# Troubleshooting SMS Not Sending

## Step 1: Check Railway Logs

1. Go to your Railway project dashboard
2. Click on your service
3. Click on the **Deployments** tab
4. Click on the latest deployment
5. Click **View Logs** or open the **Logs** tab
6. Look for:
   - `Received itinerary submission:` - confirms the request was received
   - `SMS result:` - shows if SMS was attempted
   - `Error sending SMS:` - shows any errors
   - `Twilio API error:` - shows Twilio-specific errors

**What to look for:**
- If you see "Twilio not configured" → Environment variables aren't loaded
- If you see "Twilio API error: 401" → Wrong credentials
- If you see "Twilio API error: 400" → Phone number format issue
- If you see "SMS sent successfully" → SMS was sent, check Twilio logs

## Step 2: Check Twilio Console Logs

1. Go to https://console.twilio.com
2. Click **Monitor** in the left sidebar
3. Click **Logs** → **Messaging**
4. Look for recent messages

**What to look for:**
- **Queued** → Message is in queue (wait a moment)
- **Sent** → Message was sent successfully
- **Delivered** → Message was delivered to phone
- **Failed** → Click on it to see error details
- **No messages** → SMS was never attempted (check Railway logs)

## Step 3: Verify Environment Variables

In Railway:
1. Go to your service → **Variables** tab
2. Verify all 4 variables are present:
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_PHONE_NUMBER`
   - `OPENAI_API_KEY`
3. Check that values are correct (no extra spaces, correct format)

**Phone Number Format:**
- ✅ Correct: `+13614541853`
- ❌ Wrong: `(361) 454-1853`
- ❌ Wrong: `361-454-1853`
- ❌ Wrong: `13614541853` (missing +)

## Step 4: Test Phone Number Format

The phone number you enter in the form should be:
- Any format is OK (the code will format it)
- But check Railway logs to see what format was sent to Twilio

## Step 5: Check Common Issues

### Issue: "Twilio not configured"
**Solution:** Environment variables aren't loaded. Redeploy your service in Railway.

### Issue: "401 Unauthorized"
**Solution:** Wrong Account SID or Auth Token. Double-check in Railway variables.

### Issue: "400 Bad Request - Invalid 'To' Phone Number"
**Solution:** Phone number format issue. Check that TWILIO_PHONE_NUMBER is `+13614541853` format.

### Issue: "21608 - Unable to create record"
**Solution:** Your Twilio number might not have SMS capability. Check in Twilio Console → Phone Numbers.

### Issue: No error, but no SMS
**Solution:** 
1. Check Twilio Console → Monitor → Logs → Messaging
2. Check if message is "Failed" status
3. Check if your phone number is blocked or carrier is blocking

## Step 6: Add Debug Logging

If you want more detailed logs, we can add console.log statements to see exactly what's happening.

## Quick Test

Try submitting a quote again and immediately check:
1. Railway logs (should show "SMS result:")
2. Twilio Console → Monitor → Logs → Messaging (should show a new message)

Let me know what you see in the logs!

