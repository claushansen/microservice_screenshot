FROM node:20-alpine

# Installer Chromium og nødvendige afhængigheder
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Fortæl Puppeteer at bruge installeret Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Opret app directory
WORKDIR /app

# Kopier package files
COPY package*.json ./

# Installer dependencies
RUN npm install --omit=dev

# Kopier application kode
COPY src ./src

# Eksponér port (kan overskrives med environment variable)
EXPOSE 3000

# Kør applikationen
CMD ["node", "src/server.js"]
