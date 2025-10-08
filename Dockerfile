# Use Node.js 18 Alpine image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy all files
COPY . .

# Expose a default port (Railway will override this)
EXPOSE 3000

# Start the server using Node.js built-in HTTP server
CMD ["node", "server.js"]
