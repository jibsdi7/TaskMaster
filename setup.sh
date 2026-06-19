#!/bin/bash

echo "======================================"
echo "TaskMaster Setup Script"
echo "======================================"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker and Docker Compose are installed"
echo ""

# Create environment files
echo "📝 Creating environment files..."

if [ ! -f backend/.env ]; then
    cp backend/.env.example backend/.env
    echo "✅ Created backend/.env"
else
    echo "⚠️  backend/.env already exists, skipping..."
fi

if [ ! -f frontend/.env ]; then
    cp frontend/.env.example frontend/.env
    echo "✅ Created frontend/.env"
else
    echo "⚠️  frontend/.env already exists, skipping..."
fi

echo ""
echo "🐳 Starting Docker containers..."
docker-compose up -d

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 10

echo ""
echo "✅ TaskMaster is ready!"
echo ""
echo "======================================"
echo "Access the application:"
echo "======================================"
echo "Frontend:  http://localhost:5173"
echo "Backend:   http://localhost:8000"
echo "API Docs:  http://localhost:8000/docs"
echo "Flower:    http://localhost:5555"
echo ""
echo "======================================"
echo "Useful commands:"
echo "======================================"
echo "View logs:        docker-compose logs -f"
echo "Stop services:    docker-compose down"
echo "Restart services: docker-compose restart"
echo ""

# Made with Bob
