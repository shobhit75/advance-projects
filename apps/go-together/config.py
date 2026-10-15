# Database Configuration
# 
# OPTION 1: Set your Neon connection string directly here (Quick & Easy)
# OPTION 2: Use environment variable NEON_DATABASE_URL (More Secure)
# 
# Get your connection string from: https://console.neon.tech/
# Format: postgresql://username:password@host/database?sslmode=require

# OPTION 1: Direct configuration (uncomment and fill in your details)
NEON_DATABASE_URL = None  # Set to your connection string or keep as None to use environment variable

# Example (uncomment and replace with your actual values):
# NEON_DATABASE_URL = "postgresql://myuser:mypass123@ep-cool-morning-123456.us-east-2.aws.neon.tech/neondb?sslmode=require"

# OPTION 2: Environment variable (default)
# Set in your terminal:
#   Windows CMD: set NEON_DATABASE_URL=postgresql://...
#   Windows PowerShell: $env:NEON_DATABASE_URL="postgresql://..."
#   Mac/Linux: export NEON_DATABASE_URL="postgresql://..."
