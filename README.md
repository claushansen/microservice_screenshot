# Screenshot Microservice

En containeriseret microservice til at tage screenshots af websites med forskellige skærmstørrelser og formater.

## Features

- 📸 Tag screenshots af enhver URL
- 🖥️ 5 foruddefinerede skærmstørrelser (desktop, laptop, tablet, mobile, mobile-large)
- 🎨 Understøtter PNG og JPEG formater
- ⚙️ JPEG kvalitetskontrol (0-100)
- 📄 Vælg mellem viewport eller full-page screenshots
- 🐳 Fuldt dockeriseret med Docker Compose
- 🔄 Base64-kodet output via JSON API
- ⏱️ 30 sekunders timeout med network idle wait strategy

## Skærmstørrelser

| Navn | Bredde | Højde |
|------|--------|-------|
| desktop | 1920px | 1080px |
| laptop | 1366px | 768px |
| tablet | 768px | 1024px |
| mobile | 375px | 667px |
| mobile-large | 414px | 896px |

## API Endpoints

### GET /health
Tjek service status

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2026-01-08T10:30:00.000Z",
  "service": "screenshot-microservice"
}
```

### GET /info
Vis tilgængelige skærmstørrelser og indstillinger

**Response:**
```json
{
  "screenSizes": [
    { "name": "desktop", "width": 1920, "height": 1080 },
    { "name": "laptop", "width": 1366, "height": 768 },
    ...
  ],
  "formats": ["png", "jpeg"],
  "defaultFormat": "png",
  "defaultQuality": 80,
  "timeout": "30 sekunder",
  "options": {
    "fullPage": "boolean - Tag screenshot af hele siden (default: false)"
  }
}
```

### POST /screenshot
Tag screenshot af en URL

**Request Body:**
```json
{
  "url": "https://example.com",
  "screenSize": "desktop",
  "format": "png",
  "quality": 80,
  "fullPage": false
}
```

**Parameters:**
- `url` (required): URL til websitet (skal starte med http:// eller https://)
- `screenSize` (optional): Skærmstørrelse (default: "desktop")
- `format` (optional): Billedformat - "png" eller "jpeg" (default: "png")
- `quality` (optional): JPEG kvalitet 0-100 (default: 80, kun for JPEG)
- `fullPage` (optional): Tag screenshot af hele siden (default: false)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "screenshot": "iVBORw0KGgoAAAANSUhEUgAA...",
    "format": "png",
    "screenSize": "desktop",
    "dimensions": {
      "width": 1920,
      "height": 1080
    },
    "fullPage": false,
    "url": "https://example.com",
    "timestamp": "2026-01-08T10:30:00.000Z"
  }
}
```

**Error Response (400/500):**
```json
{
  "success": false,
  "error": "Screenshot fejlede",
  "message": "Timeout: Kunne ikke indlæse siden inden for 30 sekunder",
  "timestamp": "2026-01-08T10:30:00.000Z"
}
```

## Installation

### Lokal udvikling (Node.js)

1. Installer dependencies:
```bash
npm install
```

2. Start serveren:
```bash
npm start
```

3. For udvikling med auto-reload:
```bash
npm run dev
```

Serveren kører nu på `http://localhost:3000`

### Docker

1. Byg og start med Docker Compose:
```bash
docker-compose up --build
```

2. Eller byg og kør med Docker:
```bash
docker build -t screenshot-service .
docker run -p 3000:3000 screenshot-service
```

Serveren kører nu på `http://localhost:3000`

## Eksempler

### cURL eksempel (PNG screenshot af desktop)
```bash
curl -X POST http://localhost:3000/screenshot \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "screenSize": "desktop"}'
```

### cURL eksempel (JPEG screenshot af mobile med høj kvalitet)
```bash
curl -X POST http://localhost:3000/screenshot \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "screenSize": "mobile", "format": "jpeg", "quality": 90}'
```

### cURL eksempel (Full-page screenshot af laptop)
```bash
curl -X POST http://localhost:3000/screenshot \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "screenSize": "laptop", "fullPage": true}'
```

### JavaScript (fetch) eksempel
```javascript
const response = await fetch('http://localhost:3000/screenshot', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    url: 'https://example.com',
    screenSize: 'tablet',
    format: 'png',
    fullPage: false
  })
});

const data = await response.json();

if (data.success) {
  // Base64 screenshot er i data.data.screenshot
  const img = document.createElement('img');
  img.src = `data:image/${data.data.format};base64,${data.data.screenshot}`;
  document.body.appendChild(img);
}
```

### Python eksempel
```python
import requests
import base64

response = requests.post('http://localhost:3000/screenshot', json={
    'url': 'https://example.com',
    'screenSize': 'desktop',
    'format': 'png',
    'fullPage': False
})

data = response.json()

if data['success']:
    # Gem screenshot som fil
    screenshot_data = base64.b64decode(data['data']['screenshot'])
    with open('screenshot.png', 'wb') as f:
        f.write(screenshot_data)
```

## Environment Variables

- `PORT`: Port nummeret serveren skal køre på (default: 3000)
- `NODE_ENV`: Node miljø (development/production)

Eksempel med custom port:
```bash
PORT=8080 npm start
```

Eller i Docker Compose, rediger `docker-compose.yml`:
```yaml
environment:
  - PORT=8080
ports:
  - "8080:8080"
```

## Fejlhåndtering

Servicen returnerer følgende fejltyper:

- **400 Bad Request**: Ugyldig parameter (manglende URL, ugyldig screenSize, ugyldigt format, etc.)
- **500 Internal Server Error**: Screenshot fejlede (timeout, connection refused, etc.)

Fejlbeskeder er på dansk og giver detaljerede beskrivelser af problemet.

## Teknologi Stack

- **Node.js**: Runtime miljø
- **Express**: Web framework
- **Puppeteer**: Headless browser automation
- **Docker**: Containerization
- **Alpine Linux**: Letvægts container base image

## License

MIT
