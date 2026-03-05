import { parseSlackTarget } from "../../../slack/targets.js";

export function normalizeSlackMessagingTarget(raw: string): string | undefined {
  const target = parseSlackTarget(raw, { defaultKind: "channel" });
  return target?.normalized;
}

export function looksLikeSlackTargetId(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) {
    return false;
  }
  if (/^<@([A-Z0-9]+)>$/i.test(trimmed)) {
    return true;
  }
  if (/^(user|channel):/i.test(trimmed)) {
    return true;
  }
  if (/^slack:/i.test(trimmed)) {
    return true;
  }
  // Treat @.../#... as ids only when they actually look like Slack ids.
  // Otherwise, let directory resolution handle @name / #channel.
  if (trimmed.startsWith("@")) {
    const candidate = trimmed.slice(1).trim();
    return /^[UW][A-Z0-9]{8,}$/i.test(candidate);
  }
  if (trimmed.startsWith("#")) {
    const candidate = trimmed.slice(1).trim();
    return /^[CGD][A-Z0-9]{8,}$/i.test(candidate);
  }
  return /^[CUWGD][A-Z0-9]{8,}$/i.test(trimmed);
}
