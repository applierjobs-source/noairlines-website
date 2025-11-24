# Tuvoli Integration via Browser Automation (No API Access Needed)

## Overview

When a new submission is received on noairlines.com, the system automatically creates a new contact in your Tuvoli account using browser automation (Puppeteer). This approach **doesn't require paid API access** - it automates the Tuvoli website directly, just like a human would.

## How It Works

1. **User submits quote request** on noairlines.com
2. **System launches a browser** (headless Chrome via Puppeteer)
3. **Logs into Tuvoli** using your credentials
4. **Navigates to contact creation form**
5. **Fills in contact details** (name, email, phone, notes)
6. **Submits the form** to create the contact
7. **Closes the browser**

## Required Environment Variables

Add these to your Railway environment variables:

```
TUVOLI_ENABLED=true
TUVOLI_EMAIL=your_tuvoli_email@example.com
TUVOLI_PASSWORD=your_tuvoli_password
TUVOLI_URL=https://noairlines.tuvoli.com
```

## Installation

### Step 1: Install Puppeteer

Puppeteer needs to be installed in your project. Add it to `package.json`:

```bash
npm install puppeteer
```

Or add it manually to `package.json`:

```json
{
  "dependencies": {
    "puppeteer": "^21.0.0"
  }
}
```

### Step 2: Set Environment Variables in Railway

1. Go to your Railway project
2. Click on your service
3. Go to **Variables** tab
4. Add the 4 variables listed above

### Step 3: Deploy

Railway will automatically install Puppeteer when you deploy.

## How Browser Automation Works

The system uses Puppeteer to:
- Open a headless Chrome browser
- Navigate to Tuvoli login page
- Enter your credentials
- Navigate to the contact creation form
- Fill in all contact fields
- Submit the form

**Note:** The browser automation tries multiple CSS selectors to find form fields, so it should work even if Tuvoli updates their interface slightly.

## Security

- **Credentials are stored securely** in Railway environment variables (encrypted)
- **Never commit credentials** to git
- **Browser runs in headless mode** (no visible window)
- **Automatically closes** after creating contact

## Testing

1. Submit a test quote on noairlines.com
2. Check Railway logs for:
   - "Launching browser to create Tuvoli contact..."
   - "Logged into Tuvoli successfully"
   - "Contact created successfully in Tuvoli"
3. Check your Tuvoli account to verify the contact was created

## Troubleshooting

### Contact Not Created?

1. **Check Railway Logs**
   - Look for error messages
   - Check if Puppeteer is installed
   - Verify login was successful

2. **Verify Credentials**
   - Ensure TUVOLI_EMAIL is correct
   - Ensure TUVOLI_PASSWORD is correct
   - Test logging into Tuvoli manually with these credentials

3. **Check Tuvoli URL**
   - Ensure TUVOLI_URL is correct (should be `https://noairlines.tuvoli.com`)
   - Verify the URL is accessible

4. **Form Field Issues**
   - If Tuvoli changes their form structure, we may need to update the selectors
   - Check logs for "Filling contact form..." to see which step failed

### Common Errors

**"Puppeteer not installed"**
- Solution: Add `puppeteer` to package.json dependencies and redeploy

**"Navigation timeout"**
- Solution: Tuvoli might be slow to load. We can increase timeout values.

**"Element not found"**
- Solution: Tuvoli's form structure might have changed. We can update the selectors.

**"Login failed"**
- Solution: Check your credentials are correct

## Benefits of This Approach

✅ **No API costs** - Uses browser automation instead  
✅ **Works with any website** - Doesn't require API access  
✅ **Automatic** - Runs in background, no manual work  
✅ **Reliable** - Tries multiple selectors to find form fields  
✅ **Secure** - Credentials stored in environment variables

## Limitations

- **Slightly slower** than API (takes a few seconds to open browser and fill form)
- **May break** if Tuvoli significantly changes their interface
- **Requires Puppeteer** (adds ~200MB to deployment size)

## Alternative: Manual Setup

If browser automation doesn't work, you can:
1. Use the webhook to send contact data to Zapier
2. Manually create contacts in Tuvoli (data is logged in Railway)
3. Export/import CSV files periodically

## Next Steps

1. Install Puppeteer: `npm install puppeteer`
2. Add environment variables to Railway
3. Test with a sample submission
4. Monitor logs to ensure it's working
