# 🔵 VS Code Setup Guide - Go Together App

## For Visual Studio Code Users

This guide is specifically for setting up the Go Together app in VS Code.

---

## Quick Setup (3 Easy Steps)

### Step 1: Get Your Neon Connection String

1. Go to **https://console.neon.tech/**
2. Sign up or log in
3. Click **"Create Project"**
4. Name it "go-together" and click **"Create Project"**
5. **Copy the connection string** (it looks like):
   ```
   postgresql://username:password@ep-xxx-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

### Step 2: Configure the App (Choose ONE Method)

#### **Method A: Using .env File (RECOMMENDED FOR VS CODE)** ⭐

1. Open the `.env` file in VS Code (it's in the project root)
2. Replace the example with your actual connection string:
   ```env
   NEON_DATABASE_URL=postgresql://your-actual-connection-string-here
   ```
3. Save the file (Ctrl+S)

**Example:**
```env
NEON_DATABASE_URL=postgresql://myuser:abc123@ep-cool-morning-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
```

#### **Method B: Using config.py (Alternative)**

1. Open `config.py` in VS Code
2. Find the line: `NEON_DATABASE_URL = None`
3. Change it to:
   ```python
   NEON_DATABASE_URL = "postgresql://your-actual-connection-string-here"
   ```
4. Save the file

### Step 3: Install Dependencies and Run

Open the **Terminal** in VS Code (View → Terminal or Ctrl+`):

```bash
# Install dependencies
pip install -r requirements.txt

# Run the app
python main.py
```

---

## 🎯 VS Code Settings Explained

The project includes a `.vscode/settings.json` file that:
- ✅ Enables `.env` file loading (`python.terminal.useEnvFile": true`)
- ✅ Hides Python cache files for cleaner workspace
- ✅ Sets Python as the default interpreter

**You don't need to configure anything!** These settings are already included.

---

## 🔔 About That Warning Message

You might see:
```
An environment file is configured but terminal environment injection is disabled. 
Enable "python.terminal.useEnvFile" to use environment variables from .env files in terminals.
```

**This is already fixed!** The `.vscode/settings.json` file enables this setting. If you still see the warning:

1. **Reload VS Code**: Press `Ctrl+Shift+P` → Type "Reload Window" → Enter
2. **Or** manually check: File → Preferences → Settings → Search "useEnvFile" → Make sure it's checked

---

## 🐍 Python Virtual Environment (Optional but Recommended)

For a cleaner setup, use a virtual environment:

### Create Virtual Environment:

**In VS Code Terminal:**

```bash
# Create virtual environment
python -m venv venv

# Activate it
# On Windows:
venv\Scripts\activate

# On Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the app
python main.py
```

### VS Code Will Auto-Detect It!

VS Code will show a popup asking to select the virtual environment. Click **"Yes"**.

Or manually: Press `Ctrl+Shift+P` → Type "Python: Select Interpreter" → Choose the one in `venv` folder

---

## 📂 Project Structure in VS Code

Your workspace should look like:

```
go-together-python-neon/
├── .env                    ← Edit this with your connection string!
├── .env.example           ← Template (don't edit)
├── .gitignore             ← Protects .env from git
├── .vscode/
│   └── settings.json      ← VS Code configuration
├── config.py              ← Alternative to .env
├── main.py                ← Run this file
├── requirements.txt       ← Dependencies
├── database/
│   └── db.py
├── models/
│   ├── user.py
│   ├── plan.py
│   ├── response.py
│   └── friend.py
└── README.md
```

---

## 🚀 Running the App in VS Code

### Option 1: Using Terminal

1. Open Terminal: `Ctrl+` `
2. Run: `python main.py`

### Option 2: Using Run Button

1. Open `main.py`
2. Click the **▶ Run** button in the top-right
3. Or press `F5`

### Option 3: Using Debug Mode

1. Press `F5` or click Run → Start Debugging
2. Choose "Python File"
3. Great for finding errors!

---

## 🔧 Troubleshooting in VS Code

### "No module named 'psycopg2'"

**Solution:**
```bash
pip install -r requirements.txt
```

If still issues:
```bash
pip install psycopg2-binary python-dotenv
```

### "Python not found"

**Solution:**
1. Install Python from https://www.python.org/
2. In VS Code: Press `Ctrl+Shift+P`
3. Type "Python: Select Interpreter"
4. Choose the Python version you installed

### ".env file not loading"

**Solution:**
1. Make sure the file is named exactly `.env` (not `env.txt` or `.env.txt`)
2. Reload VS Code window: `Ctrl+Shift+P` → "Reload Window"
3. Check that `python-dotenv` is installed: `pip install python-dotenv`

### "ValueError: NO DATABASE CONNECTION STRING"

**Solution:**
1. Verify `.env` file has your actual connection string (no quotes needed in .env)
2. Make sure you saved the file
3. Try restarting VS Code
4. Alternatively, use `config.py` method instead

### IntelliSense not working

**Solution:**
1. Press `Ctrl+Shift+P`
2. Type "Python: Select Interpreter"
3. Choose your Python installation
4. If using venv, choose the one in your `venv` folder

---

## 💡 Pro Tips for VS Code

### 1. Format Python Code Automatically
- Install extension: "Python" (by Microsoft)
- Press `Shift+Alt+F` to format

### 2. See .env File (if hidden)
- If .env is hidden in Explorer
- View → Show Hidden Files
- Or edit `.vscode/settings.json` to show dotfiles

### 3. Database Connection Status
When you run the app, you should see:
```
✓ Successfully connected to Neon PostgreSQL database
✓ Database tables created/verified successfully
```

### 4. Quick Terminal Toggle
- `Ctrl+` ` (backtick) to show/hide terminal

### 5. Multiple Terminals
- Click the `+` in terminal panel
- Useful for running multiple instances or testing

---

## 📋 Checklist Before Running

- [ ] Created Neon project and copied connection string
- [ ] Edited `.env` file with actual connection string
- [ ] Saved `.env` file
- [ ] Ran `pip install -r requirements.txt`
- [ ] Reloaded VS Code window (if needed)
- [ ] Ready to run `python main.py`!

---

## 🎨 Recommended VS Code Extensions

While not required, these make development easier:

1. **Python** (Microsoft) - Essential
2. **Pylance** (Microsoft) - Better IntelliSense
3. **Python Indent** - Auto-indentation
4. **Better Comments** - Colorful comments
5. **GitLens** (optional) - If using git

---

## 🎯 Next Steps After Setup

1. Run `python main.py`
2. Click "Register" 
3. Choose HOST or FRIEND role
4. Start using the app!

For HOST users:
- You'll need to create a unique Host ID (like "TravelHost2024")
- This ID will show on all your response cards

For FRIEND users:
- Add HOST friends by email
- Browse and respond to their plans
- See their Host ID on all plans

---

## 🆘 Still Having Issues?

1. Check `WINDOWS_SETUP.md` for Windows-specific help
2. Check `README.md` for general documentation
3. Make sure Python 3.7+ is installed: `python --version`
4. Verify internet connection (needed for Neon)
5. Check Neon project is active at https://console.neon.tech/

**Happy coding in VS Code! 💙**
