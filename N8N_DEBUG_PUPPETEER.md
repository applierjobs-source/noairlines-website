# How to View Puppeteer in Action in n8n

Once Puppeteer is working, here are several ways to see what's happening:

## Method 1: Take Screenshots at Key Steps (Recommended)

Add screenshot steps in your Code node to capture what Puppeteer sees:

```javascript
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

// ... your existing code ...

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/chromium-browser',
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});

const page = await browser.newPage();

try {
  // Screenshot 1: After login page loads
  await page.goto('https://noairlines.tuvoli.com/login?returnURL=%2Fhome', {
    waitUntil: 'networkidle2',
    timeout: 30000
  });
  await page.screenshot({ path: '/tmp/01-login-page.png', fullPage: true });
  console.log('📸 Screenshot saved: 01-login-page.png');

  // Screenshot 2: After logging in
  await page.waitForSelector('input[placeholder="Enter Username"]', { timeout: 15000 });
  await page.type('input[placeholder="Enter Username"]', tuvoliEmail, { delay: 50 });
  await page.type('input[placeholder="Enter Password"]', tuvoliPassword, { delay: 50 });
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
  await page.screenshot({ path: '/tmp/02-after-login.png', fullPage: true });
  console.log('📸 Screenshot saved: 02-after-login.png');

  // Screenshot 3: Contact management page
  await page.goto('https://noairlines.tuvoli.com/contact-management', {
    waitUntil: 'networkidle2',
    timeout: 30000
  });
  await page.screenshot({ path: '/tmp/03-contact-management.png', fullPage: true });
  console.log('📸 Screenshot saved: 03-contact-management.png');

  // Screenshot 4: Form opened
  // ... click Add New Contact ...
  await page.waitForSelector('input[id="first-name"]', { timeout: 10000 });
  await page.screenshot({ path: '/tmp/04-form-opened.png', fullPage: true });
  console.log('📸 Screenshot saved: 04-form-opened.png');

  // Screenshot 5: Form filled
  // ... fill form fields ...
  await page.screenshot({ path: '/tmp/05-form-filled.png', fullPage: true });
  console.log('📸 Screenshot saved: 05-form-filled.png');

  // Screenshot 6: After submission
  // ... click Create ...
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '/tmp/06-after-submit.png', fullPage: true });
  console.log('📸 Screenshot saved: 06-after-submit.png');

  // Return screenshots info
  return [{
    json: {
      success: true,
      message: 'Contact created successfully',
      screenshots: [
        '/tmp/01-login-page.png',
        '/tmp/02-after-login.png',
        '/tmp/03-contact-management.png',
        '/tmp/04-form-opened.png',
        '/tmp/05-form-filled.png',
        '/tmp/06-after-submit.png'
      ]
    }
  }];
} catch (error) {
  // Screenshot on error
  await page.screenshot({ path: '/tmp/error-screenshot.png', fullPage: true });
  console.log('📸 Error screenshot saved: error-screenshot.png');
  throw error;
} finally {
  await browser.close();
}
```

**To view screenshots:**
1. Screenshots are saved to `/tmp/` in the n8n container
2. You can't directly access them from Railway UI
3. **Better option:** Use Method 2 below (base64 screenshots in logs)

---

## Method 2: Base64 Screenshots in n8n Logs (Best for Railway)

Return screenshots as base64 in the execution data, then view them in n8n:

```javascript
const puppeteer = require('puppeteer-core');

// ... your existing code ...

// Take screenshot and convert to base64
const screenshot = await page.screenshot({ encoding: 'base64', fullPage: false });
console.log('📸 Screenshot (base64):', screenshot.substring(0, 100) + '...');

// Return in execution data
return [{
  json: {
    success: true,
    screenshot_base64: screenshot,
    step: 'after-login'
  }
}];
```

**To view:**
1. **In n8n, go to Executions**
2. **Click on the execution**
3. **Click on the Code node**
4. **View the output data** - you'll see the base64 string
5. **Copy the base64 string** and paste it into: `data:image/png;base64,<your-base64-string>` in a browser

**Or use this helper function:**

```javascript
// Helper function to save screenshot info
const takeScreenshot = async (page, stepName) => {
  const screenshot = await page.screenshot({ encoding: 'base64', fullPage: false });
  console.log(`📸 Screenshot [${stepName}]: data:image/png;base64,${screenshot.substring(0, 50)}...`);
  return screenshot;
};

// Use it:
const loginScreenshot = await takeScreenshot(page, 'login-page');
const formScreenshot = await takeScreenshot(page, 'form-opened');
```

---

## Method 3: Run in Non-Headless Mode (Local Only)

**Note:** This won't work in Railway (no display), but useful for local testing.

If running n8n locally:

```javascript
const browser = await puppeteer.launch({
  executablePath: '/usr/bin/chromium-browser',
  headless: false, // Show browser window
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});
```

You'll see the browser window open and interact with the page.

---

## Method 4: Add Detailed Console Logging

Add console.log statements throughout your script:

```javascript
console.log('🚀 Starting Tuvoli contact creation...');
console.log('📧 Contact:', firstName, lastName, email);

console.log('🌐 Navigating to login page...');
await page.goto('https://noairlines.tuvoli.com/login?returnURL=%2Fhome');
console.log('✅ Login page loaded');

console.log('⌨️ Typing username...');
await page.type('input[placeholder="Enter Username"]', tuvoliEmail);
console.log('✅ Username entered');

console.log('⌨️ Typing password...');
await page.type('input[placeholder="Enter Password"]', tuvoliPassword);
console.log('✅ Password entered');

console.log('🖱️ Clicking sign in button...');
await page.click('button[type="submit"]');
console.log('✅ Sign in clicked');

console.log('⏳ Waiting for navigation...');
await page.waitForNavigation({ waitUntil: 'networkidle2' });
console.log('✅ Navigation complete - logged in!');
```

**View logs:**
1. **In n8n, go to Executions**
2. **Click on your execution**
3. **Click on the Code node**
4. **Scroll to "Execution Log"** section
5. **See all console.log output** with timestamps

---

## Method 5: Use n8n's Built-in Debugging

### Step-by-Step Execution

1. **In n8n workflow, click "Execute Workflow"**
2. **Instead of running all nodes, click on individual nodes**
3. **Execute them one at a time**
4. **See the output of each node before moving to the next**

### View Node Output

1. **After execution, click on any node**
2. **See the input/output data**
3. **Check what data is being passed between nodes**

---

## Method 6: Add a Screenshot Node (If Using Puppeteer Community Node)

If you're using individual Puppeteer nodes instead of Code node:

1. **Add a "Puppeteer" node**
2. **Set Operation:** "Take Screenshot"
3. **Set Path:** `/tmp/screenshot-{{ $runIndex }}.png`
4. **Add after each major step**

---

## Recommended Approach: Combine Methods 2 + 4

Use base64 screenshots + detailed logging for the best debugging experience:

```javascript
const puppeteer = require('puppeteer-core');

// Helper to take and log screenshot
const debugScreenshot = async (page, stepName) => {
  try {
    const screenshot = await page.screenshot({ encoding: 'base64', fullPage: false });
    console.log(`📸 [${stepName}] Screenshot captured (${screenshot.length} chars)`);
    return screenshot;
  } catch (error) {
    console.log(`⚠️ [${stepName}] Screenshot failed:`, error.message);
    return null;
  }
};

// Helper to log page state
const logPageState = async (page, stepName) => {
  const url = page.url();
  const title = await page.title();
  console.log(`📍 [${stepName}] URL: ${url}`);
  console.log(`📍 [${stepName}] Title: ${title}`);
};

// Use throughout your script:
console.log('🚀 Starting Tuvoli contact creation...');
await page.goto('https://noairlines.tuvoli.com/login?returnURL=%2Fhome');
await logPageState(page, 'Login Page');
await debugScreenshot(page, 'Login Page');

// ... continue with more steps ...
```

---

## Quick Debug Checklist

- [ ] Add console.log statements at each step
- [ ] Take screenshots at key points (base64 for Railway)
- [ ] Check n8n execution logs after each run
- [ ] View node input/output data in n8n UI
- [ ] Test workflow step-by-step (execute individual nodes)
- [ ] Add error handling with error screenshots

---

## Viewing Screenshots from Railway

Since Railway doesn't give you direct file access, the best approach is:

1. **Use base64 screenshots** (Method 2)
2. **Return them in the Code node output**
3. **View in n8n execution data**
4. **Copy base64 string and view in browser** using: `data:image/png;base64,<string>`

Or use a service like:
- Save screenshots to a cloud storage (S3, etc.) and return URLs
- Use n8n's HTTP Request node to upload screenshots
- Email screenshots to yourself for debugging

---

## Example: Complete Debug-Enabled Script

See `N8N_CODE_NODE_SOLUTION.md` for the full script with debugging enabled.

