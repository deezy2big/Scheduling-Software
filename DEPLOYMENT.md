# Cloud Run Deployment Guide

## Prerequisites

1. **Google Cloud Project** with billing enabled
2. **gcloud CLI** installed and configured
3. **Cloud SQL PostgreSQL instance** set up

## Quick Deploy

1. **Edit deploy.sh** and set your project ID:
   ```bash
   PROJECT_ID="your-actual-project-id"
   ```

2. **Run the deployment script**:
   ```bash
   ./deploy.sh
   ```

## Manual Deployment Steps

### 1. Create Cloud SQL Database

```bash
# Create PostgreSQL instance
gcloud sql instances create scheduling-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1

# Create database
gcloud sql databases create rms_pro --instance=scheduling-db

# Set password for default user
gcloud sql users set-password postgres \
  --instance=scheduling-db \
  --password=YOUR_SECURE_PASSWORD
```

### 2. Deploy to Cloud Run

```bash
gcloud run deploy scheduling-software \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --timeout 300 \
  --memory 512Mi \
  --cpu 1 \
  --port 8080 \
  --project YOUR_PROJECT_ID
```

### 3. Configure Environment Variables

Get your Cloud SQL connection string:
```bash
gcloud sql instances describe scheduling-db --format='value(connectionName)'
```

Set environment variables in Cloud Run:
```bash
gcloud run services update scheduling-software \
  --set-env-vars "DATABASE_URL=postgresql://postgres:PASSWORD@/rms_pro?host=/cloudsql/CONNECTION_NAME" \
  --set-env-vars "JWT_SECRET=$(openssl rand -base64 32)" \
  --set-env-vars "NODE_ENV=production" \
  --add-cloudsql-instances CONNECTION_NAME \
  --region us-central1
```

### 4. Run Database Migrations

Connect to Cloud SQL and run migrations:
```bash
gcloud sql connect scheduling-db --user=postgres

# Then in psql:
\c rms_pro
# Run your schema.sql file contents
```

## Troubleshooting

### Container timeout error
- **Increase timeout**: Add `--timeout 300` to deployment command
- **Check logs**: View logs in Google Cloud Console
- **Verify database**: Ensure Cloud SQL is accessible

### Database connection issues
- Verify Cloud SQL connection name is correct
- Check that Cloud SQL instance is running
- Ensure Cloud Run service has Cloud SQL connection configured
- Verify database credentials

### Health check failing
- Check that server is listening on 0.0.0.0:8080
- Verify /health endpoint is accessible
- Check logs for startup errors

## View Logs

```bash
gcloud run services logs read scheduling-software --region us-central1 --limit 50
```

## Update Deployment

After making code changes, just run:
```bash
./deploy.sh
```

Or manually:
```bash
gcloud run deploy scheduling-software --source . --region us-central1
```
