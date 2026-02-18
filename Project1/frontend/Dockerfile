FROM node:18-alpine

WORKDIR /app

# Install http-server globally
RUN npm install -g http-server

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy frontend files
COPY . .

EXPOSE 3000

# Use http-server to serve static files
CMD ["http-server", "-p", "3000", "--cors", "-c-1"]
