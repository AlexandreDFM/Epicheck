#!/bin/bash

# GitHub Secrets Setup Helper
# This script helps you set up GitHub secrets for the CI/CD pipeline

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}GitHub Secrets Setup Helper${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}Error: GitHub CLI (gh) is not installed${NC}"
    echo -e "${YELLOW}Install it from: https://cli.github.com/${NC}"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo -e "${YELLOW}Not authenticated with GitHub CLI${NC}"
    echo -e "${BLUE}Running: gh auth login${NC}"
    gh auth login
fi

echo -e "${GREEN}Authenticated with GitHub CLI${NC}"
echo ""

# Get repository
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
echo -e "${BLUE}Repository: ${REPO}${NC}"
echo ""

read -p "Is this the correct repository? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Aborted${NC}"
    exit 0
fi

echo ""
echo -e "${YELLOW}=== Step 1: Kubernetes Configuration ===${NC}"
echo ""

# KUBE_CONFIG
if [ -f "$HOME/.kube/config" ]; then
    echo -e "${GREEN}Found kubeconfig at $HOME/.kube/config${NC}"
    read -p "Use this kubeconfig? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        KUBE_CONFIG=$(cat $HOME/.kube/config | base64 | tr -d '\n')
        echo -e "${BLUE}Setting KUBE_CONFIG secret...${NC}"
        echo "$KUBE_CONFIG" | gh secret set KUBE_CONFIG
        echo -e "${GREEN}✓ KUBE_CONFIG set${NC}"
    fi
else
    echo -e "${YELLOW}Kubeconfig not found at default location${NC}"
    read -p "Enter path to your kubeconfig file: " KUBE_PATH
    if [ -f "$KUBE_PATH" ]; then
        KUBE_CONFIG=$(cat "$KUBE_PATH" | base64 | tr -d '\n')
        echo -e "${BLUE}Setting KUBE_CONFIG secret...${NC}"
        echo "$KUBE_CONFIG" | gh secret set KUBE_CONFIG
        echo -e "${GREEN}✓ KUBE_CONFIG set${NC}"
    else
        echo -e "${RED}File not found: $KUBE_PATH${NC}"
    fi
fi

echo ""
echo -e "${YELLOW}=== Step 2: Epitech Credentials ===${NC}"
echo ""

read -p "Enter Epitech username: " EPITECH_USERNAME
echo "$EPITECH_USERNAME" | gh secret set EPITECH_USERNAME
echo -e "${GREEN}✓ EPITECH_USERNAME set${NC}"

read -sp "Enter Epitech password: " EPITECH_PASSWORD
echo
echo "$EPITECH_PASSWORD" | gh secret set EPITECH_PASSWORD
echo -e "${GREEN}✓ EPITECH_PASSWORD set${NC}"

echo ""
echo -e "${YELLOW}=== Step 3: Office 365 OAuth Credentials ===${NC}"
echo ""

read -p "Enter Office 365 Client ID: " OFFICE365_CLIENT_ID
echo "$OFFICE365_CLIENT_ID" | gh secret set OFFICE365_CLIENT_ID
echo -e "${GREEN}✓ OFFICE365_CLIENT_ID set${NC}"

read -sp "Enter Office 365 Client Secret: " OFFICE365_CLIENT_SECRET
echo
echo "$OFFICE365_CLIENT_SECRET" | gh secret set OFFICE365_CLIENT_SECRET
echo -e "${GREEN}✓ OFFICE365_CLIENT_SECRET set${NC}"

read -p "Enter Office 365 Tenant ID: " OFFICE365_TENANT_ID
echo "$OFFICE365_TENANT_ID" | gh secret set OFFICE365_TENANT_ID
echo -e "${GREEN}✓ OFFICE365_TENANT_ID set${NC}"

echo ""
echo -e "${YELLOW}=== Step 4: Azure AD Credentials ===${NC}"
echo ""

read -p "Use same as Office 365? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "$OFFICE365_CLIENT_ID" | gh secret set AZURE_AD_CLIENT_ID
    echo "$OFFICE365_CLIENT_SECRET" | gh secret set AZURE_AD_CLIENT_SECRET
    echo "$OFFICE365_TENANT_ID" | gh secret set AZURE_AD_TENANT_ID
    echo -e "${GREEN}✓ Azure AD credentials set (same as Office 365)${NC}"
else
    read -p "Enter Azure AD Client ID: " AZURE_AD_CLIENT_ID
    echo "$AZURE_AD_CLIENT_ID" | gh secret set AZURE_AD_CLIENT_ID
    echo -e "${GREEN}✓ AZURE_AD_CLIENT_ID set${NC}"

    read -sp "Enter Azure AD Client Secret: " AZURE_AD_CLIENT_SECRET
    echo
    echo "$AZURE_AD_CLIENT_SECRET" | gh secret set AZURE_AD_CLIENT_SECRET
    echo -e "${GREEN}✓ AZURE_AD_CLIENT_SECRET set${NC}"

    read -p "Enter Azure AD Tenant ID: " AZURE_AD_TENANT_ID
    echo "$AZURE_AD_TENANT_ID" | gh secret set AZURE_AD_TENANT_ID
    echo -e "${GREEN}✓ AZURE_AD_TENANT_ID set${NC}"
fi

echo ""
echo -e "${YELLOW}=== Step 5: API Keys and Secrets ===${NC}"
echo ""

read -p "Enter API Key (or press Enter to generate): " API_KEY
if [ -z "$API_KEY" ]; then
    API_KEY=$(openssl rand -hex 32)
    echo -e "${BLUE}Generated API Key: ${API_KEY}${NC}"
fi
echo "$API_KEY" | gh secret set API_KEY
echo -e "${GREEN}✓ API_KEY set${NC}"

read -p "Enter Session Secret (or press Enter to generate): " SESSION_SECRET
if [ -z "$SESSION_SECRET" ]; then
    SESSION_SECRET=$(openssl rand -hex 64)
    echo -e "${BLUE}Generated Session Secret${NC}"
fi
echo "$SESSION_SECRET" | gh secret set SESSION_SECRET
echo -e "${GREEN}✓ SESSION_SECRET set${NC}"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}All secrets configured successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

echo -e "${BLUE}Verifying secrets...${NC}"
gh secret list

echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. Review and update ${BLUE}kubernetes/ingress.yaml${NC} with your domain"
echo -e "2. Commit and push your code to trigger the pipeline"
echo -e "3. Monitor the deployment in the Actions tab"
echo ""
echo -e "${GREEN}Done! Your CI/CD pipeline is ready to use.${NC}"
