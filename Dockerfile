# Use Node.js 18 Alpine image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy all files
COPY . .

# Verify files are copied (for debugging)
RUN ls -la && echo "=== Files copied ===" && \
    if [ -f "server.js" ]; then echo "✓ server.js found"; else echo "✗ server.js MISSING"; fi && \
    if [ -f "index.html" ]; then echo "✓ index.html found"; else echo "✗ index.html MISSING"; fi

# Expose a default port (Railway will override this)
EXPOSE 3000

# Start the server using Node.js built-in HTTP server
CMD ["sh", "-c", "echo Starting container... && echo PORT=$PORT && ls -la server.js && node server.js"]
