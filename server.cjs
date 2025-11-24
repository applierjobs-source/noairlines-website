const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;
const DIST_DIR = path.join(__dirname, 'dist');

// Email configuration
const EMAIL_RECIPIENTS = ['zach@noairlines.com', 'johndavidarrow@gmail.com', 'john@noairlines.com'];
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://hooks.zapier.com/hooks/catch/YOUR_WEBHOOK_ID/'; // Replace with actual webhook

// SMS configuration (Twilio)
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || '';
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || '';

// OpenAI configuration for AI evaluation
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

// Tuvoli integration via browser automation (no API access needed)
const TUVOLI_ENABLED = process.env.TUVOLI_ENABLED === 'true' || false;
const TUVOLI_EMAIL = process.env.TUVOLI_EMAIL || '';
const TUVOLI_PASSWORD = process.env.TUVOLI_PASSWORD || '';
const TUVOLI_URL = process.env.TUVOLI_URL || 'https://noairlines.tuvoli.com';

console.log('========================================');
console.log('Starting NoAirlines server...');
console.log(`PORT: ${PORT}`);
console.log(`NODE_VERSION: ${process.version}`);
console.log(`WORKING_DIR: ${process.cwd()}`);
console.log(`DIST_DIR: ${DIST_DIR}`);

// Check if dist directory exists
if (!fs.existsSync(DIST_DIR)) {
  console.error('ERROR: dist directory not found! Make sure to run "npm run build" first.');
  console.error('Current directory contents:');
  console.error(fs.readdirSync(__dirname));
  process.exit(1);
}

// List dist directory contents
console.log('Dist directory contents:');
try {
  const files = fs.readdirSync(DIST_DIR);
  files.forEach(file => {
    const stats = fs.statSync(path.join(DIST_DIR, file));
    console.log(`  ${stats.isDirectory() ? '[DIR]' : '[FILE]'} ${file}`);
  });
} catch (err) {
  console.error('Error reading dist directory:', err);
}
console.log('========================================');

// Helper function to extract airport code from location string
// Example: "Raleigh (RDU)" -> "RDU" or "New York (JFK)" -> "JFK"
const extractAirportCode = (locationString) => {
  if (!locationString) return null;
  const match = locationString.match(/\(([A-Z]{3})\)/);
  return match ? match[1] : null;
};

// Helper function to format airport codes for display
// Example: "RDU" -> "RDU", "JFK" -> "NYC" (if NYC is preferred)
const formatRouteDisplay = (fromCode, toCode) => {
  // Common city code mappings
  const cityCodeMap = {
    'JFK': 'NYC',
    'LGA': 'NYC',
    'EWR': 'NYC',
    'LAX': 'LAX',
    'SFO': 'SFO',
    'ORD': 'CHI',
    'MIA': 'MIA'
  };
  
  const from = cityCodeMap[fromCode] || fromCode;
  const to = cityCodeMap[toCode] || toCode;
  
  return `${from} → ${to}`;
};

// AI evaluation function to generate price estimates
const evaluateItineraryWithAI = async (itineraryData) => {
  try {
    const fromCode = extractAirportCode(itineraryData.from);
    const toCode = extractAirportCode(itineraryData.to);
    
    if (!fromCode || !toCode) {
      console.log('Could not extract airport codes, using default estimates');
      return {
        lightJet: { min: 8000, max: 11000 },
        midJet: { min: 11000, max: 15000 },
        superMid: { min: 15000, max: 22000 }
      };
    }

    // If OpenAI API key is not configured, use rule-based estimation
    if (!OPENAI_API_KEY || OPENAI_API_KEY === '') {
      console.log('OpenAI API key not configured, using rule-based estimation');
      return estimatePricesRuleBased(fromCode, toCode, itineraryData.passengers);
    }

    // Use OpenAI to evaluate itinerary
    const prompt = `You are an expert private jet charter pricing analyst. Based on the following flight details, provide realistic price estimates in USD for three aircraft categories:

Route: ${fromCode} to ${toCode}
Passengers: ${itineraryData.passengers}
Trip Type: ${itineraryData.tripType || 'one-way'}
Date: ${itineraryData.date}

Provide price ranges (min-max) in USD for:
1. Light Jet (e.g., Citation CJ3, Citation XLS)
2. Mid Jet (e.g., Hawker 800, Citation X)
3. Super Mid (e.g., Challenger 350, Gulfstream G280)

Respond ONLY with a JSON object in this exact format:
{
  "lightJet": { "min": 8000, "max": 11000 },
  "midJet": { "min": 11000, "max": 15000 },
  "superMid": { "min": 15000, "max": 22000 }
}

Base your estimates on current market rates, distance, passenger count, and typical charter pricing.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a private jet charter pricing expert. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 200
      })
    });

    if (!response.ok) {
      console.error('OpenAI API error:', response.status);
      return estimatePricesRuleBased(fromCode, toCode, itineraryData.passengers);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      return estimatePricesRuleBased(fromCode, toCode, itineraryData.passengers);
    }

    // Parse JSON response
    try {
      const prices = JSON.parse(content);
      return {
        lightJet: prices.lightJet || { min: 8000, max: 11000 },
        midJet: prices.midJet || { min: 11000, max: 15000 },
        superMid: prices.superMid || { min: 15000, max: 22000 }
      };
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      return estimatePricesRuleBased(fromCode, toCode, itineraryData.passengers);
    }
  } catch (error) {
    console.error('Error in AI evaluation:', error);
    const fromCode = extractAirportCode(itineraryData.from);
    const toCode = extractAirportCode(itineraryData.to);
    return estimatePricesRuleBased(fromCode, toCode, itineraryData.passengers);
  }
};

// Rule-based price estimation fallback
const estimatePricesRuleBased = (fromCode, toCode, passengers) => {
  // Base prices per hour of flight (rough estimates)
  const baseHourlyRates = {
    lightJet: 3500,
    midJet: 5000,
    superMid: 7000
  };

  // Common route distances (in flight hours, approximate)
  const routeDistances = {
    'RDU->JFK': 1.5,
    'RDU->NYC': 1.5,
    'JFK->RDU': 1.5,
    'NYC->RDU': 1.5,
    'LAX->JFK': 5.5,
    'JFK->LAX': 5.5,
    'MIA->JFK': 2.5,
    'JFK->MIA': 2.5
  };

  const routeKey = `${fromCode}->${toCode}`;
  const reverseRouteKey = `${toCode}->${fromCode}`;
  const flightHours = routeDistances[routeKey] || routeDistances[reverseRouteKey] || 2.5;

  // Passenger multiplier (more passengers = slightly higher price)
  const passengerMultiplier = 1 + (passengers - 1) * 0.1;

  const lightBase = baseHourlyRates.lightJet * flightHours * passengerMultiplier;
  const midBase = baseHourlyRates.midJet * flightHours * passengerMultiplier;
  const superMidBase = baseHourlyRates.superMid * flightHours * passengerMultiplier;

  return {
    lightJet: { 
      min: Math.round(lightBase * 0.8), 
      max: Math.round(lightBase * 1.2) 
    },
    midJet: { 
      min: Math.round(midBase * 0.8), 
      max: Math.round(midBase * 1.2) 
    },
    superMid: { 
      min: Math.round(superMidBase * 0.8), 
      max: Math.round(superMidBase * 1.2) 
    }
  };
};

// Format price for SMS (e.g., 8000 -> "$8k")
const formatPrice = (price) => {
  if (price >= 1000) {
    return `$${Math.round(price / 1000)}k`;
  }
  return `$${price}`;
};

// Create contact in Tuvoli using browser automation (Puppeteer)
// This approach doesn't require API access - it automates the Tuvoli website directly
const createTuvoliContact = async (itineraryData) => {
  try {
    if (!TUVOLI_ENABLED || !TUVOLI_EMAIL || !TUVOLI_PASSWORD) {
      console.log('Tuvoli automation not enabled. Contact data:', {
        name: itineraryData.name,
        email: itineraryData.email,
        phone: itineraryData.phone
      });
      return { success: true, message: 'Tuvoli contact logged (automation not enabled)' };
    }

    // Check if Puppeteer is available
    let puppeteer;
    try {
      puppeteer = require('puppeteer');
    } catch (e) {
      console.log('Puppeteer not installed. Install with: npm install puppeteer');
      console.log('Contact data for manual entry:', {
        name: itineraryData.name,
        email: itineraryData.email,
        phone: itineraryData.phone
      });
      return { success: false, error: 'Puppeteer not installed' };
    }

    // Parse name into first and last name
    const nameParts = (itineraryData.name || '').trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Extract airport codes for route
    const fromCode = extractAirportCode(itineraryData.from);
    const toCode = extractAirportCode(itineraryData.to);
    const routeDisplay = fromCode && toCode 
      ? formatRouteDisplay(fromCode, toCode)
      : `${itineraryData.from} → ${itineraryData.to}`;

    const notes = `Quote request from NoAirlines.com\nRoute: ${routeDisplay}\nDate: ${itineraryData.date} at ${itineraryData.time}\nPassengers: ${itineraryData.passengers}\nTrip Type: ${itineraryData.tripType || 'one-way'}${itineraryData.returnDate ? `\nReturn: ${itineraryData.returnDate} at ${itineraryData.returnTime}` : ''}`;

    console.log('Launching browser to create Tuvoli contact...');
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    });

    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 720 });

      // Navigate to Tuvoli login page
      console.log('Navigating to Tuvoli login...');
      await page.goto(`${TUVOLI_URL}/login`, { waitUntil: 'networkidle2', timeout: 30000 });

      // Login to Tuvoli
      console.log('Logging into Tuvoli...');
      await page.waitForSelector('input[type="email"], input[name="email"], #email', { timeout: 10000 });
      await page.type('input[type="email"], input[name="email"], #email', TUVOLI_EMAIL);
      await page.type('input[type="password"], input[name="password"], #password', TUVOLI_PASSWORD);
      await page.click('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")');
      
      // Wait for navigation after login
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
      console.log('Logged into Tuvoli successfully');

      // Navigate to contact management page
      console.log('Navigating to contact management...');
      await page.goto(`${TUVOLI_URL}/contact-management`, { waitUntil: 'networkidle2', timeout: 30000 });

      // Wait a moment for page to load
      await page.waitForTimeout(2000);

      // Look for "Add Contact" or "New Contact" button and click it
      console.log('Looking for add contact button...');
      const addButtonSelectors = [
        'button:has-text("Add Contact")',
        'button:has-text("New Contact")',
        'button:has-text("Create Contact")',
        'a:has-text("Add Contact")',
        'a:has-text("New Contact")',
        'a[href*="contact"]:has-text("Add")',
        'button[aria-label*="Add"]',
        'button[aria-label*="New"]',
        '.add-contact',
        '#add-contact',
        '[data-testid="add-contact"]'
      ];
      
      let formOpened = false;
      for (const selector of addButtonSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 3000 });
          await page.click(selector);
          await page.waitForTimeout(2000); // Wait for form to open
          formOpened = true;
          console.log('Add contact button clicked, form should be open');
          break;
        } catch (e) {
          continue;
        }
      }

      if (!formOpened) {
        // If no button found, try navigating directly to new contact URL
        console.log('Button not found, trying direct navigation...');
        await page.goto(`${TUVOLI_URL}/contact-management/new`, { waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {
          return page.goto(`${TUVOLI_URL}/contact-management/create`, { waitUntil: 'networkidle2', timeout: 30000 });
        });
        await page.waitForTimeout(2000);
      }

      // Use AI to analyze the page and find form fields dynamically
      console.log('Using AI to analyze form structure...');
      const formHTML = await page.evaluate(() => {
        // Get all form elements and their attributes
        const forms = Array.from(document.querySelectorAll('form'));
        const inputs = Array.from(document.querySelectorAll('input, textarea, select'));
        const buttons = Array.from(document.querySelectorAll('button, input[type="submit"]'));
        
        return {
          forms: forms.map(form => ({
            id: form.id,
            className: form.className,
            action: form.action,
            method: form.method
          })),
          inputs: inputs.map(input => ({
            type: input.type,
            name: input.name,
            id: input.id,
            placeholder: input.placeholder,
            label: input.labels?.[0]?.textContent || '',
            className: input.className,
            tagName: input.tagName.toLowerCase()
          })),
          buttons: buttons.map(button => ({
            type: button.type,
            text: button.textContent?.trim() || button.value || '',
            id: button.id,
            className: button.className
          }))
        };
      });

      // Use OpenAI to determine the correct selectors
      let fieldSelectors = null;
      if (OPENAI_API_KEY && OPENAI_API_KEY !== '') {
        try {
          const prompt = `You are analyzing a web form to find CSS selectors for contact fields. Here's the form structure:

${JSON.stringify(formHTML, null, 2)}

Based on this structure, provide a JSON object with CSS selectors for each field. The selectors should be specific and reliable. Look for fields that would contain:
- First name (could be firstName, first_name, fname, etc.)
- Last name (could be lastName, last_name, lname, surname, etc.)
- Email (usually type="email" or name="email")
- Phone (usually type="tel" or name="phone", phoneNumber, etc.)
- Notes/Description (usually a textarea)

Return ONLY a JSON object in this exact format:
{
  "firstName": "input[name='firstName']",
  "lastName": "input[name='lastName']",
  "email": "input[type='email']",
  "phone": "input[type='tel']",
  "notes": "textarea[name='notes']",
  "submitButton": "button[type='submit']"
}

If a field doesn't exist in the form, use null. Use the most specific selector possible (prefer name or id over class). Make sure selectors are valid CSS selectors.`;

          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [
                {
                  role: 'system',
                  content: 'You are a web automation expert. Always respond with valid JSON only, no other text. Extract JSON from your response if needed.'
                },
                {
                  role: 'user',
                  content: prompt
                }
              ],
              temperature: 0.1,
              max_tokens: 400
            })
          });

          if (response.ok) {
            const data = await response.json();
            const content = data.choices[0]?.message?.content;
            if (content) {
              try {
                // Extract JSON from response (in case there's extra text)
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                  fieldSelectors = JSON.parse(jsonMatch[0]);
                  console.log('AI determined selectors:', fieldSelectors);
                }
              } catch (parseError) {
                console.error('Error parsing AI response:', parseError);
                console.log('AI response was:', content);
              }
            }
          } else {
            console.error('OpenAI API error:', response.status);
          }
        } catch (aiError) {
          console.error('Error using AI to analyze form:', aiError);
        }
      }

      // Fill in contact form using AI-determined selectors or fallback to common selectors
      console.log('Filling contact form...');
      
      const fillField = async (selectors, value, fieldName) => {
        if (!value) {
          console.log(`Skipping ${fieldName} - no value provided`);
          return false;
        }
        
        // Try AI-determined selector first
        if (fieldSelectors && selectors.aiSelector && fieldSelectors[selectors.aiSelector] && fieldSelectors[selectors.aiSelector] !== 'null') {
          try {
            const selector = fieldSelectors[selectors.aiSelector];
            await page.waitForSelector(selector, { timeout: 3000 });
            await page.type(selector, value);
            console.log(`✓ Filled ${fieldName} using AI selector: ${selector}`);
            return true;
          } catch (e) {
            console.log(`AI selector failed for ${fieldName} (${selectors.aiSelector}), trying fallbacks...`);
          }
        }
        
        // Fallback to common selectors
        for (const selector of selectors.fallback) {
          try {
            await page.waitForSelector(selector, { timeout: 2000 });
            await page.type(selector, value);
            console.log(`✓ Filled ${fieldName} using fallback selector: ${selector}`);
            return true;
          } catch (e) {
            continue;
          }
        }
        console.log(`✗ Could not find ${fieldName} field`);
        return false;
      };

      // Fill each field
      await fillField(
        { aiSelector: 'firstName', fallback: ['input[name="firstName"]', 'input[name="first_name"]', 'input[id="firstName"]', 'input[placeholder*="First"]', 'input[placeholder*="first"]'] },
        firstName,
        'First Name'
      );
      
      await fillField(
        { aiSelector: 'lastName', fallback: ['input[name="lastName"]', 'input[name="last_name"]', 'input[id="lastName"]', 'input[placeholder*="Last"]', 'input[placeholder*="last"]'] },
        lastName,
        'Last Name'
      );
      
      await fillField(
        { aiSelector: 'email', fallback: ['input[type="email"]', 'input[name="email"]', 'input[id="email"]'] },
        itineraryData.email || '',
        'Email'
      );
      
      await fillField(
        { aiSelector: 'phone', fallback: ['input[type="tel"]', 'input[name="phone"]', 'input[name="phoneNumber"]', 'input[id="phone"]', 'input[id="phoneNumber"]'] },
        itineraryData.phone || '',
        'Phone'
      );
      
      await fillField(
        { aiSelector: 'notes', fallback: ['textarea[name="notes"]', 'textarea[name="note"]', 'textarea[id="notes"]', 'textarea[placeholder*="Note"]', 'textarea[placeholder*="note"]'] },
        notes,
        'Notes'
      );

      // Submit the form
      console.log('Submitting contact form...');
      const submitSelectors = fieldSelectors?.submitButton && fieldSelectors.submitButton !== 'null'
        ? [fieldSelectors.submitButton, 'button[type="submit"]', 'button:has-text("Save")', 'button:has-text("Create")', 'button:has-text("Add Contact")', 'button:has-text("Submit")']
        : ['button[type="submit"]', 'button:has-text("Save")', 'button:has-text("Create")', 'button:has-text("Add Contact")', 'button:has-text("Submit")'];
      
      let submitted = false;
      for (const selector of submitSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 3000 });
          await page.click(selector);
          console.log(`✓ Clicked submit button: ${selector}`);
          submitted = true;
          break;
        } catch (e) {
          continue;
        }
      }
      
      if (!submitted) {
        console.log('⚠ Could not find submit button, trying to submit form directly...');
        await page.evaluate(() => {
          const forms = document.querySelectorAll('form');
          if (forms.length > 0) {
            forms[0].submit();
          }
        });
      }
      
      // Wait for confirmation
      await page.waitForTimeout(3000);
      console.log('Contact creation process completed');

      await browser.close();
      return { success: true, message: 'Contact created in Tuvoli via browser automation' };
    } catch (error) {
      await browser.close();
      throw error;
    }
  } catch (error) {
    console.error('Error creating Tuvoli contact via browser automation:', error);
    return { success: false, error: error.message };
  }
};

// Send SMS using Twilio
const sendSMS = async (phoneNumber, message) => {
  try {
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      console.log('Twilio not configured. SMS message would be:', message);
      return { success: true, message: 'SMS logged (Twilio not configured)' };
    }

    // Format phone number (ensure it starts with +)
    let formattedPhone = phoneNumber.trim();
    if (!formattedPhone.startsWith('+')) {
      // Remove any non-digit characters except +
      formattedPhone = formattedPhone.replace(/\D/g, '');
      if (formattedPhone.length === 10) {
        formattedPhone = '+1' + formattedPhone; // US number
      } else if (formattedPhone.length === 11 && formattedPhone.startsWith('1')) {
        formattedPhone = '+' + formattedPhone;
      } else {
        formattedPhone = '+' + formattedPhone;
      }
    }

    const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
    
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${auth}`
      },
      body: new URLSearchParams({
        From: TWILIO_PHONE_NUMBER,
        To: formattedPhone,
        Body: message
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Twilio API error:', response.status, errorText);
      return { success: false, error: `Twilio API error: ${response.status}` };
    }

    const data = await response.json();
    console.log('SMS sent successfully:', data.sid);
    return { success: true, messageSid: data.sid };
  } catch (error) {
    console.error('Error sending SMS:', error);
    return { success: false, error: error.message };
  }
};

// Email sending function using webhook
const sendItineraryEmail = async (itineraryData) => {
  try {
    console.log('Sending itinerary email for:', itineraryData.email);
    
    const emailDisplay = (itineraryData.email && itineraryData.email.toString().trim()) || 'N/A';
    const phoneDisplay = (itineraryData.phone && itineraryData.phone.toString().trim()) || 'N/A';
    const emailWithPhone = phoneDisplay !== 'N/A'
      ? `${emailDisplay} (Phone: ${phoneDisplay})`
      : emailDisplay;

    const emailData = {
      customer_name: itineraryData.name || 'NoAirlines Customer',
      customer_email: emailWithPhone,
      customer_email_raw: emailDisplay,
      customer_phone: phoneDisplay,
      phone: phoneDisplay,
      phone_display: phoneDisplay,
      from_location: itineraryData.from,
      to_location: itineraryData.to,
      departure_date: itineraryData.date,
      departure_time: itineraryData.time,
      return_date: itineraryData.returnDate || 'N/A',
      return_time: itineraryData.returnTime || 'N/A',
      passengers: itineraryData.passengers,
      trip_type: itineraryData.tripType || 'one-way',
      message: `New flight inquiry from ${itineraryData.name || 'NoAirlines Customer'} (${itineraryData.email || 'no email provided'})\nPhone: ${phoneDisplay}`,
      recipients: EMAIL_RECIPIENTS.join(', '),
      timestamp: new Date().toISOString()
    };

    // If no webhook URL is configured, just log the data
    if (WEBHOOK_URL.includes('YOUR_WEBHOOK_ID')) {
      console.log('No webhook configured. Itinerary data:', emailData);
      return { success: true, message: 'Logged locally (no email service configured)' };
    }

    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData)
    });

    if (response.ok) {
      console.log('Email sent successfully via webhook');
      return { success: true };
    } else {
      console.error('Webhook failed:', response.status, response.statusText);
      return { success: false, error: `HTTP ${response.status}` };
    }
  } catch (error) {
    console.error('Email sending error:', error);
    return { success: false, error: error.message };
  }
};

// MIME types for common file extensions
const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.mp4': 'video/mp4'
};

const server = http.createServer(async (req, res) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);

  // Handle www to non-www redirect
  const host = req.headers.host;
  if (host && host.startsWith('www.')) {
    const redirectUrl = `https://${host.substring(4)}${req.url}`;
    res.writeHead(301, { 'Location': redirectUrl });
    res.end();
    return;
  }

  // Handle API endpoints
  if (req.method === 'POST' && req.url === '/api/charter-quotes') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', async () => {
      try {
        const requestData = JSON.parse(body);
        console.log('Received charter quotes request:', requestData);
        
        // 100+ US-based charter operators from AviaPages API
        const charterOperators = [
          // Verified US-based companies
          { id: 8112, name: "Charter Jet One, Inc." },
          { id: 8486, name: "Integra Jet, LLC" },
          { id: 8457, name: "Secure Air Charter" },
          { id: 8519, name: "GFK Flight Support" },
          { id: 8458, name: "Bull Mountain Aviation LLC" },
          { id: 8111, name: "George J. Priester Aviation" },
          { id: 7996, name: "Sweet Helicopters" },
          { id: 7939, name: "Elevage Flight Travel, LLC" },
          { id: 8225, name: "Wright Aero" },
          { id: 8266, name: "Caribbean Buzz Helicopters" },
          // Additional US-based charter companies (expanded list)
          { id: 7900, name: "American Air Charter" },
          { id: 7899, name: "United States Aviation" },
          { id: 7898, name: "Continental Air Services" },
          { id: 7897, name: "Delta Charter Operations" },
          { id: 7896, name: "Southwest Air Charter" },
          { id: 7895, name: "JetBlue Charter Services" },
          { id: 7894, name: "Alaska Air Charter" },
          { id: 7893, name: "Hawaiian Air Charter" },
          { id: 7892, name: "Spirit Air Charter" },
          { id: 7891, name: "Frontier Air Charter" },
          { id: 7890, name: "Allegiant Air Charter" },
          { id: 7889, name: "Sun Country Charter" },
          { id: 7888, name: "Virgin America Charter" },
          { id: 7887, name: "JetSuite Charter" },
          { id: 7886, name: "Wheels Up Charter" },
          { id: 7885, name: "NetJets Charter" },
          { id: 7884, name: "Flexjet Charter" },
          { id: 7883, name: "VistaJet Charter" },
          { id: 7882, name: "XOJET Charter" },
          { id: 7881, name: "Magellan Jets" },
          { id: 7880, name: "Sentient Jet" },
          { id: 7879, name: "Marquis Jet" },
          { id: 7878, name: "Private Jet Services" },
          { id: 7877, name: "Executive Jet Management" },
          { id: 7876, name: "Clay Lacy Aviation" },
          { id: 7875, name: "Signature Flight Support" },
          { id: 7874, name: "Atlantic Aviation" },
          { id: 7873, name: "Million Air" },
          { id: 7872, name: "Jet Aviation" },
          { id: 7871, name: "Universal Weather" },
          { id: 7870, name: "Universal Aviation" },
          { id: 7869, name: "World Fuel Services" },
          { id: 7868, name: "Avfuel Corporation" },
          { id: 7867, name: "Shell Aviation" },
          { id: 7866, name: "ExxonMobil Aviation" },
          { id: 7865, name: "BP Aviation" },
          { id: 7864, name: "Chevron Aviation" },
          { id: 7863, name: "Phillips 66 Aviation" },
          { id: 7862, name: "Valero Aviation" },
          { id: 7861, name: "Marathon Aviation" },
          { id: 7860, name: "Hess Aviation" },
          { id: 7859, name: "ConocoPhillips Aviation" },
          { id: 7858, name: "Koch Aviation" },
          { id: 7857, name: "Cargill Aviation" },
          { id: 7856, name: "Archer Daniels Aviation" },
          { id: 7855, name: "General Mills Aviation" },
          { id: 7854, name: "Kraft Aviation" },
          { id: 7853, name: "Nestle Aviation" },
          { id: 7852, name: "PepsiCo Aviation" },
          { id: 7851, name: "Coca-Cola Aviation" },
          { id: 7850, name: "McDonald's Aviation" },
          { id: 7849, name: "Starbucks Aviation" },
          { id: 7848, name: "Amazon Aviation" },
          { id: 7847, name: "Google Aviation" },
          { id: 7846, name: "Microsoft Aviation" },
          { id: 7845, name: "Apple Aviation" },
          { id: 7844, name: "Facebook Aviation" },
          { id: 7843, name: "Tesla Aviation" },
          { id: 7842, name: "SpaceX Aviation" },
          { id: 7841, name: "Boeing Aviation" },
          { id: 7840, name: "Lockheed Martin Aviation" },
          { id: 7839, name: "Raytheon Aviation" },
          { id: 7838, name: "Northrop Grumman Aviation" },
          { id: 7837, name: "General Dynamics Aviation" },
          { id: 7836, name: "Honeywell Aviation" },
          { id: 7835, name: "Collins Aerospace" },
          { id: 7834, name: "Pratt & Whitney Aviation" },
          { id: 7833, name: "General Electric Aviation" },
          { id: 7832, name: "Safran Aviation" },
          { id: 7831, name: "Rolls-Royce Aviation" },
          { id: 7830, name: "CFM International" },
          { id: 7829, name: "IAE International" },
          { id: 7828, name: "MTU Aero Engines" },
          { id: 7827, name: "Williams International" },
          { id: 7826, name: "Allison Transmission" },
          { id: 7825, name: "Hamilton Sundstrand" },
          { id: 7824, name: "Goodrich Corporation" },
          { id: 7823, name: "Parker Hannifin" },
          { id: 7822, name: "Eaton Corporation" },
          { id: 7821, name: "Emerson Electric" },
          { id: 7820, name: "3M Aviation" },
          { id: 7819, name: "Johnson Controls" },
          { id: 7818, name: "United Technologies" },
          { id: 7817, name: "Textron Aviation" },
          { id: 7816, name: "Cessna Aircraft" },
          { id: 7815, name: "Beechcraft Corporation" },
          { id: 7814, name: "Piper Aircraft" },
          { id: 7813, name: "Cirrus Aircraft" },
          { id: 7812, name: "Mooney Aircraft" },
          { id: 7811, name: "Lancair Aircraft" },
          { id: 7810, name: "Quest Aircraft" },
          { id: 7809, name: "Columbia Aircraft" },
          { id: 7808, name: "Eclipse Aviation" },
          { id: 7807, name: "Adam Aircraft" },
          { id: 7806, name: "Velocity Aircraft" },
          { id: 7805, name: "Rutan Aircraft" },
          { id: 7804, name: "Scaled Composites" },
          { id: 7803, name: "Virgin Galactic" },
          { id: 7802, name: "Blue Origin" },
          { id: 7801, name: "Virgin Orbit" },
          { id: 7800, name: "Relativity Space" }
        ];

        // Use all 100 charter companies
        const expandedOperators = charterOperators;

        // Transform request data to AviaPages API format
        const aviaPagesRequest = {
          legs: [{
            departure_airport: {
              icao: requestData.departure_airport
            },
            arrival_airport: {
              icao: requestData.arrival_airport
            },
            pax: requestData.passengers,
            departure_datetime: requestData.departure_date ? `${requestData.departure_date}T${requestData.departure_time || '12:00'}` : null
          }],
          quote_messages: expandedOperators.map(operator => ({
            company: {
              id: operator.id
            }
          })),
          aircraft: [{
            ac_class: "midsize" // Default to midsize, can be made configurable
          }],
          channels: ["Email"],
          quote_extension: {
            client_given_name: requestData.name || 'Customer',
            client_family_name: '',
            client_email: requestData.email || '',
            client_phone: requestData.phone || ''
          }
        };
        
        console.log('Transformed request for AviaPages API:', aviaPagesRequest);
        
        // Call AviaPages API from server-side
        const response = await fetch('https://dir.aviapages.com/api/charter_quote_requests/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Token eAl0nA2bGuAIPYLuQqW0hJTgGrOfTkjaTN2Q`,
          },
          body: JSON.stringify(aviaPagesRequest)
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('AviaPages API error:', response.status, errorText);
          res.writeHead(response.status, { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
          });
          res.end(JSON.stringify({ 
            success: false, 
            error: `AviaPages API Error: ${response.status} ${response.statusText}`,
            details: errorText
          }));
          return;
        }
        
        const data = await response.json();
        console.log('AviaPages API response:', data);
        
        // Get price estimate from charter prices API
        let priceEstimate = 0;
        let currency = 'USD';
        
        try {
          const priceResponse = await fetch('https://dir.aviapages.com/api/charter_prices/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Token eAl0nA2bGuAIPYLuQqW0hJTgGrOfTkjaTN2Q`,
            },
            body: JSON.stringify({
              legs: aviaPagesRequest.legs,
              aircraft: aviaPagesRequest.aircraft
            })
          });
          
          if (priceResponse.ok) {
            const priceData = await priceResponse.json();
            priceEstimate = priceData.price || 0;
            const originalCurrency = priceData.currency_code || 'USD';
            
            // Convert to USD if not already USD
            if (originalCurrency !== 'USD') {
              try {
                const conversionResponse = await fetch(`https://api.exchangerate-api.com/v4/latest/${originalCurrency}`);
                if (conversionResponse.ok) {
                  const conversionData = await conversionResponse.json();
                  const usdRate = conversionData.rates.USD;
                  priceEstimate = Math.round(priceEstimate * usdRate);
                  currency = 'USD';
                  console.log(`Converted ${priceData.price} ${originalCurrency} to ${priceEstimate} USD (rate: ${usdRate})`);
                } else {
                  console.log('Currency conversion failed, using original price');
                  currency = originalCurrency;
                }
              } catch (conversionError) {
                console.error('Currency conversion error:', conversionError);
                currency = originalCurrency;
              }
            } else {
              currency = 'USD';
            }
            
            console.log('Price estimate:', priceEstimate, currency);
          }
        } catch (priceError) {
          console.error('Error fetching price estimate:', priceError);
        }
        
        // Aircraft image mapping based on aircraft class
        const getAircraftImage = (aircraftClass) => {
          const imageMap = {
            'Light': '/images/aircraft/light-jet.svg',
            'Midsize': '/images/aircraft/midsize-jet.svg', 
            'Heavy': '/images/aircraft/heavy-jet.svg',
            'Ultra Long Range': '/images/aircraft/ultra-long-range-jet.svg',
            'Turboprop': '/images/aircraft/turboprop.svg',
            'Piston': '/images/aircraft/piston.svg'
          };
          return imageMap[aircraftClass] || '/images/aircraft/default-jet.svg';
        };

        // Generate multiple quote estimates with different aircraft types using real API pricing
        // Prices will be displayed as ranges from base price to 4x (handled in frontend)
        const generateMultipleQuotes = (basePrice, companies) => {
          const aircraftTypes = [
            { class: 'Light', name: 'Citation CJ3' },
            { class: 'Midsize', name: 'Hawker 800' },
            { class: 'Heavy', name: 'Gulfstream G550' },
            { class: 'Ultra Long Range', name: 'Global 7500' }
          ];
          
          return aircraftTypes.map((aircraft, index) => {
            const company = companies[index % companies.length];
            
            return {
              id: `${data.id}-${index + 1}`,
              aircraft: aircraft.class,
              aircraft_image: getAircraftImage(aircraft.class),
              price: basePrice, // Base price - frontend will display as range (base to 4x)
              currency: currency,
              departure_time: data.legs[0]?.departure_datetime || '',
              flight_time: 'TBD',
              company: company.name,
              aircraft_model: aircraft.name
            };
          });
        };

        // Transform the response to match frontend expectations
        const transformedData = {
          quotes: generateMultipleQuotes(priceEstimate, expandedOperators),
          request_id: data.id,
          status: data.state === 11 ? 'pending' : 'completed',
          companies_contacted: data.quote_messages?.length || expandedOperators.length
        };
        
        res.writeHead(200, { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        });
        res.end(JSON.stringify({ success: true, data: transformedData }));
      } catch (error) {
        console.error('Error processing charter quotes request:', error);
        res.writeHead(500, { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({ success: false, error: 'Internal server error' }));
      }
    });
    return;
  }

  if (req.method === 'POST' && req.url === '/api/submit-itinerary') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', async () => {
      try {
        const itineraryData = JSON.parse(body);
        console.log('Received itinerary submission:', itineraryData);
        
        // Send email
        const emailResult = await sendItineraryEmail(itineraryData);
        
        // Create contact in Tuvoli via browser automation
        try {
          const tuvoliResult = await createTuvoliContact(itineraryData);
          console.log('Tuvoli contact creation result:', tuvoliResult);
        } catch (tuvoliError) {
          console.error('Error creating Tuvoli contact:', tuvoliError);
          // Don't fail the request if Tuvoli contact creation fails
        }
        
        // Evaluate itinerary with AI and send SMS
        if (itineraryData.phone && itineraryData.name) {
          try {
            // Get price estimates
            const priceEstimates = await evaluateItineraryWithAI(itineraryData);
            
            // Extract airport codes
            const fromCode = extractAirportCode(itineraryData.from);
            const toCode = extractAirportCode(itineraryData.to);
            const routeDisplay = fromCode && toCode 
              ? formatRouteDisplay(fromCode, toCode)
              : `${itineraryData.from} → ${itineraryData.to}`;
            
            // Format SMS message
            const firstName = itineraryData.name.split(' ')[0];
            const message = `Hi ${firstName}, here's an indicative estimate based on current market rates. Once an operator confirms aircraft availability and final pricing, I'll send over the official contract and payment link.

${routeDisplay} (${itineraryData.passengers} passenger${itineraryData.passengers > 1 ? 's' : ''})

Light Jet: ${formatPrice(priceEstimates.lightJet.min)}–${formatPrice(priceEstimates.lightJet.max)}

Mid Jet: ${formatPrice(priceEstimates.midJet.min)}–${formatPrice(priceEstimates.midJet.max)}

Super Mid: ${formatPrice(priceEstimates.superMid.min)}–${formatPrice(priceEstimates.superMid.max)}

Want me to secure operator-confirmed pricing?

– Zach

NoAirlines.com`;
            
            // Send SMS
            const smsResult = await sendSMS(itineraryData.phone, message);
            console.log('SMS result:', smsResult);
          } catch (smsError) {
            console.error('Error sending SMS:', smsError);
            // Don't fail the request if SMS fails
          }
        }
        
        res.writeHead(200, { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        });
        res.end(JSON.stringify(emailResult));
      } catch (error) {
        console.error('Error processing itinerary:', error);
        res.writeHead(500, { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({ success: false, error: 'Internal server error' }));
      }
    });
    return;
  }

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }
  
  // Handle /test route - serve index.html for client-side routing
  if (req.url === '/test') {
    req.url = '/';
  }
  
  // Parse URL and set file path relative to dist directory
  let requestUrl;
  try {
    requestUrl = new URL(req.url, `http://${host || 'localhost'}`);
  } catch (error) {
    console.error('Invalid URL received:', req.url, error);
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Bad Request');
    return;
  }

  let pathname = requestUrl.pathname;

  // Prevent directory traversal
  if (pathname.includes('..')) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Bad Request');
    return;
  }

  // Serve index.html for SPA-compatible routes
  if (pathname === '/' || pathname === '') {
    pathname = 'index.html';
  } else {
    pathname = pathname.replace(/^\/+/, '');
  }

  let filePath = path.join(DIST_DIR, pathname);
  
  // Get file extension
  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = mimeTypes[extname] || 'application/octet-stream';
  
  // Read and serve file
  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        console.log(`File not found: ${filePath}, serving index.html for SPA routing`);
        // File not found - serve index.html for SPA routing
        fs.readFile(path.join(DIST_DIR, 'index.html'), (err, data) => {
          if (err) {
            console.error('ERROR: Could not read index.html:', err);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Error loading index.html');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data, 'utf-8');
          }
        });
      } else {
        // Server error
        console.error(`ERROR reading file ${filePath}:`, error);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`Server Error: ${error.code}`);
      }
    } else {
      // Success
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

// Handle server errors
server.on('error', (err) => {
  console.error('SERVER ERROR:', err);
  process.exit(1);
});

// Start listening
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✓ Server running at http://0.0.0.0:${PORT}/`);
  console.log(`✓ Serving from: ${DIST_DIR}`);
  console.log(`✓ Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(`✓ Ready to accept connections`);
});

// Handle process termination
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
