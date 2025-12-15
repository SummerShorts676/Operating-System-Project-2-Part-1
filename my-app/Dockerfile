# Dockerfile for Next.js frontend
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Accept build argument for API URL
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Build the Next.js application
RUN npm run build

# Expose port
EXPOSE 3000

# Set environment variable for production
ENV NODE_ENV=production

# Start Next.js in production mode
CMD ["npm", "start"]
