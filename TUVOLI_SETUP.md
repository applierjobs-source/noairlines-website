# Tuvoli Integration via Zapier (No API Access Needed)

## Overview

When a new submission is received on noairlines.com, the system automatically sends Tuvoli-ready contact data to your Zapier webhook. Zapier can then create the contact in your Tuvoli account without requiring paid API access.

## How It Works

1. **User submits quote request** on noairlines.com
2. **System formats contact data** for Tuvoli:
   - First name and last name (parsed from full name)
   - Email address
   - Phone number
   - Notes with itinerary details
3. **Data sent to Zapier webhook** (your existing WEBHOOK_URL)
4. **Zapier creates contact in Tuvoli** automatically

## Setup in Zapier

### Step 1: Create a Zap

1. Go to https://zapier.com and create a new Zap
2. **Trigger**: Webhooks by Zapier → Catch Hook
3. Copy the webhook URL and add it to Railway as `WEBHOOK_URL`

### Step 2: Add Tuvoli Action

1. **Action**: Search for "Tuvoli" in Zapier
2. If Tuvoli has a Zapier integration:
   - Select "Create Contact" or "Add Contact"
   - Map the fields from the webhook:
     - First Name → `tuvoli_first_name` or `firstName`
     - Last Name → `tuvoli_last_name` or `lastName`
     - Email → `tuvoli_email` or `email`
     - Phone → `tuvoli_phone` or `phone`
     - Notes → `tuvoli_notes` or `notes`

3. If Tuvoli doesn't have a Zapier integration:
   - Use "Webhooks by Zapier" → POST
   - Configure it to send data to Tuvoli's contact form endpoint
   - Or use "Code by Zapier" to format and send the data

### Step 3: Test the Integration

1. Submit a test quote on noairlines.com
2. Check Zapier to see if the webhook was received
3. Verify the contact was created in Tuvoli

## Contact Data Structure

The webhook includes these fields (both Tuvoli-prefixed and standard):

```json
{
  "tuvoli_first_name": "John",
  "tuvoli_last_name": "Doe",
  "tuvoli_email": "john@example.com",
  "tuvoli_phone": "+15126363628",
  "tuvoli_notes": "Quote request from NoAirlines.com\nRoute: AUS → DFW\nDate: 2025-12-10 at 14:30\nPassengers: 2\nTrip Type: one-way",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "+15126363628",
  "notes": "Quote request: AUS → DFW on 2025-12-10 for 2 passenger(s). Trip type: one-way."
}
```

## Alternative: Browser Automation

If Zapier doesn't work, we can use browser automation (Puppeteer) to automatically log into Tuvoli and create contacts. This would require:

1. Tuvoli login credentials (stored securely as environment variables)
2. Puppeteer installed on the server
3. Configuration for the contact creation form

Let me know if you'd like to explore this option.

## Testing

1. Submit a test quote on noairlines.com
2. Check Railway logs for: "Webhook sent with Tuvoli contact data"
3. Check Zapier dashboard to see if the webhook was received
4. Verify the contact appears in your Tuvoli account

## Troubleshooting

### Contact Not Created in Tuvoli?

1. **Check Zapier Dashboard**
   - Go to your Zapier account
   - Check if the webhook was received
   - Check if the Zap ran successfully
   - Look for any error messages

2. **Verify Webhook URL**
   - Ensure `WEBHOOK_URL` in Railway matches your Zapier webhook URL
   - Test the webhook manually using a tool like Postman

3. **Check Field Mapping**
   - Ensure Zapier is mapping the correct fields to Tuvoli
   - Field names might need adjustment based on Tuvoli's requirements

4. **Check Railway Logs**
   - Look for "Webhook sent with Tuvoli contact data"
   - Check for any error messages

## Benefits of This Approach

✅ **No API costs** - Uses free Zapier integration  
✅ **Easy to set up** - Visual Zapier interface  
✅ **Flexible** - Can add additional actions (email notifications, etc.)  
✅ **Reliable** - Zapier handles retries and error handling  
✅ **Scalable** - Works with any volume of submissions

## Next Steps

1. Set up your Zapier Zap with the webhook trigger
2. Add Tuvoli action (or webhook action if no direct integration)
3. Test with a sample submission
4. Monitor Zapier dashboard for successful runs
