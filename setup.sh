#!/bin/bash

# RAG Chunking Visualizer Setup Script

echo "🚀 Starting RAG Chunking Visualizer Setup..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "❌ Docker is not running. Please start Docker Desktop and try again."
  exit 1
fi

echo "📦 Starting services with Docker Compose..."
docker-compose up -d

echo "⏳ Waiting for Ollama to be ready..."
until curl -s http://localhost:11434/api/tags > /dev/null; do
  sleep 2
  echo -n "."
done
echo ""
echo "✅ Ollama is ready!"

echo "🧠 Pulling embedding model (mxbai-embed-large)..."
docker exec rag-chunking-ollama ollama pull mxbai-embed-large:latest

echo "✅ Model pulled successfully!"

echo "⚙️ Installing dependencies..."
if command -v bun &> /dev/null; then
  bun install
else
  npm install
fi

echo "🎉 Setup complete!"
echo "👉 Run 'npm run dev' or 'bun run dev' to start the application."
