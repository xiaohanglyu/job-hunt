#!/bin/bash
cd "$(dirname "$0")"

# Kill any existing server on port 8080
lsof -ti:8080 | xargs kill -9 2>/dev/null

# Start server
python3 -m http.server 8080 &
SERVER_PID=$!

# Wait for server to start
sleep 0.8

# Open browser
open http://localhost:8080

echo "job-hunt running at http://localhost:8080"
echo "Press Ctrl+C to stop"

wait $SERVER_PID
