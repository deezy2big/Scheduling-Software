#!/bin/bash

# Deploy to Google Cloud Run
# Make sure you have gcloud CLI installed and configured

# Configuration
PROJECT_ID="your-project-id"  # Change this to your GCP project ID
SERVICE_NAME="scheduling-software"
REGION="us-central1"  # Change to your preferred region

echo "========================================="
echo "Deploying Scheduling Software to Cloud Run"
echo "========================================="
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "ERROR: gcloud CLI is not installed"
    echo "Install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Build and deploy
echo "Building and deploying..."
gcloud run deploy $SERVICE_NAME \
  --source . \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --timeout 300 \
  --memory 512Mi \
  --cpu 1 \
  --port 8080 \
  --set-env-vars "NODE_ENV=production" \
  --project $PROJECT_ID

echo ""
echo "========================================="
echo "Deployment complete!"
echo "========================================="
echo ""
echo "IMPORTANT: You need to configure these environment variables in Cloud Run:"
echo "1. DATABASE_URL - Your Cloud SQL connection string"
echo "2. JWT_SECRET - A secure random string"
echo "3. DB_USER, DB_HOST, DB_NAME, DB_PASSWORD - Database credentials"
echo ""
echo "To set environment variables:"
echo "gcloud run services update $SERVICE_NAME \\"
echo "  --set-env-vars DATABASE_URL=postgresql://user:pass@host:5432/dbname \\"
echo "  --set-env-vars JWT_SECRET=your-secret-key \\"
echo "  --region $REGION"
echo ""
