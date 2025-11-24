# Use Node.js 18 Alpine image
FROM node:18-alpine

# Install Puppeteer dependencies for Chromium
# These are required for Puppeteer to work in Alpine Linux
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    ttf-opensans \
    ttf-dejavu \
    ttf-liberation \
    udev \
    ttf-opensans \
    && rm -rf /var/cache/apk/*

# Set Puppeteer to use installed Chromium instead of downloading
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install ALL dependencies (including devDependencies needed for build)
# Using npm install instead of npm ci to handle lock file updates
RUN npm install --legacy-peer-deps

# Copy all source files
COPY . .

# Build the React app with verbose output
RUN npm run build 2>&1 || (echo "Build failed!" && exit 1)

# Verify build output
RUN ls -la dist/ && echo "=== Build completed ===" && \
    if [ -d "dist" ]; then echo "✓ dist folder created"; else echo "✗ dist folder MISSING"; fi && \
    if [ -f "dist/index.html" ]; then echo "✓ dist/index.html found"; else echo "✗ dist/index.html MISSING"; fi

# Expose a default port (Railway will override this)
EXPOSE 3000

# Start the server (using .cjs extension for CommonJS)
CMD ["node", "server.cjs"]
