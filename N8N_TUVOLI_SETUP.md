# n8n Tuvoli Automation Setup Guide

This guide walks you through setting up Tuvoli contact creation automation using n8n with Puppeteer browser automation.

## Overview

Instead of running Puppeteer directly in your Node.js server, we'll use n8n to handle the browser automation. Your Node.js server will send a webhook to n8n, and n8n will handle the Tuvoli login and contact creation.

```
noairlines.com → Node.js Server → Webhook → n8n → Tuvoli (Puppeteer)
```

---

## Step 1: Deploy n8n

### Option A: Deploy n8n on Railway (Recommended)

1. **Create a new Railway project:**
   - Go to [Railway.app](https://railway.app)
   - Click "New Project"
   - Select "Deploy from GitHub repo" OR "Empty Project"

2. **Add n8n service:**
   - If using Empty Project, click "New" → "GitHub Repo"
   - Search for `n8nio/n8n` or use this Dockerfile approach:

   **Create `n8n.Dockerfile` in your project:**
   ```dockerfile
   FROM n8nio/n8n:latest
   ```

   **Or use Railway's one-click deploy:**
   - Railway has n8n in their template library
   - Search for "n8n" and deploy

3. **Set Environment Variables in Railway:**
   ```
   N8N_BASIC_AUTH_ACTIVE=true
   N8N_BASIC_AUTH_USER=admin
   N8N_BASIC_AUTH_PASSWORD=your_secure_password_here
   N8N_HOST=0.0.0.0
   N8N_PORT=5678
   NODE_ENV=production
   ```

4. **Deploy and get your n8n URL:**
   - Railway will provide a URL like: `https://your-n8n-app.railway.app`
   - Access it and log in with your basic auth credentials

### Option B: Self-Hosted (Docker)

```bash
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  -e N8N_BASIC_AUTH_ACTIVE=true \
  -e N8N_BASIC_AUTH_USER=admin \
  -e N8N_BASIC_AUTH_PASSWORD=your_password \
  n8nio/n8n
```

Access at: `http://localhost:5678`

---

## Step 2: Install Puppeteer Community Node

1. **In n8n interface:**
   - Click **Settings** (gear icon in top right)
   - Click **Community Nodes**
   - Click **Install** button
   - Enter: `n8n-nodes-puppeteer`
   - Click **Install** and agree to terms
   - Wait for installation to complete (may take 1-2 minutes)

2. **Verify installation:**
   - Go back to workflow editor
   - Click "+" to add node
   - Search for "Puppeteer"
   - You should see "Puppeteer" node available

---

## Step 3: Create the Workflow

### 3.1 Create New Workflow

1. Click **"Add workflow"** in n8n
2. Name it: **"Tuvoli Contact Creation"**

### 3.2 Add Webhook Trigger

1. Click **"+"** to add node
2. Search for **"Webhook"**
3. Select **"Webhook"** node
4. Configure:
   - **HTTP Method:** POST
   - **Path:** `tuvoli-contact` (or any path you want)
   - **Response Mode:** "Last Node" (we'll add a response node later)
   - Click **"Execute Node"** to get the webhook URL
   - **Copy the webhook URL** - you'll need this for your Node.js server
   - Example: `https://your-n8n.railway.app/webhook/tuvoli-contact`

### 3.3 Add Set Node (Extract Data)

1. Add **"Set"** node after Webhook
2. Configure to extract data from webhook:
   - **Keep Only Set Fields:** ON
   - Add these fields:
     - **firstName:** `{{ $json.firstName }}`
     - **lastName:** `{{ $json.lastName }}`
     - **email:** `{{ $json.email }}`
     - **phone:** `{{ $json.phone }}`
     - **route:** `{{ $json.route }}`

### 3.4 Add Puppeteer Node - Navigate to Login

1. Add **"Puppeteer"** node
2. Configure:
   - **Operation:** "Navigate"
   - **URL:** `https://noairlines.tuvoli.com/login?returnURL=%2Fhome`
   - **Wait Until:** "networkidle2"
   - **Timeout:** 30000

### 3.5 Add Puppeteer Node - Wait for Login Fields

1. Add another **"Puppeteer"** node
2. Configure:
   - **Operation:** "Wait"
   - **Wait For:** "Selector"
   - **Selector:** `input[placeholder='Enter Username']`
   - **Timeout:** 10000

### 3.6 Add Puppeteer Node - Type Username

1. Add **"Puppeteer"** node
2. Configure:
   - **Operation:** "Type"
   - **Selector:** `input[placeholder='Enter Username']`
   - **Text:** `{{ $env.TUVOLI_EMAIL }}` (or use credentials node)
   - **Delay:** 50

### 3.7 Add Puppeteer Node - Type Password

1. Add **"Puppeteer"** node
2. Configure:
   - **Operation:** "Type"
   - **Selector:** `input[placeholder='Enter Password']`
   - **Text:** `{{ $env.TUVOLI_PASSWORD }}` (or use credentials node)
   - **Delay:** 50

### 3.8 Add Puppeteer Node - Click Sign In

1. Add **"Puppeteer"** node
2. Configure:
   - **Operation:** "Click"
   - **Selector:** `button[type='submit']` or `//button[contains(text(), 'Sign in')]`
   - **Wait For Navigation:** ON
   - **Timeout:** 15000

### 3.9 Add Puppeteer Node - Wait for Login Success

1. Add **"Puppeteer"** node
2. Configure:
   - **Operation:** "Wait"
   - **Wait For:** "Navigation"
   - **Timeout:** 10000

### 3.10 Add Puppeteer Node - Navigate to Client Management

1. Add **"Puppeteer"** node
2. Configure:
   - **Operation:** "Navigate"
   - **URL:** `https://noairlines.tuvoli.com/contact-management`
   - **Wait Until:** "networkidle2"
   - **Timeout:** 30000

### 3.11 Add Puppeteer Node - Wait for Page Load

1. Add **"Puppeteer"** node
2. Configure:
   - **Operation:** "Wait"
   - **Wait For:** "Selector"
   - **Selector:** `button:has-text("Add New Contact")` or `//button[contains(text(), 'Add New Contact')]`
   - **Timeout:** 10000

### 3.12 Add Puppeteer Node - Click Add New Contact

1. Add **"Puppeteer"** node
2. Configure:
   - **Operation:** "Click"
   - **Selector:** `//button[contains(text(), 'Add New Contact')]` (XPath)
   - **Wait For Navigation:** OFF
   - **Timeout:** 5000

### 3.13 Add Puppeteer Node - Wait for Form

1. Add **"Puppeteer"** node
2. Configure:
   - **Operation:** "Wait"
   - **Wait For:** "Selector"
   - **Selector:** `input[id='first-name']`
   - **Timeout:** 10000

### 3.14 Add Puppeteer Node - Type First Name

1. Add **"Puppeteer"** node
2. Configure:
   - **Operation:** "Type"
   - **Selector:** `input[id='first-name']`
   - **Text:** `{{ $json.firstName }}`
   - **Delay:** 50

### 3.15 Add Puppeteer Node - Type Last Name

1. Add **"Puppeteer"** node
2. Configure:
   - **Operation:** "Type"
   - **Selector:** `input[id='last-name']`
   - **Text:** `{{ $json.lastName }}`
   - **Delay:** 50

### 3.16 Add Puppeteer Node - Type Email

1. Add **"Puppeteer"** node
2. Configure:
   - **Operation:** "Type"
   - **Selector:** `input[id='account-email']`
   - **Text:** `{{ $json.email }}`
   - **Delay:** 50

### 3.17 Add Puppeteer Node - Type Phone (Optional)

1. Add **"Puppeteer"** node
2. Configure:
   - **Operation:** "Type"
   - **Selector:** `input[id='phone']`
   - **Text:** `{{ $json.phone }}`
   - **Delay:** 50

### 3.18 Add Puppeteer Node - Type Account Field

1. Add **"Puppeteer"** node
2. Configure:
   - **Operation:** "Type"
   - **Selector:** `input[placeholder='Select an account…']`
   - **Text:** `{{ $json.firstName }} {{ $json.lastName }}`
   - **Delay:** 50

### 3.19 Add Puppeteer Node - Wait for Typeahead Dropdown

1. Add **"Puppeteer"** node
2. Configure:
   - **Operation:** "Wait"
   - **Wait For:** "Selector"
   - **Selector:** `ngb-typeahead-window`
   - **Timeout:** 5000

### 3.20 Add Puppeteer Node - Click Add (+) Button

1. Add **"Puppeteer"** node
2. Configure:
   - **Operation:** "Click"
   - **Selector:** `//ngb-typeahead-window//button[contains(@class, 'active')]` (XPath)
   - **Wait For Navigation:** OFF
   - **Timeout:** 5000

### 3.21 Add Puppeteer Node - Click Create Button

1. Add **"Puppeteer"** node
2. Configure:
   - **Operation:** "Click"
   - **Selector:** `button[type='submit']` or `//button[contains(text(), 'Create')]` (XPath)
   - **Wait For Navigation:** OFF
   - **Timeout:** 5000

### 3.22 Add Puppeteer Node - Wait for Success

1. Add **"Puppeteer"** node
2. Configure:
   - **Operation:** "Wait"
   - **Wait For:** "Selector"
   - **Selector:** `//*[contains(text(), '{{ $json.firstName }}')]` (XPath - looks for name in list)
   - **Timeout:** 10000

### 3.23 Add Respond to Webhook Node

1. Add **"Respond to Webhook"** node
2. Configure:
   - **Response Code:** 200
   - **Response Body:** 
     ```json
     {
       "success": true,
       "message": "Contact created successfully"
     }
     ```

---

## Step 4: Set Up Credentials

### Option A: Environment Variables (Recommended)

In Railway n8n service, add:
```
TUVOLI_EMAIL=your_email@example.com
TUVOLI_PASSWORD=your_password
```

Then in Puppeteer nodes, use: `{{ $env.TUVOLI_EMAIL }}`

### Option B: n8n Credentials

1. Go to **Settings** → **Credentials**
2. Click **"Add Credential"**
3. Create a generic credential with:
   - **Name:** Tuvoli Login
   - **Email:** your_email@example.com
   - **Password:** your_password
4. Reference in nodes using credential picker

---

## Step 5: Enable Stealth Mode (Important!)

For each Puppeteer node, enable stealth mode to avoid bot detection:

1. Click on any Puppeteer node
2. Scroll to **"Options"** section
3. Enable **"Stealth Mode"** or **"Use Stealth Plugin"**
4. This helps avoid redirects to tuvoli.com

---

## Step 6: Update Your Node.js Server

Update `server.cjs` to send webhook to n8n instead of running Puppeteer:

```javascript
// Add to environment variables in Railway:
// N8N_WEBHOOK_URL=https://your-n8n.railway.app/webhook/tuvoli-contact

const createTuvoliContact = async (itineraryData) => {
  try {
    if (!process.env.N8N_WEBHOOK_URL) {
      console.log('N8N_WEBHOOK_URL not set, skipping Tuvoli automation');
      return { success: false, error: 'N8N_WEBHOOK_URL not configured' };
    }

    // Parse name
    const nameParts = (itineraryData.name || '').trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Extract airport codes for route
    const fromCode = extractAirportCode(itineraryData.from);
    const toCode = extractAirportCode(itineraryData.to);
    const routeDisplay = fromCode && toCode 
      ? formatRouteDisplay(fromCode, toCode)
      : `${itineraryData.from} → ${itineraryData.to}`;

    // Send webhook to n8n
    const response = await fetch(process.env.N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName,
        lastName,
        email: itineraryData.email || '',
        phone: itineraryData.phone || '',
        route: routeDisplay,
        date: itineraryData.date || '',
        time: itineraryData.time || '',
        passengers: itineraryData.passengers || ''
      }),
      timeout: 60000 // 60 second timeout
    });

    if (response.ok) {
      const result = await response.json();
      return { success: true, message: 'Contact creation triggered in n8n', n8nResult: result };
    } else {
      const errorText = await response.text();
      throw new Error(`n8n webhook failed: ${response.status} - ${errorText}`);
    }
  } catch (error) {
    console.error('Error triggering n8n workflow:', error);
    return { success: false, error: error.message };
  }
};
```

Then uncomment the call in your API endpoint:

```javascript
// Create contact in Tuvoli via n8n automation
try {
  const tuvoliResult = await createTuvoliContact(itineraryData);
  console.log('Tuvoli contact creation result:', tuvoliResult);
} catch (tuvoliError) {
  console.error('Error creating Tuvoli contact:', tuvoliError);
  // Don't fail the request if Tuvoli contact creation fails
}
```

---

## Step 7: Test the Workflow

1. **Test in n8n:**
   - Click **"Execute Workflow"** button
   - Manually input test data
   - Watch each node execute
   - Check for errors

2. **Test from your server:**
   - Submit a test quote on noairlines.com
   - Check n8n execution logs
   - Verify contact was created in Tuvoli

---

## Troubleshooting

### Bot Detection / Redirects

- Enable **Stealth Mode** in all Puppeteer nodes
- Add delays between actions
- Use realistic user agent strings

### Elements Not Found

- Use n8n's **"Take Screenshot"** operation to debug
- Try different selectors (CSS vs XPath)
- Increase timeout values

### Login Fails

- Verify credentials are correct
- Check if Tuvoli requires 2FA
- Ensure login page has loaded (wait longer)

### Form Not Filling

- Add explicit waits before typing
- Verify selectors are correct
- Check if form is in a modal/iframe

---

## Benefits of n8n Approach

✅ **Visual Debugging** - See each step execute  
✅ **Easy Maintenance** - Update workflow without code changes  
✅ **Better Error Handling** - Built-in retry logic  
✅ **Separation of Concerns** - Automation separate from main app  
✅ **Scalability** - n8n can handle multiple workflows  

---

## Next Steps

1. Deploy n8n on Railway
2. Install Puppeteer node
3. Create workflow following steps above
4. Test workflow manually
5. Update Node.js server to send webhook
6. Test end-to-end
7. Monitor n8n execution logs

Good luck! 🚀

