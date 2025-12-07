# AWS EC2 Deployment Script for Kayak Travel Platform
# Run this from PowerShell on your local machine

# Configuration
$KEY_NAME = "kayak-ec2-key"
$INSTANCE_TYPE = "m7i-flex.large"  # Best free tier eligible: 2 vCPU, 8GB RAM
$AMI_ID = "ami-0c846debef94e83c2"  # Ubuntu 22.04 LTS (auto-detected for current region)
$REGION = (aws configure get region)
$SECURITY_GROUP_NAME = "kayak-production-sg"
$INSTANCE_NAME = "kayak-production"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Kayak Travel Platform AWS EC2 Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Create Security Group
Write-Host "Step 1: Creating Security Group..." -ForegroundColor Yellow

$sgId = aws ec2 describe-security-groups --filters "Name=group-name,Values=$SECURITY_GROUP_NAME" --query "SecurityGroups[0].GroupId" --output text 2>$null

if ($sgId -eq "None" -or $sgId -eq "") {
    Write-Host "Creating new security group..." -ForegroundColor Green
    
    $sgId = aws ec2 create-security-group `
        --group-name $SECURITY_GROUP_NAME `
        --description "Security group for Kayak Travel Platform" `
        --query 'GroupId' `
        --output text
    
    # SSH
    aws ec2 authorize-security-group-ingress --group-id $sgId --protocol tcp --port 22 --cidr 0.0.0.0/0
    
    # HTTP/HTTPS
    aws ec2 authorize-security-group-ingress --group-id $sgId --protocol tcp --port 80 --cidr 0.0.0.0/0
    aws ec2 authorize-security-group-ingress --group-id $sgId --protocol tcp --port 443 --cidr 0.0.0.0/0
    
    # Application ports
    aws ec2 authorize-security-group-ingress --group-id $sgId --protocol tcp --port 3001 --cidr 0.0.0.0/0  # Frontend
    aws ec2 authorize-security-group-ingress --group-id $sgId --protocol tcp --port 5001 --cidr 0.0.0.0/0  # Backend
    aws ec2 authorize-security-group-ingress --group-id $sgId --protocol tcp --port 8002 --cidr 0.0.0.0/0  # Concierge
    aws ec2 authorize-security-group-ingress --group-id $sgId --protocol tcp --port 8003 --cidr 0.0.0.0/0  # Deals
    
    Write-Host "Security group created: $sgId" -ForegroundColor Green
} else {
    Write-Host "Security group already exists: $sgId" -ForegroundColor Green
}

# Step 2: Create or use existing key pair
Write-Host ""
Write-Host "Step 2: Checking SSH Key Pair..." -ForegroundColor Yellow

$keyExists = aws ec2 describe-key-pairs --filters "Name=key-name,Values=$KEY_NAME" --query "KeyPairs[0].KeyName" --output text 2>$null

if ($keyExists -eq "None" -or $keyExists -eq "") {
    Write-Host "Creating new key pair..." -ForegroundColor Green
    
    aws ec2 create-key-pair --key-name $KEY_NAME --query 'KeyMaterial' --output text | Out-File -Encoding ascii -FilePath "$KEY_NAME.pem"
    
    Write-Host "Key pair created and saved to: $KEY_NAME.pem" -ForegroundColor Green
    Write-Host "IMPORTANT: Keep this file safe!" -ForegroundColor Red
} else {
    Write-Host "Key pair already exists: $KEY_NAME" -ForegroundColor Green
    if (!(Test-Path "$KEY_NAME.pem")) {
        Write-Host "WARNING: .pem file not found locally. You may need to use an existing one." -ForegroundColor Red
    }
}

# Step 3: Launch EC2 Instance
Write-Host ""
Write-Host "Step 3: Launching EC2 Instance..." -ForegroundColor Yellow

$instanceId = aws ec2 run-instances `
    --image-id $AMI_ID `
    --instance-type $INSTANCE_TYPE `
    --key-name $KEY_NAME `
    --security-group-ids $sgId `
    --block-device-mappings "DeviceName=/dev/sda1,Ebs={VolumeSize=100,VolumeType=gp3}" `
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$INSTANCE_NAME}]" `
    --query 'Instances[0].InstanceId' `
    --output text

Write-Host "Instance launched: $instanceId" -ForegroundColor Green
Write-Host "Waiting for instance to be running..." -ForegroundColor Yellow

aws ec2 wait instance-running --instance-ids $instanceId

# Get public IP
$publicIp = aws ec2 describe-instances --instance-ids $instanceId --query 'Reservations[0].Instances[0].PublicIpAddress' --output text

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "EC2 Instance Ready!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "Instance ID: $instanceId" -ForegroundColor Cyan
Write-Host "Public IP: $publicIp" -ForegroundColor Cyan
Write-Host "SSH Command: ssh -i $KEY_NAME.pem ubuntu@$publicIp" -ForegroundColor Cyan
Write-Host ""

# Step 4: Wait for SSH to be available
Write-Host "Waiting for SSH to be available (this may take 2-3 minutes)..." -ForegroundColor Yellow
Start-Sleep -Seconds 60

# Step 5: Create deployment script for EC2
$deployScript = @"
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
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-`$(uname -s)-`$(uname -m)" -o /usr/local/bin/docker-compose
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
echo "✅ All prerequisites installed!"
echo ""
echo "Next steps:"
echo "1. Clone your repository"
echo "2. cd into the kayak directory"
echo "3. Run: docker-compose up -d"
echo "4. Load Kaggle data: cd backend && node scripts/import-kaggle-data.js"
echo ""
"@

$deployScript | Out-File -Encoding ascii -FilePath "deploy-ec2.sh"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Next Steps - Deploy to EC2" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Copy deployment script to EC2:" -ForegroundColor Yellow
Write-Host "   scp -i $KEY_NAME.pem deploy-ec2.sh ubuntu@${publicIp}:~/" -ForegroundColor White
Write-Host ""
Write-Host "2. SSH into EC2:" -ForegroundColor Yellow
Write-Host "   ssh -i $KEY_NAME.pem ubuntu@$publicIp" -ForegroundColor White
Write-Host ""
Write-Host "3. Run deployment script:" -ForegroundColor Yellow
Write-Host "   chmod +x deploy-ec2.sh && ./deploy-ec2.sh" -ForegroundColor White
Write-Host ""
Write-Host "4. Clone repository:" -ForegroundColor Yellow
Write-Host "   git clone <your-repo-url> kayak" -ForegroundColor White
Write-Host ""
Write-Host "5. Start services:" -ForegroundColor Yellow
Write-Host "   cd kayak && docker-compose up -d" -ForegroundColor White
Write-Host ""
Write-Host "6. Access your application:" -ForegroundColor Yellow
Write-Host "   Frontend: http://${publicIp}:3001" -ForegroundColor White
Write-Host "   Backend:  http://${publicIp}:5001" -ForegroundColor White
Write-Host ""

# Save connection details
$connectionInfo = @"
========================================
AWS EC2 Instance Details
========================================
Instance ID: $instanceId
Public IP: $publicIp
Region: $REGION
Instance Type: $INSTANCE_TYPE
Key Pair: $KEY_NAME.pem

SSH Command:
ssh -i $KEY_NAME.pem ubuntu@$publicIp

Service URLs:
Frontend:         http://${publicIp}:3001
Backend API:      http://${publicIp}:5001
Concierge Agent:  http://${publicIp}:8002
Deals Agent:      http://${publicIp}:8003

To stop instance:
aws ec2 stop-instances --instance-ids $instanceId

To start instance:
aws ec2 start-instances --instance-ids $instanceId

To terminate instance:
aws ec2 terminate-instances --instance-ids $instanceId
========================================
"@

$connectionInfo | Out-File -Encoding ascii -FilePath "ec2-connection-info.txt"

Write-Host "Connection details saved to: ec2-connection-info.txt" -ForegroundColor Green
Write-Host ""
Write-Host "Would you like me to automatically set up the instance? (Y/N)" -ForegroundColor Yellow
