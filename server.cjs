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
      from_location: itineraryData.from,
      to_location: itineraryData.to,
      departure_date: itineraryData.date,
      departure_time: itineraryData.time,
      return_date: itineraryData.returnDate || 'N/A',
      return_time: itineraryData.returnTime || 'N/A',
      passengers: itineraryData.passengers,
      trip_type: itineraryData.tripType || 'one-way',
      message: `New flight inquiry from ${itineraryData.name} (${itineraryData.email})`,
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
  
  // Parse URL and set file path relative to dist directory
  let filePath = path.join(DIST_DIR, req.url === '/' ? 'index.html' : req.url);
  
  // Remove query string
  const queryIndex = filePath.indexOf('?');
  if (queryIndex !== -1) {
    filePath = filePath.substring(0, queryIndex);
  }
  
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
