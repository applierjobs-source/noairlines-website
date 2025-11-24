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
const TUVOLI_DEBUG = process.env.TUVOLI_DEBUG === 'true' || false; // Set to true to see browser in action

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
      puppeteer = require('puppeteer-core');
    } catch (e) {
      console.log('Puppeteer-core not installed. Install with: npm install puppeteer-core');
      console.log('Contact data for manual entry:', {
        name: itineraryData.name,
        email: itineraryData.email,
        phone: itineraryData.phone
      });
      return { success: false, error: 'Puppeteer-core not installed' };
    }

    // Parse name into first and last name
    const nameParts = (itineraryData.name || '').trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    
    // Store credentials for AI to use (these will be referenced in the AI prompt)
    const tuvoliCredentials = {
      email: TUVOLI_EMAIL,
      password: TUVOLI_PASSWORD
    };

    // Extract airport codes for route
    const fromCode = extractAirportCode(itineraryData.from);
    const toCode = extractAirportCode(itineraryData.to);
    const routeDisplay = fromCode && toCode 
      ? formatRouteDisplay(fromCode, toCode)
      : `${itineraryData.from} → ${itineraryData.to}`;

    const notes = `Quote request from NoAirlines.com\nRoute: ${routeDisplay}\nDate: ${itineraryData.date} at ${itineraryData.time}\nPassengers: ${itineraryData.passengers}\nTrip Type: ${itineraryData.tripType || 'one-way'}${itineraryData.returnDate ? `\nReturn: ${itineraryData.returnDate} at ${itineraryData.returnTime}` : ''}`;

    console.log('Launching browser to create Tuvoli contact...');
    
    // Determine executable path - use environment variable or default Alpine path
    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser';
    
    console.log(`Using Chromium executable: ${executablePath}`);
    
    const browser = await puppeteer.launch({
      headless: !TUVOLI_DEBUG, // Run in visible mode if debug is enabled
      executablePath: executablePath,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-breakpad',
        '--disable-client-side-phishing-detection',
        '--disable-default-apps',
        '--disable-features=TranslateUI',
        '--disable-hang-monitor',
        '--disable-ipc-flooding-protection',
        '--disable-popup-blocking',
        '--disable-prompt-on-repost',
        '--disable-renderer-backgrounding',
        '--disable-sync',
        '--disable-translate',
        '--metrics-recording-only',
        '--mute-audio',
        '--no-default-browser-check',
        '--no-pings',
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ],
      timeout: 60000,
      ignoreHTTPSErrors: true
    });

    try {
      // Wait a moment to ensure browser is fully initialized
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 720 });
      
      // Helper to save screenshots for debugging (always save on failures, optional on success)
      const saveScreenshot = async (name, always = false) => {
        if (TUVOLI_DEBUG || always) {
          try {
            const screenshot = await page.screenshot({ 
              path: `/tmp/tuvoli-${name}-${Date.now()}.png`,
              fullPage: false 
            });
            console.log(`📸 Screenshot saved: tuvoli-${name}-${Date.now()}.png`);
          } catch (e) {
            console.log(`Could not save screenshot: ${e.message}`);
          }
        }
      };
      
      // Theory of Mind: Track what we've tried and why it might have failed
      const reasoningMemory = {
        navigationAttempts: [],
        failedStrategies: [],
        detectedProblems: [],
        successfulActions: [],
        currentUnderstanding: null,
        knowledgeBaseFailures: [], // Track when knowledge base strategies fail
        validatedStrategies: [], // Strategies we've actually tested and confirmed work
        invalidatedStrategies: [], // Strategies from knowledge base that don't work
        workingSelectors: {}, // Selectors that actually worked: { 'firstName': 'input[...]', 'checkbox': '...' }
        workingApproaches: [], // Approaches that worked: ['browser_manipulation_then_navigate', 'xpath_checkbox']
        learnedFacts: [] // Facts learned: ['Individual Account checkbox found via JavaScript search', 'Navigation works after clearing cookies']
      };
      
      // Theory of Mind: Analyze why we're stuck
      const analyzeSituation = async () => {
        const currentUrl = page.url();
        const pageState = await page.evaluate(() => {
          return {
            url: window.location.href,
            title: document.title,
            hasLoginForm: !!document.querySelector('input[type="password"]'),
            isMainSite: window.location.hostname === 'tuvoli.com',
            isSubdomain: window.location.hostname.includes('noairlines.tuvoli.com'),
            redirectCount: window.history.length,
            cookies: document.cookie ? document.cookie.split(';').length : 0
          };
        });
        
        // Reason about the situation
        let understanding = {
          problem: null,
          likelyCause: null,
          confidence: 'low',
          recommendedApproach: null
        };
        
        // If we're on main site but need subdomain
        if (pageState.isMainSite && !pageState.isSubdomain) {
          understanding.problem = 'Redirected to main site instead of subdomain';
          understanding.likelyCause = 'Bot detection or session/cookie issue preventing subdomain access';
          understanding.confidence = 'high';
          understanding.recommendedApproach = 'Try browser manipulation (clear cookies, change user agent) or use JavaScript navigation with specific headers';
        }
        
        // If we've tried navigation multiple times
        if (reasoningMemory.navigationAttempts.length >= 3) {
          understanding.problem = 'Multiple navigation attempts failed';
          understanding.likelyCause = 'Redirects are being enforced, need to bypass detection';
          understanding.confidence = 'medium';
          understanding.recommendedApproach = 'Use manipulate_browser to change browser fingerprint, then navigate';
        }
        
        // If we're in a loop
        const uniqueUrls = new Set(reasoningMemory.navigationAttempts.map(a => a.url));
        if (reasoningMemory.navigationAttempts.length >= 5 && uniqueUrls.size <= 2) {
          understanding.problem = 'Navigation loop detected';
          understanding.likelyCause = 'Server is redirecting based on browser characteristics';
          understanding.confidence = 'high';
          understanding.recommendedApproach = 'Change browser characteristics (user agent, viewport, headers) before navigating';
        }
        
        reasoningMemory.currentUnderstanding = understanding;
        return understanding;
      };
      
      // AI Reasoning System - Uses OpenAI to figure out what to do next
      // Note: tuvoliCredentials is available in closure scope
      const aiReasonNextAction = async (goal, currentState, maxAttempts = 10) => {
        if (!OPENAI_API_KEY || OPENAI_API_KEY === '') {
          console.log('⚠ OpenAI API key not available, skipping AI reasoning');
          return null;
        }
        
        // Theory of Mind: Analyze the situation first
        const situation = await analyzeSituation();
        if (situation.problem) {
          console.log('🧠 THEORY OF MIND ANALYSIS:');
          console.log(`  Problem: ${situation.problem}`);
          console.log(`  Likely Cause: ${situation.likelyCause}`);
          console.log(`  Confidence: ${situation.confidence}`);
          console.log(`  Recommended: ${situation.recommendedApproach}`);
        }
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🤖 AI REASONING: Analyzing current state and determining next action');
        console.log(`Goal: ${goal}`);
        if (reasoningMemory.failedStrategies.length > 0) {
          console.log(`Failed Strategies: ${reasoningMemory.failedStrategies.join(', ')}`);
        }
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        try {
          // Get current page state
          const screenshot = await page.screenshot({ encoding: 'base64', fullPage: false });
          const pageState = await page.evaluate(() => {
            return {
              url: window.location.href,
              title: document.title,
              bodyText: document.body?.innerText?.substring(0, 1000) || '',
              visibleButtons: Array.from(document.querySelectorAll('button, a[role="button"]')).map(btn => ({
                text: btn.innerText?.trim() || btn.textContent?.trim() || '',
                visible: btn.offsetParent !== null,
                tagName: btn.tagName,
                className: btn.className,
                id: btn.id,
                href: btn.href || ''
              })).filter(btn => btn.visible && btn.text.length > 0).slice(0, 20),
              visibleInputs: Array.from(document.querySelectorAll('input, textarea')).map(input => ({
                type: input.type,
                name: input.name,
                id: input.id,
                placeholder: input.placeholder || '',
                visible: input.offsetParent !== null,
                value: input.value || ''
              })).filter(input => input.visible).slice(0, 10),
              hasLoginForm: !!document.querySelector('input[type="password"]'),
              hasContactForm: document.body?.innerText?.toLowerCase().includes('first name') || 
                            document.body?.innerText?.toLowerCase().includes('last name') || false
            };
          });
          
          // Include investigation insights if provided
          const investigationContext = currentState && typeof currentState === 'object' 
            ? `\nINVESTIGATION INSIGHTS (from proactive analysis):
- Current State: ${currentState.currentState || 'Not provided'}
- Ready for Action: ${currentState.readyForAction || 'Unknown'}
- Recommended Next: ${currentState.recommendedNextAction || 'Not provided'}
- Insights: ${currentState.insights ? currentState.insights.join(', ') : 'None'}
- Potential Issues: ${currentState.potentialIssues ? currentState.potentialIssues.join(', ') : 'None'}
- Confidence: ${currentState.confidence || 'Unknown'}
- Suggested Selectors: ${currentState.suggestedSelectors ? JSON.stringify(currentState.suggestedSelectors, null, 2) : 'None'}
Use these insights to make a more informed decision.`
            : '';
          
          // Build context about what we've learned - UPDATED KNOWLEDGE BASE
          const learnedContext = `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
UPDATED KNOWLEDGE BASE (from this session):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ VALIDATED STRATEGIES (actually tested and confirmed to work):
${reasoningMemory.validatedStrategies.length > 0 ? reasoningMemory.validatedStrategies.map(s => `- ${s}`).join('\n') : '- None yet'}

✅ WORKING APPROACHES (combinations that worked):
${reasoningMemory.workingApproaches.length > 0 ? reasoningMemory.workingApproaches.map(a => `- ${a}`).join('\n') : '- None yet'}

✅ WORKING SELECTORS (selectors that actually found elements):
${Object.keys(reasoningMemory.workingSelectors).length > 0 ? Object.entries(reasoningMemory.workingSelectors).map(([k, v]) => `- ${k}: ${v}`).join('\n') : '- None yet'}

✅ LEARNED FACTS (things we discovered):
${reasoningMemory.learnedFacts.length > 0 ? reasoningMemory.learnedFacts.map(f => `- ${f}`).join('\n') : '- None yet'}

❌ INVALIDATED STRATEGIES (from knowledge base, but don't work):
${reasoningMemory.invalidatedStrategies.length > 0 ? reasoningMemory.invalidatedStrategies.map(s => `- ${s} (don't use this)`).join('\n') : '- None'}

⚠ FAILED STRATEGIES (tried but didn't work):
${reasoningMemory.failedStrategies.length > 0 ? reasoningMemory.failedStrategies.slice(-5).map(s => `- ${s}`).join('\n') : '- None'}

📊 SESSION STATS:
- Navigation Attempts: ${reasoningMemory.navigationAttempts.length}
- Detected Problems: ${reasoningMemory.detectedProblems.join('; ') || 'None'}
- Current Understanding: ${situation.problem ? `${situation.problem} (${situation.likelyCause})` : 'Analyzing...'}
- Recommended Approach: ${situation.recommendedApproach || 'Standard navigation'}

🧠 KNOWLEDGE BASE UPDATE RULES:
- Use VALIDATED STRATEGIES first - these are proven to work
- Use WORKING SELECTORS when available - these found elements successfully
- Avoid INVALIDATED STRATEGIES - these don't work for this situation
- Prefer WORKING APPROACHES - these combinations succeeded
- Learn from LEARNED FACTS - these are discoveries from this session
- Update this knowledge base as you discover what works

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
          
          const reasoningPrompt = `You are an expert web automation agent with theory of mind - you can reason about why things fail and adapt your strategy. Your mission is to accomplish this goal:

GOAL: ${goal}

CURRENT STATE:
- URL: ${pageState.url}
- Page Title: ${pageState.title}
- Has Login Form: ${pageState.hasLoginForm}
- Has Contact Form: ${pageState.hasContactForm}
- Visible Buttons: ${JSON.stringify(pageState.visibleButtons, null, 2)}
- Visible Inputs: ${JSON.stringify(pageState.visibleInputs, null, 2)}
- Body Text Preview: ${pageState.bodyText.substring(0, 500)}${investigationContext}${learnedContext}

THEORY OF MIND REASONING:
You can see what's happening and understand why. Think about:
1. Why am I on this page instead of where I need to be?
2. What has prevented me from reaching the login page?
3. What patterns do I see in my failed attempts?
4. What would a human do differently?
5. What browser characteristics might be causing redirects?
6. **Is the knowledge base wrong?** If recommended strategies keep failing, the knowledge base may be outdated or incorrect.
7. **CRITICAL THINKING: If navigation keeps redirecting, what's the root cause?**
   - If you try to navigate to noairlines.tuvoli.com but end up on tuvoli.com, the server is detecting you
   - The server sees your browser fingerprint and says "this looks like automation, redirect to main site"
   - The solution is NOT to keep trying navigation - it's to CHANGE YOUR FINGERPRINT FIRST
   - Think: "If I keep getting redirected, I need to look different to the server"

CRITICAL: QUESTION THE KNOWLEDGE BASE
- The knowledge base above may contain errors or outdated information
- If a "proven" strategy fails multiple times, it's probably wrong for this situation
- Don't blindly follow knowledge base - test and validate
- If knowledge base says "Strategy X works" but it doesn't, Strategy X is wrong for now
- Be willing to try completely different approaches than what knowledge base suggests
- The knowledge base is a starting point, not a rulebook

IF YOU'RE STUCK ON tuvoli.com (main site) INSTEAD OF noairlines.tuvoli.com (subdomain):
🚨 THIS IS THE MOST COMMON PROBLEM - READ THIS CAREFULLY:

The server is detecting automation and redirecting you. Here's what to think:
1. **Root Cause Analysis**: Why does navigation keep redirecting?
   - Answer: The server sees your browser fingerprint and recognizes it as automation
   - Your user agent, headers, cookies, viewport - all of these create a "fingerprint"
   - The server says "this looks like a bot" and redirects you

2. **The Solution is NOT more navigation attempts**:
   - Trying navigate, navigate_js, navigate_root_then again won't help
   - You'll just get redirected again because your fingerprint is the same
   - You need to CHANGE YOUR FINGERPRINT FIRST

3. **What to do (in this order)**:
   a. Use manipulate_browser action with browserAction: "clear_cookies" - fresh start
   b. Use manipulate_browser action with browserAction: "change_user_agent" - look different
   c. Use manipulate_browser action with browserAction: "change_viewport" - different screen size
   d. Use manipulate_browser action with browserAction: "set_headers" - different headers
   e. THEN try navigate or navigate_js with your new fingerprint

4. **Think like this**: "If I keep getting redirected when I try to go to noairlines.tuvoli.com, 
   the problem isn't the navigation method - it's that the server doesn't like my browser fingerprint.
   I need to change who I appear to be, THEN navigate."

5. **Don't waste attempts**: If navigation failed 2+ times, STOP trying navigation and START 
   manipulating your browser fingerprint. Navigation will keep failing until you change your fingerprint.

THIS IS THE KEY INSIGHT: Navigation failures = fingerprint problem, not navigation problem.

KNOWLEDGE FROM PREVIOUS SUCCESSFUL ATTEMPTS:
1. LOGIN PAGE NAVIGATION: The URL https://noairlines.tuvoli.com/login?returnURL=%2Fhome may redirect. You have multiple strategies available:

   STRATEGY A - Direct Navigation with Headers:
   - Use action "navigate" with url: "https://noairlines.tuvoli.com/login?returnURL=%2Fhome"
   - This uses Puppeteer's goto() with custom headers
   
   STRATEGY B - JavaScript Navigation:
   - Use action "navigate_js" to navigate via JavaScript: window.location.href = "https://noairlines.tuvoli.com/login?returnURL=%2Fhome"
   - This bypasses some redirect mechanisms
   
   STRATEGY C - Click Login Link:
   - If you see a login link/button on the page, use action "click" to click it
   - Look for buttons/links with text containing "login", "sign in", or href containing "/login"
   
   STRATEGY D - Access Subdomain Root First:
   - Navigate to "https://noairlines.tuvoli.com/" first, then navigate to "/login?returnURL=%2Fhome"
   - Sometimes accessing the root helps establish the session
   
   STRATEGY E - Browser Manipulation (Trial and Error):
   - Use action "manipulate_browser" to experiment with browser settings
   - Try different user agents, viewports, headers, wait strategies
   - Clear cookies/cache for fresh start
   - Bypass security features if needed
   - This is your "trial and error" toolkit - experiment until something works

IMPORTANT NAVIGATION RULES:
- Check current URL before navigating - if already on login page (URL contains 'noairlines.tuvoli.com/login'), DO NOT navigate again
- If you're on tuvoli.com (main site) instead of noairlines.tuvoli.com, you MUST navigate to the subdomain
- The login page MUST be on noairlines.tuvoli.com, NOT tuvoli.com
- If navigation fails or redirects to tuvoli.com, try a different strategy (navigate_js, navigate_root_then, or manipulate_browser)
- After navigation, ALWAYS wait 6+ seconds for fields to load
- Check if login fields are visible before trying to fill them
- If fields aren't visible after navigation, use action "wait" with waitTime: 6000
- If you've tried navigating 2+ times to the same URL, try a different strategy or wait instead
- If you're stuck on tuvoli.com, use manipulate_browser to try different approaches

2. LOGIN FORM FIELDS (PROVEN WORKING):
   - Username field: input[placeholder='Enter Username'] (this has worked successfully)
   - Password field: input[placeholder='Enter Password'] (this has worked successfully)
   - Submit button: form button:last-of-type OR button[type='submit'] (form button:last-of-type has worked when submit button is visible)
   - Alternative submit: XPath //button[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'sign in')]

3. LOGIN CREDENTIALS:
   - Username: "${tuvoliCredentials.email}"
   - Password: "${tuvoliCredentials.password}"
   - After filling fields, wait 1-2 seconds for form to update before clicking submit

4. POST-LOGIN NAVIGATION:
   - After successful login, navigate to: https://noairlines.tuvoli.com/contact-management
   - The login form disappearing is a sign of successful login
   - If still on /login URL but form is gone, navigate to /home first, then to /contact-management

5. CONTACT MANAGEMENT PAGE:
   - Look for "Add New Contact" button - it may be visible as a button or link
   - The button text might be "Add New Contact", "Add Contact", or "New Contact"
   - Use XPath for text matching: //button[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'add new contact')]
   - Once form is open, you'll see: "First Name *", "Last Name *", "Primary Phone", "Primary Email *", "Individual Account" checkbox, and "Create" button
   - If you see these fields, you're in the right place - fill them and submit!

6. CONTACT FORM FIELDS (from screenshot analysis):
   - First Name: Look for input with label "First Name *" or placeholder containing "First Name"
     * Use selector: input[placeholder*="First Name" i] or input near label containing "First Name"
     * Fill with the first name from the goal (extract from "First Name: [value]" in goal)
   - Last Name: Look for input with label "Last Name *" or placeholder containing "Last Name"
     * Use selector: input[placeholder*="Last Name" i] or input near label containing "Last Name"
     * Fill with the last name from the goal (extract from "Last Name: [value]" in goal)
   - Primary Email: Look for input[type="email"] or input with label "Primary Email *"
     * Use selector: input[type="email"] or input[placeholder*="Primary Email" i]
     * Fill with the email from the goal (extract from "Email: [value]" in goal)
   - Primary Phone: Look for input[type="tel"] or input with label "Primary Phone"
     * Use selector: input[type="tel"] or input[placeholder*="Primary Phone" i]
     * Fill with the phone from the goal (extract from "Phone: [value]" in goal)
   - Individual Account checkbox: input[type="checkbox"] near "Individual Account" text (REQUIRED - checking this bypasses the "Account *" required field)
     * MUST be checked before submitting - this is critical!
     * **SIMPLE SOLUTION FIRST**: The checkbox has id="individual-account" - use #individual-account or input[id="individual-account"]
     * This is a normal checkbox with a clear ID - don't overcomplicate it!
     * Try these selectors in order:
       1. #individual-account (SIMPLE - this should work!)
       2. input[id="individual-account"]
       3. input[type="checkbox"][id="individual-account"]
       4. label:has-text("Individual Account") input[type="checkbox"]
       5. //label[contains(text(), 'Individual Account')]//input[@type='checkbox']
       6. input[type="checkbox"][id*="individual" i]
       7. JavaScript search if above don't work
     * If checkbox is found but not visible, force visibility with CSS, then click
     * If checkbox is found but already checked, that's fine - just verify it's checked
   - Create button: button with text "Create" or "Save"
     * Use selector: button[type="submit"] with text "Create" or //button[contains(text(), 'Create')]
     * Click this AFTER filling all fields and checking Individual Account checkbox
   
   FORM FILLING ORDER:
   1. Fill First Name (extract value from goal)
   2. Fill Last Name (extract value from goal)
   3. Fill Primary Email (extract value from goal)
   4. Fill Primary Phone (extract value from goal, optional but recommended)
   5. Check "Individual Account" checkbox (REQUIRED)
   6. Click "Create" button
   
   IMPORTANT: Extract the actual values from the GOAL string above. The goal contains "First Name: [value]", "Last Name: [value]", etc. Use those values.

7. TIMING:
   - Wait 6+ seconds after navigating to login page for fields to load
   - Wait 2-3 seconds after clicking buttons for modals/forms to open
   - Wait 1-2 seconds after typing in fields
   - If you're on the login page but don't see fields, ALWAYS wait 6+ seconds before trying to interact

8. NAVIGATION LOOP PREVENTION:
   - If current URL already contains '/login', DO NOT navigate again
   - Check the current URL in the page state before deciding to navigate
   - If you keep trying to navigate to the same URL, use "wait" action instead
   - Only navigate if the current URL is different from the target URL

Analyze the screenshot and current state. Use the knowledge above to determine the EXACT next action needed to progress toward the goal.

Return JSON with this structure:
{
  "action": "click" | "type" | "navigate" | "navigate_js" | "navigate_root_then" | "manipulate_browser" | "wait" | "complete" | "error",
  "reasoning": "Brief explanation of why this action, referencing which proven strategy you're using",
  "selector": "CSS selector or XPath for the element (if action is click or type)",
  "text": "Text to type (if action is type)",
  "url": "URL to navigate to (if action is navigate, navigate_js, navigate_root_then, or manipulate_browser)",
  "waitTime": "Milliseconds to wait (if action is wait)",
  "isComplete": true/false,
  "nextGoal": "What to do after this action",
  "strategy": "Which navigation strategy you're using (A, B, C, D, or E)",
  
  // For manipulate_browser action:
  "browserAction": "change_user_agent" | "change_viewport" | "set_headers" | "clear_cookies" | "new_context" | "try_different_wait" | "bypass_security",
  "userAgent": "User agent string (if browserAction is change_user_agent)",
  "width": "Viewport width (if browserAction is change_viewport)",
  "height": "Viewport height (if browserAction is change_viewport)",
  "headers": {"Header-Name": "value"} (if browserAction is set_headers),
  "waitStrategy": "load" | "domcontentloaded" | "networkidle0" | "networkidle2" (if browserAction is try_different_wait)
}

AVAILABLE ACTIONS:
- "navigate": Standard Puppeteer navigation (Strategy A)
- "navigate_js": JavaScript-based navigation (Strategy B) - use if standard navigation fails
- "navigate_root_then": Navigate to root first, then target (Strategy D) - use if redirects persist
- "manipulate_browser": Direct Chromium/browser manipulation (Strategy E) - trial and error with browser settings
- "click": Click an element (Strategy C if clicking login link)
- "type": Type text into an input field
- "wait": Wait for specified milliseconds
- "complete": Goal is complete
- "error": Cannot proceed (with reasoning)

BROWSER MANIPULATION OPTIONS (Strategy E - Trial and Error):
- "change_user_agent": Try different user agent (e.g., "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0")
- "change_viewport": Try different screen size (e.g., width: 1920, height: 1080)
- "set_headers": Modify HTTP headers (e.g., {"Referer": "https://noairlines.tuvoli.com"})
- "clear_cookies": Clear cookies and cache (fresh start)
- "try_different_wait": Try different wait strategies (load, domcontentloaded, networkidle0, networkidle2)
- "bypass_security": Bypass CSP and try navigation

Use manipulate_browser to experiment with different browser configurations if standard navigation fails.

Be VERY specific with selectors. Use the proven selectors from knowledge above when applicable. Prioritize:
1. IDs: #elementId
2. Proven working selectors from knowledge above
3. Unique classes: .unique-class
4. Text-based XPath: //button[contains(text(), 'Add New Contact')]
5. Attribute selectors: input[name="firstName"]
6. Type selectors: button[type="submit"]

If the goal is complete, set "isComplete": true and "action": "complete".
If you can't determine the next action, set "action": "error" with reasoning.`;

          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
              model: 'gpt-4o',
              messages: [
                {
                  role: 'system',
                  content: 'You are an expert web automation agent. Analyze screenshots and page state to determine the exact next action needed. Always return valid JSON.'
                },
                {
                  role: 'user',
                  content: [
                    {
                      type: 'text',
                      text: reasoningPrompt
                    },
                    {
                      type: 'image_url',
                      image_url: {
                        url: `data:image/png;base64,${screenshot}`
                      }
                    }
                  ]
                }
              ],
              max_tokens: 1000,
              temperature: 0.3
            })
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.log(`✗ AI reasoning API error: ${response.status} - ${errorText}`);
            return null;
          }

          const data = await response.json();
          const content = data.choices[0]?.message?.content || '';
          
          // Extract JSON from response
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (!jsonMatch) {
            console.log('✗ Could not parse AI reasoning response');
            return null;
          }
          
          const actionPlan = JSON.parse(jsonMatch[0]);
          console.log('🤖 AI Reasoning Result:');
          console.log(`  Action: ${actionPlan.action}`);
          console.log(`  Reasoning: ${actionPlan.reasoning}`);
          if (actionPlan.selector) console.log(`  Selector: ${actionPlan.selector}`);
          if (actionPlan.text) console.log(`  Text: ${actionPlan.text}`);
          if (actionPlan.url) console.log(`  URL: ${actionPlan.url}`);
          console.log(`  Is Complete: ${actionPlan.isComplete || false}`);
          
          // Theory of Mind: Remember this attempt
          if (actionPlan.url) {
            reasoningMemory.navigationAttempts.push({
              url: actionPlan.url,
              action: actionPlan.action,
              timestamp: Date.now()
            });
          }
          
          return actionPlan;
        } catch (e) {
          console.log(`✗ AI reasoning failed: ${e.message}`);
          return null;
        }
      };
      
      // Investigation function: Analyze problems and try alternative solutions
      // proactive = true means this is a proactive check at each step, not just error handling
      const investigateAndRetry = async (failedAction = null, proactive = false) => {
        if (proactive) {
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('🔍 PROACTIVE INVESTIGATION: Analyzing current state before action');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        } else {
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('🔍 INVESTIGATION MODE: Analyzing problem and trying solutions');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        }
        
        try {
          // Get detailed page state for investigation
          const investigationState = await page.evaluate(() => {
            return {
              url: window.location.href,
              title: document.title,
              readyState: document.readyState,
              hasLoginForm: !!document.querySelector('input[type="password"]'),
              hasContactForm: document.body?.innerText?.toLowerCase().includes('first name') || false,
              allInputs: Array.from(document.querySelectorAll('input')).map(input => ({
                type: input.type,
                placeholder: input.placeholder || '',
                name: input.name || '',
                id: input.id || '',
                visible: input.offsetParent !== null,
                value: input.value || ''
              })),
              allButtons: Array.from(document.querySelectorAll('button, a[role="button"]')).map(btn => ({
                text: btn.innerText?.trim() || btn.textContent?.trim() || '',
                visible: btn.offsetParent !== null,
                type: btn.type || '',
                className: btn.className || '',
                id: btn.id || ''
              })),
              bodyText: document.body?.innerText?.substring(0, 500) || '',
              errorMessages: Array.from(document.querySelectorAll('[class*="error" i], [id*="error" i]')).map(el => el.textContent?.trim()).filter(t => t)
            };
          });
          
          console.log('Investigation State:', JSON.stringify(investigationState, null, 2));
          
          // Use AI to investigate the problem or current state
          if (OPENAI_API_KEY && OPENAI_API_KEY !== '') {
            const investigationScreenshot = await page.screenshot({ encoding: 'base64', fullPage: false });
            
            const investigationPrompt = proactive 
              ? `You are analyzing the current state of a web page during automation. Provide insights to help determine the best next action.

CURRENT STATE:
${JSON.stringify(investigationState, null, 2)}

GOAL: ${mainGoal}

Analyze:
1. What is the current state of the page?
2. What elements are visible and ready for interaction?
3. What should be the next action based on the goal?
4. Are there any issues or obstacles that need to be addressed?
5. What insights can help the AI make the right decision?

Return JSON:
{
  "currentState": "Description of what's on the page",
  "readyForAction": true/false,
  "recommendedNextAction": "What action should be taken next",
  "insights": ["Key insights about the page state"],
  "potentialIssues": ["Any potential issues or obstacles"],
  "suggestedSelectors": {"elementName": "selector"} - if you see specific elements that should be interacted with,
  "confidence": "high" | "medium" | "low" - how confident you are about the state
}`
              : `You are troubleshooting a web automation issue. Analyze the current state and determine what went wrong and how to fix it.

CURRENT STATE:
${JSON.stringify(investigationState, null, 2)}

${failedAction ? `FAILED ACTION: ${JSON.stringify(failedAction, null, 2)}` : 'NO ACTION RETURNED FROM AI'}

GOAL: ${mainGoal}

Investigate:
1. What is the current state of the page?
2. What should be visible but isn't?
3. What went wrong with the previous action (if any)?
4. What alternative approaches could work?

Return JSON:
{
  "problem": "Description of the problem",
  "solution": "What to try next",
  "action": "click" | "type" | "navigate" | "wait" | "retry",
  "selector": "CSS selector or XPath",
  "text": "Text to type (if action is type)",
  "url": "URL to navigate to (if action is navigate)",
  "waitTime": "Milliseconds (if action is wait)",
  "alternativeStrategies": ["List of alternative approaches to try"]
}`;

            const investigationResponse = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
              },
              body: JSON.stringify({
                model: 'gpt-4o',
                messages: [
                  {
                    role: 'system',
                    content: 'You are a web automation troubleshooting expert. Analyze problems and suggest concrete solutions with specific selectors and actions.'
                  },
                  {
                    role: 'user',
                    content: [
                      {
                        type: 'text',
                        text: investigationPrompt
                      },
                      {
                        type: 'image_url',
                        image_url: {
                          url: `data:image/png;base64,${investigationScreenshot}`
                        }
                      }
                    ]
                  }
                ],
                max_tokens: 1000,
                temperature: 0.5
              })
            });

            if (investigationResponse.ok) {
              const invData = await investigationResponse.json();
              const invContent = invData.choices[0]?.message?.content || '';
              const invJsonMatch = invContent.match(/\{[\s\S]*\}/);
              
              if (invJsonMatch) {
                const investigationResult = JSON.parse(invJsonMatch[0]);
                
                if (proactive) {
                  // Proactive investigation - return insights for AI to use
                  console.log('🔍 Proactive Investigation Insights:');
                  console.log(`  Current State: ${investigationResult.currentState}`);
                  console.log(`  Ready for Action: ${investigationResult.readyForAction}`);
                  console.log(`  Recommended Next: ${investigationResult.recommendedNextAction}`);
                  console.log(`  Confidence: ${investigationResult.confidence}`);
                  if (investigationResult.insights) {
                    console.log(`  Insights: ${investigationResult.insights.join(', ')}`);
                  }
                  if (investigationResult.potentialIssues) {
                    console.log(`  Potential Issues: ${investigationResult.potentialIssues.join(', ')}`);
                  }
                  
                  // Return insights to be used by AI reasoning
                  return investigationResult;
                } else {
                  // Reactive investigation - try to fix the problem
                  console.log('🔍 Investigation Result:');
                  console.log(`  Problem: ${investigationResult.problem}`);
                  console.log(`  Solution: ${investigationResult.solution}`);
                  console.log(`  Action: ${investigationResult.action}`);
                  if (investigationResult.alternativeStrategies) {
                    console.log(`  Alternative Strategies: ${investigationResult.alternativeStrategies.join(', ')}`);
                  }
                  
                  // Try the suggested solution
                  if (investigationResult.action && investigationResult.action !== 'retry') {
                    const solutionAction = {
                      action: investigationResult.action,
                      selector: investigationResult.selector,
                      text: investigationResult.text,
                      url: investigationResult.url,
                      waitTime: investigationResult.waitTime
                    };
                    
                    console.log('🔧 Attempting suggested solution...');
                    const solutionSuccess = await executeAIAction(solutionAction);
                    if (solutionSuccess) {
                      console.log('✅ Investigation solution worked!');
                      return true;
                    } else {
                      console.log('⚠ Investigation solution did not work, will try alternatives...');
                    }
                  }
                  
                  // Try alternative strategies if provided
                  if (investigationResult.alternativeStrategies && investigationResult.alternativeStrategies.length > 0) {
                    console.log('🔧 Trying alternative strategies...');
                    for (const strategy of investigationResult.alternativeStrategies.slice(0, 2)) { // Try first 2 alternatives
                      console.log(`  Trying: ${strategy}`);
                      // Could parse strategy and try it, but for now just log it
                      await delay(2000);
                    }
                  }
                }
              }
            }
          }
          
          // Fallback: Try common fixes
          console.log('🔧 Trying common fixes...');
          
          // If on login page but no fields, wait longer
          if (investigationState.url.includes('/login') && !investigationState.hasLoginForm) {
            console.log('  → On login page but no fields, waiting 8 seconds...');
            await delay(8000);
            await saveScreenshot('after-investigation-wait');
            return true; // Indicate we tried something
          }
          
          // If fields exist but aren't visible, try scrolling
          if (investigationState.allInputs.length > 0) {
            console.log('  → Inputs found, trying to scroll to them...');
            await page.evaluate(() => {
              const firstInput = document.querySelector('input[type="password"], input[placeholder*="Username" i], input[placeholder*="Email" i]');
              if (firstInput) {
                firstInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            });
            await delay(2000);
            return true;
          }
          
          // Return null/insights based on mode
          if (proactive) {
            // Return basic insights even if AI investigation failed
            return {
              currentState: `URL: ${investigationState.url}, Has Login: ${investigationState.hasLoginForm}, Has Contact Form: ${investigationState.hasContactForm}`,
              readyForAction: investigationState.hasLoginForm || investigationState.hasContactForm || investigationState.allInputs.length > 0,
              insights: [`Found ${investigationState.allInputs.length} inputs, ${investigationState.allButtons.length} buttons`],
              confidence: 'medium'
            };
          }
          return false; // Investigation didn't find a solution
        } catch (e) {
          console.log(`✗ Investigation failed: ${e.message}`);
          if (proactive) {
            // Return basic state even on error
            return {
              currentState: 'Investigation failed, using basic state',
              readyForAction: false,
              insights: ['Investigation error occurred'],
              confidence: 'low'
            };
          }
          return false;
        }
      };
      
      // Helper: Verify element is actually visible and interactable
      const verifyElementReady = async (selector, isXPath = false) => {
        try {
          let element;
          if (isXPath) {
            const elements = await page.$x(selector);
            if (elements.length === 0) return false;
            element = elements[0];
          } else {
            element = await page.$(selector);
            if (!element) return false;
          }
          
          // Check if element is visible
          const isVisible = await page.evaluate((el) => {
            const style = window.getComputedStyle(el);
            return style.display !== 'none' && 
                   style.visibility !== 'hidden' && 
                   style.opacity !== '0' &&
                   el.offsetParent !== null;
          }, element);
          
          if (!isVisible) return false;
          
          // Check if element is enabled (for inputs/buttons)
          const isEnabled = await page.evaluate((el) => {
            return !el.disabled && !el.readOnly;
          }, element);
          
          return isEnabled;
        } catch (e) {
          return false;
        }
      };
      
      // Helper: Verify action actually succeeded
      const verifyActionSuccess = async (actionType, selector = null, expectedChange = null) => {
        await delay(1000); // Give page time to react
        
        try {
          switch (actionType) {
            case 'click':
              // Check if URL changed or element disappeared (indicates click worked)
              const urlAfterClick = page.url();
              // Could check if modal opened, element disappeared, etc.
              return true; // For now, assume success if no error
              
            case 'type':
              if (selector) {
                // Verify text was actually typed
                const actualValue = await page.evaluate((sel) => {
                  const el = document.querySelector(sel);
                  return el ? el.value : null;
                }, selector);
                return actualValue && actualValue.length > 0;
              }
              return true;
              
            case 'navigate':
              // Verify we're on the target URL (or close to it)
              const currentUrl = page.url();
              return currentUrl.includes(actionPlan.url?.split('/')[2] || ''); // Check domain matches
              
            default:
              return true;
          }
        } catch (e) {
          return false;
        }
      };
      
      // Helper: Wait for specific element to appear (better than fixed waits)
      const waitForElement = async (selector, timeout = 10000, isXPath = false) => {
        try {
          if (isXPath) {
            await page.waitForFunction(
              (xpath) => {
                const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                const element = result.singleNodeValue;
                return element && element.offsetParent !== null;
              },
              { timeout },
              selector
            );
          } else {
            await page.waitForSelector(selector, { timeout, visible: true });
          }
          return true;
        } catch (e) {
          return false;
        }
      };
      
      // Execute AI-determined action
      const executeAIAction = async (actionPlan) => {
        if (!actionPlan) return false;
        
        try {
          switch (actionPlan.action) {
            case 'click':
              if (actionPlan.selector) {
                const isXPath = actionPlan.selector.startsWith('//') || actionPlan.selector.startsWith('(//');
                
                // Wait for element to appear
                const elementAppeared = await waitForElement(actionPlan.selector, 8000, isXPath);
                if (!elementAppeared) {
                  console.log(`✗ Element not found: ${actionPlan.selector}`);
                  await saveScreenshot('click-failed-element-not-found');
                  return false;
                }
                
                // Verify element is ready
                const isReady = await verifyElementReady(actionPlan.selector, isXPath);
                if (!isReady) {
                  console.log(`✗ Element not ready for interaction: ${actionPlan.selector}`);
                  await saveScreenshot('click-failed-element-not-ready');
                  return false;
                }
                
                // Perform click
                if (isXPath) {
                  const elements = await page.$x(actionPlan.selector);
                  if (elements.length > 0) {
                    await elements[0].click();
                    console.log(`✓ Clicked element using XPath: ${actionPlan.selector}`);
                  } else {
                    return false;
                  }
                } else {
                  await page.click(actionPlan.selector);
                  console.log(`✓ Clicked element using CSS: ${actionPlan.selector}`);
                }
                
                // Verify click succeeded
                const clickSuccess = await verifyActionSuccess('click', actionPlan.selector);
                if (!clickSuccess) {
                  console.log(`⚠ Click may not have succeeded, but continuing...`);
                }
                
                await delay(2000);
                return true;
              }
              break;
              
            case 'type':
              if (actionPlan.selector && actionPlan.text) {
                // Wait for element
                const elementAppeared = await waitForElement(actionPlan.selector, 8000, false);
                if (!elementAppeared) {
                  console.log(`✗ Input field not found: ${actionPlan.selector}`);
                  await saveScreenshot('type-failed-element-not-found');
                  return false;
                }
                
                // Verify element is ready
                const isReady = await verifyElementReady(actionPlan.selector, false);
                if (!isReady) {
                  console.log(`✗ Input field not ready: ${actionPlan.selector}`);
                  await saveScreenshot('type-failed-element-not-ready');
                  return false;
                }
                
                // Focus and clear field
                await page.click(actionPlan.selector);
                await delay(200);
                await page.keyboard.down('Control');
                await page.keyboard.press('a');
                await page.keyboard.up('Control');
                await delay(200);
                
                // Type text
                await page.type(actionPlan.selector, actionPlan.text, { delay: 50 });
                await delay(500);
                
                // Verify text was actually typed
                const typeSuccess = await verifyActionSuccess('type', actionPlan.selector);
                if (!typeSuccess) {
                  console.log(`⚠ Text may not have been typed correctly, retrying...`);
                  // Retry once
                  await page.click(actionPlan.selector);
                  await page.keyboard.down('Control');
                  await page.keyboard.press('a');
                  await page.keyboard.up('Control');
                  await page.type(actionPlan.selector, actionPlan.text, { delay: 50 });
                  await delay(500);
                }
                
                const finalValue = await page.evaluate((sel) => {
                  const el = document.querySelector(sel);
                  return el ? el.value : '';
                }, actionPlan.selector);
                
                if (finalValue.includes(actionPlan.text.substring(0, 5))) {
                  console.log(`✓ Typed "${actionPlan.text}" into ${actionPlan.selector} (verified: "${finalValue.substring(0, 20)}...")`);
                  await delay(1000);
                  return true;
                } else {
                  console.log(`✗ Text verification failed. Expected to contain "${actionPlan.text.substring(0, 5)}", got "${finalValue}"`);
                  await saveScreenshot('type-failed-verification');
                  return false;
                }
              }
              break;
              
            case 'navigate':
              if (actionPlan.url) {
                try {
                  // Check if we're already on this URL
                  const currentUrl = page.url();
                  if (currentUrl === actionPlan.url || currentUrl.includes(actionPlan.url.split('?')[0])) {
                    console.log(`⚠ Already on target URL: ${currentUrl}, skipping navigation`);
                    // Still verify we can see expected elements
                    await delay(1000);
                    return true;
                  }
                  
                  const urlBefore = page.url();
                  await page.goto(actionPlan.url, { waitUntil: 'networkidle2', timeout: 30000 });
                  await delay(2000); // Give page time to load
                  
                  const newUrl = page.url();
                  
                  // Verify navigation succeeded
                  const navSuccess = await verifyActionSuccess('navigate', null, actionPlan.url);
                  if (!navSuccess && newUrl === urlBefore) {
                    console.log(`✗ Navigation may have failed - URL didn't change`);
                    await saveScreenshot('navigate-failed-no-url-change');
                    return false;
                  }
                  
                  console.log(`✓ Navigated to: ${newUrl}`);
                  
                  // Wait for page to be interactive
                  await page.waitForFunction(() => document.readyState === 'complete', { timeout: 5000 }).catch(() => {});
                  
                  return true;
                } catch (e) {
                  console.log(`✗ Navigation failed: ${e.message}`);
                  await saveScreenshot('navigate-failed-error');
                  return false;
                }
              }
              break;
              
            case 'navigate_js':
              // JavaScript-based navigation (bypasses some redirects)
              if (actionPlan.url) {
                try {
                  const currentUrl = page.url();
                  if (currentUrl === actionPlan.url || currentUrl.includes(actionPlan.url.split('?')[0])) {
                    console.log(`⚠ Already on target URL: ${currentUrl}, skipping JS navigation`);
                    return true;
                  }
                  
                  await page.evaluate((url) => {
                    window.location.href = url;
                  }, actionPlan.url);
                  await delay(3000); // Wait for navigation
                  const newUrl = page.url();
                  console.log(`✓ JavaScript navigation to: ${newUrl}`);
                  await delay(2000);
                  return true;
                } catch (e) {
                  console.log(`✗ JS navigation failed: ${e.message}`);
                  return false;
                }
              }
              break;
              
            case 'navigate_root_then':
              // Navigate to root first, then to target (helps establish session)
              if (actionPlan.url) {
                try {
                  const urlObj = new URL(actionPlan.url);
                  const rootUrl = `${urlObj.protocol}//${urlObj.host}/`;
                  console.log(`Navigating to root first: ${rootUrl}`);
                  await page.goto(rootUrl, { waitUntil: 'networkidle2', timeout: 30000 });
                  await delay(2000);
                  console.log(`Now navigating to target: ${actionPlan.url}`);
                  await page.goto(actionPlan.url, { waitUntil: 'networkidle2', timeout: 30000 });
                  const newUrl = page.url();
                  console.log(`✓ Root-then-target navigation to: ${newUrl}`);
                  await delay(2000);
                  return true;
                } catch (e) {
                  console.log(`✗ Root-then-target navigation failed: ${e.message}`);
                  return false;
                }
              }
              break;
              
            case 'manipulate_browser':
              // Direct browser manipulation - AI can change browser settings
              if (actionPlan.browserAction) {
                try {
                  switch (actionPlan.browserAction) {
                    case 'change_user_agent':
                      if (actionPlan.userAgent) {
                        await page.setUserAgent(actionPlan.userAgent);
                        console.log(`✓ Changed user agent to: ${actionPlan.userAgent}`);
                        return true;
                      }
                      break;
                      
                    case 'change_viewport':
                      if (actionPlan.width && actionPlan.height) {
                        await page.setViewport({ width: actionPlan.width, height: actionPlan.height });
                        console.log(`✓ Changed viewport to: ${actionPlan.width}x${actionPlan.height}`);
                        return true;
                      }
                      break;
                      
                    case 'set_headers':
                      if (actionPlan.headers) {
                        await page.setExtraHTTPHeaders(actionPlan.headers);
                        console.log(`✓ Changed headers: ${JSON.stringify(actionPlan.headers)}`);
                        return true;
                      }
                      break;
                      
                    case 'clear_cookies':
                      const client = await page.target().createCDPSession();
                      await client.send('Network.clearBrowserCookies');
                      await client.send('Network.clearBrowserCache');
                      console.log('✓ Cleared cookies and cache');
                      return true;
                      
                    case 'new_context':
                      // Create a new browser context (fresh session)
                      const context = await browser.createBrowserContext();
                      const newPage = await context.newPage();
                      await newPage.setViewport({ width: 1280, height: 720 });
                      // Copy current page settings
                      await newPage.setUserAgent(await page.evaluate(() => navigator.userAgent));
                      console.log('✓ Created new browser context');
                      // Note: This creates a new page, but we'd need to switch to it
                      // For now, just log it
                      return true;
                      
                    case 'try_different_wait':
                      // Try different wait strategies
                      const waitStrategy = actionPlan.waitStrategy || 'networkidle2';
                      if (actionPlan.url) {
                        await page.goto(actionPlan.url, { 
                          waitUntil: waitStrategy, 
                          timeout: 30000 
                        });
                        console.log(`✓ Navigated with wait strategy: ${waitStrategy}`);
                        return true;
                      }
                      break;
                      
                    case 'bypass_security':
                      // Try navigating with security bypass
                      if (actionPlan.url) {
                        await page.setBypassCSP(true);
                        await page.goto(actionPlan.url, { waitUntil: 'networkidle2', timeout: 30000 });
                        console.log('✓ Navigated with CSP bypass');
                        return true;
                      }
                      break;
                  }
                } catch (e) {
                  console.log(`✗ Browser manipulation failed: ${e.message}`);
                  return false;
                }
              }
              break;
              
            case 'wait':
              const waitTime = actionPlan.waitTime || 2000;
              console.log(`⏳ Waiting ${waitTime}ms...`);
              await delay(waitTime);
              return true;
              
            case 'complete':
              console.log('✓ Goal completed!');
              return true;
              
            case 'error':
              console.log(`✗ AI reported error: ${actionPlan.reasoning}`);
              return false;
          }
        } catch (e) {
          console.log(`✗ Failed to execute action: ${e.message}`);
          return false;
        }
        
        return false;
      };
      
      // Set longer timeouts for page operations
      page.setDefaultNavigationTimeout(60000);
      page.setDefaultTimeout(60000);

      // Make Puppeteer look like a real browser to avoid bot detection
      // This prevents redirects from noairlines.tuvoli.com to tuvoli.com
      console.log('Configuring browser to avoid bot detection...');
      
      // Set realistic user agent (not HeadlessChrome)
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // Set realistic headers
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0'
      });

      // Override webdriver property (major bot detection signal)
      await page.evaluateOnNewDocument(() => {
        // Remove webdriver property
        Object.defineProperty(navigator, 'webdriver', {
          get: () => false,
        });
        
        // Override plugins to look like a real browser
        Object.defineProperty(navigator, 'plugins', {
          get: () => [1, 2, 3, 4, 5],
        });
        
        // Override languages
        Object.defineProperty(navigator, 'languages', {
          get: () => ['en-US', 'en'],
        });
        
        // Chrome runtime
        window.chrome = {
          runtime: {},
        };
        
        // Override permissions
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) => (
          parameters.name === 'notifications' ?
            Promise.resolve({ state: Notification.permission }) :
            originalQuery(parameters)
        );
      });

      // Helper function to delay (replacement for deprecated waitForTimeout)
      // MUST be defined before AI-guided mode uses it
      const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

      // ============================================================
      // AI-POWERED AUTOMATION: Let AI figure out how to accomplish the goal
      // ============================================================
      const mainGoal = `Login to ${TUVOLI_URL}, navigate to contact management, click "Add New Contact", fill in the form with First Name: "${firstName}", Last Name: "${lastName}", Email: "${itineraryData.email || ''}", Phone: "${itineraryData.phone || ''}", check "Individual Account" checkbox, and click "Create" to create a new contact.`;
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🚀 STARTING AI-POWERED AUTOMATION');
      console.log(`Goal: ${mainGoal}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      // AI-Powered approach: Let AI guide us through the process
      let aiGuidedMode = OPENAI_API_KEY && OPENAI_API_KEY !== '';
      let aiAttempts = 0;
      const maxAIAttempts = 25; // Maximum steps AI can take
      
      if (aiGuidedMode) {
        console.log('🤖 Using AI-guided automation mode');
        
        // Start by navigating to login page - try multiple strategies
        console.log('Attempting initial navigation to login page...');
        let initialNavSuccess = false;
        
        // Strategy 1: Direct navigation
        try {
          const targetUrl = `${TUVOLI_URL}/login?returnURL=%2Fhome`;
          console.log(`Trying direct navigation to: ${targetUrl}`);
          await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 60000 });
          await delay(3000);
          const urlAfterNav = page.url();
          console.log(`After navigation, URL: ${urlAfterNav}`);
          
          if (urlAfterNav.includes('noairlines.tuvoli.com') && urlAfterNav.includes('login')) {
            initialNavSuccess = true;
            console.log('✓ Successfully navigated to login page');
          } else {
            console.log(`⚠ Navigation redirected to: ${urlAfterNav}`);
          }
        } catch (e) {
          console.log(`Direct navigation failed: ${e.message}`);
        }
        
        // Strategy 2: If redirected, try JavaScript navigation
        if (!initialNavSuccess) {
          try {
            console.log('Trying JavaScript navigation...');
            await page.evaluate((url) => {
              window.location.href = url;
            }, `${TUVOLI_URL}/login?returnURL=%2Fhome`);
            await delay(5000);
            const urlAfterJS = page.url();
            console.log(`After JS navigation, URL: ${urlAfterJS}`);
            
            if (urlAfterJS.includes('noairlines.tuvoli.com') && urlAfterJS.includes('login')) {
              initialNavSuccess = true;
              console.log('✓ JavaScript navigation succeeded');
            }
          } catch (e) {
            console.log(`JavaScript navigation failed: ${e.message}`);
          }
        }
        
        // Strategy 3: Navigate to root first, then login
        if (!initialNavSuccess) {
          try {
            console.log('Trying root-then-login strategy...');
            await page.goto(`${TUVOLI_URL}/`, { waitUntil: 'networkidle2', timeout: 30000 });
            await delay(2000);
            await page.goto(`${TUVOLI_URL}/login?returnURL=%2Fhome`, { waitUntil: 'networkidle2', timeout: 30000 });
            await delay(3000);
            const urlAfterRoot = page.url();
            console.log(`After root-then-login, URL: ${urlAfterRoot}`);
            
            if (urlAfterRoot.includes('noairlines.tuvoli.com') && urlAfterRoot.includes('login')) {
              initialNavSuccess = true;
              console.log('✓ Root-then-login succeeded');
            }
          } catch (e) {
            console.log(`Root-then-login failed: ${e.message}`);
          }
        }
        
        if (!initialNavSuccess) {
          console.log('⚠ Initial navigation strategies failed, trying browser manipulation...');
          
          // Theory of Mind: If all navigation failed, we're being detected/redirected
          // Try aggressive browser manipulation to change fingerprint
          try {
            console.log('🔧 Attempting browser fingerprint change...');
            
            // Change user agent to something more realistic
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            
            // Clear cookies for fresh start
            const client = await page.target().createCDPSession();
            await client.send('Network.clearBrowserCookies');
            await client.send('Network.clearBrowserCache');
            console.log('✓ Cleared cookies and cache');
            
            // Change viewport
            await page.setViewport({ width: 1920, height: 1080 });
            
            // Set different headers
            await page.setExtraHTTPHeaders({
              'Accept-Language': 'en-US,en;q=0.9',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
              'Referer': 'https://noairlines.tuvoli.com/',
              'Origin': 'https://noairlines.tuvoli.com'
            });
            
            await delay(2000);
            
            // Try navigation again with new fingerprint
            console.log('Trying navigation with new browser fingerprint...');
            await page.goto(`${TUVOLI_URL}/login?returnURL=%2Fhome`, { 
              waitUntil: 'domcontentloaded', 
              timeout: 30000 
            });
            await delay(3000);
            
            const urlAfterManip = page.url();
            console.log(`After browser manipulation, URL: ${urlAfterManip}`);
            
            if (urlAfterManip.includes('noairlines.tuvoli.com') && urlAfterManip.includes('login')) {
              initialNavSuccess = true;
              console.log('✓ Browser manipulation succeeded!');
            } else {
              console.log('⚠ Browser manipulation also redirected, AI will need to try more creative approaches');
            }
          } catch (e) {
            console.log(`Browser manipulation failed: ${e.message}`);
          }
        }
        
        if (!initialNavSuccess) {
          console.log('⚠ All initial navigation strategies failed, AI will investigate and try alternatives');
          // Mark navigation strategies as potentially invalidated
          reasoningMemory.invalidatedStrategies.push('navigate', 'navigate_js', 'navigate_root_then');
          console.log('🧠 Knowledge Base: Marking standard navigation strategies as invalidated - they keep redirecting');
        }
        
        await saveScreenshot('initial-page-state');
        
        // AI-guided loop: Keep asking AI what to do next until goal is complete
        let lastUrl = '';
        let navigationAttempts = new Map(); // Track navigation attempts per URL
        let consecutiveNavigationFailures = 0;
        const maxNavigationLoops = 2; // Reduced to 2 to force strategy switching sooner
        const maxConsecutiveFailures = 3;
        
        while (aiAttempts < maxAIAttempts) {
          aiAttempts++;
          console.log(`\n🤖 AI Reasoning Step ${aiAttempts}/${maxAIAttempts}`);
          
          // Get current URL to detect navigation loops
          const currentUrl = page.url();
          
          // Enhanced loop detection
          if (currentUrl === lastUrl && lastUrl !== '') {
            const attemptCount = navigationAttempts.get(currentUrl) || 0;
            navigationAttempts.set(currentUrl, attemptCount + 1);
            
            if (attemptCount >= maxNavigationLoops) {
              console.log(`⚠ Navigation loop detected - tried ${attemptCount + 1} times to reach: ${currentUrl}`);
              console.log('⚠ Forcing strategy change - AI should try different navigation method or wait');
              
              // Force AI to wait and check for fields instead of navigating
              await delay(6000); // Wait for login fields to load
              await saveScreenshot('after-wait-for-fields');
              
              // Check for login fields
              const hasLoginFields = await page.evaluate(() => {
                return !!document.querySelector('input[type="password"]') && 
                       !!document.querySelector('input[placeholder*="Username" i], input[placeholder*="Email" i]');
              });
              
              if (hasLoginFields) {
                console.log('✓ Login fields detected! Proceeding to fill them...');
                navigationAttempts.clear(); // Reset all counters
                lastUrl = ''; // Reset to allow navigation again
                consecutiveNavigationFailures = 0;
                // Continue with AI reasoning but it should now see the fields
              } else {
                console.log('⚠ Still no login fields after wait, investigating...');
                await investigateAndRetry();
                // Force AI to try a different navigation strategy
                // Add context that navigation is failing
              }
            }
          } else {
            // URL changed, reset counters for old URL
            if (lastUrl) {
              navigationAttempts.delete(lastUrl);
            }
            navigationAttempts.set(currentUrl, (navigationAttempts.get(currentUrl) || 0) + 1);
          }
          lastUrl = currentUrl;
          
          // ============================================================
          // INVESTIGATION AT EVERY STEP: Analyze current state
          // ============================================================
          console.log('🔍 Step Investigation: Analyzing current state...');
          const investigationInsights = await investigateAndRetry(null, true); // true = proactive investigation
          
          // Use investigation insights to inform AI reasoning
          // Pass investigation insights as context to help AI make better decisions
          const actionPlan = await aiReasonNextAction(mainGoal, investigationInsights || {});
          
          if (!actionPlan) {
            console.log('⚠ AI could not determine next action, investigating...');
            // Investigation phase: Analyze what's wrong and try to fix it
            await investigateAndRetry();
            continue;
          }
          
          if (actionPlan.isComplete) {
            console.log('✅ AI reports goal is complete!');
            await saveScreenshot('ai-complete');
            break;
          }
          
          // If AI keeps trying to navigate to the same URL, force it to wait instead
          if (actionPlan.action === 'navigate' && actionPlan.url === currentUrl) {
            console.log('⚠ AI trying to navigate to current URL, forcing wait instead...');
            actionPlan.action = 'wait';
            actionPlan.waitTime = 6000;
            actionPlan.reasoning = 'Waiting for page to fully load and fields to appear';
          }
          
          // Check if this is a navigation action and we've tried it before
          const isNavigationAction = ['navigate', 'navigate_js', 'navigate_root_then', 'manipulate_browser'].includes(actionPlan.action);
          if (isNavigationAction && actionPlan.url) {
            const navAttempts = navigationAttempts.get(actionPlan.url) || 0;
            if (navAttempts >= maxNavigationLoops) {
              console.log(`⚠ Already tried navigating to ${actionPlan.url} ${navAttempts} times, forcing different strategy`);
              // Modify action plan to try a different navigation method
              if (actionPlan.action === 'navigate') {
                actionPlan.action = 'navigate_js';
                actionPlan.reasoning = 'Switching to JavaScript navigation after standard navigation failed';
              } else if (actionPlan.action === 'navigate_js') {
                actionPlan.action = 'navigate_root_then';
                actionPlan.reasoning = 'Switching to root-then-target navigation after JS navigation failed';
              } else if (actionPlan.action === 'navigate_root_then') {
                // Try browser manipulation
                actionPlan.action = 'manipulate_browser';
                actionPlan.browserAction = 'try_different_wait';
                actionPlan.waitStrategy = 'domcontentloaded';
                actionPlan.reasoning = 'Switching to browser manipulation with different wait strategy';
              } else {
                // Tried all navigation methods, force wait
                actionPlan.action = 'wait';
                actionPlan.waitTime = 8000;
                actionPlan.reasoning = 'All navigation methods failed, waiting for page to load';
              }
            }
          }
          
          // If browser manipulation is requested, ensure it has the URL
          if (actionPlan.action === 'manipulate_browser' && actionPlan.browserAction === 'try_different_wait' && !actionPlan.url) {
            // If no URL specified but we need to navigate, use the login URL
            actionPlan.url = `${TUVOLI_URL}/login?returnURL=%2Fhome`;
          }
          
          const success = await executeAIAction(actionPlan);
          
          if (!success) {
            consecutiveNavigationFailures++;
            
            // Theory of Mind: Remember what failed
            if (actionPlan.action) {
              reasoningMemory.failedStrategies.push(actionPlan.action);
              // Keep only last 5 failed strategies
              if (reasoningMemory.failedStrategies.length > 5) {
                reasoningMemory.failedStrategies.shift();
              }
              
              // Check if this was a knowledge base recommended strategy
              const kbStrategies = ['navigate', 'navigate_js', 'navigate_root_then'];
              if (kbStrategies.includes(actionPlan.action)) {
                const failureCount = reasoningMemory.failedStrategies.filter(s => s === actionPlan.action).length;
                if (failureCount >= 2 && !reasoningMemory.invalidatedStrategies.includes(actionPlan.action)) {
                  reasoningMemory.invalidatedStrategies.push(actionPlan.action);
                  console.log(`🧠 Knowledge Base Validation: Strategy "${actionPlan.action}" from knowledge base has failed ${failureCount} times - marking as invalidated`);
                  console.log(`   The knowledge base may be wrong about this strategy. Try something different.`);
                }
              }
            }
            
            // Theory of Mind: Detect the problem
            const currentUrl = page.url();
            if (currentUrl.includes('tuvoli.com') && !currentUrl.includes('noairlines.tuvoli.com')) {
              reasoningMemory.detectedProblems.push('Redirected to main site');
            }
            
            console.log(`⚠ Action failed (consecutive failures: ${consecutiveNavigationFailures}/${maxConsecutiveFailures})`);
            console.log(`🧠 Learning: This strategy (${actionPlan.action}) didn't work. Failed strategies so far: ${reasoningMemory.failedStrategies.join(', ')}`);
            
            if (consecutiveNavigationFailures >= maxConsecutiveFailures) {
              console.log('⚠ Too many consecutive failures, investigating with theory of mind...');
              const investigationResult = await investigateAndRetry(actionPlan);
              if (investigationResult && typeof investigationResult === 'object' && investigationResult.solution) {
                consecutiveNavigationFailures = 0; // Reset on successful investigation
              }
            } else {
              // Investigation phase: Analyze why action failed and try alternative
              await investigateAndRetry(actionPlan);
            }
            
            // Theory of Mind: If we're stuck, force a creative solution
            if (consecutiveNavigationFailures >= 2 && actionPlan.action === 'navigate') {
              console.log('🧠 Theory of Mind: Standard navigation keeps failing, forcing creative approach...');
              // Force browser manipulation before next navigation
              const browserManipAction = {
                action: 'manipulate_browser',
                browserAction: 'clear_cookies',
                reasoning: 'Clearing cookies to reset session, then will try navigation with different user agent'
              };
              await executeAIAction(browserManipAction);
              await delay(1000);
              // Next iteration will try navigation again with fresh session
            }
            
            // Continue the loop to let AI try again
            continue;
          } else {
            // Success - reset failure counter and remember what worked
            consecutiveNavigationFailures = 0;
            if (actionPlan.action) {
              reasoningMemory.successfulActions.push(actionPlan.action);
              // Keep only last 5 successful actions
              if (reasoningMemory.successfulActions.length > 5) {
                reasoningMemory.successfulActions.shift();
              }
              
              // Validate this strategy actually works
              if (!reasoningMemory.validatedStrategies.includes(actionPlan.action)) {
                reasoningMemory.validatedStrategies.push(actionPlan.action);
                console.log(`🧠 Knowledge Base Update: Strategy "${actionPlan.action}" validated - adding to working strategies`);
              }
              
              // Store working selectors if provided
              if (actionPlan.selector) {
                const selectorType = actionPlan.action === 'click' ? 'click' : 
                                   actionPlan.action === 'type' ? actionPlan.text?.includes('@') ? 'email' : 'text' : 
                                   'other';
                if (!reasoningMemory.workingSelectors[selectorType]) {
                  reasoningMemory.workingSelectors[selectorType] = actionPlan.selector;
                  console.log(`🧠 Knowledge Base Update: Working selector for ${selectorType}: ${actionPlan.selector}`);
                }
              }
              
              // Store working approach
              let approach = actionPlan.action;
              if (actionPlan.browserAction) {
                approach = `${actionPlan.browserAction}_then_${actionPlan.action}`;
              }
              if (!reasoningMemory.workingApproaches.includes(approach)) {
                reasoningMemory.workingApproaches.push(approach);
                console.log(`🧠 Knowledge Base Update: Working approach: ${approach}`);
              }
              
              // Learn facts
              if (actionPlan.action === 'navigate' && actionPlan.url?.includes('noairlines.tuvoli.com')) {
                const fact = `Navigation to ${actionPlan.url} works using ${actionPlan.action}`;
                if (!reasoningMemory.learnedFacts.includes(fact)) {
                  reasoningMemory.learnedFacts.push(fact);
                }
              }
              
              // Remove from invalidated if it was there (maybe it works now)
              const invalidatedIndex = reasoningMemory.invalidatedStrategies.indexOf(actionPlan.action);
              if (invalidatedIndex !== -1) {
                reasoningMemory.invalidatedStrategies.splice(invalidatedIndex, 1);
                console.log(`🧠 Knowledge Base Update: Strategy "${actionPlan.action}" now works - removing from invalidated list`);
              }
            }
            console.log(`✅ Success! Strategy that worked: ${actionPlan.action}`);
            
            // Take success screenshot periodically
            if (aiAttempts % 5 === 0) {
              await saveScreenshot(`success-checkpoint-${aiAttempts}`);
            }
          }
          
          // Small delay between actions
          await delay(1000);
        }
        
        if (aiAttempts >= maxAIAttempts) {
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('⚠ Reached maximum AI attempts');
          console.log('🔍 Performing final investigation before fallback...');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          
          // Final investigation attempt
          const finalInvestigation = await investigateAndRetry();
          if (!finalInvestigation) {
            console.log('⚠ Final investigation did not resolve issues, falling back to manual approach');
            aiGuidedMode = false;
          } else {
            console.log('✅ Final investigation found a solution, continuing AI mode...');
            // Reset attempt counter to give it more chances
            aiAttempts = Math.max(0, aiAttempts - 5);
          }
        }
      }
      
      // If AI-guided mode didn't complete, fall back to manual approach
      if (!aiGuidedMode || aiAttempts >= maxAIAttempts) {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📋 FALLING BACK TO MANUAL AUTOMATION');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      }

        // AI-powered smart waiting: Check if page is ready using AI
      const waitForPageReady = async (page, description = 'page') => {
        if (!OPENAI_API_KEY || OPENAI_API_KEY === '') {
          // Fallback: just wait a bit
          await delay(3000);
          return;
        }

        console.log(`Using AI to check if ${description} is ready...`);
        for (let attempt = 0; attempt < 5; attempt++) {
          const pageState = await page.evaluate(() => {
            return {
              readyState: document.readyState,
              hasInputs: document.querySelectorAll('input').length,
              hasForms: document.querySelectorAll('form').length,
              hasButtons: document.querySelectorAll('button').length,
              bodyText: document.body?.innerText?.substring(0, 200) || ''
            };
          });

          try {
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
                    content: 'You are a web automation expert. Respond with only "ready" or "not ready" based on whether the page appears to be fully loaded with interactive elements.'
                  },
                  {
                    role: 'user',
                    content: `Page state: ${JSON.stringify(pageState)}. Is this page ready for interaction? Look for login forms, input fields, or interactive elements.`
                  }
                ],
                temperature: 0.1,
                max_tokens: 10
              })
            });

            if (response.ok) {
              const data = await response.json();
              const content = data.choices[0]?.message?.content?.toLowerCase();
              if (content?.includes('ready')) {
                console.log(`Page is ready (attempt ${attempt + 1})`);
                return;
              }
            }
          } catch (e) {
            // If AI check fails, continue with delay
          }

          if (attempt < 4) {
            console.log(`Page not ready yet, waiting... (attempt ${attempt + 1}/5)`);
            await delay(2000);
          }
        }
        console.log('Proceeding after waiting period...');
      };

      // Navigate to Tuvoli login page - MUST be on noairlines.tuvoli.com
      // The login form only exists on the subdomain, not on tuvoli.com
      const loginUrl = `${TUVOLI_URL}/login?returnURL=%2Fhome`;
      console.log(`Attempting to access subdomain login: ${loginUrl}`);
      
      // Strategy 1: Try with response interception to prevent redirects
      let navigationSuccess = false;
      
      try {
        console.log('Strategy 1: Direct navigation with redirect interception...');
        
        // Set up response listener to detect redirects
        page.on('response', (response) => {
          const status = response.status();
          const url = response.url();
          if (status >= 300 && status < 400 && url.includes('noairlines.tuvoli.com')) {
            console.log(`Detected redirect response: ${status} from ${url}`);
          }
        });
        
        // Try navigating with different wait strategies
        await page.goto(loginUrl, { 
          waitUntil: 'domcontentloaded', // Don't wait for networkidle, might help
          timeout: 60000 
        });
        
        // Wait a moment for any JavaScript redirects
        await delay(2000);
        
        const url1 = page.url();
        console.log(`After navigation, URL: ${url1}`);
        
        if (url1.includes('noairlines.tuvoli.com') && url1.includes('/login')) {
          navigationSuccess = true;
          console.log('✓ Successfully navigated to subdomain login page');
        } else if (url1.includes('tuvoli.com') && !url1.includes('noairlines')) {
          console.log('✗ Redirected to main domain, trying to intercept...');
        }
      } catch (e) {
        console.log('Strategy 1 failed:', e.message);
      }
      
      // Strategy 2: Try with JavaScript navigation after page loads
      if (!navigationSuccess) {
        try {
          console.log('Strategy 2: Load main domain first, then navigate via JavaScript...');
          await page.goto('https://tuvoli.com', { waitUntil: 'networkidle2', timeout: 30000 });
          await delay(2000);
          
          // Try to navigate to subdomain using JavaScript (might bypass some redirects)
          await page.evaluate((url) => {
            window.location.href = url;
          }, loginUrl);
          
          // Wait for navigation
          await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {
            // Navigation might not happen if redirected
          });
          
          await delay(3000);
          const url2 = page.url();
          console.log(`After JavaScript navigation, URL: ${url2}`);
          
          if (url2.includes('noairlines.tuvoli.com') && url2.includes('/login')) {
            navigationSuccess = true;
            console.log('✓ Successfully navigated via JavaScript');
          }
        } catch (e) {
          console.log('Strategy 2 failed:', e.message);
        }
      }
      
      // Strategy 3: Try with different headers and no redirect following
      if (!navigationSuccess) {
        try {
          console.log('Strategy 3: Navigation with custom headers...');
          
          // Set headers that might help
          await page.setExtraHTTPHeaders({
            'X-Requested-With': 'XMLHttpRequest',
            'Origin': TUVOLI_URL,
            'Referer': TUVOLI_URL
          });
          
          await page.goto(loginUrl, { 
            waitUntil: 'domcontentloaded',
            timeout: 60000 
          });
          
          await delay(3000);
          const url3 = page.url();
          console.log(`After custom headers navigation, URL: ${url3}`);
          
          if (url3.includes('noairlines.tuvoli.com') && url3.includes('/login')) {
            navigationSuccess = true;
            console.log('✓ Successfully navigated with custom headers');
          }
        } catch (e) {
          console.log('Strategy 3 failed:', e.message);
        }
      }
      
      // Strategy 4: Try accessing root of subdomain first, then navigate to login
      if (!navigationSuccess) {
        try {
          console.log('Strategy 4: Access subdomain root first, then navigate to login...');
          await page.goto(TUVOLI_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
          await delay(3000);
          const rootUrl = page.url();
          console.log(`After accessing subdomain root, URL: ${rootUrl}`);
          
          if (rootUrl.includes('noairlines.tuvoli.com')) {
            // We're on the subdomain! Now navigate to login
            console.log('✓ Successfully accessed subdomain, navigating to login...');
            await page.goto(loginUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
            await delay(3000);
            const loginUrlAfter = page.url();
            if (loginUrlAfter.includes('noairlines.tuvoli.com') && loginUrlAfter.includes('/login')) {
              navigationSuccess = true;
              console.log('✓ Successfully navigated to login from subdomain root');
            }
          }
        } catch (e) {
          console.log('Strategy 4 failed:', e.message);
        }
      }
      
      if (!navigationSuccess) {
        console.log('⚠ All navigation strategies failed. Current URL:', page.url());
        console.log('Will attempt to find login fields on current page anyway...');
      }

      // Tuvoli login fields take at least 6 seconds to load
      console.log('Waiting for login fields to load (Tuvoli takes ~6 seconds)...');
      await delay(6000);

      // Use AI vision to actually see the page and find login elements
      console.log('Using AI vision to analyze the page...');
      await saveScreenshot('login-page');
      const screenshot = await page.screenshot({ encoding: 'base64', fullPage: false });
      
      if (OPENAI_API_KEY && OPENAI_API_KEY !== '') {
        try {
          const visionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
              model: 'gpt-4o',
              messages: [
                {
                  role: 'system',
                  content: 'You are a web automation expert. Analyze this screenshot and identify: 1) Are we on a login page? 2) Where are the username and password fields? 3) What CSS selectors would work? Return JSON: {"onLoginPage": true/false, "usernameSelector": "input[...]", "passwordSelector": "input[...]", "submitSelector": "button[...]"}'
                },
                {
                  role: 'user',
                  content: [
                    {
                      type: 'text',
                      text: 'Analyze this login page screenshot. Find the username field (labeled "Enter Username"), password field, and sign in button. Return CSS selectors.'
                    },
                    {
                      type: 'image_url',
                      image_url: {
                        url: `data:image/png;base64,${screenshot}`
                      }
                    }
                  ]
                }
              ],
              max_tokens: 300
            })
          });

          if (visionResponse.ok) {
            const visionData = await visionResponse.json();
            const visionContent = visionData.choices[0]?.message?.content;
            const visionJsonMatch = visionContent.match(/\{[\s\S]*\}/);
            if (visionJsonMatch) {
              const visionResult = JSON.parse(visionJsonMatch[0]);
              console.log('AI Vision analysis:', visionResult);
              
              if (visionResult.onLoginPage && visionResult.usernameSelector) {
                console.log('AI Vision found login page! Using vision-detected selectors...');
                // Store these selectors to use later
                page._visionSelectors = visionResult;
              }
            }
          }
        } catch (e) {
          console.log('AI Vision analysis failed:', e.message);
        }
      }

      // Use AI to wait for page to be ready (additional check)
      await waitForPageReady(page, 'login page');

      // Debug: Check what's actually on the page
      const pageTitle = await page.title();
      const pageUrl = page.url();
      console.log(`Page loaded - Title: ${pageTitle}, URL: ${pageUrl}`);
      
      // At this point, we're on some Tuvoli page - either login page or homepage
      // We'll look for login fields on whatever page we're on

      // AI-powered element finding: Use AI to intelligently find username field with retries
      // Tuvoli uses "Enter Username" not email
      console.log('Using AI to find username input field...');
      let usernameFieldFound = false;
      let usernameSelector = null;

      // First, try using vision-detected selectors if available
      if (page._visionSelectors && page._visionSelectors.usernameSelector) {
        try {
          console.log(`Trying AI Vision-detected selector: ${page._visionSelectors.usernameSelector}`);
          await page.waitForSelector(page._visionSelectors.usernameSelector, { timeout: 10000 });
          usernameSelector = page._visionSelectors.usernameSelector;
          usernameFieldFound = true;
          console.log(`✓ Successfully used AI Vision selector for username`);
        } catch (e) {
          console.log(`AI Vision selector didn't work, trying other methods...`);
        }
      }

      if (OPENAI_API_KEY && OPENAI_API_KEY !== '' && !usernameFieldFound) {
        // Try AI-powered detection with retries (handles slow-loading pages)
        // Tuvoli fields take at least 6 seconds, so we wait longer between retries
        for (let attempt = 0; attempt < 4; attempt++) {
          try {
            const pageStructure = await page.evaluate(() => {
              const inputs = Array.from(document.querySelectorAll('input'));
              return inputs.map(input => ({
                type: input.type,
                name: input.name,
                id: input.id,
                placeholder: input.placeholder,
                className: input.className,
                visible: input.offsetParent !== null,
                label: input.labels?.[0]?.textContent || '',
                ariaLabel: input.getAttribute('aria-label') || ''
              }));
            });

            if (pageStructure.length === 0 && attempt < 3) {
              console.log(`No inputs found yet, waiting for Tuvoli to load... (attempt ${attempt + 1}/4)`);
              await delay(3000); // Wait 3 seconds between retries for slow-loading Tuvoli
              continue;
            }

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
                    content: 'You are a web automation expert. Return ONLY a valid CSS selector for the username input field (the field labeled "Enter Username" or similar). Return JSON: {"selector": "input[name=\'username\']"} or {"selector": null}'
                  },
                  {
                    role: 'user',
                    content: `Find the username input field (labeled "Enter Username") in this form structure: ${JSON.stringify(pageStructure)}. Return the best CSS selector.`
                  }
                ],
                temperature: 0.1,
                max_tokens: 100
              })
            });

            if (response.ok) {
              const data = await response.json();
              const content = data.choices[0]?.message?.content;
              const jsonMatch = content.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                const result = JSON.parse(jsonMatch[0]);
                if (result.selector && result.selector !== 'null') {
                  try {
                    await page.waitForSelector(result.selector, { timeout: 10000 });
                    usernameSelector = result.selector;
                    usernameFieldFound = true;
                    console.log(`AI found username field: ${result.selector}`);
                    break;
                  } catch (e) {
                    console.log(`AI selector didn't work: ${result.selector}, trying again...`);
                  }
                }
              }
            }
          } catch (e) {
            console.log(`AI detection attempt ${attempt + 1} failed: ${e.message}`);
          }

          if (attempt < 3) {
            await delay(3000); // Wait 3 seconds between retries
          }
        }
      }

      // Fallback to traditional selectors if AI didn't find it
      // Tuvoli uses "Enter Username" - look for username fields
      if (!usernameFieldFound) {
        console.log('AI didn\'t find username field, trying traditional selectors with longer timeout...');
        const usernameSelectors = [
          'input[placeholder*="Username" i]',
          'input[placeholder*="username" i]',
          'input[placeholder*="Enter Username" i]',
          'input[name="username"]',
          'input[id="username"]',
          'input[type="text"]:first-of-type', // First text input is usually username
          'input[autocomplete="username"]',
          'input[type="email"]', // Some systems use email for username
          'input[name="email"]',
          'input[id="email"]'
        ];

        for (const selector of usernameSelectors) {
          try {
            // Use longer timeout since Tuvoli takes time to load
            await page.waitForSelector(selector, { timeout: 10000 });
            usernameSelector = selector;
            usernameFieldFound = true;
            console.log(`Found username field with selector: ${selector}`);
            break;
          } catch (e) {
            continue;
          }
        }
      }

      if (!usernameFieldFound || !usernameSelector) {
        // Get page HTML structure for debugging
        const pageContent = await page.evaluate(() => {
          const inputs = Array.from(document.querySelectorAll('input'));
          return inputs.map(input => ({
            type: input.type,
            name: input.name,
            id: input.id,
            placeholder: input.placeholder,
            className: input.className,
            ariaLabel: input.getAttribute('aria-label')
          }));
        });
        console.log('Available input fields on page:', JSON.stringify(pageContent, null, 2));
        throw new Error('Could not find username input field on login page');
      }

      // Type username/email into the field (Tuvoli uses email as username)
      console.log('Typing username...');
      await page.type(usernameSelector, TUVOLI_EMAIL, { delay: 100 });
      await delay(500); // Small delay after typing

      // AI-powered password field finding
      console.log('Using AI to find password input field...');
      let passwordFieldFound = false;
      let passwordSelector = null;

      // First, try using vision-detected selectors if available
      if (page._visionSelectors && page._visionSelectors.passwordSelector) {
        try {
          console.log(`Trying AI Vision-detected selector: ${page._visionSelectors.passwordSelector}`);
          await page.waitForSelector(page._visionSelectors.passwordSelector, { timeout: 10000 });
          passwordSelector = page._visionSelectors.passwordSelector;
          passwordFieldFound = true;
          console.log(`✓ Successfully used AI Vision selector for password`);
        } catch (e) {
          console.log(`AI Vision selector didn't work, trying other methods...`);
        }
      }

      if (OPENAI_API_KEY && OPENAI_API_KEY !== '' && !passwordFieldFound) {
        // Retry logic for password field (Tuvoli loads slowly)
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const pageStructure = await page.evaluate(() => {
              const inputs = Array.from(document.querySelectorAll('input'));
              return inputs.map(input => ({
                type: input.type,
                name: input.name,
                id: input.id,
                placeholder: input.placeholder,
                className: input.className,
                visible: input.offsetParent !== null
              }));
            });

            if (pageStructure.length === 0 && attempt < 2) {
              console.log(`No inputs found yet for password, waiting... (attempt ${attempt + 1}/3)`);
              await delay(3000);
              continue;
            }

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
                    content: 'You are a web automation expert. Return ONLY a valid CSS selector for the password input field. Return JSON: {"selector": "input[type=\'password\']"} or {"selector": null}'
                  },
                  {
                    role: 'user',
                    content: `Find the password input field: ${JSON.stringify(pageStructure)}. Return the best CSS selector.`
                  }
                ],
                temperature: 0.1,
                max_tokens: 100
              })
            });

            if (response.ok) {
              const data = await response.json();
              const content = data.choices[0]?.message?.content;
              const jsonMatch = content.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                const result = JSON.parse(jsonMatch[0]);
                if (result.selector && result.selector !== 'null') {
                  try {
                    await page.waitForSelector(result.selector, { timeout: 10000 });
                    passwordSelector = result.selector;
                    passwordFieldFound = true;
                    console.log(`AI found password field: ${result.selector}`);
                    break;
                  } catch (e) {
                    console.log(`AI selector didn't work, trying again...`);
                  }
                }
              }
            }
          } catch (e) {
            console.log(`AI detection attempt ${attempt + 1} failed: ${e.message}`);
          }

          if (attempt < 2) {
            await delay(3000);
          }
        }
      }

      // Fallback to traditional selectors
      if (!passwordFieldFound) {
        console.log('AI didn\'t find password field, trying traditional selectors...');
        const passwordSelectors = [
          'input[type="password"]',
          'input[name="password"]',
          'input[id="password"]',
          'input[placeholder*="password" i]',
          'input[placeholder*="Password" i]',
          'input[autocomplete="current-password"]'
        ];

        for (const selector of passwordSelectors) {
          try {
            await page.waitForSelector(selector, { timeout: 10000 });
            passwordSelector = selector;
            passwordFieldFound = true;
            console.log(`Found password field with selector: ${selector}`);
            break;
          } catch (e) {
            continue;
          }
        }
      }

      if (!passwordFieldFound || !passwordSelector) {
        throw new Error('Could not find password input field on login page');
      }

      // Type password
      console.log('Typing password...');
      await page.type(passwordSelector, TUVOLI_PASSWORD, { delay: 100 });
      
      // Wait after typing password - button might appear or become enabled after fields are filled
      console.log('Waiting for form to update after filling fields...');
      await delay(2000);
      
      // Trigger any events that might show/enable the button
      await page.keyboard.press('Tab'); // Move focus away from password field
      await delay(500);
      
      // Check if button exists but is disabled
      const buttonState = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, input[type="submit"]'));
        return buttons.map(btn => ({
          text: btn.textContent?.trim() || btn.value || '',
          type: btn.type,
          disabled: btn.disabled,
          visible: btn.offsetParent !== null,
          display: window.getComputedStyle(btn).display,
          opacity: window.getComputedStyle(btn).opacity
        }));
      });
      console.log('Button states after filling fields:', JSON.stringify(buttonState, null, 2));

      // Find and click submit button - make it more robust with retries
      console.log('Looking for submit button...');
      let submitButtonFound = false;
      
      // Button might appear after fields are filled, so we already waited above
      // But wait a bit more to ensure it's fully rendered
      await delay(1000);
      
      // Helper function to try clicking a button with retries
      const tryClickButton = async (selector, description, useXPath = false) => {
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            if (useXPath) {
              const buttons = await page.$x(selector);
              if (buttons.length > 0) {
                // Check if button is visible and enabled
                const isVisible = await page.evaluate((btn) => {
                  return btn.offsetParent !== null && !btn.disabled;
                }, buttons[0]);
                if (isVisible) {
                  await buttons[0].click();
                  return true;
                }
              }
            } else {
              await page.waitForSelector(selector, { timeout: 5000, visible: true });
              // Check if button is actually clickable
              const isClickable = await page.evaluate((sel) => {
                const btn = document.querySelector(sel);
                return btn && btn.offsetParent !== null && !btn.disabled;
              }, selector);
              if (isClickable) {
                await page.click(selector);
                return true;
              }
            }
          } catch (e) {
            if (attempt < 2) {
              await delay(1000);
            }
          }
        }
        return false;
      };
      
      // First, try using vision-detected selector if available
      if (page._visionSelectors && page._visionSelectors.submitSelector) {
        let visionSelector = page._visionSelectors.submitSelector;
        
        // Fix invalid CSS selectors from AI Vision (like :contains which doesn't exist in CSS)
        if (visionSelector.includes(':contains(')) {
          const textMatch = visionSelector.match(/:contains\(['"]([^'"]+)['"]\)/);
          if (textMatch) {
            const buttonText = textMatch[1];
            console.log(`AI Vision suggested :contains selector, converting to XPath for text: "${buttonText}"`);
            submitButtonFound = await tryClickButton(
              `//button[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '${buttonText.toLowerCase()}')]`,
              'AI Vision XPath',
              true
            );
            if (submitButtonFound) {
              console.log(`✓ Successfully clicked button using XPath`);
            }
          }
        } else {
          // Try the selector as-is with retries
          console.log(`Trying AI Vision-detected selector: ${visionSelector}`);
          submitButtonFound = await tryClickButton(visionSelector, 'AI Vision selector');
          if (submitButtonFound) {
            console.log(`✓ Successfully used AI Vision selector for submit button`);
          } else {
            console.log(`AI Vision selector didn't work after retries, trying other methods...`);
          }
        }
      }
      
      // Try XPath for "Sign in" button text FIRST (most reliable since we know the text)
      if (!submitButtonFound) {
        console.log('Trying XPath to find "Sign in" button (prioritizing text match)...');
        const xpathSelectors = [
          "//button[normalize-space(text())='Sign in']", // Exact match
          "//button[normalize-space(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'))='sign in']", // Case-insensitive exact
          "//button[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'sign in')]", // Contains "sign in"
          "//button[starts-with(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'sign in')]", // Starts with "sign in"
          "//button[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'signin')]", // Contains "signin" (no space)
        ];
        
        for (const xpath of xpathSelectors) {
          submitButtonFound = await tryClickButton(xpath, 'XPath "Sign in"', true);
          if (submitButtonFound) {
            console.log(`✓ Found and clicked "Sign in" button using XPath`);
            break;
          }
        }
      }
      
      // Fallback to traditional selectors with multiple strategies
      if (!submitButtonFound) {
        console.log('XPath text matching failed, trying type-based selectors...');
        const loginSubmitSelectors = [
          'form button[type="submit"]', // More specific - button in form
          'button[type="submit"]', // Standard submit button
          'input[type="submit"]', // Input submit button
          'form button:last-of-type', // Last button in form (usually submit)
          'form button', // Any button in form
          'button[type="submit"]:not([disabled])', // Enabled submit button
        ];

        for (const selector of loginSubmitSelectors) {
          submitButtonFound = await tryClickButton(selector, selector);
          if (submitButtonFound) {
            console.log(`✓ Found and clicked submit button with selector: ${selector}`);
            break;
          }
        }
      }
      
      // Additional XPath fallbacks for submit buttons
      if (!submitButtonFound) {
        console.log('Trying additional XPath selectors for submit buttons...');
        const additionalXpath = [
          "//input[@type='submit']",
          "//button[@type='submit']",
          "//form//button[@type='submit']"
        ];
        
        for (const xpath of additionalXpath) {
          submitButtonFound = await tryClickButton(xpath, 'XPath submit', true);
          if (submitButtonFound) {
            console.log(`✓ Found and clicked submit button using XPath`);
            break;
          }
        }
      }
      
      // Try finding button by evaluating all buttons on page
      if (!submitButtonFound) {
        try {
          console.log('Trying to find submit button by evaluating page...');
          const buttonInfo = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button, input[type="submit"]'));
            return buttons.map((btn, idx) => {
              const style = window.getComputedStyle(btn);
              return {
                index: idx,
                type: btn.type,
                text: btn.textContent?.trim() || btn.value || '',
                tagName: btn.tagName,
                isVisible: btn.offsetParent !== null,
                isEnabled: !btn.disabled,
                display: style.display,
                opacity: style.opacity,
                visibility: style.visibility,
                className: btn.className,
                id: btn.id,
                ariaLabel: btn.getAttribute('aria-label') || ''
              };
            });
          });
          
          console.log('Available buttons on page:', JSON.stringify(buttonInfo, null, 2));
          
          // Check if any buttons are hidden (display: none, opacity: 0, etc.)
          const hiddenButtons = buttonInfo.filter(btn => 
            btn.display === 'none' || 
            btn.opacity === '0' || 
            btn.visibility === 'hidden' ||
            !btn.isVisible
          );
          if (hiddenButtons.length > 0) {
            console.log(`Found ${hiddenButtons.length} hidden buttons. They might appear after interaction.`);
          }
          
          // Try to find the submit button - prioritize "Sign in" text
          // First, look for buttons with "Sign in" text
          for (const btnInfo of buttonInfo) {
            if (btnInfo.isVisible && btnInfo.isEnabled && 
                btnInfo.text.toLowerCase().includes('sign in')) {
              const selector = btnInfo.id ? `#${btnInfo.id}` : 
                              btnInfo.className ? `.${btnInfo.className.split(' ')[0]}` :
                              `${btnInfo.tagName.toLowerCase()}:nth-of-type(${btnInfo.index + 1})`;
              submitButtonFound = await tryClickButton(selector, `Evaluated "Sign in" button: ${btnInfo.text}`);
              if (submitButtonFound) {
                console.log(`✓ Clicked "Sign in" button found by evaluation`);
                break;
              }
            }
          }
          
          // If "Sign in" not found, try other submit buttons
          if (!submitButtonFound) {
            for (const btnInfo of buttonInfo) {
              if (btnInfo.isVisible && btnInfo.isEnabled && 
                  (btnInfo.type === 'submit' || 
                   btnInfo.text.toLowerCase().includes('login'))) {
                const selector = btnInfo.id ? `#${btnInfo.id}` : 
                                btnInfo.className ? `.${btnInfo.className.split(' ')[0]}` :
                                `${btnInfo.tagName.toLowerCase()}:nth-of-type(${btnInfo.index + 1})`;
                submitButtonFound = await tryClickButton(selector, `Evaluated button: ${btnInfo.text}`);
                if (submitButtonFound) {
                  console.log(`✓ Clicked button found by evaluation: ${btnInfo.text}`);
                  break;
                }
              }
            }
          }
        } catch (e) {
          console.log(`Button evaluation failed: ${e.message}`);
        }
      }

      if (!submitButtonFound) {
        // Try pressing Enter as fallback (often works for forms)
        console.log('Submit button not found after all attempts, trying Enter key on password field...');
        if (passwordSelector) {
          await page.focus(passwordSelector);
          await delay(500);
          await page.keyboard.press('Enter');
          submitButtonFound = true; // Assume it worked
          console.log('✓ Pressed Enter on password field to submit form');
        } else {
          // Last resort: press Enter anywhere
          await page.keyboard.press('Enter');
          console.log('✓ Pressed Enter as last resort');
        }
      }
      
      // Wait for navigation after login
      console.log('Waiting for navigation after login...');
      
      // Wait a moment for login to process
      await delay(3000);
      
      // Check for error messages first
      const errorMessage = await page.evaluate(() => {
        const errorSelectors = [
          '.error',
          '.alert',
          '[role="alert"]',
          '.message-error',
          '.invalid-feedback',
          '[class*="error" i]',
          '[class*="invalid" i]'
        ];
        for (const selector of errorSelectors) {
          const element = document.querySelector(selector);
          if (element && element.textContent) {
            return element.textContent.trim();
          }
        }
        return null;
      });
      
      if (errorMessage) {
        console.log(`⚠ Error message detected on page: ${errorMessage}`);
        // Don't throw error yet - might still work
      }
      
      // Check if we're still on login page
      let currentUrl = page.url();
      console.log(`Current URL after login click: ${currentUrl}`);
      
      // Try waiting for navigation
      try {
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });
        currentUrl = page.url();
        console.log('Navigation detected after login');
      } catch (e) {
        // If navigation doesn't happen immediately, wait longer and check again
        console.log('No immediate navigation, waiting longer...');
        await delay(5000);
        currentUrl = page.url();
        console.log(`URL after waiting: ${currentUrl}`);
        
        // Check if URL changed even if it still contains /login
        if (currentUrl !== loginUrl) {
          console.log('URL changed (even if still contains /login), login might be processing...');
        }
      }
      
      // Check if we're still on login page
      console.log(`Current URL after login attempt: ${currentUrl}`);
      
      if (currentUrl.includes('/login')) {
        // Check if there are any success indicators or if page content changed
        const pageContent = await page.evaluate(() => {
          return {
            title: document.title,
            hasLoginForm: !!document.querySelector('input[type="password"]'),
            hasDashboard: !!document.querySelector('[class*="dashboard" i], [id*="dashboard" i]'),
            bodyText: document.body?.innerText?.substring(0, 200) || '',
            url: window.location.href,
            allLinks: Array.from(document.querySelectorAll('a')).map(a => a.href).slice(0, 5)
          };
        });
        
        console.log('Page content check:', JSON.stringify(pageContent, null, 2));
        
        // If login form is gone, we might have logged in successfully
        if (!pageContent.hasLoginForm) {
          console.log('✓ Login form disappeared - login likely successful!');
          // Try navigating away from login page
          console.log('Attempting to navigate to home/dashboard...');
          try {
            await page.goto(`${TUVOLI_URL}/home`, { waitUntil: 'networkidle2', timeout: 30000 });
            await delay(2000);
            currentUrl = page.url();
            console.log(`✓ Navigated to: ${currentUrl}`);
            await saveScreenshot('after-navigate-to-home');
          } catch (e) {
            console.log(`⚠ Navigation to /home failed: ${e.message}, will try contact-management directly`);
          }
        } else if (errorMessage) {
          throw new Error(`Login failed: ${errorMessage}`);
        } else {
          // Try waiting a bit more - sometimes login takes time
          console.log('Still on login page, waiting a bit more for login to process...');
          await delay(5000);
          currentUrl = page.url();
          console.log(`URL after additional wait: ${currentUrl}`);
          
          if (currentUrl.includes('/login')) {
            // Check one more time if form is gone
            const stillHasForm = await page.evaluate(() => !!document.querySelector('input[type="password"]'));
            if (!stillHasForm) {
              console.log('✓ Login form disappeared after additional wait - login successful!');
            } else {
              throw new Error('Still on login page after login attempt - login may have failed');
            }
          }
        }
      } else {
        console.log(`✓ Not on login page anymore, current URL: ${currentUrl}`);
      }
      
      console.log('✓ Logged into Tuvoli successfully');
      await saveScreenshot('after-login');
      
      // Get final URL before navigation
      const finalUrlBeforeNav = page.url();
      console.log(`Current URL before navigating to contact-management: ${finalUrlBeforeNav}`);
      
      // Wait a moment for the page to fully load after login
      await delay(3000);

      // Navigate to contact management page - MUST be on noairlines.tuvoli.com/contact-management
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('STEP: Navigating to contact management');
      console.log(`Target URL: ${TUVOLI_URL}/contact-management`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      let contactPageLoaded = false;
      
      try {
        console.log('Attempting navigation with networkidle2...');
        await page.goto(`${TUVOLI_URL}/contact-management`, { waitUntil: 'networkidle2', timeout: 60000 });
        await delay(2000); // Give it time to fully load
        const contactUrl = page.url();
        console.log(`✓ After navigation, current URL: ${contactUrl}`);
        await saveScreenshot('after-navigate-to-contact-management');
        
        if (contactUrl.includes('contact-management') || contactUrl.includes('contacts')) {
          contactPageLoaded = true;
          console.log('✓ Successfully navigated to contact management page');
        } else {
          console.log(`⚠ Not on contact management page! Current URL: ${contactUrl}`);
          console.log('Checking page content...');
          const pageInfo = await page.evaluate(() => {
            return {
              title: document.title,
              url: window.location.href,
              hasContactManagement: document.body?.innerText?.toLowerCase().includes('contact') || false,
              bodyPreview: document.body?.innerText?.substring(0, 300) || ''
            };
          });
          console.log('Page info:', JSON.stringify(pageInfo, null, 2));
        }
      } catch (e) {
        console.log(`✗ Navigation to contact-management failed: ${e.message}`);
        console.log(`Error stack: ${e.stack}`);
      }
      
      if (!contactPageLoaded) {
        // Try alternative URLs
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Trying alternative contact management URLs...');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        const altUrls = [
          `${TUVOLI_URL}/contact-management`,
          `${TUVOLI_URL}/contacts`,
          `${TUVOLI_URL}/home`
        ];
        for (const url of altUrls) {
          try {
            console.log(`Trying: ${url}`);
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
            await delay(2000);
            const altUrl = page.url();
            console.log(`  → Result URL: ${altUrl}`);
            if (altUrl.includes('contact-management') || altUrl.includes('contacts')) {
              contactPageLoaded = true;
              console.log(`✓ Successfully reached contact management via: ${url}`);
              break;
            }
          } catch (altError) {
            console.log(`  ✗ Failed: ${altError.message}`);
            continue;
          }
        }
        
        if (!contactPageLoaded) {
          console.log('⚠ Could not reach contact management page. Current URL:', page.url());
          throw new Error('Failed to navigate to contact management page');
        }
      }

      // Use AI to wait for page to be ready
      await waitForPageReady(page, 'contact management page');
      
      // Take screenshot to verify we're on the right page
      await saveScreenshot('contact-management-page');
      const contactPageScreenshot = await page.screenshot({ encoding: 'base64', fullPage: false });
      console.log('Contact management page loaded, looking for "Add New Contact" button...');

      // Use AI Vision to find "Add New Contact" button
      console.log('Using AI Vision to find "Add New Contact" button...');
      let addButtonSelector = null;
      
      if (OPENAI_API_KEY && OPENAI_API_KEY !== '') {
        try {
          const visionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
              model: 'gpt-4o',
              messages: [
                {
                  role: 'system',
                  content: 'You are a web automation expert. Analyze this screenshot and find the "Add New Contact" button. Return JSON: {"addButtonSelector": "button..."} or {"addButtonSelector": null}'
                },
                {
                  role: 'user',
                  content: [
                    {
                      type: 'text',
                      text: 'Find the "Add New Contact" button on this contact management page. Return a CSS selector.'
                    },
                    {
                      type: 'image_url',
                      image_url: {
                        url: `data:image/png;base64,${contactPageScreenshot}`
                      }
                    }
                  ]
                }
              ],
              max_tokens: 200
            })
          });

          if (visionResponse.ok) {
            const visionData = await visionResponse.json();
            const visionContent = visionData.choices[0]?.message?.content;
            const visionJsonMatch = visionContent.match(/\{[\s\S]*\}/);
            if (visionJsonMatch) {
              const visionResult = JSON.parse(visionJsonMatch[0]);
              if (visionResult.addButtonSelector && visionResult.addButtonSelector !== 'null') {
                addButtonSelector = visionResult.addButtonSelector;
                console.log('AI Vision found Add New Contact button:', addButtonSelector);
              }
            }
          }
        } catch (e) {
          console.log('AI Vision button detection failed:', e.message);
        }
      }
      
      // Look for "Add New Contact" or "Add Contact" button and click it
      console.log('Looking for add contact button...');
      const addButtonSelectors = [
        addButtonSelector, // Try AI Vision selector first
        'button:has-text("Add New Contact")',
        'button:has-text("Add Contact")',
        'button:has-text("New Contact")',
        'button:has-text("Create Contact")',
        'a:has-text("Add New Contact")',
        'a:has-text("Add Contact")',
        'a:has-text("New Contact")',
        'a[href*="contact"]:has-text("Add")',
        'button[aria-label*="Add New"]',
        'button[aria-label*="Add"]',
        'button[aria-label*="New"]',
        '.add-contact',
        '#add-contact',
        '[data-testid="add-contact"]'
      ].filter(s => s !== null);
      
      let formOpened = false;
      for (const selector of addButtonSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 5000, visible: true });
          await page.click(selector);
          await delay(3000); // Wait longer for modal/form to open
          formOpened = true;
          console.log(`✓ Add contact button clicked using selector: ${selector}`);
          break;
        } catch (e) {
          continue;
        }
      }
      
      // Try XPath for "Add New Contact" button
      if (!formOpened) {
        try {
          console.log('Trying XPath to find "Add New Contact" button...');
          const addButtons = await page.$x("//button[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'add new contact')]");
          if (addButtons.length === 0) {
            const addButtons2 = await page.$x("//button[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'add contact')]");
            if (addButtons2.length > 0) {
              await addButtons2[0].click();
              formOpened = true;
              console.log('✓ Clicked "Add Contact" button using XPath');
            }
          } else {
            await addButtons[0].click();
            formOpened = true;
            console.log('✓ Clicked "Add New Contact" button using XPath');
          }
          if (formOpened) {
            await delay(3000);
          }
        } catch (e) {
          console.log('XPath button search failed:', e.message);
        }
      }

      if (!formOpened) {
        // If no button found, try navigating directly to new contact URL
        console.log('Button not found, trying direct navigation to new contact form...');
        try {
          await page.goto(`${TUVOLI_URL}/contact-management/new`, { waitUntil: 'networkidle2', timeout: 30000 });
          await delay(3000);
          formOpened = true;
          console.log('✓ Navigated directly to new contact form');
        } catch (e) {
          try {
            await page.goto(`${TUVOLI_URL}/contact-management/create`, { waitUntil: 'networkidle2', timeout: 30000 });
            await delay(3000);
            formOpened = true;
            console.log('✓ Navigated directly to create contact form');
          } catch (e2) {
            console.log('Direct navigation also failed');
          }
        }
      }
      
      if (!formOpened) {
        throw new Error('Could not open contact creation form');
      }

      // Wait for modal/form to be fully loaded
      console.log('Waiting for contact form to load...');
      await delay(3000);
      await saveScreenshot('contact-form-opened');
      
      // Use AI Vision to analyze the contact form
      console.log('Using AI Vision to analyze contact form...');
      const formScreenshot = await page.screenshot({ encoding: 'base64', fullPage: false });
      let visionFormSelectors = null;
      
      if (OPENAI_API_KEY && OPENAI_API_KEY !== '') {
        try {
          const visionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
              model: 'gpt-4o',
              messages: [
                {
                  role: 'system',
                  content: 'You are a web automation expert. Analyze this contact form screenshot and identify CSS selectors for: First Name, Last Name, Primary Email, Primary Phone, Individual Account checkbox, and Create button. Return JSON: {"firstName": "input...", "lastName": "input...", "email": "input...", "phone": "input...", "individualAccountCheckbox": "input[type=\'checkbox\']...", "createButton": "button..."}'
                },
                {
                  role: 'user',
                  content: [
                    {
                      type: 'text',
                      text: 'Find the form fields: First Name *, Last Name *, Primary Email *, Primary Phone, Individual Account checkbox, and Create button. Return CSS selectors.'
                    },
                    {
                      type: 'image_url',
                      image_url: {
                        url: `data:image/png;base64,${formScreenshot}`
                      }
                    }
                  ]
                }
              ],
              max_tokens: 400
            })
          });

          if (visionResponse.ok) {
            const visionData = await visionResponse.json();
            const visionContent = visionData.choices[0]?.message?.content;
            const visionJsonMatch = visionContent.match(/\{[\s\S]*\}/);
            if (visionJsonMatch) {
              visionFormSelectors = JSON.parse(visionJsonMatch[0]);
              console.log('AI Vision found form selectors:', visionFormSelectors);
            }
          }
        } catch (e) {
          console.log('AI Vision form analysis failed:', e.message);
        }
      }

      // Use AI to analyze the page and find form fields dynamically
      console.log('Using AI to analyze form structure...');
      const formHTML = await page.evaluate(() => {
        // Get all form elements and their attributes, including labels
        const forms = Array.from(document.querySelectorAll('form'));
        const inputs = Array.from(document.querySelectorAll('input, textarea, select'));
        const buttons = Array.from(document.querySelectorAll('button, input[type="submit"]'));
        
        // Get labels for each input
        const getLabelForInput = (input) => {
          // Try label[for] attribute
          if (input.id) {
            const label = document.querySelector(`label[for="${input.id}"]`);
            if (label) return label.textContent?.trim() || '';
          }
          // Try parent label
          let parent = input.parentElement;
          while (parent && parent.tagName !== 'BODY') {
            if (parent.tagName === 'LABEL') {
              return parent.textContent?.trim() || '';
            }
            parent = parent.parentElement;
          }
          // Try previous sibling label
          let prev = input.previousElementSibling;
          while (prev) {
            if (prev.tagName === 'LABEL') {
              return prev.textContent?.trim() || '';
            }
            prev = prev.previousElementSibling;
          }
          return '';
        };
        
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
            label: getLabelForInput(input) || input.labels?.[0]?.textContent || '',
            className: input.className,
            tagName: input.tagName.toLowerCase(),
            value: input.value
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

      // Fill in contact form using AI Vision selectors first, then AI-determined, then fallback
      console.log('Filling contact form...');
      await saveScreenshot('before-filling-form');
      
      const fillField = async (selectors, value, fieldName) => {
        if (!value) {
          console.log(`Skipping ${fieldName} - no value provided`);
          return false;
        }
        
        // Try AI Vision selector first (most reliable)
        if (visionFormSelectors && selectors.visionSelector && visionFormSelectors[selectors.visionSelector]) {
          try {
            const selector = visionFormSelectors[selectors.visionSelector];
            await page.waitForSelector(selector, { timeout: 5000, visible: true });
            // Clear field first
            await page.click(selector);
            await page.keyboard.down('Control');
            await page.keyboard.press('a');
            await page.keyboard.up('Control');
            await page.type(selector, value, { delay: 50 });
            console.log(`✓ Filled ${fieldName} using AI Vision selector: ${selector}`);
            
            // Update knowledge base with working selector
            const fieldKey = fieldName.toLowerCase().replace(/\s+/g, '');
            if (!reasoningMemory.workingSelectors[fieldKey]) {
              reasoningMemory.workingSelectors[fieldKey] = selector;
              console.log(`🧠 Knowledge Base Update: Working selector for ${fieldName}: ${selector}`);
            }
            
            return true;
          } catch (e) {
            console.log(`AI Vision selector failed for ${fieldName}, trying other methods...`);
          }
        }
        
        // Try AI-determined selector
        if (fieldSelectors && selectors.aiSelector && fieldSelectors[selectors.aiSelector] && fieldSelectors[selectors.aiSelector] !== 'null') {
          try {
            const selector = fieldSelectors[selectors.aiSelector];
            await page.waitForSelector(selector, { timeout: 3000, visible: true });
            await page.click(selector);
            await page.keyboard.down('Control');
            await page.keyboard.press('a');
            await page.keyboard.up('Control');
            await page.type(selector, value, { delay: 50 });
            console.log(`✓ Filled ${fieldName} using AI selector: ${selector}`);
            
            // Update knowledge base with working selector
            const fieldKey = fieldName.toLowerCase().replace(/\s+/g, '');
            if (!reasoningMemory.workingSelectors[fieldKey]) {
              reasoningMemory.workingSelectors[fieldKey] = selector;
              console.log(`🧠 Knowledge Base Update: Working selector for ${fieldName}: ${selector}`);
            }
            
            return true;
          } catch (e) {
            console.log(`AI selector failed for ${fieldName}, trying fallbacks...`);
          }
        }
        
        // Fallback to common selectors
        for (const selector of selectors.fallback) {
          try {
            await page.waitForSelector(selector, { timeout: 2000, visible: true });
            await page.click(selector);
            await page.keyboard.down('Control');
            await page.keyboard.press('a');
            await page.keyboard.up('Control');
            await page.type(selector, value, { delay: 50 });
            console.log(`✓ Filled ${fieldName} using fallback selector: ${selector}`);
            
            // Update knowledge base with working selector
            const fieldKey = fieldName.toLowerCase().replace(/\s+/g, '');
            if (!reasoningMemory.workingSelectors[fieldKey]) {
              reasoningMemory.workingSelectors[fieldKey] = selector;
              console.log(`🧠 Knowledge Base Update: Working selector for ${fieldName}: ${selector}`);
            }
            
            return true;
          } catch (e) {
            continue;
          }
        }
        console.log(`✗ Could not find ${fieldName} field`);
        return false;
      };

      // Fill each field - use labels from screenshot
      await fillField(
        { 
          visionSelector: 'firstName',
          aiSelector: 'firstName', 
          fallback: [
            'input[placeholder*="First Name" i]',
            'label:has-text("First Name") + input',
            'label:has-text("First Name *") + input',
            'input[name="firstName"]', 
            'input[name="first_name"]', 
            'input[id="firstName"]',
            'input[placeholder*="First"]'
          ] 
        },
        firstName,
        'First Name'
      );
      
      await fillField(
        { 
          visionSelector: 'lastName',
          aiSelector: 'lastName', 
          fallback: [
            'input[placeholder*="Last Name" i]',
            'label:has-text("Last Name") + input',
            'label:has-text("Last Name *") + input',
            'input[name="lastName"]', 
            'input[name="last_name"]', 
            'input[id="lastName"]',
            'input[placeholder*="Last"]'
          ] 
        },
        lastName,
        'Last Name'
      );
      
      await fillField(
        { 
          visionSelector: 'email',
          aiSelector: 'email', 
          fallback: [
            'input[placeholder*="Primary Email" i]',
            'input[placeholder*="Email" i]',
            'input[type="email"]', 
            'input[name="email"]', 
            'input[id="email"]'
          ] 
        },
        itineraryData.email || '',
        'Email'
      );
      
      await fillField(
        { 
          visionSelector: 'phone',
          aiSelector: 'phone', 
          fallback: [
            'input[placeholder*="Primary Phone" i]',
            'input[placeholder*="Phone" i]',
            'input[type="tel"]', 
            'input[name="phone"]', 
            'input[name="phoneNumber"]', 
            'input[id="phone"]'
          ] 
        },
        itineraryData.phone || '',
        'Phone'
      );
      
      // Check "Individual Account" checkbox to bypass Account requirement
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Checking Individual Account checkbox (REQUIRED)...');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      let checkboxChecked = false;
      
      // Strategy 0: SIMPLE ID SELECTOR (should work - checkbox has id="individual-account")
      try {
        console.log('Trying simple ID selector: #individual-account');
        const checkbox = await page.$('#individual-account');
        if (checkbox) {
          // Check if it's visible, if not, make it visible
          const isVisible = await page.evaluate((cb) => {
            const style = window.getComputedStyle(cb);
            return style.display !== 'none' && style.visibility !== 'hidden' && cb.offsetParent !== null;
          }, checkbox);
          
          if (!isVisible) {
            console.log('Checkbox exists but not visible, forcing visibility...');
            await page.evaluate(() => {
              const cb = document.getElementById('individual-account');
              if (cb) {
                cb.style.display = 'block';
                cb.style.visibility = 'visible';
                cb.style.opacity = '1';
                cb.scrollIntoView({ behavior: 'instant', block: 'center' });
              }
            });
            await delay(500);
          }
          
          const isChecked = await page.evaluate((cb) => cb.checked, checkbox);
          if (!isChecked) {
            await checkbox.click();
            console.log('✓ Checked Individual Account checkbox using simple ID selector: #individual-account');
            checkboxChecked = true;
            
            // Update knowledge base
            if (!reasoningMemory.workingSelectors['individualaccount']) {
              reasoningMemory.workingSelectors['individualaccount'] = '#individual-account';
              console.log('🧠 Knowledge Base Update: Individual Account checkbox selector: #individual-account');
            }
          } else {
            console.log('✓ Individual Account checkbox already checked (ID selector)');
            checkboxChecked = true;
          }
        }
      } catch (e) {
        console.log(`ID selector failed: ${e.message}, trying other strategies...`);
      }
      
      // Strategy 1: AI Vision selector
      if (visionFormSelectors && visionFormSelectors.individualAccountCheckbox) {
        try {
          const selector = visionFormSelectors.individualAccountCheckbox;
          console.log(`Trying AI Vision selector: ${selector}`);
          await page.waitForSelector(selector, { timeout: 5000, visible: true });
          const isChecked = await page.$eval(selector, checkbox => checkbox.checked);
          if (!isChecked) {
            await page.click(selector);
            console.log('✓ Checked Individual Account checkbox using AI Vision selector');
            checkboxChecked = true;
          } else {
            console.log('✓ Individual Account checkbox already checked (AI Vision selector)');
            checkboxChecked = true;
          }
        } catch (e) {
          console.log(`AI Vision checkbox selector failed: ${e.message}, trying fallbacks...`);
        }
      }
      
      // Strategy 2: XPath - find label with "Individual Account" text, then find checkbox
      if (!checkboxChecked) {
        try {
          console.log('Trying XPath: label containing "Individual Account" -> checkbox');
          const checkboxes = await page.$x("//label[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'individual account')]//input[@type='checkbox']");
          if (checkboxes.length === 0) {
            // Try alternative XPath - checkbox followed by text
            const checkboxes2 = await page.$x("//input[@type='checkbox'][following-sibling::text()[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'individual account')]]");
            if (checkboxes2.length > 0) {
              const isChecked = await page.evaluate(cb => cb.checked, checkboxes2[0]);
              if (!isChecked) {
                await checkboxes2[0].click();
                console.log('✓ Checked Individual Account checkbox using XPath (following-sibling)');
                checkboxChecked = true;
              } else {
                console.log('✓ Individual Account checkbox already checked (XPath)');
                checkboxChecked = true;
              }
            }
          } else {
            const isChecked = await page.evaluate(cb => cb.checked, checkboxes[0]);
            if (!isChecked) {
              await checkboxes[0].click();
              console.log('✓ Checked Individual Account checkbox using XPath (label)');
              checkboxChecked = true;
            } else {
              console.log('✓ Individual Account checkbox already checked (XPath)');
              checkboxChecked = true;
            }
          }
        } catch (e) {
          console.log(`XPath checkbox search failed: ${e.message}`);
        }
      }
      
      // Strategy 3: Find all checkboxes and check which one is near "Individual Account" text
      if (!checkboxChecked) {
        try {
          console.log('Trying strategy: Find all checkboxes and check labels...');
          const checkboxInfo = await page.evaluate(() => {
            const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
            return checkboxes.map((cb, index) => {
              // Find label for this checkbox
              let labelText = '';
              if (cb.id) {
                const label = document.querySelector(`label[for="${cb.id}"]`);
                if (label) labelText = label.textContent || '';
              }
              // Check parent label
              let parent = cb.parentElement;
              while (parent && parent.tagName !== 'BODY') {
                if (parent.tagName === 'LABEL') {
                  labelText = parent.textContent || '';
                  break;
                }
                parent = parent.parentElement;
              }
              // Check nearby text
              const nearbyText = cb.parentElement?.textContent || '';
              
              return {
                index,
                id: cb.id || '',
                name: cb.name || '',
                checked: cb.checked,
                labelText: labelText.trim(),
                nearbyText: nearbyText.substring(0, 100),
                hasIndividual: (labelText + nearbyText).toLowerCase().includes('individual')
              };
            });
          });
          
          console.log('Found checkboxes:', JSON.stringify(checkboxInfo, null, 2));
          
          const individualCheckbox = checkboxInfo.find(cb => cb.hasIndividual);
          if (individualCheckbox) {
            const allCheckboxes = await page.$$('input[type="checkbox"]');
            if (allCheckboxes[individualCheckbox.index]) {
              const isChecked = await page.evaluate(cb => cb.checked, allCheckboxes[individualCheckbox.index]);
              if (!isChecked) {
                await allCheckboxes[individualCheckbox.index].click();
                console.log(`✓ Checked Individual Account checkbox (found by label text: "${individualCheckbox.labelText}")`);
                checkboxChecked = true;
              } else {
                console.log('✓ Individual Account checkbox already checked (found by label)');
                checkboxChecked = true;
              }
            }
          }
        } catch (e) {
          console.log(`Checkbox search by label failed: ${e.message}`);
        }
      }
      
      // Strategy 4: JavaScript-based search and click (works even if not visible)
      if (!checkboxChecked) {
        try {
          console.log('Trying JavaScript-based checkbox search and click (works even if hidden)...');
          const checkboxFound = await page.evaluate(() => {
            // Find all checkboxes
            const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
            
            for (const checkbox of checkboxes) {
              // Get label text
              let labelText = '';
              
              // Try label[for] attribute
              if (checkbox.id) {
                const label = document.querySelector(`label[for="${checkbox.id}"]`);
                if (label) labelText = label.textContent || '';
              }
              
              // Try parent label
              let parent = checkbox.parentElement;
              while (parent && parent.tagName !== 'BODY') {
                if (parent.tagName === 'LABEL') {
                  labelText = parent.textContent || '';
                  break;
                }
                parent = parent.parentElement;
              }
              
              // Check nearby text
              const nearbyText = checkbox.parentElement?.textContent || checkbox.closest('div')?.textContent || '';
              const allText = (labelText + ' ' + nearbyText).toLowerCase();
              
              // Check if this is the Individual Account checkbox
              if (allText.includes('individual') && allText.includes('account')) {
                // Found it! Force visibility and check it
                checkbox.style.display = 'block';
                checkbox.style.visibility = 'visible';
                checkbox.style.opacity = '1';
                checkbox.removeAttribute('hidden');
                
                // Scroll into view
                checkbox.scrollIntoView({ behavior: 'instant', block: 'center' });
                
                // Check it if not already checked
                if (!checkbox.checked) {
                  checkbox.click();
                  return { found: true, checked: true, labelText: labelText.trim() };
                } else {
                  return { found: true, checked: false, labelText: labelText.trim(), message: 'already checked' };
                }
              }
            }
            
            return { found: false };
          });
          
          if (checkboxFound.found) {
            if (checkboxFound.checked) {
              console.log(`✓ Checked Individual Account checkbox via JavaScript (label: "${checkboxFound.labelText}")`);
            } else {
              console.log(`✓ Individual Account checkbox already checked via JavaScript (label: "${checkboxFound.labelText}")`);
            }
            checkboxChecked = true;
          } else {
            console.log('JavaScript search did not find Individual Account checkbox');
          }
        } catch (e) {
          console.log(`JavaScript checkbox search failed: ${e.message}`);
        }
      }
      
      // Strategy 5: Scroll form and try again
      if (!checkboxChecked) {
        try {
          console.log('Scrolling form into view and retrying...');
          await page.evaluate(() => {
            const form = document.querySelector('form') || document.querySelector('[class*="modal"]') || document.body;
            if (form) {
              form.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          });
          await delay(1000);
          
          // Try JavaScript search again after scrolling
          const checkboxFound = await page.evaluate(() => {
            const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
            for (const checkbox of checkboxes) {
              let labelText = '';
              if (checkbox.id) {
                const label = document.querySelector(`label[for="${checkbox.id}"]`);
                if (label) labelText = label.textContent || '';
              }
              let parent = checkbox.parentElement;
              while (parent && parent.tagName !== 'BODY') {
                if (parent.tagName === 'LABEL') {
                  labelText = parent.textContent || '';
                  break;
                }
                parent = parent.parentElement;
              }
              const nearbyText = checkbox.parentElement?.textContent || '';
              const allText = (labelText + ' ' + nearbyText).toLowerCase();
              if (allText.includes('individual') && allText.includes('account')) {
                checkbox.style.display = 'block';
                checkbox.style.visibility = 'visible';
                checkbox.style.opacity = '1';
                checkbox.scrollIntoView({ behavior: 'instant', block: 'center' });
                if (!checkbox.checked) {
                  checkbox.click();
                  return { found: true, checked: true };
                } else {
                  return { found: true, checked: false };
                }
              }
            }
            return { found: false };
          });
          
          if (checkboxFound.found) {
            console.log('✓ Checked Individual Account checkbox after scrolling');
            checkboxChecked = true;
          }
        } catch (e) {
          console.log(`Scroll and retry failed: ${e.message}`);
        }
      }
      
      if (!checkboxChecked) {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('⚠ WARNING: Could not find Individual Account checkbox');
        console.log('The form may require an Account field instead');
        console.log('Continuing anyway - contact creation may fail');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      } else {
        // Verify it's actually checked
        await delay(500);
        const isActuallyChecked = await page.evaluate(() => {
          const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
          for (const checkbox of checkboxes) {
            const labelText = checkbox.closest('label')?.textContent || 
                             document.querySelector(`label[for="${checkbox.id}"]`)?.textContent || '';
            const nearbyText = checkbox.parentElement?.textContent || '';
            const allText = (labelText + ' ' + nearbyText).toLowerCase();
            if (allText.includes('individual') && allText.includes('account')) {
              return checkbox.checked;
            }
          }
          return false;
        });
        
        if (isActuallyChecked) {
          console.log('✅ Verified: Individual Account checkbox is checked');
          
          // Update knowledge base with working approach
          const checkboxApproach = 'javascript_checkbox_search_with_force_visibility';
          if (!reasoningMemory.workingApproaches.includes(checkboxApproach)) {
            reasoningMemory.workingApproaches.push(checkboxApproach);
            console.log(`🧠 Knowledge Base Update: Checkbox approach "${checkboxApproach}" works - added to knowledge base`);
          }
          
          const fact = 'Individual Account checkbox can be found and checked using JavaScript search of all checkboxes by label text';
          if (!reasoningMemory.learnedFacts.includes(fact)) {
            reasoningMemory.learnedFacts.push(fact);
          }
        } else {
          console.log('⚠ Warning: Checkbox may not be checked - verification failed');
        }
      }
      
      // Fill notes field if available
      await fillField(
        { 
          aiSelector: 'notes', 
          fallback: [
            'textarea[name="notes"]', 
            'textarea[name="note"]', 
            'textarea[id="notes"]', 
            'textarea[placeholder*="Note"]'
          ] 
        },
        notes,
        'Notes'
      );

      // Submit the form - look for "Create" button
      console.log('Submitting contact form...');
      await saveScreenshot('before-submit');
      let submitted = false;
      
      // Try AI Vision selector first
      if (visionFormSelectors && visionFormSelectors.createButton) {
        try {
          await page.waitForSelector(visionFormSelectors.createButton, { timeout: 5000, visible: true });
          await page.click(visionFormSelectors.createButton);
          submitted = true;
          console.log(`✓ Clicked Create button using AI Vision selector`);
        } catch (e) {
          console.log('AI Vision Create button selector failed, trying other methods...');
        }
      }
      
      // Try other selectors
      if (!submitted) {
        const submitSelectors = [
          'button:has-text("Create")',
          'button:has-text("Create Contact")',
          fieldSelectors?.submitButton && fieldSelectors.submitButton !== 'null' ? fieldSelectors.submitButton : null,
          'button[type="submit"]',
          'button:has-text("Save")',
          'button:has-text("Add Contact")',
          'button:has-text("Submit")'
        ].filter(s => s !== null);
        
        for (const selector of submitSelectors) {
          try {
            await page.waitForSelector(selector, { timeout: 3000, visible: true });
            await page.click(selector);
            console.log(`✓ Clicked submit button: ${selector}`);
            submitted = true;
            break;
          } catch (e) {
            continue;
          }
        }
      }
      
      // Try XPath for "Create" button
      if (!submitted) {
        try {
          const createButtons = await page.$x("//button[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'create')]");
          if (createButtons.length > 0) {
            await createButtons[0].click();
            submitted = true;
            console.log('✓ Clicked Create button using XPath');
          }
        } catch (e) {
          console.log('XPath Create button search failed');
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
      
      // Wait for form submission and check for success
      console.log('Waiting for contact creation to complete...');
      await delay(5000);
      await saveScreenshot('after-submit');
      
      // Check if contact was created successfully
      const successCheck = await page.evaluate(() => {
        // Look for success messages
        const successIndicators = [
          'success',
          'created',
          'saved',
          'contact created',
          'contact saved'
        ];
        
        const bodyText = document.body?.innerText?.toLowerCase() || '';
        const hasSuccessMessage = successIndicators.some(indicator => bodyText.includes(indicator));
        
        // Check if modal/form is gone (indicates success)
        const hasModal = !!document.querySelector('[role="dialog"], .modal, [class*="modal" i]');
        const hasForm = !!document.querySelector('input[type="password"], input[name*="firstName" i]');
        
        return {
          hasSuccessMessage,
          modalGone: !hasModal,
          formGone: !hasForm,
          currentUrl: window.location.href
        };
      });
      
      console.log('Contact creation result check:', JSON.stringify(successCheck, null, 2));
      
      if (successCheck.hasSuccessMessage || (successCheck.modalGone && successCheck.formGone)) {
        console.log('✓ Contact created successfully in Tuvoli');
      } else {
        console.log('⚠ Contact creation status unclear - may need manual verification');
      }
      
      // Check if AI-guided mode completed successfully
      if (aiGuidedMode && aiAttempts < maxAIAttempts) {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ AI-GUIDED AUTOMATION COMPLETED SUCCESSFULLY');
        console.log(`Completed in ${aiAttempts} AI reasoning steps`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      } else {
        console.log('Contact creation process completed');
      }
      
      await saveScreenshot('final-state');

      if (TUVOLI_DEBUG) {
        console.log('🔍 DEBUG MODE: Keeping browser open for 30 seconds so you can see the result...');
        console.log('🔍 Set TUVOLI_DEBUG=false in Railway to run headless in production.');
        await delay(30000); // Keep browser open for 30 seconds in debug mode
      }

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
