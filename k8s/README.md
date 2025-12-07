# Kubernetes Deployment Guide

## Overview
This directory contains Kubernetes manifests for deploying the Kayak Travel Platform on a K8s cluster (local or AWS EKS).

## Files

- `namespace-config.yaml` - Namespace, ConfigMap, and Secrets
- `mysql.yaml` - MySQL StatefulSet and Service
- `mongodb.yaml` - MongoDB StatefulSet and Service
- `redis.yaml` - Redis Deployment and Service
- `kafka.yaml` - Zookeeper and Kafka Deployments
- `backend.yaml` - Backend API and HPA
- `frontend.yaml` - Frontend Deployment
- `agents.yaml` - Concierge and Deals Agent Deployments
- `ingress.yaml` - Ingress routing (requires NGINX Ingress Controller)

## Prerequisites

### Local Testing (Docker Desktop or Minikube)
```bash
# Enable K8s in Docker Desktop
# Or install minikube: https://minikube.sigs.k8s.io/docs/start/

# Start minikube
minikube start --memory=8000 --cpus=4

# Verify cluster
kubectl cluster-info
kubectl get nodes
```

### AWS EKS
```bash
# Install AWS CLI and eksctl
# Configure AWS credentials
aws configure

# Create cluster
eksctl create cluster --name kayak-prod --region us-east-1 --nodegroup-name standard-workers --node-type t3.medium --nodes 3
```

## Deployment Steps

### 1. Build Docker Images

```bash
# From root directory
cd backend && docker build -t kayak-backend:latest .
cd ../traveler-frontend && docker build -t kayak-frontend:latest .
cd ../services/concierge_agent && docker build -t kayak-concierge-agent:latest .
cd ../deals_agent && docker build -t kayak-deals-agent:latest .
```

### 2. Load Images to Local K8s (for local testing)

```bash
# For Minikube
minikube image load kayak-backend:latest
minikube image load kayak-frontend:latest
minikube image load kayak-concierge-agent:latest
minikube image load kayak-deals-agent:latest

# For Docker Desktop: Images are automatically available
```

### 3. Apply Manifests in Order

```bash
# Create namespace and config
kubectl apply -f namespace-config.yaml

# Deploy infrastructure services
kubectl apply -f mysql.yaml
kubectl apply -f mongodb.yaml
kubectl apply -f redis.yaml
kubectl apply -f kafka.yaml

# Wait for infrastructure to be ready
kubectl wait --for=condition=ready pod -l app=kafka -n kayak-travel --timeout=300s

# Deploy services
kubectl apply -f backend.yaml
kubectl apply -f frontend.yaml
kubectl apply -f agents.yaml

# Deploy ingress (requires NGINX Ingress Controller)
# kubectl apply -f ingress.yaml
```

### 4. Verify Deployment

```bash
# Check namespaces
kubectl get namespaces

# Check all resources
kubectl get all -n kayak-travel

# Check pod status
kubectl get pods -n kayak-travel
kubectl describe pod <pod-name> -n kayak-travel

# View logs
kubectl logs -f deployment/backend -n kayak-travel
kubectl logs -f deployment/concierge-agent -n kayak-travel

# Port forward to test
kubectl port-forward svc/backend-service 5001:5001 -n kayak-travel
kubectl port-forward svc/frontend-service 3001:3001 -n kayak-travel
```

## AWS EKS Deployment

### 1. Push Images to ECR

```bash
# Create ECR repository
aws ecr create-repository --repository-name kayak-backend --region us-east-1
aws ecr create-repository --repository-name kayak-frontend --region us-east-1
aws ecr create-repository --repository-name kayak-concierge-agent --region us-east-1
aws ecr create-repository --repository-name kayak-deals-agent --region us-east-1

# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com

# Tag and push images
docker tag kayak-backend:latest <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/kayak-backend:latest
docker push <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/kayak-backend:latest

# Repeat for other images...
```

### 2. Update Image References

Edit the YAML files to use ECR URLs instead of local images:
```yaml
image: <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/kayak-backend:latest
imagePullPolicy: Always
```

### 3. Deploy to EKS

```bash
# Configure kubectl for EKS
aws eks update-kubeconfig --name kayak-prod --region us-east-1

# Apply manifests
kubectl apply -f namespace-config.yaml
kubectl apply -f mysql.yaml
kubectl apply -f mongodb.yaml
kubectl apply -f redis.yaml
kubectl apply -f kafka.yaml
kubectl apply -f backend.yaml
kubectl apply -f frontend.yaml
kubectl apply -f agents.yaml
```

## Scaling

### Manual Scaling
```bash
kubectl scale deployment backend --replicas=5 -n kayak-travel
kubectl scale deployment frontend --replicas=3 -n kayak-travel
```

### Horizontal Pod Autoscaler (HPA)
The backend service includes HPA configuration. Monitor with:
```bash
kubectl get hpa -n kayak-travel
kubectl describe hpa backend-hpa -n kayak-travel
```

## Monitoring

### Metrics Server (required for HPA)
```bash
kubectl apply -https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

### Prometheus + Grafana
Recommended for production monitoring.

## Cleanup

### Local
```bash
# Delete resources
kubectl delete namespace kayak-travel

# Stop Minikube
minikube stop
minikube delete
```

### AWS EKS
```bash
# Delete cluster
eksctl delete cluster --name kayak-prod --region us-east-1
```

## Troubleshooting

### Pods not starting
```bash
kubectl describe pod <pod-name> -n kayak-travel
kubectl logs <pod-name> -n kayak-travel
```

### CrashLoopBackOff
Check logs and environment variables are correctly set.

### Services not connecting
Verify ConfigMap and Secrets are created and DNS resolution works.

### Images not found
Ensure images are built and loaded for local K8s, or pushed to ECR for cloud deployments.
