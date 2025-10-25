#!/bin/bash

# EFBC Conference Development Server Startup Script
echo "🚀 Starting EFBC Conference Development Environment..."

# Kill any existing processes
echo "🧹 Cleaning up existing processes..."
pkill -f "working-server" 2>/dev/null || true
pkill -f "react-scripts" 2>/dev/null || true

# Wait a moment for processes to stop
sleep 2

# Start backend
echo "🔧 Starting backend server..."
cd backend
node working-server.js &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Start frontend
echo "🎨 Starting frontend server..."
cd ../frontend
npm start &
FRONTEND_PID=$!

echo ""
echo "✅ Both servers are starting up!"
echo "🔧 Backend: http://localhost:54112"
echo "🎨 Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for user to stop
wait
