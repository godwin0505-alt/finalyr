#!/bin/bash

echo "🚀 Setting up PostgreSQL + Node.js Backend"
echo "=========================================="
echo ""

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "📦 Installing PostgreSQL..."
    sudo apt update
    sudo apt install -y postgresql postgresql-contrib
    echo "✅ PostgreSQL installed"
else
    echo "✅ PostgreSQL already installed"
fi

# Start PostgreSQL service
echo "🔄 Starting PostgreSQL service..."
sudo service postgresql start
sleep 2

# Create database and user
echo "🗄️  Creating database..."
sudo -u postgres psql -c "DROP DATABASE IF EXISTS climate_db;" 2>/dev/null
sudo -u postgres psql -c "CREATE DATABASE climate_db;"
sudo -u postgres psql -c "CREATE USER postgres WITH PASSWORD 'password';" 2>/dev/null || echo "User already exists"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE climate_db TO postgres;"
sudo -u postgres psql -c "ALTER DATABASE climate_db OWNER TO postgres;"
echo "✅ Database created"

# Navigate to backend directory
cd /home/esu/projects/finalyr/backend

# Generate Prisma Client
echo "⚙️  Generating Prisma Client..."
npm run prisma:generate

# Push database schema
echo "📊 Pushing database schema..."
npm run db:push

# Seed database
echo "🌱 Seeding database with CSV data..."
npm run seed

echo ""
echo "✨ Setup complete!"
echo ""
echo "🚀 To start the server, run:"
echo "   cd /home/esu/projects/finalyr/backend"
echo "   npm run dev"
echo ""
echo "📊 To view database, run:"
echo "   npm run prisma:studio"
echo ""
