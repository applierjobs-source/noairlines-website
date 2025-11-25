# Fix: "Unrecognized node type: n8n-nodes-puppeteer.puppeteer"

## Problem
n8n workflow fails with error: `"Unrecognized node type: n8n-nodes-puppeteer.puppeteer"`

This means the Puppeteer community node is not installed or not properly loaded in n8n.

## Solution 1: Reinstall Puppeteer Community Node

### Step 1: Access n8n Settings
1. Go to your n8n instance: `https://primary-production-8f74d.up.railway.app`
2. Log in with your basic auth credentials
3. Click **Settings** (gear icon in top right)
4. Click **Community Nodes** in the left sidebar

### Step 2: Remove and Reinstall
1. **Find** `n8n-nodes-puppeteer` in the list
2. **Click the trash/delete icon** to remove it
3. **Click "Install a community node"**
4. **Enter:** `n8n-nodes-puppeteer`
5. **Click "Install"**
6. **Wait for installation to complete**

### Step 3: Restart n8n Service
1. Go to Railway → Your n8n service ("Primary")
2. Click **"Deploy"** or **"Redeploy"** to restart the service
3. This ensures the new node is loaded

### Step 4: Verify Installation
1. Go back to n8n
2. Create a new workflow or edit existing one
3. Click **"+"** to add node
4. Search for **"Puppeteer"**
5. You should see **"Puppeteer"** in the results
6. If not, the installation failed - try Solution 2

---

## Solution 2: Use Code Node with Puppeteer (Alternative)

If the community node doesn't work, use the built-in **Code** node with Puppeteer installed in the container.

### Step 1: Install Puppeteer in n8n Container

Add to Railway n8n service variables:
```
N8N_CUSTOM_EXTENSIONS=/data/custom-extensions
```

Then create a custom Dockerfile or use Railway's build command to install Puppeteer.

**OR** use the Code node approach below (simpler).

### Step 2: Use Code Node Instead

1. **Remove all Puppeteer nodes** from your workflow
2. **Add a "Code" node** after the Set node
3. **Use this script:**

```javascript
const puppeteer = require('puppeteer');

// Get data from previous node
const firstName = $input.item.json.firstName;
const lastName = $input.item.json.lastName;
const email = $input.item.json.email;
const phone = $input.item.json.phone || '';

// Get credentials from environment
const tuvoliEmail = $env.TUVOLI_EMAIL;
const tuvoliPassword = $env.TUVOLI_PASSWORD;

if (!tuvoliEmail || !tuvoliPassword) {
  throw new Error('TUVOLI_EMAIL or TUVOLI_PASSWORD not set');
}

// Launch browser
const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});

const page = await browser.newPage();

try {
  // Navigate to login
  await page.goto('https://noairlines.tuvoli.com/login?returnURL=%2Fhome', {
    waitUntil: 'networkidle2',
    timeout: 30000
  });

  // Wait for login fields
  await page.waitForSelector('input[placeholder="Enter Username"]', { timeout: 10000 });

  // Login
  await page.type('input[placeholder="Enter Username"]', tuvoliEmail, { delay: 50 });
  await page.type('input[placeholder="Enter Password"]', tuvoliPassword, { delay: 50 });
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });

  // Navigate to contact management
  await page.goto('https://noairlines.tuvoli.com/contact-management', {
    waitUntil: 'networkidle2',
    timeout: 30000
  });

  // Click Add New Contact
  await page.waitForSelector('button', { timeout: 10000 });
  const addButton = await page.evaluateHandle(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.find(btn => btn.textContent.includes('Add New Contact'));
  });
  await addButton.click();

  // Wait for form
  await page.waitForSelector('input[id="first-name"]', { timeout: 10000 });

  // Fill form
  await page.type('input[id="first-name"]', firstName, { delay: 50 });
  await page.type('input[id="last-name"]', lastName, { delay: 50 });
  await page.type('input[id="account-email"]', email, { delay: 50 });
  
  if (phone) {
    await page.type('input[id="phone"]', phone, { delay: 50 });
  }

  // Fill account field
  const accountValue = `${firstName} ${lastName}`;
  await page.type('input[placeholder="Select an account…"]', accountValue, { delay: 50 });
  
  // Wait for typeahead and click add button
  await page.waitForSelector('ngb-typeahead-window', { timeout: 5000 });
  const addPlusButton = await page.evaluateHandle(() => {
    const windows = Array.from(document.querySelectorAll('ngb-typeahead-window'));
    if (windows.length > 0) {
      const buttons = Array.from(windows[0].querySelectorAll('button'));
      return buttons.find(btn => btn.classList.contains('active') || btn.textContent.includes('+'));
    }
    return null;
  });
  if (addPlusButton) {
    await addPlusButton.click();
  }

  // Click Create
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);

  await browser.close();

  return [{
    success: true,
    message: `Contact ${firstName} ${lastName} created successfully`,
    firstName,
    lastName,
    email
  }];
} catch (error) {
  await browser.close();
  throw error;
}
```

**Note:** This requires Puppeteer to be available in the n8n container. If it's not, you'll need to install it.

---

## Solution 3: Install Puppeteer in n8n Container (Recommended)

### Option A: Use n8n Docker Image with Puppeteer

1. **In Railway, change your n8n service source:**
   - Go to n8n service → Settings → Source
   - Instead of `n8nio/n8n:latest`, use a custom build

2. **Create a Dockerfile** (or use Railway's build settings):
   ```dockerfile
   FROM n8nio/n8n:latest
   
   USER root
   RUN apk add --no-cache \
       chromium \
       nss \
       freetype \
       harfbuzz \
       ca-certificates \
       ttf-freefont
   
   ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
   ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
   
   RUN npm install -g puppeteer-core
   
   USER node
   ```

3. **Or add to Railway build command:**
   - Settings → Build → Build Command:
   ```bash
   apk add --no-cache chromium nss freetype harfbuzz ca-certificates ttf-freefont && npm install -g puppeteer-core
   ```

### Option B: Use Railway's Environment Variables

Add to n8n service variables:
```
N8N_DOCKER_IMAGE=n8nio/n8n:latest
```

Then install Puppeteer via community node (Solution 1).

---

## Quick Fix: Check n8n Logs

1. Go to Railway → n8n service → Logs
2. Look for errors about Puppeteer node loading
3. Check if there are any installation errors

---

## Recommended Approach

**Try in this order:**
1. **Solution 1** (Reinstall community node) - Easiest
2. If that fails, **Solution 3** (Install Puppeteer in container)
3. If still failing, **Solution 2** (Code node) as last resort

The community node approach (Solution 1) is usually the simplest and most reliable.

