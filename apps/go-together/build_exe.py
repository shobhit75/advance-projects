"""
PyInstaller Build Script for Go Together Desktop App
This creates a standalone executable that can be distributed to others
"""

import PyInstaller.__main__
import os
import sys

# Get the current directory
current_dir = os.path.dirname(os.path.abspath(__file__))

# Check if icon exists
icon_path = os.path.join(current_dir, 'app_icon.ico')
has_icon = os.path.exists(icon_path)

# Base PyInstaller arguments
args = [
    'main.py',                          # Main script
    '--name=GoTogetherApp',             # Name of the executable
    '--onefile',                        # Create a single executable file
    '--windowed',                       # No console window (GUI only)
]

# Add icon if it exists
if has_icon:
    args.append(f'--icon={icon_path}')
    print("✅ Using custom icon: app_icon.ico")
else:
    print("ℹ️  No custom icon found. Using default Python icon.")
    print("   To add a custom icon: save an .ico file as 'app_icon.ico'")

# Add data files
args.extend([
    f'--add-data={os.path.join(current_dir, "database")}{os.pathsep}database',
    f'--add-data={os.path.join(current_dir, "models")}{os.pathsep}models',
    f'--add-data={os.path.join(current_dir, "config.py")}{os.pathsep}.',
])

# Add .env if it exists
env_path = os.path.join(current_dir, '.env')
if os.path.exists(env_path):
    args.append(f'--add-data={env_path}{os.pathsep}.')
    print("✅ Including .env file in build")
else:
    print("⚠️  Warning: .env file not found!")
    print("   Users will need to provide their own .env file")

# Add hidden imports
args.extend([
    '--hidden-import=psycopg2',
    '--hidden-import=dotenv',
    '--hidden-import=tkinter',
    '--clean',                          # Clean cache before building
    '--noconfirm',                      # Replace output without asking
])

# Run PyInstaller
print("\n" + "=" * 60)
print("🔨 Building GoTogether Desktop App...")
print("=" * 60)
print()

PyInstaller.__main__.run(args)

print()
print("=" * 60)
print("✅ Build complete!")
print("=" * 60)
print("\n📦 Your executable is ready:")
print(f"   Location: {os.path.join(current_dir, 'dist', 'GoTogetherApp.exe')}")
print("\n📤 To distribute to others:")
print("   1. Copy 'dist/GoTogetherApp.exe'")
print("   2. Copy '.env' file (with your Neon connection string)")
print("   3. Put both in a folder and zip it")
print("   4. Share with friends!")
print("\n📖 Read DESKTOP_APP_GUIDE.md for complete instructions")
print("=" * 60)
