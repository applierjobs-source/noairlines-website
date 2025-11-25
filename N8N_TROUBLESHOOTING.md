# n8n Tuvoli Workflow Troubleshooting

## Error: "Error in workflow" (500)

This error means n8n received the webhook but the workflow failed during execution.

### Step 1: Check n8n Execution Logs

1. **Go to your n8n instance**
2. **Click "Executions"** in the left sidebar
3. **Find the failed execution** (should be the most recent one)
4. **Click on it** to see detailed error logs
5. **Look for the specific error message** - it will tell you which node failed and why

### Step 2: Common Issues and Fixes

#### Issue 1: Missing Environment Variables

**Error:** `ReferenceError: TUVOLI_EMAIL is not defined` or `$env.TUVOLI_EMAIL is undefined`

**Fix:**
1. Go to Railway → Your n8n service → Variables tab
2. Make sure these are set:
   ```
   TUVOLI_EMAIL=your_email@example.com
   TUVOLI_PASSWORD=your_password
   N8N_BLOCK_ENV_ACCESS_IN_NODE=false
   ```
3. **Important:** `N8N_BLOCK_ENV_ACCESS_IN_NODE=false` is required to access `$env` variables in custom scripts

#### Issue 2: Environment Variable Access Blocked

**Error:** Cannot access environment variables in node

**Fix:**
Add to Railway n8n service variables:
```
N8N_BLOCK_ENV_ACCESS_IN_NODE=false
```

#### Issue 3: Puppeteer Script Syntax Error

**Error:** Syntax errors in custom script

**Fix:** Use the working script below (see "Working Custom Script")

#### Issue 4: Element Not Found

**Error:** `Error: No node found for selector: input[id='first-name']`

**Fix:**
- Add longer timeouts
- Add explicit waits before interacting with elements
- Use more robust selectors (try XPath if CSS doesn't work)

#### Issue 5: Login Page Not Loading

**Error:** Timeout waiting for login fields

**Fix:**
- Increase timeout to 15000ms or more
- Add a delay after navigation: `await $page.waitForTimeout(6000);`
- Check if Tuvoli is blocking the request (try enabling Stealth Mode)

### Step 3: Verify Webhook Data

Check that your Node.js server is sending the correct data:

1. **In n8n, add a "Set" node right after the Webhook**
2. **Add all fields to see what's being received:**
   - `firstName`
   - `lastName`
   - `email`
   - `phone`
   - `route`
   - `date`
   - `time`
   - `passengers`
3. **Execute the workflow manually** with test data
4. **Check the Set node output** to verify data format

### Step 4: Test Workflow Manually

1. **In n8n, click "Execute Workflow"**
2. **Manually input test data:**
   ```json
   {
     "firstName": "Test",
     "lastName": "User",
     "email": "test@example.com",
     "phone": "5125551234",
     "route": "AUS → DFW",
     "date": "2025-12-10",
     "time": "10:00",
     "passengers": "1"
   }
   ```
3. **Watch each node execute** - see where it fails
4. **Check error messages** in failed nodes

### Step 5: Enable Debug Logging

In your Puppeteer custom script, add console.log statements:

```javascript
console.log('Starting Tuvoli contact creation...');
console.log('First Name:', firstName);
console.log('Last Name:', lastName);
console.log('Email:', email);
```

These will appear in n8n execution logs.

---

## Working Custom Script (Puppeteer Run Custom Script)

If you're using the "Run Custom Script" operation in Puppeteer, use this complete script:

```javascript
// Get data from previous node
const firstName = $json.firstName;
const lastName = $json.lastName;
const email = $json.email;
const phone = $json.phone || '';

// Get Tuvoli credentials from environment variables
const tuvoliEmail = $env.TUVOLI_EMAIL;
const tuvoliPassword = $env.TUVOLI_PASSWORD;

if (!tuvoliEmail || !tuvoliPassword) {
  throw new Error('TUVOLI_EMAIL or TUVOLI_PASSWORD not set in environment variables');
}

console.log('Starting Tuvoli contact creation...');
console.log('Contact:', firstName, lastName, email);

// Navigate to login page
await $page.goto('https://noairlines.tuvoli.com/login?returnURL=%2Fhome', {
  waitUntil: 'networkidle2',
  timeout: 30000
});

// Wait for login fields to load (Tuvoli takes ~6 seconds)
await $page.waitForSelector('input[placeholder="Enter Username"]', { timeout: 10000 });

// Type username
await $page.type('input[placeholder="Enter Username"]', tuvoliEmail, { delay: 50 });

// Type password
await $page.type('input[placeholder="Enter Password"]', tuvoliPassword, { delay: 50 });

// Click sign in button
await $page.click('button[type="submit"]');

// Wait for navigation after login
await $page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });

console.log('Logged in successfully');

// Navigate to contact management
await $page.goto('https://noairlines.tuvoli.com/contact-management', {
  waitUntil: 'networkidle2',
  timeout: 30000
});

// Wait for Add New Contact button
await $page.waitForSelector('//button[contains(text(), "Add New Contact")]', { timeout: 10000 });

// Click Add New Contact
await $page.click('//button[contains(text(), "Add New Contact")]');

// Wait for form to appear
await $page.waitForSelector('input[id="first-name"]', { timeout: 10000 });

console.log('Form opened, filling fields...');

// Fill First Name
await $page.type('input[id="first-name"]', firstName, { delay: 50 });

// Fill Last Name
await $page.type('input[id="last-name"]', lastName, { delay: 50 });

// Fill Email
await $page.type('input[id="account-email"]', email, { delay: 50 });

// Fill Phone (if provided)
if (phone) {
  await $page.type('input[id="phone"]', phone, { delay: 50 });
}

// Fill Account field
const accountValue = `${firstName} ${lastName}`;
await $page.type('input[placeholder="Select an account…"]', accountValue, { delay: 50 });

// Wait for typeahead dropdown to appear
await $page.waitForSelector('ngb-typeahead-window', { timeout: 5000 });

// Click the add (+) button in typeahead
await $page.click('//ngb-typeahead-window//button[contains(@class, "active")]');

// Wait a moment for the account to be added
await $page.waitForTimeout(1000);

// Click Create button
await $page.click('button[type="submit"]');

// Wait for form submission
await $page.waitForTimeout(3000);

console.log('Contact creation completed');

// Return success
return [{
  success: true,
  message: `Contact ${firstName} ${lastName} created successfully`,
  firstName: firstName,
  lastName: lastName,
  email: email
}];
```

**Important Notes:**
- Make sure `N8N_BLOCK_ENV_ACCESS_IN_NODE=false` is set in Railway
- The script uses XPath selectors (with `//`) - make sure your Puppeteer node supports XPath
- If XPath doesn't work, try JavaScript evaluation instead (see alternative below)

---

## Alternative: Using JavaScript Evaluation (If XPath Fails)

If XPath selectors don't work, use JavaScript evaluation:

```javascript
// Instead of: await $page.click('//button[contains(text(), "Add New Contact")]');
// Use:
const addButton = await $page.evaluateHandle(() => {
  const buttons = Array.from(document.querySelectorAll('button'));
  return buttons.find(btn => btn.textContent.includes('Add New Contact'));
});
await addButton.click();
```

---

## Quick Checklist

- [ ] `TUVOLI_EMAIL` set in Railway n8n variables
- [ ] `TUVOLI_PASSWORD` set in Railway n8n variables
- [ ] `N8N_BLOCK_ENV_ACCESS_IN_NODE=false` set in Railway n8n variables
- [ ] Webhook URL is correct in your Node.js server (`N8N_WEBHOOK_URL`)
- [ ] n8n workflow is **Active** (not paused)
- [ ] Puppeteer community node is installed
- [ ] All timeouts are set to reasonable values (10000ms+)
- [ ] Tested workflow manually in n8n first

---

## Still Not Working?

1. **Check n8n execution logs** - they will show the exact error
2. **Test each node individually** - execute workflow step by step
3. **Try the individual Puppeteer nodes approach** instead of custom script (see N8N_TUVOLI_SETUP.md)
4. **Enable Stealth Mode** in Puppeteer node options
5. **Add screenshots** to debug - use "Take Screenshot" operation in Puppeteer

