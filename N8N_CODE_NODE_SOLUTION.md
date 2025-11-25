# n8n Code Node Solution (No Puppeteer Community Node Needed)

Since the Puppeteer community node isn't working, use the built-in **Code** node instead. This doesn't require installing any community nodes.

## Step 1: Update Your Workflow

1. **Open your n8n workflow**
2. **Delete all Puppeteer nodes** (or keep them disabled for now)
3. **Add a Code node** after your Set node

## Step 2: Configure the Code Node

1. **Click on the Code node**
2. **Set Mode:** "Run Once for All Items"
3. **Paste this script:**

```javascript
// Note: This requires Puppeteer to be available in the n8n container
// If it's not, you'll need to install it first (see Step 3)

const puppeteer = require('puppeteer');

// Get data from previous node
const items = $input.all();
const item = items[0].json;

const firstName = item.firstName;
const lastName = item.lastName;
const email = item.email;
const phone = item.phone || '';

// Get credentials from environment
const tuvoliEmail = process.env.TUVOLI_EMAIL;
const tuvoliPassword = process.env.TUVOLI_PASSWORD;

if (!tuvoliEmail || !tuvoliPassword) {
  throw new Error('TUVOLI_EMAIL or TUVOLI_PASSWORD not set in environment variables');
}

console.log('Starting Tuvoli contact creation...');
console.log('Contact:', firstName, lastName, email);

// Launch browser
const browser = await puppeteer.launch({
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

const page = await browser.newPage();

try {
  // Set a realistic viewport
  await page.setViewport({ width: 1920, height: 1080 });
  
  // Set user agent to avoid bot detection
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  // Navigate to login
  console.log('Navigating to login page...');
  await page.goto('https://noairlines.tuvoli.com/login?returnURL=%2Fhome', {
    waitUntil: 'networkidle2',
    timeout: 30000
  });

  // Wait for login fields (Tuvoli takes ~6 seconds to load)
  console.log('Waiting for login fields...');
  await page.waitForSelector('input[placeholder="Enter Username"]', { timeout: 15000 });

  // Login
  console.log('Logging in...');
  await page.type('input[placeholder="Enter Username"]', tuvoliEmail, { delay: 50 });
  await page.type('input[placeholder="Enter Password"]', tuvoliPassword, { delay: 50 });
  await page.click('button[type="submit"]');
  
  // Wait for navigation after login
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
  console.log('Logged in successfully');

  // Navigate to contact management
  console.log('Navigating to contact management...');
  await page.goto('https://noairlines.tuvoli.com/contact-management', {
    waitUntil: 'networkidle2',
    timeout: 30000
  });

  // Click Add New Contact button
  console.log('Looking for Add New Contact button...');
  await page.waitForSelector('button', { timeout: 10000 });
  
  const addButton = await page.evaluateHandle(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.find(btn => 
      btn.textContent && btn.textContent.trim().includes('Add New Contact')
    );
  });
  
  if (!addButton || !addButton.asElement()) {
    throw new Error('Add New Contact button not found');
  }
  
  await addButton.asElement().click();
  console.log('Clicked Add New Contact');

  // Wait for form
  console.log('Waiting for form...');
  await page.waitForSelector('input[id="first-name"]', { timeout: 10000 });

  // Fill form
  console.log('Filling form...');
  await page.type('input[id="first-name"]', firstName, { delay: 50 });
  await page.type('input[id="last-name"]', lastName, { delay: 50 });
  await page.type('input[id="account-email"]', email, { delay: 50 });
  
  if (phone) {
    await page.type('input[id="phone"]', phone, { delay: 50 });
  }

  // Fill account field
  const accountValue = `${firstName} ${lastName}`;
  console.log('Filling account field:', accountValue);
  await page.type('input[placeholder="Select an account…"]', accountValue, { delay: 50 });
  
  // Wait for typeahead dropdown
  console.log('Waiting for typeahead dropdown...');
  await page.waitForSelector('ngb-typeahead-window', { timeout: 5000 }).catch(() => {
    console.log('Typeahead dropdown not found, continuing...');
  });
  
  // Click add (+) button in typeahead
  const addPlusButton = await page.evaluateHandle(() => {
    const windows = Array.from(document.querySelectorAll('ngb-typeahead-window'));
    if (windows.length > 0) {
      const buttons = Array.from(windows[0].querySelectorAll('button'));
      return buttons.find(btn => 
        btn.classList.contains('active') || 
        btn.textContent.includes('+') ||
        btn.getAttribute('aria-label')?.includes('add')
      );
    }
    return null;
  });
  
  if (addPlusButton && addPlusButton.asElement()) {
    await addPlusButton.asElement().click();
    console.log('Clicked add (+) button');
    await page.waitForTimeout(1000);
  } else {
    console.log('Add (+) button not found, continuing...');
  }

  // Click Create button
  console.log('Clicking Create button...');
  await page.click('button[type="submit"]');
  
  // Wait for form submission
  await page.waitForTimeout(3000);
  console.log('Contact creation completed');

  await browser.close();

  return [{
    json: {
      success: true,
      message: `Contact ${firstName} ${lastName} created successfully`,
      firstName,
      lastName,
      email
    }
  }];
} catch (error) {
  console.error('Error during contact creation:', error);
  await browser.close();
  throw error;
}
```

## Step 3: Install Puppeteer in n8n Container

The Code node approach requires Puppeteer to be available. Since you're using Railway, you have two options:

### Option A: Use Railway Build Command (Easiest)

1. **Go to Railway → Your n8n service ("Primary")**
2. **Click "Settings" tab**
3. **Scroll to "Build" section**
4. **Add Build Command:**
   ```bash
   npm install -g puppeteer
   ```
5. **Save and redeploy**

### Option B: Use Custom Dockerfile

1. **Create a file** `Dockerfile.n8n` in your project root:
   ```dockerfile
   FROM n8nio/n8n:latest
   
   USER root
   RUN npm install -g puppeteer
   USER node
   ```

2. **In Railway n8n service:**
   - Settings → Source → Use Dockerfile
   - Point to `Dockerfile.n8n`

### Option C: Install via n8n Settings (If Available)

1. **In n8n, go to Settings**
2. **Check if there's a way to install npm packages**
3. **If not, use Option A or B**

## Step 4: Set Environment Variables

Make sure these are set in Railway n8n service variables:
```
TUVOLI_EMAIL=your_email@example.com
TUVOLI_PASSWORD=your_password
N8N_BLOCK_ENV_ACCESS_IN_NODE=false
```

## Step 5: Test the Workflow

1. **Click "Execute Workflow"** in n8n
2. **Manually input test data:**
   ```json
   {
     "firstName": "Test",
     "lastName": "User",
     "email": "test@example.com",
     "phone": "5125551234"
   }
   ```
3. **Watch the Code node execute**
4. **Check for errors in the execution logs**

## Troubleshooting

### Error: "Cannot find module 'puppeteer'"

**Fix:** Puppeteer is not installed. Use Option A, B, or C above to install it.

### Error: "Browser executable not found"

**Fix:** You need Chromium. Add to Railway build command:
```bash
apk add --no-cache chromium && npm install -g puppeteer
```

Or use `puppeteer-core` and set executable path:
```javascript
const browser = await puppeteer.launch({
  executablePath: '/usr/bin/chromium-browser',
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});
```

### Error: Timeout waiting for element

**Fix:** Increase timeout values or add more explicit waits.

---

## Alternative: Use HTTP Request Node (Simplest, No Puppeteer)

If Puppeteer continues to cause issues, you could use Tuvoli's API if available, or use a different automation service. But for now, the Code node with Puppeteer should work once Puppeteer is installed in the container.

