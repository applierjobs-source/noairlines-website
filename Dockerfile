# Use Node.js 18 Alpine image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all files
COPY . .

# Expose a default port (Railway will override this)
EXPOSE 3000

# Start command using Railway's PORT environment variable
CMD ["sh", "-c", "npx serve . -s -l ${PORT:-3000}"]
