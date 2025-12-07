# AWS EKS Deployment Automation Script
# Deploys Kayak Platform to AWS EKS

param(
    [Parameter(Mandatory=$false)]
    [string]$ClusterName = "kayak-prod",
    
    [Parameter(Mandatory=$false)]
    [string]$Region = "us-east-1",
    
    [Parameter(Mandatory=$false)]
    [string]$NodeType = "t3.medium",
    
    [Parameter(Mandatory=$false)]
    [int]$Nodes = 3,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipClusterCreation = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipECRCreation = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipImageBuild = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipDeploy = $false
)

$ErrorActionPreference = "Stop"

function Write-Header {
    param([string]$Text)
    Write-Host "`n╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║ $Text" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Text)
    Write-Host "✅ $Text" -ForegroundColor Green
}

function Write-Error {
    param([string]$Text)
    Write-Host "❌ $Text" -ForegroundColor Red
}

function Write-Info {
    param([string]$Text)
    Write-Host "ℹ️  $Text" -ForegroundColor Yellow
}

# Get AWS Account ID
Write-Header "AWS ACCOUNT INFORMATION"
try {
    $AWS_ACCOUNT_ID = aws sts get-caller-identity --query Account --output text
    $AWS_IDENTITY = aws sts get-caller-identity --output json | ConvertFrom-Json
    Write-Success "AWS Account ID: $AWS_ACCOUNT_ID"
    Write-Info "Identity: $($AWS_IDENTITY.Arn)"
} catch {
    Write-Error "Failed to get AWS credentials. Please run: aws configure"
    exit 1
}

$ECR_REGISTRY = "$AWS_ACCOUNT_ID.dkr.ecr.$Region.amazonaws.com"
Write-Info "ECR Registry: $ECR_REGISTRY"

# Step 1: Create EKS Cluster
if (-not $SkipClusterCreation) {
    Write-Header "CREATING EKS CLUSTER"
    Write-Info "This will take 10-15 minutes..."
    
    try {
        $clusterExists = eksctl get cluster --name $ClusterName --region $Region 2>$null
        if ($clusterExists) {
            Write-Success "Cluster already exists"
        } else {
            Write-Info "Creating EKS cluster..."
            eksctl create cluster `
                --name $ClusterName `
                --region $Region `
                --nodegroup-name standard-workers `
                --node-type $NodeType `
                --nodes $Nodes `
                --nodes-min 2 `
                --nodes-max 10 `
                --managed `
                --with-oidc
            Write-Success "EKS cluster created"
        }
    } catch {
        Write-Error "Failed to create EKS cluster: $_"
        exit 1
    }
    
    # Update kubeconfig
    Write-Info "Updating kubeconfig..."
    aws eks update-kubeconfig --name $ClusterName --region $Region
    Write-Success "Kubeconfig updated"
}

# Step 2: Create ECR Repositories
if (-not $SkipECRCreation) {
    Write-Header "CREATING ECR REPOSITORIES"
    
    $services = @("backend", "frontend", "concierge-agent", "deals-agent")
    
    foreach ($service in $services) {
        try {
            $repoName = "kayak-$service"
            $repoExists = aws ecr describe-repositories --repository-names $repoName --region $Region 2>$null
            
            if ($repoExists) {
                Write-Success "Repository kayak-$service already exists"
            } else {
                Write-Info "Creating repository $repoName..."
                aws ecr create-repository --repository-name $repoName --region $Region
                Write-Success "Repository $repoName created"
            }
        } catch {
            Write-Error "Failed to create repository kayak-$service: $_"
        }
    }
}

# Step 3: Build and Push Docker Images
if (-not $SkipImageBuild) {
    Write-Header "BUILDING AND PUSHING DOCKER IMAGES"
    
    # Login to ECR
    Write-Info "Logging in to ECR..."
    $loginCmd = aws ecr get-login-password --region $Region | docker login --username AWS --password-stdin $ECR_REGISTRY
    Write-Success "ECR login successful"
    
    # Service paths
    $services = @{
        "backend" = "./backend"
        "frontend" = "./traveler-frontend"
        "concierge-agent" = "./services/concierge_agent"
        "deals-agent" = "./services/deals_agent"
    }
    
    foreach ($service in $services.Keys) {
        $dockerfilePath = $services[$service]
        $localTag = "kayak-$service`:latest"
        $remoteTag = "$ECR_REGISTRY/kayak-$service`:latest"
        
        Write-Info "Building $service..."
        
        try {
            if (-not (Test-Path $dockerfilePath)) {
                Write-Error "Dockerfile not found at $dockerfilePath"
                continue
            }
            
            docker build -t $localTag $dockerfilePath
            Write-Success "$service built locally"
            
            Write-Info "Tagging for ECR..."
            docker tag $localTag $remoteTag
            
            Write-Info "Pushing to ECR..."
            docker push $remoteTag
            Write-Success "$service pushed to $remoteTag"
        } catch {
            Write-Error "Failed to build/push $service`: $_"
        }
    }
}

# Step 4: Update K8s Manifests for AWS
Write-Header "UPDATING K8S MANIFESTS FOR AWS"

try {
    $k8sFiles = Get-ChildItem "k8s/*.yaml" -ErrorAction SilentlyContinue
    
    if ($k8sFiles) {
        foreach ($file in $k8sFiles) {
            Write-Info "Updating $($file.Name)..."
            $content = Get-Content $file.FullName -Raw
            
            # Replace image tags
            $content = $content -replace "kayak-backend:latest", "$ECR_REGISTRY/kayak-backend:latest"
            $content = $content -replace "kayak-frontend:latest", "$ECR_REGISTRY/kayak-frontend:latest"
            $content = $content -replace "kayak-concierge-agent:latest", "$ECR_REGISTRY/kayak-concierge-agent:latest"
            $content = $content -replace "kayak-deals-agent:latest", "$ECR_REGISTRY/kayak-deals-agent:latest"
            
            # Replace imagePullPolicy
            $content = $content -replace "imagePullPolicy: Never", "imagePullPolicy: Always"
            
            Set-Content $file.FullName $content
        }
        Write-Success "K8s manifests updated"
    } else {
        Write-Error "No K8s manifests found in k8s/ directory"
    }
} catch {
    Write-Error "Failed to update K8s manifests: $_"
}

# Step 5: Deploy to EKS
if (-not $SkipDeploy) {
    Write-Header "DEPLOYING TO EKS"
    
    try {
        Write-Info "Verifying cluster connection..."
        kubectl cluster-info
        Write-Success "Connected to EKS cluster"
        
        Write-Info "Applying Kubernetes manifests..."
        $manifestFiles = @(
            "k8s/namespace-config.yaml",
            "k8s/mysql.yaml",
            "k8s/mongodb.yaml",
            "k8s/redis.yaml",
            "k8s/kafka.yaml",
            "k8s/backend.yaml",
            "k8s/frontend.yaml",
            "k8s/agents.yaml"
        )
        
        foreach ($manifest in $manifestFiles) {
            if (Test-Path $manifest) {
                Write-Info "Applying $manifest..."
                kubectl apply -f $manifest
            } else {
                Write-Error "Manifest not found: $manifest"
            }
        }
        
        Write-Success "All manifests applied"
        
        Write-Info "Waiting for pods to be ready (this may take 5-10 minutes)..."
        kubectl wait --for=condition=ready pod -l app in (backend,frontend,concierge-agent,deals-agent) `
            -n kayak-travel --timeout=600s
        
        Write-Success "All pods are ready!"
        
    } catch {
        Write-Error "Failed to deploy to EKS: $_"
        exit 1
    }
}

# Summary
Write-Header "DEPLOYMENT SUMMARY"
Write-Success "EKS Cluster: $ClusterName"
Write-Success "Region: $Region"
Write-Success "ECR Registry: $ECR_REGISTRY"

Write-Info "Next steps:"
Write-Info "1. Verify pods are running: kubectl get pods -n kayak-travel"
Write-Info "2. Check services: kubectl get svc -n kayak-travel"
Write-Info "3. View logs: kubectl logs deployment/backend -n kayak-travel -f"
Write-Info "4. Create load balancer for external access"
Write-Info "5. Configure DNS records"

Write-Header "DEPLOYMENT COMPLETE"
