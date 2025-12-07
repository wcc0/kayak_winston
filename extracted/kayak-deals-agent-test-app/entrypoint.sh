#!/bin/sh
set -e

if [ "$AGENT_API" = "true" ]; then
  echo "Starting Deals Agent API (uvicorn)..."
  exec uvicorn deals_agent.api:app --host 0.0.0.0 --port ${AGENT_PORT:-8000} --loop asyncio
else
  echo "Starting Deals Agent worker (main)..."
  exec python -m deals_agent.main
fi
