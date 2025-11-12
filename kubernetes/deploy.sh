#!/bin/bash

# EpiCheck Kubernetes Deployment Script
# This script automates the deployment process

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="epicheck"
DOCKER_REGISTRY="${DOCKER_REGISTRY:-your-registry}"
IMAGE_TAG="${IMAGE_TAG:-latest}"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}EpiCheck Kubernetes Deployment Script${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}Error: kubectl is not installed${NC}"
    exit 1
fi

# Check if connected to cluster
if ! kubectl cluster-info &> /dev/null; then
    echo -e "${RED}Error: Not connected to a Kubernetes cluster${NC}"
    exit 1
fi

echo -e "${YELLOW}Current cluster:${NC}"
kubectl config current-context
echo ""

read -p "Do you want to proceed with deployment? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Deployment cancelled${NC}"
    exit 0
fi

# Check if secrets file exists
if [ ! -f "kubernetes/secrets.yaml" ]; then
    echo -e "${RED}Error: kubernetes/secrets.yaml not found${NC}"
    echo -e "${YELLOW}Please copy kubernetes/secrets.yaml.example and fill in your credentials${NC}"
    exit 1
fi

# Build and push images (optional)
read -p "Do you want to build and push Docker images? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${GREEN}Building and pushing Docker images...${NC}"
    
    # Build main app
    echo -e "${YELLOW}Building epicheck:${IMAGE_TAG}${NC}"
    docker build -t ${DOCKER_REGISTRY}/epicheck:${IMAGE_TAG} .
    docker push ${DOCKER_REGISTRY}/epicheck:${IMAGE_TAG}
    
    # Build proxy
    echo -e "${YELLOW}Building epicheck-proxy:${IMAGE_TAG}${NC}"
    docker build -t ${DOCKER_REGISTRY}/epicheck-proxy:${IMAGE_TAG} ./proxy-server
    docker push ${DOCKER_REGISTRY}/epicheck-proxy:${IMAGE_TAG}
    
    echo -e "${GREEN}Images built and pushed successfully${NC}"
fi

# Deploy to Kubernetes
echo ""
echo -e "${GREEN}Deploying to Kubernetes...${NC}"

# Create namespace
echo -e "${YELLOW}Creating namespace...${NC}"
kubectl apply -f kubernetes/namespace.yaml

# Create ConfigMap
echo -e "${YELLOW}Creating ConfigMap...${NC}"
kubectl apply -f kubernetes/configmap.yaml

# Create Secrets
echo -e "${YELLOW}Creating Secrets...${NC}"
kubectl apply -f kubernetes/secrets.yaml

# Deploy applications
echo -e "${YELLOW}Deploying applications...${NC}"
kubectl apply -f kubernetes/deployment.yaml

# Create services
echo -e "${YELLOW}Creating services...${NC}"
kubectl apply -f kubernetes/service.yaml

# Create ingress
echo -e "${YELLOW}Creating ingress...${NC}"
kubectl apply -f kubernetes/ingress.yaml

# Create HPA
echo -e "${YELLOW}Creating HPA...${NC}"
kubectl apply -f kubernetes/hpa.yaml

# Optional: Network Policy and PVC
read -p "Do you want to apply network policy and PVC? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    kubectl apply -f kubernetes/network-policy.yaml
    kubectl apply -f kubernetes/pvc.yaml
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment completed successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Show deployment status
echo -e "${YELLOW}Checking deployment status...${NC}"
kubectl get all -n ${NAMESPACE}

echo ""
echo -e "${GREEN}Useful commands:${NC}"
echo -e "  View pods:       ${YELLOW}kubectl get pods -n ${NAMESPACE}${NC}"
echo -e "  View services:   ${YELLOW}kubectl get svc -n ${NAMESPACE}${NC}"
echo -e "  View ingress:    ${YELLOW}kubectl get ingress -n ${NAMESPACE}${NC}"
echo -e "  View logs:       ${YELLOW}kubectl logs -f deployment/epicheck-app -n ${NAMESPACE}${NC}"
echo -e "  Port forward:    ${YELLOW}kubectl port-forward svc/epicheck-app 8080:80 -n ${NAMESPACE}${NC}"
echo ""
