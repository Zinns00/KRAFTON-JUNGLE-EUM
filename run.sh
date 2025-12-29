#!/bin/bash

# Function to handle script termination
cleanup() {
    echo "Stopping services..."
    kill $(jobs -p)
}

# Trap SIGINT (Ctrl+C) to run cleanup
trap cleanup SIGINT

echo "Starting Backend..."
cd backend
go run cmd/server/main.go &
cd ..

echo "Starting Frontend..."
cd frontend
npm run dev &
cd ..

echo "Waiting for services to start..."
sleep 5

echo "Opening Chrome..."
open -a "Google Chrome" http://localhost:3000

# Wait for all background jobs
wait