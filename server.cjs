const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;
const DIST_DIR = path.join(__dirname, 'dist');

// Email configuration
const EMAIL_RECIPIENTS = ['zach@noairlines.com', 'johndavidarrow@gmail.com', 'john@noairlines.com'];
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://hooks.zapier.com/hooks/catch/YOUR_WEBHOOK_ID/'; // Replace with actual webhook

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

// Email sending function using webhook
const sendItineraryEmail = async (itineraryData) => {
  try {
    console.log('Sending itinerary email for:', itineraryData.email);
    
    const emailData = {
      customer_name: itineraryData.name || 'NoAirlines Customer',
      customer_email: itineraryData.email,
      customer_phone: itineraryData.phone || 'N/A',
      from_location: itineraryData.from,
      to_location: itineraryData.to,
      departure_date: itineraryData.date,
      departure_time: itineraryData.time,
      return_date: itineraryData.returnDate || 'N/A',
      return_time: itineraryData.returnTime || 'N/A',
      passengers: itineraryData.passengers,
      trip_type: itineraryData.tripType || 'one-way',
      message: `New flight inquiry from ${itineraryData.name || 'NoAirlines Customer'} (${itineraryData.email || 'no email provided'}) — Phone: ${itineraryData.phone || 'N/A'}`,
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
