# Railway n8n Setup with Dockerfile

## Step 1: Update Railway n8n Service to Use Dockerfile

1. **Go to Railway → Your "Primary" service (n8n)**
2. **Click "Settings" tab**
3. **Scroll to "Source" section**
4. **You have two options:**

### Option A: If n8n is connected to GitHub

1. **Make sure your repo is connected** (it should be since we just pushed `Dockerfile.n8n`)
2. **In Source settings, set:**
   - **Dockerfile Path:** `Dockerfile.n8n`
   - **Root Directory:** `/` (or leave default)
3. **Save**

### Option B: If n8n is using Docker Image

1. **Change source type** from "Docker Image" to "GitHub Repo"
2. **Connect your GitHub repository**
3. **Set Dockerfile Path:** `Dockerfile.n8n`
4. **Save**

## Step 2: Verify Environment Variables

Make sure these are set in Railway n8n service → Variables:

```
TUVOLI_EMAIL=your_email@example.com
TUVOLI_PASSWORD=your_password
N8N_BLOCK_ENV_ACCESS_IN_NODE=false
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

## Step 3: Redeploy

1. **Railway will automatically detect the Dockerfile change**
2. **Or manually trigger:** Click "Deploy" or "Redeploy"
3. **Wait for deployment to complete** (will take a few minutes as it installs Chromium)

## Step 4: Update Your Code Node Script

In your n8n workflow Code node, make sure it uses `puppeteer-core` and the executable path:

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

## Step 5: Test

1. **After deployment completes, test your workflow**
2. **Execute manually in n8n with test data**
3. **Check execution logs** - should no longer see "Could not find Chrome" error

---

## Troubleshooting

### If Railway doesn't detect the Dockerfile

1. **Check the file is in the repo root** (not in a subdirectory)
2. **Verify the filename is exactly:** `Dockerfile.n8n`
3. **Try renaming to just `Dockerfile`** if Railway requires that

### If build fails

1. **Check Railway build logs**
2. **Look for errors installing Chromium or puppeteer-core**
3. **Make sure the base image is correct:** `n8nio/n8n:latest`

### If Puppeteer still can't find Chrome

1. **Verify environment variables are set** (especially `PUPPETEER_EXECUTABLE_PATH`)
2. **Check the executable path** - try `/usr/bin/chromium` instead of `/usr/bin/chromium-browser`
3. **In Code node, add debug logging:**
   ```javascript
   console.log('PUPPETEER_EXECUTABLE_PATH:', process.env.PUPPETEER_EXECUTABLE_PATH);
   ```

