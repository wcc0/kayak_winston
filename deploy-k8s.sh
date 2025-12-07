#!/bin/bash

# Kayak K8s Deployment Script
# Usage: ./deploy-k8s.sh [local|aws]

set -e

DEPLOYMENT_TYPE=${1:-local}
NAMESPACE="kayak-travel"

echo "🚀 Deploying Kayak Travel Platform to K8s (${DEPLOYMENT_TYPE})"

if [ "$DEPLOYMENT_TYPE" = "local" ]; then
    echo "📦 Building Docker images..."
    docker build -t kayak-backend:latest ./backend
    docker build -t kayak-frontend:latest ./traveler-frontend
    docker build -t kayak-concierge-agent:latest ./services/concierge_agent
    docker build -t kayak-deals-agent:latest ./services/deals_agent
    
    echo "🔄 Loading images to Minikube..."
    minikube image load kayak-backend:latest
    minikube image load kayak-frontend:latest
    minikube image load kayak-concierge-agent:latest
    minikube image load kayak-deals-agent:latest

elif [ "$DEPLOYMENT_TYPE" = "aws" ]; then
    echo "🔐 Pushing images to ECR..."
    AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    AWS_REGION="us-east-1"
    ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
    
    # Login to ECR
    aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REGISTRY
    
    # Tag and push images
    for image in backend frontend concierge-agent deals-agent; do
        docker tag kayak-$image:latest $ECR_REGISTRY/kayak-$image:latest
        docker push $ECR_REGISTRY/kayak-$image:latest
    done
fi

echo "📋 Applying K8s manifests..."
kubectl apply -f k8s/namespace-config.yaml
sleep 5

kubectl apply -f k8s/mysql.yaml
kubectl apply -f k8s/mongodb.yaml
kubectl apply -f k8s/redis.yaml
kubectl apply -f k8s/kafka.yaml

echo "⏳ Waiting for infrastructure to be ready..."
kubectl wait --for=condition=ready pod -l app=kafka -n $NAMESPACE --timeout=300s 2>/dev/null || echo "⚠️ Kafka startup timeout"

kubectl apply -f k8s/backend.yaml
kubectl apply -f k8s/frontend.yaml
kubectl apply -f k8s/agents.yaml

echo "✅ Deployment complete!"
echo ""
echo "📊 Monitoring deployment:"
echo "   kubectl get pods -n $NAMESPACE"
echo "   kubectl get svc -n $NAMESPACE"
echo ""
echo "🔗 Port forwarding (local only):"
echo "   kubectl port-forward svc/backend-service 5001:5001 -n $NAMESPACE"
echo "   kubectl port-forward svc/frontend-service 3001:3001 -n $NAMESPACE"
