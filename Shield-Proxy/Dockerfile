# Sentinel Shield Proxy Dockerfile
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose the Shield port
EXPOSE 8081

# Command to run the proxy
CMD ["node", "index.js"]
