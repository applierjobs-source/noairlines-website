# Use Node.js 18 Alpine image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies (faster with npm ci if lock file is up to date)
# Fallback to npm install if lock file is missing
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

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
