FROM node:18-alpine

WORKDIR /app

# Install dependencies first (layer caching)
COPY package*.json ./
RUN npm install --omit=dev

# Copy source code
COPY . .

EXPOSE 5000

# Wait for DB to be ready, seed users, then start server
CMD ["sh", "-c", "node database/seed.js && node server.js"]
