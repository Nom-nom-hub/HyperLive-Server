# 📸 Screenshot Guide - Advanced Live Server

Create professional screenshots for your documentation, presentations, and bug reports with the Advanced Live Server extension!

## 🚀 Quick Start

1. **Start the server** - Use `Ctrl+Shift+P` → "Advanced Live Server: Start Server"
2. **Open your page** - Navigate to the page you want to capture
3. **Take a screenshot** - Use one of the screenshot commands below

## 📋 Available Commands

### Basic Screenshots
- **📸 Capture Screenshot** - Capture the current viewport
- **📄 Capture Full Page Screenshot** - Capture the entire page (including content below the fold)
- **🎯 Capture Element Screenshot** - Capture a specific element using CSS selectors

### Management
- **📸 Screenshot Manager** - Open the screenshots folder to view and manage your captures

## 🎯 How to Use

### 1. Viewport Screenshot
```bash
# Command Palette: Advanced Live Server: Capture Screenshot
# Captures what's currently visible in the browser window
```

### 2. Full Page Screenshot
```bash
# Command Palette: Advanced Live Server: Capture Full Page Screenshot
# Captures the entire page, including content below the fold
```

### 3. Element Screenshot
```bash
# Command Palette: Advanced Live Server: Capture Element Screenshot
# Then enter a CSS selector like:
.header          # Capture the header
.feature-card    # Capture a specific card
#main-content    # Capture the main content area
.btn-primary     # Capture a button
```

### 4. Screenshot Manager
```bash
# Command Palette: Advanced Live Server: Screenshot Manager
# Opens the screenshots folder in VSCode
```

## 🔧 Advanced Options

The screenshot service supports various options for customization:

### Basic Options
- **Width/Height** - Set custom viewport dimensions
- **Device Scale Factor** - Control pixel density
- **Quality** - Adjust image quality (1-100)
- **Format** - Choose PNG, JPEG, or WebP

### Advanced Options
- **Wait for Selector** - Wait for specific elements to load
- **Hide Elements** - Hide unwanted elements before capture
- **Custom CSS** - Inject custom styles for the screenshot
- **Full Page** - Capture entire page vs viewport only

## 📁 File Organization

Screenshots are automatically saved to:
```
your-project/
├── screenshots/
│   ├── screenshot-2024-01-15T10-30-45-123Z.png
│   ├── fullpage-2024-01-15T10-31-12-456Z.png
│   └── element-2024-01-15T10-32-00-789Z.png
```

## 🎨 Use Cases

### 1. Documentation
- Capture UI components for style guides
- Document responsive breakpoints
- Show before/after comparisons

### 2. Bug Reports
- Capture error states
- Document visual issues
- Show reproduction steps

### 3. Presentations
- Create demo screenshots
- Capture key features
- Build slide decks

### 4. Social Media
- Create promotional images
- Share feature highlights
- Build marketing materials

## 🛠️ Technical Details

### Supported Formats
- **PNG** - Lossless, good for UI elements
- **JPEG** - Compressed, good for photos
- **WebP** - Modern format, smaller file sizes

### Default Settings
```javascript
{
  width: 1920,
  height: 1080,
  deviceScaleFactor: 1,
  fullPage: false,
  quality: 90,
  format: 'png',
  waitForTimeout: 2000
}
```

### CSS Selectors for Common Elements
```css
/* Headers */
.header, .navbar, .nav, .top-bar

/* Content areas */
.main, .content, .container, .wrapper

/* Cards and components */
.card, .feature-card, .product-card, .widget

/* Forms */
.form, .login-form, .contact-form

/* Buttons */
.btn, .button, .cta, .action-button

/* Footers */
.footer, .bottom-bar, .site-footer
```

## 🎯 Pro Tips

### 1. Element Selection
- Use specific selectors for precise captures
- Test selectors in browser dev tools first
- Use classes over IDs when possible

### 2. Timing
- Wait for animations to complete
- Ensure all content is loaded
- Consider using `waitForSelector` for dynamic content

### 3. Quality vs Size
- Use PNG for UI elements (lossless)
- Use JPEG for photos (smaller files)
- Use WebP for web optimization

### 4. Organization
- Use descriptive filenames
- Organize by feature or component
- Keep a consistent naming convention

## 🔍 Troubleshooting

### Common Issues

**Screenshot fails to capture**
- Ensure the server is running
- Check that the page is fully loaded
- Verify the URL is accessible

**Element not found**
- Check the CSS selector syntax
- Ensure the element exists on the page
- Try a more specific selector

**Poor quality images**
- Increase the device scale factor
- Use PNG format for better quality
- Check the quality setting

**Large file sizes**
- Use JPEG format for photos
- Reduce quality setting
- Use WebP for web optimization

## 📚 Examples

### Basic Screenshot
```bash
# 1. Start server
# 2. Open page in browser
# 3. Run: Advanced Live Server: Capture Screenshot
# Result: screenshot-2024-01-15T10-30-45-123Z.png
```

### Element Screenshot
```bash
# 1. Start server
# 2. Open page in browser
# 3. Run: Advanced Live Server: Capture Element Screenshot
# 4. Enter selector: .feature-card
# Result: element-2024-01-15T10-32-00-789Z.png
```

### Full Page Screenshot
```bash
# 1. Start server
# 2. Open page in browser
# 3. Run: Advanced Live Server: Capture Full Page Screenshot
# Result: fullpage-2024-01-15T10-31-12-456Z.png
```

## 🎉 Ready to Start?

1. **Install the extension** (if not already installed)
2. **Start your server** with `Ctrl+Shift+P` → "Advanced Live Server: Start Server"
3. **Open your page** in the browser
4. **Take your first screenshot** with `Ctrl+Shift+P` → "Advanced Live Server: Capture Screenshot"

Happy screenshotting! 📸✨ 