# Step 1: Build the environment
FROM node:18-alpine AS runner
WORKDIR /app

# Copy dependency files
COPY package*.json ./
COPY client/package*.json ./client/

# Install ALL dependencies (including dev deps like tsx/nodemon if needed, or production)
RUN npm install
RUN cd client && npm install

# Copy all source files
COPY . .

# Build the client static assets into client/dist
RUN cd client && npm run build

# Expose the port your Express/Node server runs on (e.g., 3000, 5000, etc.)
# Change "3000" to whatever port your server/index.ts listens on!
EXPOSE 3000

# Start the actual backend server using tsx
CMD ["npx", "tsx", "server/index.ts"]