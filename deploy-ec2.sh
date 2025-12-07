#!/bin/bash
set -e

echo "========================================="
echo "Kayak Platform - Automated Deployment"
echo "========================================="
echo ""

# Update system
echo "Updating system packages..."
sudo apt-get update -qq
sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y -qq

# Install Docker
echo "Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker ubuntu
    rm get-docker.sh
fi

# Install Docker Compose
echo "Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# Install Node.js (for data import)
echo "Installing Node.js..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Install Git
echo "Installing Git..."
sudo apt-get install -y git

echo ""
echo "??? All prerequisites installed!"
echo ""
echo "Next steps:"
echo "1. Clone your repository"
echo "2. cd into the kayak directory"
echo "3. Run: docker-compose up -d"
echo "4. Load Kaggle data: cd backend && node scripts/import-kaggle-data.js"
echo ""
