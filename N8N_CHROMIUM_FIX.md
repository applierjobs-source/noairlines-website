# Fix: Puppeteer "Could not find Chrome" Error in n8n

## Problem
Puppeteer can't find Chrome/Chromium in the n8n container. This happens because the n8n Docker image doesn't include Chromium by default.

## Solution: Install Chromium in n8n Container

### Option 1: Use Railway Build Command (Easiest)

1. **Go to Railway → Your n8n service ("Primary")**
2. **Click "Settings" tab**
3. **Scroll to "Build" section**
4. **Add Build Command:**
   ```bash
   apk add --no-cache chromium nss freetype harfbuzz ca-certificates ttf-freefont && npm install -g puppeteer-core
   ```
5. **Add Environment Variable:**
   ```
   PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
   PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
   ```
6. **Save and redeploy**

### Option 2: Use Custom Dockerfile (More Reliable)

1. **Create a file** `Dockerfile.n8n` in your project root:

```dockerfile
FROM n8nio/n8n:latest

USER root

# Install Chromium and dependencies
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    ttf-opensans \
    ttf-dejavu \
    ttf-liberation

# Install puppeteer-core (lighter, uses system Chromium)
RUN npm install -g puppeteer-core

# Set Puppeteer to use system Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

USER node
```

2. **In Railway n8n service:**
   - Go to **Settings** → **Source**
   - Change from "Docker Image" to "Dockerfile"
   - Point to `Dockerfile.n8n`
   - **Save and redeploy**

### Option 3: Update Code Node Script to Use System Chromium

If you can't modify the Dockerfile, update your Code node script:

```javascript
const puppeteer = require('puppeteer-core');

// ... rest of your code ...

// Launch browser with explicit executable path
const browser = await puppeteer.launch({
  executablePath: '/usr/bin/chromium-browser', // or '/usr/bin/chromium'
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--no-first-run',
    '--no-zygote',
    '--disable-gpu'
  ]
});
```

But you still need Chromium installed in the container (Option 1 or 2).

---

## Recommended: Option 2 (Custom Dockerfile)

This is the most reliable approach. Here's the complete setup:

### Step 1: Create Dockerfile.n8n

```dockerfile
FROM n8nio/n8n:latest

USER root

# Install Chromium and all required dependencies
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    ttf-opensans \
    ttf-dejavu \
    ttf-liberation \
    udev \
    ttf-opensans

# Install puppeteer-core (uses system Chromium, lighter than full puppeteer)
RUN npm install -g puppeteer-core

# Configure Puppeteer to use system Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

USER node
```

### Step 2: Update Railway Configuration

1. **Go to Railway → n8n service → Settings → Source**
2. **Change from "Docker Image" to "Dockerfile"**
3. **Set Dockerfile path:** `Dockerfile.n8n`
4. **Save**

### Step 3: Update Code Node Script

Make sure your Code node uses `puppeteer-core` and the executable path:

```javascript
const puppeteer = require('puppeteer-core');

// ... get data from previous node ...

const browser = await puppeteer.launch({
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser',
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--no-first-run',
    '--no-zygote',
    '--disable-gpu'
  ]
});

// ... rest of your script ...
```

### Step 4: Redeploy

1. **Redeploy the n8n service** in Railway
2. **Wait for deployment to complete**
3. **Test the workflow again**

---

## Alternative: Let Puppeteer Download Chrome

If you can't install Chromium system-wide, you can let Puppeteer download it:

### Update Code Node Script:

```javascript
const puppeteer = require('puppeteer'); // Use full puppeteer, not puppeteer-core

// ... rest of your code ...

const browser = await puppeteer.launch({
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage'
  ]
});
```

**Note:** This will download Chrome on first run (adds ~170MB), but it's simpler if you can't modify the Dockerfile.

---

## Quick Fix Checklist

- [ ] Chromium installed in container (via Dockerfile or build command)
- [ ] `PUPPETEER_EXECUTABLE_PATH` environment variable set
- [ ] Code node uses `puppeteer-core` (if using system Chromium) or `puppeteer` (if downloading)
- [ ] Browser launch args include `--no-sandbox` and `--disable-setuid-sandbox`
- [ ] n8n service redeployed after changes

---

## Verify Installation

After redeploying, test in n8n:

1. **Execute workflow manually**
2. **Check Code node execution logs**
3. **Should see:** "Starting Tuvoli contact creation..." without Chrome errors

If you still get Chrome errors, check:
- Railway logs for installation errors
- n8n execution logs for the exact error
- Verify Chromium path: `/usr/bin/chromium-browser` or `/usr/bin/chromium`

