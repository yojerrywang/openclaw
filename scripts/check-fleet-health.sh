#!/bin/bash
# Fleet Health Check Script for Dr. Claw
# Verifies Gateway status, Slack bot connectivity, and log integrity.

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Dr. Claw Fleet Health Check ===${NC}"
echo -e "Timestamp: $(date)"
echo ""

# 1. Check Gateway Daemon
echo -e "${YELLOW}[1/4] Checking Gateway Daemon...${NC}"
if launchctl list | grep -q "ai.openclaw.gateway"; then
    echo -e "${GREEN}PASS:${NC} ai.openclaw.gateway is registered in launchd."
    
    # Check if actually running (has a PID)
    PID=$(launchctl list ai.openclaw.gateway | grep -o "PID\" = [0-9]*" | grep -o "[0-9]*")
    if [ -n "$PID" ]; then
        echo -e "${GREEN}PASS:${NC} Gateway is running (PID: $PID)."
    else
        echo -e "${RED}FAIL:${NC} Gateway is registered but NOT running."
    fi
else
    echo -e "${RED}FAIL:${NC} ai.openclaw.gateway is NOT registered in launchd."
fi
echo ""

# 2. Check Slack Bot Connectivity
echo -e "${YELLOW}[2/4] Probing Slack Bot Connectivity...${NC}"
STATUS_OUTPUT=$(node openclaw.mjs status --deep 2>/dev/null)
if [[ $? -eq 0 ]]; then
    # Count bots that are "ok"
    BOT_COUNT=$(echo "$STATUS_OUTPUT" | grep -o "ok ([^)]*)" | grep -o ", " | wc -l)
    # The count is , count + 1
    BOT_COUNT=$((BOT_COUNT + 1))
    
    if [ "$BOT_COUNT" -eq 6 ]; then
        echo -e "${GREEN}PASS:${NC} All 6 bots are OK and responding."
    else
        echo -e "${RED}FAIL:${NC} Only $BOT_COUNT / 6 bots are OK."
    fi
    echo "$STATUS_OUTPUT" | grep "Slack" | sed 's/^/  /'
else
    echo -e "${RED}FAIL:${NC} Failed to get status from OpenClaw CLI."
fi
echo ""

# 3. Scan Logs for Recent Errors
echo -e "${YELLOW}[3/4] Scanning logs for recent errors (last 100 lines)...${NC}"
ERROR_COUNT=$(tail -n 100 ~/.openclaw/logs/gateway.err.log 2>/dev/null | grep -iE "error|fail|exception" | grep -v "buildTokenChannelStatusSummary" | wc -l)

if [ "$ERROR_COUNT" -eq 0 ]; then
    echo -e "${GREEN}PASS:${NC} No new errors found in gateway.err.log."
else
    echo -e "${YELLOW}WARN:${NC} Found $ERROR_COUNT potential errors in gateway.err.log."
    tail -n 100 ~/.openclaw/logs/gateway.err.log | grep -iE "error|fail|exception" | grep -v "buildTokenChannelStatusSummary" | tail -n 5 | sed 's/^/  /'
fi
echo ""

# 4. Check API Key/PII Leaks in Logs
echo -e "${YELLOW}[4/4] Checking for sensitive data leaks in logs...${NC}"
# Simple check for xoxb- or other token-like strings in the log
LEAKS=$(grep -E "xoxb-|xapp-|4a87" ~/.openclaw/logs/gateway.log 2>/dev/null | wc -l)

if [ "$LEAKS" -eq 0 ]; then
    echo -e "${GREEN}PASS:${NC} No obvious Slack tokens or Gateway tokens found in logs."
else
    echo -e "${RED}CAUTION:${NC} Found $LEAKS potential token leaks in gateway.log!"
fi

echo ""
echo -e "${BLUE}=== Health Check Complete ===${NC}"
