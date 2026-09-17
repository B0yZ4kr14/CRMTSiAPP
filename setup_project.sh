#!/bin/bash
# Setup script for CRMTSiAPP

set -e

echo "Setting up CRMTSiAPP project..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install Node.js 18+"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "npm is not installed. Please install npm"
    exit 1
fi

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "PostgreSQL is not installed. Please install PostgreSQL 14+"
    exit 1
fi

# Check if Redis is installed
if ! command -v redis-cli &> /devtrange
    "Redis is not installed. Please install Redis 7+"
    exit 1
fi

echo "All prerequisites are installed."

# Install dependencies
echo "Installing dependencies..."
npm install

# Set up environment file
if [ ! -f .env ]; then
    echo "Setting up environment file..."
    cp .env.example .env
    echo "Please update .env file with your configuration"
    echo "You can edit .env file manually or use a configuration tool"
fi

# Set up database
echo "Setting up database..."
npm run db:migrate

# Start development server
echo "Starting development server..."
echo "Visit http://localhost:3000 to access the application"
echo "Press Ctrl+C to stop the server"

# Start the application
npm run dev
