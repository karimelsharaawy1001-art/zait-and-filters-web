#!/bin/bash

# Configuration
ENV_FILE=".env"

# Check if .env file exists
if [ ! -f "$ENV_FILE" ]; then
    echo "Error: $ENV_FILE not found!"
    exit 1
fi

echo "Setting up environment variables on Vercel..."

# Read .env file line by line
while IFS='=' read -r key value || [ -n "$key" ]; do
    # Skip comments and empty lines
    if [[ $key =~ ^#.* ]] || [ -z "$key" ]; then
        continue
    fi

    # Only process VITE_APPWRITE variables
    if [[ $key == VITE_APPWRITE_* ]]; then
        # Remove any quotes from value
        value=$(echo "$value" | tr -d '"' | tr -d "'")
        
        echo "Setting $key..."
        
        # Add for Production
        printf "%s" "$value" | vercel env add "$key" production
        
        # Add for Preview
        printf "%s" "$value" | vercel env add "$key" preview
        
        # Add for Development
        printf "%s" "$value" | vercel env add "$key" development
        
        echo "✅ $key set (or updated)"
        
        sleep 1
    fi
done < "$ENV_FILE"

echo "🎉 All Appwrite environment variables have been pushed to Vercel!"
