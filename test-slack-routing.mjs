#!/usr/bin/env node
/**
 * OpenClaw Slack Routing Smoke Tests
 * 
 * Enables allowBots on test channel, restarts gateway, runs tests, reverts.
 * 
 * Usage: node ~/.openclaw/test-slack-routing.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const CONFIG_PATH = process.env.HOME + '/.openclaw/openclaw.json';
const LOG_PATH    = '/private/tmp/gw8.log';
function die(msg) { console.error('ERROR: ' + msg); process.exit(1); }

const USER_TOKEN  = process.env.SLACK_USER_TOKEN || die('Set SLACK_USER_TOKEN env var');

const BOTS = {
  'dr-claw':          { userId: 'U0AFT46E9FH', botToken: process.env.SLACK_BOT_TOKEN_DRCLAW || die('Set SLACK_BOT_TOKEN_DRCLAW') },
  'brain':            { userId: 'U0AGB2F0HT5', botToken: process.env.SLACK_BOT_TOKEN_BRAIN || die('Set SLACK_BOT_TOKEN_BRAIN') },
  'penny':            { userId: 'U0AGNBWBAG2', botToken: process.env.SLACK_BOT_TOKEN_PENNY || die('Set SLACK_BOT_TOKEN_PENNY') },
  'inspector-gadget': { userId: 'U0AGS0SJ536', botToken: process.env.SLACK_BOT_TOKEN_GADGET || die('Set SLACK_BOT_TOKEN_GADGET') },
};

const TEST_CHANNEL = 'C0AEEMXL84C';
const WAIT_SEC     = parseInt(process.env.WAIT_SEC || '25', 10);
const MARKER       = `smoke-${Date.now()}`;

let originalConfig;

function patchConfig() {
  originalConfig = readFileSync(CONFIG_PATH, 'utf8');
  const config = JSON.parse(originalConfig);
  const slack = config.channels.slack;
  
  // Only set allowBots on the specific channel (valid config location)
  if (!slack.channels) slack.channels = {};
  slack.channels[TEST_CHANNEL] = {
    ...(slack.channels[TEST_CHANNEL] || {}),
    allowBots: true,
    requireMention: true,
  };
  
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  console.log('  🔧 Config patched (allowBots on test channel)');
}

function revertConfig() {
  if (originalConfig) {
    writeFileSync(CONFIG_PATH, originalConfig);
    console.log('  🔧 Config reverted');
  }
}

function restartGateway() {
  try {
    execSync('pkill -f openclaw-gateway 2>/dev/null; sleep 2', { stdio: 'ignore' });
  } catch {}
  // Source nvm and start gateway
  execSync(
    'bash -c "export NVM_DIR=$HOME/.nvm && source $NVM_DIR/nvm.sh && nohup openclaw gateway > ' + LOG_PATH + ' 2>&1 &"',
    { stdio: 'ignore' }
  );
  console.log('  🔄 Gateway restarting …');
}

function waitForGateway(timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const log = readFileSync(LOG_PATH, 'utf8');
      const lines = log.split('\n');
      // Look for "socket mode connected" after our restart
      const connectedCount = lines.filter(l => l.includes('socket mode connected')).length;
      if (connectedCount >= 4) return true;
    } catch {}
    execSync('sleep 1');
  }
  return false;
}

// ── slack helpers ────────────────────────────────────────────────────
async function slack(method, token, body = {}) {
  const r = await fetch(`https://slack.com/api/${method}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return r.json();
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function messagesAfter(token, channel, ts, threadTs) {
  if (threadTs) {
    const r = await slack('conversations.replies', token, { channel, ts: threadTs, limit: 30 });
    return (r.messages || []).filter(m => parseFloat(m.ts) > parseFloat(ts));
  }
  const r = await slack('conversations.history', token, { channel, oldest: ts, limit: 30, inclusive: false });
  return r.messages || [];
}

const results = [];
function result(name, pass, detail = '') {
  results.push({ name, pass, detail });
  console.log(`${pass ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`);
}

// ── tests ────────────────────────────────────────────────────────────

async function testDM(botName) {
  const bot = BOTS[botName];
  const dm = await slack('conversations.open', USER_TOKEN, { users: bot.userId });
  if (!dm.ok) return result(`DM → ${botName}`, false, dm.error);
  const ch = dm.channel.id;

  const send = await slack('chat.postMessage', USER_TOKEN, {
    channel: ch,
    text: `[${MARKER}] hey ${botName}, say exactly one word`,
  });
  if (!send.ok) return result(`DM → ${botName}`, false, send.error);

  console.log(`  ⏳ DM ${botName} — waiting ${WAIT_SEC}s …`);
  await sleep(WAIT_SEC * 1000);

  const msgs = await messagesAfter(bot.botToken, ch, send.ts);
  const replies = msgs.filter(m => m.user === bot.userId);
  result(`DM → ${botName}`, replies.length > 0, replies.length ? `${replies.length} reply(s)` : 'no reply');
}

async function testGroupDM() {
  const drClaw = BOTS['dr-claw'];
  const brain  = BOTS['brain'];

  const mpim = await slack('conversations.open', USER_TOKEN, {
    users: [drClaw.userId, brain.userId].join(','),
  });
  if (!mpim.ok) return result('Group DM', false, mpim.error);
  const ch = mpim.channel.id;

  const send = await slack('chat.postMessage', USER_TOKEN, {
    channel: ch,
    text: `[${MARKER}] group test — both say exactly one word`,
  });
  if (!send.ok) return result('Group DM', false, send.error);

  console.log(`  ⏳ Group DM — waiting ${WAIT_SEC}s …`);
  await sleep(WAIT_SEC * 1000);

  const msgs1 = await messagesAfter(drClaw.botToken, ch, send.ts);
  const msgs2 = await messagesAfter(brain.botToken, ch, send.ts);
  const allMsgs = [...msgs1, ...msgs2];

  const drReplied = allMsgs.some(m => m.user === drClaw.userId);
  const brReplied = allMsgs.some(m => m.user === brain.userId);

  if (drReplied && brReplied) result('Group DM', true, 'both replied');
  else if (drReplied || brReplied) result('Group DM', false, `only ${drReplied ? 'dr-claw' : 'brain'} replied`);
  else result('Group DM', false, 'neither replied');
}

async function testChannelSingleMention(botName) {
  const bot = BOTS[botName];

  const send = await slack('chat.postMessage', USER_TOKEN, {
    channel: TEST_CHANNEL,
    text: `[${MARKER}] <@${bot.userId}> say exactly one word`,
  });
  if (!send.ok) return result(`Channel @${botName}`, false, send.error);

  console.log(`  ⏳ Channel @${botName} — waiting ${WAIT_SEC}s …`);
  await sleep(WAIT_SEC * 1000);

  const chanMsgs   = await messagesAfter(bot.botToken, TEST_CHANNEL, send.ts);
  const threadMsgs = await messagesAfter(bot.botToken, TEST_CHANNEL, send.ts, send.ts);
  const all = [...chanMsgs, ...threadMsgs];
  const replies = all.filter(m => m.user === bot.userId);

  result(`Channel @${botName}`, replies.length > 0, replies.length ? `${replies.length} reply(s)` : 'no reply');
}

async function testChannelMultiMention() {
  const drClaw = BOTS['dr-claw'];
  const brain  = BOTS['brain'];

  const send = await slack('chat.postMessage', USER_TOKEN, {
    channel: TEST_CHANNEL,
    text: `[${MARKER}] <@${drClaw.userId}> <@${brain.userId}> each say exactly one word`,
  });
  if (!send.ok) return result('Channel multi-mention', false, send.error);

  console.log(`  ⏳ Channel multi-mention — waiting ${WAIT_SEC}s …`);
  await sleep(WAIT_SEC * 1000);

  const chanMsgs   = await messagesAfter(drClaw.botToken, TEST_CHANNEL, send.ts);
  const threadMsgs = await messagesAfter(drClaw.botToken, TEST_CHANNEL, send.ts, send.ts);
  const all = [...chanMsgs, ...threadMsgs];

  const drReplied = all.some(m => m.user === drClaw.userId);
  const brReplied = all.some(m => m.user === brain.userId);

  if (drReplied && brReplied) result('Channel multi-mention', true, 'both replied');
  else {
    const who = [drReplied && 'dr-claw', brReplied && 'brain'].filter(Boolean);
    result('Channel multi-mention', false, who.length ? `only ${who.join(', ')} replied` : 'neither replied');
  }
}

// ── main ─────────────────────────────────────────────────────────────
async function main() {
  const auth = await slack('auth.test', USER_TOKEN, {});
  if (!auth.ok) { console.error('❌ User token invalid:', auth.error); process.exit(1); }

  console.log(`\n🧪 OpenClaw Slack Routing Tests`);
  console.log(`   posting as: ${auth.user} (${auth.user_id})`);
  console.log(`   marker: ${MARKER}\n${'─'.repeat(60)}\n`);

  // Patch config and restart gateway
  patchConfig();
  restartGateway();
  
  console.log('  ⏳ Waiting for gateway to connect …');
  await sleep(10000); // give it time to start + connect all sockets

  try {
    console.log("\n📧 DMs (⚠️  cannot automate — user token is bot-tagged by Slack)");
    await testDM('dr-claw');
    await testDM('brain');

    console.log('\n📬 Group DM');
    await testGroupDM();

    console.log('\n📢 Channel single @mention');
    await testChannelSingleMention('dr-claw');
    await testChannelSingleMention('brain');

    console.log('\n📢 Channel multi @mention');
    await testChannelMultiMention();
  } finally {
    console.log('');
    revertConfig();
    restartGateway();
    console.log('  ⏳ Gateway restarting with original config …');
  }

  console.log(`\n${'─'.repeat(60)}`);
  const passed = results.filter(r => r.pass).length;
  console.log(`\n📊 ${passed}/${results.length} passed`);
  results.filter(r => !r.pass).forEach(r => console.log(`   ❌ ${r.name} — ${r.detail}`));
  console.log('');
  process.exit(passed === results.length ? 0 : 1);
}

main().catch(e => { console.error(e); revertConfig(); process.exit(1); });
