#!/bin/bash

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=================================="
echo "  DeFi Risk Sentinel - Starting"
echo "=================================="
echo ""

# Install dependencies if needed
if [ ! -d "$PROJECT_DIR/backend/node_modules" ]; then
  echo "[1/2] Installing backend dependencies..."
  npm install --prefix "$PROJECT_DIR/backend"
else
  echo "[1/2] Backend dependencies OK"
fi

if [ ! -d "$PROJECT_DIR/frontend/node_modules" ]; then
  echo "[2/2] Installing frontend dependencies..."
  npm install --prefix "$PROJECT_DIR/frontend"
else
  echo "[2/2] Frontend dependencies OK"
fi

echo ""
echo "Starting services..."
echo "  Backend:  http://localhost:8000"
echo "  Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both."
echo "=================================="
echo ""

# Start backend in background
npm run dev --prefix "$PROJECT_DIR/backend" &
BACKEND_PID=$!

# Start frontend in foreground
npm run dev --prefix "$PROJECT_DIR/frontend" &
FRONTEND_PID=$!

# Trap Ctrl+C to kill both
cleanup() {
  echo ""
  echo "Shutting down..."
  kill $BACKEND_PID 2>/dev/null
  kill $FRONTEND_PID 2>/dev/null
  wait $BACKEND_PID 2>/dev/null
  wait $FRONTEND_PID 2>/dev/null
  echo "Done. Goodbye!"
  exit 0
}

trap cleanup SIGINT SIGTERM

# Wait for both
wait
