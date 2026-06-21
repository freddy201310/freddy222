# Portable container image — works on Fly.io, Railway, Cloud Run, etc.
FROM node:20-alpine

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm install --omit=dev

# Copy the rest of the app
COPY . .

# The server reads PORT from the environment (defaults to 3000)
EXPOSE 3000
CMD ["npm", "start"]
