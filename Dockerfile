FROM node:20-slim

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --production

# Copy application files
COPY search-api.js ./
COPY metal-search.html ./
COPY bands.db ./

# Expose port
EXPOSE 3456

# Start the server
CMD ["node", "search-api.js"]
