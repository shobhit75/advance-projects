# 🪟 Windows Setup Guide - Go Together App

## Quick Setup for Windows Users

### Step 1: Create Your Neon Database (2 minutes)

1. Open your web browser and go to: **https://console.neon.tech/**
2. Click **"Sign Up"** (or "Log In" if you have an account)
3. Click **"Create Project"**
4. Give it a name like "go-together"
5. Click **"Create Project"**
6. You'll see a connection string that looks like:
   ```
   postgresql://username:password@ep-something-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
7. **COPY THIS ENTIRE STRING** (click the copy button or select all and Ctrl+C)

### Step 2: Configure the App (EASIEST METHOD)

**Method A: Using config.py (RECOMMENDED FOR WINDOWS)**

1. Open the folder where you extracted the app
2. Find and open `config.py` in Notepad or any text editor
3. Find this line:
   ```python
   NEON_DATABASE_URL = None
   ```
4. Change it to (paste your connection string):
   ```python
   NEON_DATABASE_URL = "postgresql://your-actual-connection-string-here"
   ```
5. Save the file (Ctrl+S)
6. Close the text editor

**Example:**
```python
NEON_DATABASE_URL = "postgresql://myuser:abc123@ep-cool-morning-123456.us-east-2.aws.neon.tech/neondb?sslmode=require"
```

**Method B: Using Environment Variable (Alternative)**

**If using Command Prompt (CMD):**
1. Open Command Prompt
2. Navigate to your app folder:
   ```cmd
   cd "C:\New folder (4)\go-together-python-neon\go-together-python-neon"
   ```
3. Set the environment variable (paste your connection string):
   ```cmd
   set NEON_DATABASE_URL=postgresql://your-connection-string-here
   ```
4. Keep this Command Prompt window open!

**If using PowerShell:**
1. Open PowerShell
2. Navigate to your app folder:
   ```powershell
   cd "C:\New folder (4)\go-together-python-neon\go-together-python-neon"
   ```
3. Set the environment variable:
   ```powershell
   $env:NEON_DATABASE_URL="postgresql://your-connection-string-here"
   ```
4. Keep this PowerShell window open!

### Step 3: Install Dependencies

In the same Command Prompt or PowerShell window:

```cmd
pip install -r requirements.txt
```

If that doesn't work, try:
```cmd
python -m pip install -r requirements.txt
```

### Step 4: Run the App

```cmd
python main.py
```

If you see errors about Python not found, try:
```cmd
py main.py
```
or
```cmd
python3 main.py
```

### Step 5: Success! 🎉

You should see:
```
✓ Successfully connected to Neon PostgreSQL database
✓ Database tables created/verified successfully
```

Then the app window will open!

## 🔧 Troubleshooting

### "Python is not recognized"
- Install Python from https://www.python.org/downloads/
- During installation, CHECK the box "Add Python to PATH"

### "pip is not recognized"
Try:
```cmd
python -m pip install -r requirements.txt
```

### "No database connection string provided"
- Make sure you edited `config.py` correctly
- The connection string should be in quotes
- Don't add extra spaces or line breaks

### "Error connecting to database"
- Check your internet connection
- Verify you copied the ENTIRE connection string from Neon
- Make sure the connection string is on ONE line in config.py
- Verify your Neon project is active at https://console.neon.tech/

### "ModuleNotFoundError: No module named 'psycopg2'"
- Run the install command again:
  ```cmd
  pip install psycopg2-binary
  ```

## 📝 Making Environment Variable Permanent (Optional)

If you want to set the environment variable permanently instead of using config.py:

1. Press `Windows + R`
2. Type `sysdm.cpl` and press Enter
3. Click "Advanced" tab
4. Click "Environment Variables"
5. Under "User variables", click "New"
6. Variable name: `NEON_DATABASE_URL`
7. Variable value: paste your connection string
8. Click OK on all windows
9. Close and reopen Command Prompt/PowerShell

## 🎯 What to Do After Setup

1. **Register as HOST:**
   - Click "Register"
   - Choose role: HOST
   - Create a unique Host ID (like "TravelHost2024")
   
2. **Or Register as FRIEND:**
   - Click "Register"  
   - Choose role: FRIEND
   - No Host ID needed

3. **Add Friends:**
   - Use the "Friends" button
   - Add friends by their email addresses

4. **Start Planning:**
   - HOSTs: Create trip plans
   - FRIENDs: Browse and respond to plans

## 🆘 Still Having Issues?

Common fixes:
- ✅ Restart Command Prompt/PowerShell after editing config.py
- ✅ Make sure you're in the correct folder when running commands
- ✅ Check that config.py was saved after editing
- ✅ Verify your internet connection is working
- ✅ Make sure your Neon project isn't paused (visit console.neon.tech)

## 📁 Where Are Your Files?

Your current location:
```
C:\New folder (4)\go-together-python-neon\go-together-python-neon\
```

This folder should contain:
- ✅ main.py
- ✅ config.py (← This is the file to edit!)
- ✅ requirements.txt
- ✅ database/ folder
- ✅ models/ folder
- ✅ README.md

**Happy trip planning! 🚀**
