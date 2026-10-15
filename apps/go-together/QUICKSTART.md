# 🚀 Quick Start Guide

## Get Up and Running in 5 Minutes!

### 1️⃣ Create Your Neon Database (2 minutes)

1. Visit https://console.neon.tech/
2. Click "Sign Up" (or "Log In" if you have an account)
3. Click "Create Project"
4. Name it "go-together" or anything you like
5. Click "Create Project"
6. **COPY the connection string** that appears (starts with `postgresql://`)

### 2️⃣ Set Up Your Environment (1 minute)

**On Mac/Linux:**
```bash
export NEON_DATABASE_URL="paste-your-connection-string-here"
```

**On Windows (CMD):**
```cmd
set NEON_DATABASE_URL=paste-your-connection-string-here
```

**On Windows (PowerShell):**
```powershell
$env:NEON_DATABASE_URL="paste-your-connection-string-here"
```

### 3️⃣ Install & Run (2 minutes)

```bash
# Install dependencies
pip install -r requirements.txt

# Run the app
python main.py
```

That's it! The app will:
- ✅ Connect to Neon
- ✅ Create all tables automatically
- ✅ Show the login screen

### 🎯 First Time User?

1. Click "Register"
2. Choose a role:
   - **HOST** - Create trip plans (requires unique Host ID like "TravelHost123")
   - **FRIEND** - Browse and respond to plans
3. Start planning!

### 🔑 Your Host ID

If you're registering as a HOST, choose a memorable Host ID like:
- `AdventureHost2024`
- `TravelBuddy123`
- `TripMaster456`

This ID will appear on all response cards so your friends know which HOST they're responding to!

### ⚡ Pro Tips

- The free Neon tier gives you 500 hours/month (plenty for personal use!)
- Your data is stored in the cloud - access from anywhere
- Add friends by their email addresses
- HOSTs can see all friend responses with their Host ID displayed

### ❓ Need Help?

Check the full README.md for:
- Detailed setup instructions
- Troubleshooting guide
- Complete feature list
- Database schema details

**Enjoy planning your trips! 🎉**
