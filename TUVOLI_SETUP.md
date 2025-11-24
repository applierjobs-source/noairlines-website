# Tuvoli API Integration Setup

## Overview

When a new submission is received on noairlines.com, the system automatically creates a new contact in your Tuvoli account at https://noairlines.tuvoli.com/ using AI to format the contact data.

## Required Environment Variables

Add these to your Railway environment variables:

```
TUVOLI_API_KEY=your_tuvoli_api_key_here
TUVOLI_API_URL=https://api.tuvoli.com
TUVOLI_ACCOUNT_ID=your_tuvoli_account_id
```

## How to Get Tuvoli API Credentials

1. **Contact Tuvoli Support**
   - Email: support@tuvoli.com
   - Or contact through your Tuvoli dashboard
   - Request API access for your account

2. **Get Your API Key**
   - Tuvoli will provide you with:
     - API Key (for authentication)
     - Account ID (your Tuvoli account identifier)
     - API Base URL (usually https://api.tuvoli.com)

3. **Verify API Endpoint**
   - The integration tries: `${TUVOLI_API_URL}/api/v1/contacts`
   - Falls back to: `${TUVOLI_API_URL}/contacts`
   - If your API uses a different endpoint, we can adjust it

## How It Works

1. **User submits quote request** on noairlines.com
2. **AI formats contact data** using OpenAI to structure:
   - First name and last name (parsed from full name)
   - Email address
   - Phone number
   - Notes with itinerary details
3. **Contact created in Tuvoli** via API call
4. **Logs recorded** for debugging

## Contact Data Structure

The system creates contacts with this structure:

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "+15126363628",
  "notes": "Quote request: AUS to DFW on 2025-12-10 for 2 passenger(s). Trip type: one-way."
}
```

## Testing

1. Submit a test quote on noairlines.com
2. Check Railway logs for:
   - "Tuvoli contact creation result:"
   - Any error messages
3. Check your Tuvoli account to verify the contact was created
4. If the contact doesn't appear, check the logs for API errors

## Troubleshooting

### Contact Not Created?

1. **Check Railway Logs**
   - Look for "Tuvoli contact creation result:"
   - Check for error messages

2. **Verify API Credentials**
   - Ensure TUVOLI_API_KEY is set correctly
   - Ensure TUVOLI_ACCOUNT_ID is set correctly
   - Ensure TUVOLI_API_URL is correct

3. **Check API Endpoint**
   - The code tries two common endpoints
   - If your API uses a different endpoint, we need to update the code

4. **Verify API Permissions**
   - Ensure your API key has permission to create contacts
   - Contact Tuvoli support if permissions are missing

### Common Errors

**"Tuvoli API error: 401"**
- Invalid API key
- Check TUVOLI_API_KEY in Railway

**"Tuvoli API error: 403"**
- API key doesn't have permission to create contacts
- Contact Tuvoli support

**"Tuvoli API error: 404"**
- API endpoint might be different
- We may need to adjust the endpoint URL

**"Tuvoli API error: 400"**
- Contact data format might be incorrect
- Check logs for the exact error message

## API Endpoint Adjustment

If Tuvoli uses a different API endpoint structure, we can adjust it. Common variations:

- `/api/contacts`
- `/v1/contacts`
- `/contacts/create`
- `/api/v2/contacts`

Share the correct endpoint with the developer to update the code.

## Notes

- The integration uses AI (OpenAI) to format contact data if OPENAI_API_KEY is configured
- Falls back to rule-based formatting if AI is not available
- Contact creation failures don't block the quote submission process
- All contact creation attempts are logged for debugging

