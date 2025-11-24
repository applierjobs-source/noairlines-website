# Twilio SMS Setup Guide

## Quick Setup Steps

### 1. Create Twilio Account
- Go to https://www.twilio.com/try-twilio
- Sign up for a free account (includes trial credits)

### 2. Get Your Credentials

#### Step-by-Step Instructions:

1. **Log into Twilio Console**
   - Go to: https://console.twilio.com
   - Sign in with your Twilio account credentials

2. **Find Your Account SID and Auth Token**
   
   **Option A: From the Dashboard (Easiest)**
   - Once logged in, you'll land on the **Dashboard** page
   - Look at the top-right area of the page
   - You'll see a section labeled **Account Info** or **Project Info**
   - Here you'll find:
     - **Account SID**: Starts with `AC` followed by 32 characters (e.g., `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)
     - **Auth Token**: Click the eye icon 👁️ or "Show" button next to it to reveal it
   
   **Option B: From Account Settings**
   - Click on your **account name** in the top-right corner (or the profile icon)
   - Select **Account** from the dropdown menu
   - You'll see **Account SID** and **Auth Token** displayed on this page
   - Click the eye icon to reveal the Auth Token
   
   **Option C: Direct Link**
   - Go directly to: https://console.twilio.com/us1/account/settings
   - Your Account SID and Auth Token will be displayed here

3. **Copy Your Credentials**
   - **Account SID**: Click the copy icon next to it (or manually select and copy)
   - **Auth Token**: Click the eye icon to reveal it, then click the copy icon
   - **IMPORTANT**: Keep these secure! Don't share them publicly or commit them to git

#### Visual Guide:
- **Account SID**: Usually visible immediately, no need to reveal
- **Auth Token**: Hidden by default (shows as dots `••••••••`), click the eye icon to see it
- Both will be in a format like:
  ```
  Account SID: ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  Auth Token:  [Click to reveal]
  ```

#### Detailed Navigation Path:

**If you're on the Dashboard:**
1. Look at the **left sidebar menu**
2. You should see options like: Dashboard, Phone Numbers, Messaging, etc.
3. Scroll down or look for **Account** section
4. Click on **Account** → **General** (or just **Account**)
5. The Account SID and Auth Token will be displayed at the top of the page

**If you're lost:**
1. Click on your **account name/icon** in the very top-right corner
2. A dropdown menu will appear
3. Click **Account** or **Settings**
4. This will take you to the account settings page where credentials are shown

**What the page looks like:**
- The Account SID will be in a box/card labeled "Account SID"
- The Auth Token will be in a box/card labeled "Auth Token" 
- There will be a small eye icon or "Show" button next to the Auth Token
- Both are typically at the top of the account settings page

#### Troubleshooting - Can't Find It?

**If you don't see Account SID/Auth Token:**
1. Make sure you're logged into the correct Twilio account
2. Try this direct URL: https://console.twilio.com/us1/account/settings
3. If you see "Project Info" instead of "Account Info", that's the same thing - use those credentials
4. If you're in a different region (not US), the URL might be:
   - Europe: https://console.twilio.com/eu1/account/settings
   - Asia: https://console.twilio.com/ap1/account/settings
5. Check the browser console for any errors (F12 → Console tab)

**Still can't find it?**
- Make sure you've completed the account verification process
- Some trial accounts may need email/phone verification first
- Contact Twilio support if credentials are still not visible

#### Visual Walkthrough (What You'll Actually See):

**When you first log in:**
1. You'll see the Twilio Dashboard
2. At the very top of the page, look for:
   - Your account name/email in the top-right corner
   - Or a profile icon/avatar
3. Click on that account name/icon
4. A menu will drop down with options like:
   - Account
   - Settings
   - Billing
   - Logout
5. Click **"Account"** or **"Settings"**

**On the Account/Settings page:**
- You'll see several sections/cards
- Look for a card/section titled:
  - "Account Info" OR
  - "Project Info" OR  
  - "API Credentials" OR
  - Just "Account SID" and "Auth Token" as headings
- This section will contain:
  - **Account SID**: A long string starting with `AC` (usually visible)
  - **Auth Token**: Hidden with dots, has an eye icon 👁️ or "Show" button

**Alternative: Using the Left Sidebar**
1. Look at the left side of the screen
2. You'll see a navigation menu with items like:
   - Dashboard
   - Phone Numbers
   - Messaging
   - Monitor
   - etc.
3. Scroll down in this menu
4. Look for a section called **"Account"** or **"Settings"**
5. Click on it
6. You might see sub-items like:
   - General
   - Security
   - API Keys
7. Click **"General"** or just stay on the Account page
8. Your credentials will be displayed there

**Quick Test - Are you in the right place?**
If you see any of these, you're in the right spot:
- "Account SID" as a label
- "Auth Token" as a label  
- A section showing your account information
- API credentials section

### 3. Get a Phone Number
1. In Twilio Console, go to **Phone Numbers** → **Manage** → **Buy a number**
2. Select:
   - Country: United States (or your country)
   - Capabilities: Check **SMS**
3. Click **Search** and choose a number
4. Click **Buy** (free on trial account)

### 4. Set Environment Variables

#### For Railway/Heroku/Production:
Add these environment variables in your hosting platform:

```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
```

**Important:** 
- Phone number must include country code (e.g., `+1` for US)
- Format: `+1234567890` (no spaces or dashes)

#### For Local Development (.env file):
Create a `.env` file in the project root:

```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
```

**Note:** Don't commit `.env` to git! Add it to `.gitignore`.

### 5. Test the Setup

1. Restart your server after adding environment variables
2. Submit a quote request with a valid phone number
3. Check Twilio Console → **Monitor** → **Logs** → **Messaging** to see if SMS was sent
4. You should receive the SMS on the phone number you provided

## Troubleshooting

### SMS Not Sending?
1. **Check Twilio Console Logs**: Go to Monitor → Logs → Messaging
2. **Verify Phone Number Format**: Must be `+1234567890` format
3. **Check Trial Account Limits**: Free trial has restrictions
4. **Verify Credentials**: Double-check Account SID and Auth Token

### Trial Account Limitations
- Can only send SMS to **verified phone numbers** (numbers you verify in Twilio Console)
- To verify a number: Console → Phone Numbers → Verified Caller IDs → Add a new number
- For production, upgrade your account to remove this limitation

### Phone Number Format Issues
The code automatically formats phone numbers, but ensure:
- US numbers: `+1` followed by 10 digits
- International: Country code + number (e.g., `+44` for UK)

## Cost Information

- **Trial Account**: Free credits included
- **Pay-as-you-go**: ~$0.0075 per SMS in US
- **Monthly**: Various plans available

## Security Best Practices

1. **Never commit credentials to git**
2. **Use environment variables** for all sensitive data
3. **Rotate Auth Token** periodically
4. **Use Twilio's Messaging Service** for production (more features)

## Next Steps

Once set up, the SMS will automatically send when users click "Get Quote" with:
- Personalized greeting
- Route information
- Price estimates for Light Jet, Mid Jet, and Super Mid
- Signature from Zach at NoAirlines.com

