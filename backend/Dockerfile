# Use official Node.js LTS image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package.json ./
RUN npm install 

# Copy rest of the backend code
COPY . .

# Expose port
EXPOSE 5000

# Start the server
CMD ["npm","run", "start"]
