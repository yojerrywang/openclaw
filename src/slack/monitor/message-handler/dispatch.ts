import { resolveHumanDelayConfig } from "../../../agents/identity.js";
import { dispatchInboundMessage } from "../../../auto-reply/dispatch.js";
import { clearHistoryEntriesIfEnabled } from "../../../auto-reply/reply/history.js";
import { createReplyDispatcherWithTyping } from "../../../auto-reply/reply/reply-dispatcher.js";
import type { ReplyPayload } from "../../../auto-reply/types.js";
import { removeAckReactionAfterReply } from "../../../channels/ack-reactions.js";
import { logAckFailure, logTypingFailure } from "../../../channels/logging.js";
import { createReplyPrefixOptions } from "../../../channels/reply-prefix.js";
import { createTypingCallbacks } from "../../../channels/typing.js";
import { resolveStorePath, updateLastRoute } from "../../../config/sessions.js";
import { danger, logVerbose, shouldLogVerbose } from "../../../globals.js";
import { removeSlackReaction } from "../../actions.js";
import { createSlackDraftStream } from "../../draft-stream.js";
import {
  applyAppendOnlyStreamUpdate,
  buildStatusFinalPreviewText,
  resolveSlackStreamMode,
} from "../../stream-mode.js";
import type { SlackStreamSession } from "../../streaming.js";
import { appendSlackStream, startSlackStream, stopSlackStream } from "../../streaming.js";
import { resolveSlackThreadTargets } from "../../threading.js";
import { enforceStoryCoherence, normalizeStoryModeText } from "../orchestration.js";
import { createSlackReplyDeliveryPlan, deliverReplies, resolveSlackThreadTs } from "../replies.js";
import {
  getBatonSnapshot,
  isBatonActive,
  recordBotReply,
  resolveBatonTurnDelayMs,
} from "../thread-relay.js";
import type { PreparedSlackMessage } from "./types.js";

function hasMedia(payload: ReplyPayload): boolean {
  return Boolean(payload.mediaUrl) || (payload.mediaUrls?.length ?? 0) > 0;
}

export function isSlackStreamingEnabled(
  streaming: boolean | string | { mode: string; nativeStreaming: boolean } | undefined,
): boolean {
  if (typeof streaming === "object" && streaming !== null) {
    const s = streaming as { mode: string; nativeStreaming: boolean };
    return s.mode === "partial" && s.nativeStreaming;
  }
  if (streaming === "off") {
    return false;
  }
  return streaming !== false && streaming !== undefined;
}

export function resolveSlackStreamingThreadHint(params: {
  replyToMode: "off" | "first" | "all";
  incomingThreadTs: string | undefined;
  messageTs: string | undefined;
}): string | undefined {
  return resolveSlackThreadTs({
    replyToMode: params.replyToMode,
    incomingThreadTs: params.incomingThreadTs,
    messageTs: params.messageTs,
    hasReplied: false,
  });
}

function shouldUseStreaming(params: {
  streamingEnabled: boolean;
  threadTs: string | undefined;
}): boolean {
  if (!params.streamingEnabled) {
    return false;
  }
  if (!params.threadTs) {
    logVerbose("slack-stream: streaming disabled — no reply thread target available");
    return false;
  }
  return true;
}

export async function dispatchPreparedSlackMessage(prepared: PreparedSlackMessage) {
  const { ctx, account, message, route } = prepared;
  const cfg = ctx.cfg;
  const runtime = ctx.runtime;

  if (prepared.isDirectMessage) {
    const sessionCfg = cfg.session;
    const storePath = resolveStorePath(sessionCfg?.store, {
      agentId: route.agentId,
    });
    await updateLastRoute({
      storePath,
      sessionKey: route.mainSessionKey,
      deliveryContext: {
        channel: "slack",
        to: `user:${message.user}`,
        accountId: route.accountId,
      },
      ctx: prepared.ctxPayload,
    });
  }

  const { statusThreadTs } = resolveSlackThreadTargets({
    message,
    replyToMode: ctx.replyToMode,
  });

  const messageTs = message.ts ?? message.event_ts;
  const incomingThreadTs = message.thread_ts;
  let didSetStatus = false;

  // Shared mutable ref for "replyToMode=first". Both tool + auto-reply flows
  // mark this to ensure only the first reply is threaded.
  const hasRepliedRef = { value: false };
  const replyPlan = createSlackReplyDeliveryPlan({
    replyToMode: ctx.replyToMode,
    incomingThreadTs,
    messageTs,
    hasRepliedRef,
  });

  const typingTarget = statusThreadTs ? `${message.channel}/${statusThreadTs}` : message.channel;
  const typingCallbacks = createTypingCallbacks({
    start: async () => {
      didSetStatus = true;
      await ctx.setSlackThreadStatus({
        channelId: message.channel,
        threadTs: statusThreadTs,
        status: "is typing...",
      });
    },
    stop: async () => {
      if (!didSetStatus) {
        return;
      }
      didSetStatus = false;
      await ctx.setSlackThreadStatus({
        channelId: message.channel,
        threadTs: statusThreadTs,
        status: "",
      });
    },
    onStartError: (err) => {
      logTypingFailure({
        log: (message) => runtime.error?.(danger(message)),
        channel: "slack",
        action: "start",
        target: typingTarget,
        error: err,
      });
    },
    onStopError: (err) => {
      logTypingFailure({
        log: (message) => runtime.error?.(danger(message)),
        channel: "slack",
        action: "stop",
        target: typingTarget,
        error: err,
      });
    },
  });

  const { onModelSelected, ...prefixOptions } = createReplyPrefixOptions({
    cfg,
    agentId: route.agentId,
    channel: "slack",
    accountId: route.accountId,
  });

  const streamingEnabled = isSlackStreamingEnabled(account.config.streaming);
  const streamThreadHint = resolveSlackStreamingThreadHint({
    replyToMode: ctx.replyToMode,
    incomingThreadTs,
    messageTs,
  });
  const useStreaming = shouldUseStreaming({
    streamingEnabled,
    threadTs: streamThreadHint,
  });
  let streamSession: SlackStreamSession | null = null;
  let streamFailed = false;
  let batonDelayApplied = false;
  let batonTurnCompleted = false;

  const isBatonThread = (threadTs: string | undefined): boolean =>
    Boolean(threadTs && isBatonActive({ channelId: message.channel, threadTs }));
  const batonContextThreadTs = message.thread_ts ?? message.ts;
  const dispatchStartedInBaton = Boolean(
    batonContextThreadTs &&
    isBatonActive({ channelId: message.channel, threadTs: batonContextThreadTs }),
  );

  const isStaleBatonDispatch = (threadTs: string | undefined): boolean => {
    if (!dispatchStartedInBaton || !threadTs) {
      return false;
    }
    const snapshot = getBatonSnapshot({ channelId: message.channel, threadTs });
    const expectedAgentId = snapshot?.roster[snapshot.turnIndex];
    const stale = expectedAgentId !== account.accountId;
    if (stale) {
      logVerbose(
        `slack: drop stale baton dispatch for ${account.accountId} channel=${message.channel} thread=${threadTs} expected=${expectedAgentId ?? "none"}`,
      );
    }
    return stale;
  };

  const shouldDropAdditionalBatonReply = (threadTs: string | undefined): boolean => {
    if (!batonTurnCompleted || !isBatonThread(threadTs)) {
      return false;
    }
    logVerbose(
      `slack: dropping extra baton payload for ${account.accountId} channel=${message.channel} thread=${threadTs}`,
    );
    return true;
  };

  const recordReplyForTurn = (replyThreadTs: string | undefined, text?: string): void => {
    if (!replyThreadTs) {
      return;
    }
    recordBotReply({
      channelId: message.channel,
      threadTs: replyThreadTs,
      agentId: account.accountId,
      text,
    });
    if (isBatonThread(replyThreadTs)) {
      batonTurnCompleted = true;
    }
  };

  const delayForBatonTurn = async (threadTs: string | undefined): Promise<void> => {
    if (batonDelayApplied || !threadTs) {
      return;
    }
    const delayMs = resolveBatonTurnDelayMs({
      channelId: message.channel,
      threadTs,
      agentId: account.accountId,
    });
    if (delayMs <= 0) {
      return;
    }
    batonDelayApplied = true;
    await new Promise<void>((resolve) => {
      setTimeout(resolve, delayMs);
    });
  };

  const normalizeBatonPayload = (
    payload: ReplyPayload,
    threadTs: string | undefined,
  ): ReplyPayload => {
    if (!threadTs || !isBatonActive({ channelId: message.channel, threadTs }) || !payload.text) {
      return payload;
    }
    const snapshot = getBatonSnapshot({ channelId: message.channel, threadTs });
    const normalizedText = normalizeStoryModeText(payload.text);
    const coherentText = snapshot
      ? enforceStoryCoherence({
          text: normalizedText,
          agentId: account.accountId,
          turnIndex: snapshot.turnIndex,
          state: snapshot.state,
          transcript: snapshot.transcript,
        })
      : normalizedText;
    return { ...payload, text: coherentText };
  };

  const deliverNormally = async (payload: ReplyPayload, forcedThreadTs?: string): Promise<void> => {
    const replyThreadTs = forcedThreadTs ?? replyPlan.nextThreadTs();
    if (isStaleBatonDispatch(replyThreadTs)) {
      return;
    }
    if (shouldDropAdditionalBatonReply(replyThreadTs)) {
      return;
    }
    await delayForBatonTurn(replyThreadTs);
    if (isStaleBatonDispatch(replyThreadTs)) {
      return;
    }
    const normalizedPayload = normalizeBatonPayload(payload, replyThreadTs);
    await deliverReplies({
      replies: [normalizedPayload],
      target: prepared.replyTarget,
      token: ctx.botToken,
      accountId: account.accountId,
      runtime,
      textLimit: ctx.textLimit,
      replyThreadTs,
      replyToMode: ctx.replyToMode,
    });
    replyPlan.markSent();

    recordReplyForTurn(replyThreadTs, normalizedPayload.text);
  };

  const deliverWithStreaming = async (payload: ReplyPayload): Promise<void> => {
    if (streamFailed || hasMedia(payload) || !payload.text?.trim()) {
      await deliverNormally(payload, streamSession?.threadTs);
      return;
    }

    const previewThreadTs = streamSession?.threadTs ?? replyPlan.nextThreadTs();
    if (isStaleBatonDispatch(previewThreadTs)) {
      return;
    }
    const normalizedPayload = normalizeBatonPayload(payload, previewThreadTs);
    const text = normalizedPayload.text?.trim() ?? "";
    if (!text) {
      await deliverNormally(normalizedPayload, streamSession?.threadTs ?? previewThreadTs);
      return;
    }
    let plannedThreadTs: string | undefined;
    try {
      if (!streamSession) {
        const streamThreadTs = previewThreadTs;
        plannedThreadTs = streamThreadTs;
        if (!streamThreadTs) {
          logVerbose(
            "slack-stream: no reply thread target for stream start, falling back to normal delivery",
          );
          streamFailed = true;
          await deliverNormally(payload);
          return;
        }

        await delayForBatonTurn(streamThreadTs);
        if (isStaleBatonDispatch(streamThreadTs)) {
          return;
        }
        streamSession = await startSlackStream({
          client: ctx.app.client,
          channel: message.channel,
          threadTs: streamThreadTs,
          text,
          teamId: ctx.teamId,
          userId: message.user,
        });
        replyPlan.markSent();

        if (streamThreadTs) {
          recordReplyForTurn(streamThreadTs, text);
        }
        return;
      }

      if (isStaleBatonDispatch(streamSession.threadTs)) {
        return;
      }
      await appendSlackStream({
        session: streamSession,
        text: "\n" + text,
      });
    } catch (err) {
      runtime.error?.(
        danger(`slack-stream: streaming API call failed: ${String(err)}, falling back`),
      );
      streamFailed = true;
      await deliverNormally(payload, streamSession?.threadTs ?? plannedThreadTs);
    }
  };

  const { dispatcher, replyOptions, markDispatchIdle } = createReplyDispatcherWithTyping({
    ...prefixOptions,
    humanDelay: resolveHumanDelayConfig(cfg, route.agentId),
    deliver: async (payload) => {
      if (useStreaming) {
        await deliverWithStreaming(payload);
        return;
      }

      const mediaCount = payload.mediaUrls?.length ?? (payload.mediaUrl ? 1 : 0);
      const draftMessageId = draftStream?.messageId();
      const draftChannelId = draftStream?.channelId();
      const finalText = payload.text;
      const canFinalizeViaPreviewEdit =
        streamMode !== "status_final" &&
        mediaCount === 0 &&
        !payload.isError &&
        typeof finalText === "string" &&
        finalText.trim().length > 0 &&
        typeof draftMessageId === "string" &&
        typeof draftChannelId === "string";

      if (canFinalizeViaPreviewEdit) {
        draftStream?.stop();
        try {
          await ctx.app.client.chat.update({
            token: ctx.botToken,
            channel: draftChannelId,
            ts: draftMessageId,
            text: finalText.trim(),
          });
          const replyThreadTs = replyPlan.nextThreadTs();
          recordReplyForTurn(replyThreadTs, finalText.trim());
          return;
        } catch (err) {
          logVerbose(
            `slack: preview final edit failed; falling back to standard send (${String(err)})`,
          );
        }
      } else if (streamMode === "status_final" && hasStreamedMessage) {
        try {
          const statusChannelId = draftStream?.channelId();
          const statusMessageId = draftStream?.messageId();
          if (statusChannelId && statusMessageId) {
            await ctx.app.client.chat.update({
              token: ctx.botToken,
              channel: statusChannelId,
              ts: statusMessageId,
              text: "Status: complete. Final answer posted below.",
            });
          }
        } catch (err) {
          logVerbose(`slack: status_final completion update failed (${String(err)})`);
        }
      } else if (mediaCount > 0) {
        await draftStream?.clear();
        hasStreamedMessage = false;
      }

      const replyThreadTs = replyPlan.nextThreadTs();
      if (shouldDropAdditionalBatonReply(replyThreadTs)) {
        return;
      }
      await delayForBatonTurn(replyThreadTs);
      const normalizedPayload = normalizeBatonPayload(payload, replyThreadTs);
      await deliverReplies({
        replies: [normalizedPayload],
        target: prepared.replyTarget,
        token: ctx.botToken,
        accountId: account.accountId,
        runtime,
        textLimit: ctx.textLimit,
        replyThreadTs,
        replyToMode: ctx.replyToMode,
      });
      replyPlan.markSent();

      recordReplyForTurn(replyThreadTs, normalizedPayload.text);
    },
    onError: (err, info) => {
      runtime.error?.(danger(`slack ${info.kind} reply failed: ${String(err)}`));
      typingCallbacks.onIdle?.();
    },
    onReplyStart: typingCallbacks.onReplyStart,
    onIdle: typingCallbacks.onIdle,
  });

  const draftStream = createSlackDraftStream({
    target: prepared.replyTarget,
    token: ctx.botToken,
    accountId: account.accountId,
    maxChars: Math.min(ctx.textLimit, 4000),
    resolveThreadTs: () => replyPlan.nextThreadTs(),
    onMessageSent: () => replyPlan.markSent(),
    log: logVerbose,
    warn: logVerbose,
  });
  let hasStreamedMessage = false;
  const streamMode = resolveSlackStreamMode(account.config.streamMode);
  let appendRenderedText = "";
  let appendSourceText = "";
  let statusUpdateCount = 0;
  const updateDraftFromPartial = (text?: string) => {
    const trimmed = text?.trimEnd();
    if (!trimmed) {
      return;
    }

    if (streamMode === "append") {
      const next = applyAppendOnlyStreamUpdate({
        incoming: trimmed,
        rendered: appendRenderedText,
        source: appendSourceText,
      });
      appendRenderedText = next.rendered;
      appendSourceText = next.source;
      if (!next.changed) {
        return;
      }
      draftStream.update(next.rendered);
      hasStreamedMessage = true;
      return;
    }

    if (streamMode === "status_final") {
      statusUpdateCount += 1;
      if (statusUpdateCount > 1 && statusUpdateCount % 4 !== 0) {
        return;
      }
      draftStream.update(buildStatusFinalPreviewText(statusUpdateCount));
      hasStreamedMessage = true;
      return;
    }

    draftStream.update(trimmed);
    hasStreamedMessage = true;
  };

  const { queuedFinal, counts } = await dispatchInboundMessage({
    ctx: prepared.ctxPayload,
    cfg,
    dispatcher,
    replyOptions: {
      ...replyOptions,
      skillFilter: prepared.channelConfig?.skills,
      hasRepliedRef,
      disableBlockStreaming: useStreaming
        ? true
        : typeof account.config.blockStreaming === "boolean"
          ? !account.config.blockStreaming
          : undefined,
      onModelSelected,
      onPartialReply: useStreaming
        ? undefined
        : async (payload) => {
            updateDraftFromPartial(payload.text);
          },
      onAssistantMessageStart: useStreaming
        ? undefined
        : async () => {
            if (hasStreamedMessage) {
              draftStream.forceNewMessage();
              hasStreamedMessage = false;
              appendRenderedText = "";
              appendSourceText = "";
              statusUpdateCount = 0;
            }
          },
      onReasoningEnd: useStreaming
        ? undefined
        : async () => {
            if (hasStreamedMessage) {
              draftStream.forceNewMessage();
              hasStreamedMessage = false;
              appendRenderedText = "";
              appendSourceText = "";
              statusUpdateCount = 0;
            }
          },
    },
  });
  await draftStream.flush();
  draftStream.stop();
  markDispatchIdle();

  // -----------------------------------------------------------------------
  // Finalize the stream if one was started
  // -----------------------------------------------------------------------
  const finalStream = streamSession as SlackStreamSession | null;
  if (finalStream && !finalStream.stopped) {
    try {
      await stopSlackStream({ session: finalStream });
    } catch (err) {
      runtime.error?.(danger(`slack-stream: failed to stop stream: ${String(err)}`));
    }
  }

  const anyReplyDelivered = queuedFinal || (counts.block ?? 0) > 0 || (counts.final ?? 0) > 0;

  if (!anyReplyDelivered) {
    await draftStream.clear();
    if (prepared.isRoomish) {
      clearHistoryEntriesIfEnabled({
        historyMap: ctx.channelHistories,
        historyKey: prepared.historyKey,
        limit: ctx.historyLimit,
      });
    }
    return;
  }

  if (shouldLogVerbose()) {
    const finalCount = counts.final;
    logVerbose(
      `slack: delivered ${finalCount} reply${finalCount === 1 ? "" : "ies"} to ${prepared.replyTarget}`,
    );
  }

  removeAckReactionAfterReply({
    removeAfterReply: ctx.removeAckAfterReply,
    ackReactionPromise: prepared.ackReactionPromise,
    ackReactionValue: prepared.ackReactionValue,
    remove: () =>
      removeSlackReaction(
        message.channel,
        prepared.ackReactionMessageTs ?? "",
        prepared.ackReactionValue,
        {
          token: ctx.botToken,
          client: ctx.app.client,
        },
      ),
    onError: (err) => {
      logAckFailure({
        log: logVerbose,
        channel: "slack",
        target: `${message.channel}/${message.ts}`,
        error: err,
      });
    },
  });

  if (prepared.isRoomish) {
    clearHistoryEntriesIfEnabled({
      historyMap: ctx.channelHistories,
      historyKey: prepared.historyKey,
      limit: ctx.historyLimit,
    });
  }
}
