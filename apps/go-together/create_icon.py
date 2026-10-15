# Creating a Simple App Icon
# This script shows you how to add a custom icon to your app

"""
To add a custom icon to your desktop app:

1. Create or download an .ico file (Windows icon format)
   - Recommended size: 256x256 pixels
   - Free icon sources:
     * https://www.flaticon.com/
     * https://icons8.com/
     * https://www.iconfinder.com/

2. Save it as 'app_icon.ico' in this folder

3. The build_exe.py script will automatically use it!

4. If you don't have an icon:
   - The app will use Python's default icon
   - App still works perfectly fine
   
5. To convert image to .ico:
   - Use online converter: https://convertio.co/png-ico/
   - Or use GIMP (free software)
   - Or use Photoshop
"""

# Optional: Create a simple colored square icon using PIL
try:
    from PIL import Image, ImageDraw, ImageFont
    
    def create_simple_icon():
        """Create a simple colored icon with text"""
        # Create 256x256 image
        img = Image.new('RGB', (256, 256), color='#4A90E2')
        draw = ImageDraw.Draw(img)
        
        # Draw a circle
        draw.ellipse([40, 40, 216, 216], fill='#2ECC71', outline='white', width=8)
        
        # Add text "GT" for Go Together
        try:
            # Try to use a nice font
            font = ImageFont.truetype("arial.ttf", 80)
        except:
            # Use default font if arial not found
            font = ImageFont.load_default()
        
        # Draw text
        text = "GT"
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        position = ((256 - text_width) // 2, (256 - text_height) // 2 - 10)
        draw.text(position, text, fill='white', font=font)
        
        # Save as ICO
        img.save('app_icon.ico', format='ICO')
        print("✅ Icon created: app_icon.ico")
        print("   Now you can build your app with: python build_exe.py")
        
    if __name__ == "__main__":
        create_simple_icon()
        
except ImportError:
    print("PIL/Pillow not installed.")
    print("To create an icon automatically:")
    print("  pip install Pillow")
    print("  python create_icon.py")
    print("\nOr just download an .ico file and save as 'app_icon.ico'")
