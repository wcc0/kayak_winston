# Kayak K8s Deployment Script for Windows
# Usage: .\deploy-k8s.ps1 -DeploymentType local|aws

param(
    [string]$DeploymentType = "local"
)

$NAMESPACE = "kayak-travel"

Write-Host "🚀 Deploying Kayak Travel Platform to K8s ($DeploymentType)" -ForegroundColor Cyan

if ($DeploymentType -eq "local") {
    Write-Host "📦 Building Docker images..." -ForegroundColor Yellow
    
    Set-Location backend
    docker build -t kayak-backend:latest .
    Set-Location ..
    
    Set-Location traveler-frontend
    docker build -t kayak-frontend:latest .
    Set-Location ..
    
    Set-Location services/concierge_agent
    docker build -t kayak-concierge-agent:latest .
    Set-Location ../..
    
    Set-Location services/deals_agent
    docker build -t kayak-deals-agent:latest .
    Set-Location ../..
    
    Write-Host "🔄 Loading images to Docker Desktop K8s..." -ForegroundColor Yellow
    Write-Host "Images loaded and ready for K8s" -ForegroundColor Green
    
} elseif ($DeploymentType -eq "aws") {
    Write-Host "🔐 Pushing images to ECR..." -ForegroundColor Yellow
    
    $AWS_ACCOUNT_ID = aws sts get-caller-identity --query Account --output text
    $AWS_REGION = "us-east-1"
    $ECR_REGISTRY = "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"
    
    # Login to ECR
    aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REGISTRY
    
    # Tag and push images
    foreach ($image in @("backend", "frontend", "concierge-agent", "deals-agent")) {
        docker tag kayak-$image`:latest $ECR_REGISTRY/kayak-$image`:latest
        docker push $ECR_REGISTRY/kayak-$image`:latest
    }
    Write-Host "✅ Images pushed to ECR" -ForegroundColor Green
}

Write-Host "📋 Applying K8s manifests..." -ForegroundColor Yellow
kubectl apply -f k8s/namespace-config.yaml
Start-Sleep -Seconds 5

kubectl apply -f k8s/mysql.yaml
kubectl apply -f k8s/mongodb.yaml
kubectl apply -f k8s/redis.yaml
kubectl apply -f k8s/kafka.yaml

Write-Host "⏳ Waiting for infrastructure to be ready..." -ForegroundColor Yellow
kubectl apply -f k8s/backend.yaml
kubectl apply -f k8s/frontend.yaml
kubectl apply -f k8s/agents.yaml

Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Monitoring deployment:" -ForegroundColor Cyan
Write-Host "   kubectl get pods -n $NAMESPACE" -ForegroundColor Gray
Write-Host "   kubectl get svc -n $NAMESPACE" -ForegroundColor Gray
Write-Host ""
Write-Host "🔗 Port forwarding (local only):" -ForegroundColor Cyan
Write-Host "   kubectl port-forward svc/backend-service 5001:5001 -n $NAMESPACE" -ForegroundColor Gray
Write-Host "   kubectl port-forward svc/frontend-service 3001:3001 -n $NAMESPACE" -ForegroundColor Gray
