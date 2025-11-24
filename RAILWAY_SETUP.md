# Railway Environment Variables Setup

## Twilio Configuration

Add these environment variables in Railway:

```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
```

**Important:** Phone number format is `+13614541853` (no spaces, dashes, or parentheses)

## OpenAI Configuration

Add this environment variable in Railway:

```
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## How to Add in Railway

1. Go to your Railway project dashboard
2. Click on your service (the one running your app)
3. Click on the **Variables** tab
4. Click **+ New Variable** for each one
5. Add the variable name and value
6. Click **Add**
7. **Redeploy** your service (Railway should auto-redeploy, but you can trigger it manually)

## Verification

After adding all variables:
1. Check that all 4 variables are listed in Railway
2. Restart/redeploy your service
3. Test by submitting a quote request
4. Check Twilio Console → Monitor → Logs → Messaging to see if SMS was sent
5. Check your server logs to see if AI evaluation is working

## Security Notes

- ✅ Credentials are stored securely in Railway (encrypted)
- ✅ Never commit these to git
- ✅ Consider rotating the Auth Token periodically
- ✅ OpenAI API key should be kept secure

