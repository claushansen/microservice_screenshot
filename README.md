# Screenshot Microservice

En containeriseret microservice til at tage screenshots af websites med forskellige skærmstørrelser og formater.

## Features

- 📸 Tag screenshots af enhver URL
- 🕷️ **Website Crawler** - Crawler hele websites og tag screenshots automatisk
- 🖥️ 5 foruddefinerede skærmstørrelser (desktop, laptop, tablet, mobile, mobile-large)
- 📐 **Multiple Sizes** - Tag screenshots i flere størrelser uden at genindlæse siden
- 🎨 Understøtter PNG og JPEG formater
- ⚙️ JPEG kvalitetskontrol (0-100)
- 📄 Vælg mellem viewport eller full-page screenshots
- 🔄 Auto-scroll gennem siden for at trigge scroll-baserede animationer
- ⏸️ Kontrollerbar delay for animationer og dynamisk indhold
- ⚡ Disable CSS animationer for konsistente screenshots
- 📦 **Download som ZIP** - Hent alle screenshots som en samlet ZIP fil
- 📝 **Smart filnavngivning** - domain_path_size.extension (f.eks. example_com_about_mobile.png)
- �🐳 Fuldt dockeriseret med Docker Compose
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
  "defaultDelay": "2000 millisekunder",
  "autoScroll": true,
  "timeout": "30 sekunder",
  "options": {
    "fullPage": "boolean - Tag screenshot af hele siden (default: false)",
    "delay": "number - Ekstra ventetid i ms efter side load (default: 2000)",
    "disableAnimations": "boolean - Disable CSS animationer (default: true)",
    "autoScroll": "boolean - Auto-scroll for at trigge scroll-animationer (default: true)"
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
  "fullPage": false,
  "delay": 2000,
  "disableAnimations": true,
  "autoScroll": true
}
```

**Parameters:**
- `url` (required): URL til websitet (skal starte med http:// eller https://)
- `screenSize` (optional): Skærmstørrelse (default: "desktop")
- `format` (optional): Billedformat - "png" eller "jpeg" (default: "png")
- `quality` (optional): JPEG kvalitet 0-100 (default: 80, kun for JPEG)
- `fullPage` (optional): Tag screenshot af hele siden (default: false)
- `delay` (optional): Ekstra ventetid i millisekunder efter side load (default: 2000, max: 30000)
- `disableAnimations` (optional): Disable CSS animationer og transitions (default: true)
- `autoScroll` (optional): Auto-scroll gennem siden for at trigge scroll-baserede animationer (default: true)

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
    "delay": 2000,
    "disableAnimations": true,
    "autoScroll": true,
    "url": "https://example.com",
    "timestamp": "2026-01-08T10:30:00.000Z"
  }
}
```

### POST /screenshot/multiple-sizes
Tag screenshots af samme URL i flere størrelser (optimeret - loader siden kun én gang)

**Request Body:**
```json
{
  "url": "https://example.com",
  "screenSizes": ["desktop", "tablet", "mobile"],
  "format": "png",
  "quality": 80,
  "fullPage": false,
  "delay": 2000,
  "disableAnimations": true,
  "autoScroll": true
}
```

**Parameters:**
- `url` (required): URL til websitet
- `screenSizes` (required): Array af skærmstørrelser (mindst én)
- `format` (optional): Billedformat - "png" eller "jpeg" (default: "png")
- `quality` (optional): JPEG kvalitet 0-100 (default: 80)
- `fullPage` (optional): Tag screenshot af hele siden (default: false)
- `delay` (optional): Ekstra ventetid i millisekunder (default: 2000)
- `disableAnimations` (optional): Disable CSS animationer (default: true)
- `autoScroll` (optional): Auto-scroll gennem siden (default: true)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "url": "https://example.com",
    "screenshots": [
      {
        "screenshot": "iVBORw0KGgoAAAANSUhEUgAA...",
        "screenSize": "desktop",
        "dimensions": { "width": 1920, "height": 1080 },
        "format": "png"
      },
      {
        "screenshot": "iVBORw0KGgoAAAANSUhEUgAA...",
        "screenSize": "tablet",
        "dimensions": { "width": 768, "height": 1024 },
        "format": "png"
      }
    ],
    "timestamp": "2026-01-12T10:30:00.000Z"
  }
}
```

### POST /screenshot/crawl
Crawler et helt website og tag screenshots af alle interne sider

**Request Body:**
```json
{
  "url": "https://example.com",
  "maxPages": 10,
  "screenSize": "desktop",
  "format": "png",
  "quality": 80,
  "fullPage": false,
  "delay": 2000,
  "disableAnimations": true,
  "autoScroll": true,
  "outputFormat": "json"
}
```

**Parameters:**
- `url` (required): Start URL at crawle fra
- `maxPages` (optional): Maksimalt antal sider at crawle (default: 10, max: 100)
- `screenSize` (optional): Skærmstørrelse (default: "desktop")
- `format` (optional): Billedformat - "png" eller "jpeg" (default: "png")
- `quality` (optional): JPEG kvalitet 0-100 (default: 80)
- `fullPage` (optional): Tag screenshot af hele siden (default: false)
- `delay` (optional): Ekstra ventetid per side i millisekunder (default: 2000)
- `disableAnimations` (optional): Disable CSS animationer (default: true)
- `autoScroll` (optional): Auto-scroll gennem siden (default: true)
- `outputFormat` (optional): Output format - "json" eller "zip" (default: "json")

**Success Response (200) - JSON format:**
```json
{
  "success": true,
  "data": {
    "totalPages": 5,
    "successCount": 5,
    "failCount": 0,
    "screenshots": [
      {
        "url": "https://example.com",
        "screenshot": "iVBORw0KGgoAAAANSUhEUgAA...",
        "format": "png",
        "success": true,
        "index": 1
      }
    ],
    "screenSize": "desktop",
    "dimensions": { "width": 1920, "height": 1080 },
    "timestamp": "2026-01-10T10:30:00.000Z"
  }
}
```

**Success Response (200) - ZIP format:**
Returnerer en ZIP fil med alle screenshots og en metadata.json fil.

### POST /screenshot/generate-zip
Generer ZIP fil fra allerede hentede screenshots (undgår re-crawling)

**Request Body:**
```json
{
  "screenshots": [
    {
      "url": "https://example.com",
      "screenshot": "base64...",
      "format": "png",
      "screenSize": "desktop",
      "success": true,
      "index": 1
    }
  ],
  "metadata": {
    "totalPages": 5,
    "successCount": 5,
    "timestamp": "2026-01-10T10:30:00.000Z"
  }
}
```

**Success Response (200):**
Returnerer en ZIP fil med alle screenshots. Filnavne følger formatet: `domain_path_size.extension`

**Eksempel filnavne:**
- `example_com_index_desktop.png` - Homepage i desktop størrelse
- `example_com_about_mobile.png` - About side i mobile størrelse
- `example_com_products_laptop.jpeg` - Products side i laptop størrelse

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

## Demo Interfaces

Tre HTML demo interfaces er inkluderet:

- **[example.html](example.html)** - Single screenshot interface
  - Tag screenshots af enkelte URLs
  - Juster alle parametre
  - Preview og download

- **[example-multiple.html](example-multiple.html)** - Multiple sizes interface
  - Tag screenshots i flere størrelser samtidig
  - Optimeret - loader siden kun én gang
  - Visuel checkbox selector til at vælge størrelser
  - Preview alle størrelser i grid

- **[crawler.html](crawler.html)** - Website crawler interface
  - Crawler hele websites automatisk
  - Vælg enkelt størrelse eller "Forskellige Størrelser"
  - Preview alle screenshots i grid
  - Download som ZIP eller individuelle billeder
  - Progress tracking

Åbn filerne direkte i din browser når servicen kører.

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

### cURL eksempel (Med scroll-animationer og custom delay)
```bash
curl -X POST http://localhost:3000/screenshot \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "screenSize": "desktop", "autoScroll": true, "delay": 3000, "disableAnimations": false}'
```

### cURL eksempel (Tag screenshots i flere størrelser)
```bash
curl -X POST http://localhost:3000/screenshot/multiple-sizes \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "screenSizes": ["desktop", "tablet", "mobile"]}'
```

### cURL eksempel (Crawler website med JSON output)
```bash
curl -X POST http://localhost:3000/screenshot/crawl \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "maxPages": 5, "screenSize": "desktop", "outputFormat": "json"}'
```

### cURL eksempel (Crawler website og download ZIP)
```bash
curl -X POST http://localhost:3000/screenshot/crawl \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "maxPages": 10, "screenSize": "laptop", "outputFormat": "zip"}' \
  --output screenshots.zip
```
```bash
curl -X POST http://localhost:3000/screenshot \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "screenSize": "desktop", "autoScroll": true, "delay": 3000, "disableAnimations": false}'
```
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
    fullPage: false,
    delay: 2000,
    disableAnimations: true,
    autoScroll: true
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
    'fullPage': False,
    'delay': 2000,
    'disableAnimations': True,
    'autoScroll': True
})

data = response.json()

if data['success']:
    # Gem screenshot som fil
    screenshot_data = base64.b64decode(data['data']['screenshot'])
    with open('screenshot.png', 'wb') as f:
        f.write(screenshot_data)
```

### Python eksempel (Crawler)
```python
import requests

# Crawler website og få JSON med alle screenshots
response = requests.post('http://localhost:3000/screenshot/crawl', json={
    'url': 'https://example.com',
    'maxPages': 10,
    'screenSize': 'desktop',
    'outputFormat': 'json'
})

data = response.json()

if data['success']:
    print(f"Crawled {data['data']['totalPages']} sider")
    print(f"Success: {data['data']['successCount']}, Fejl: {data['data']['failCount']}")
    
    # Gem hver screenshot
    for item in data['data']['screenshots']:
        if item['success']:
            screenshot_data = base64.b64decode(item['screenshot'])
            filename = f"screenshot_{item['index']}.{item['format']}"
            with open(filename, 'wb') as f:
                f.write(screenshot_data)

# Eller download direkte som ZIP
zip_response = requests.post('http://localhost:3000/screenshot/crawl', json={
    'url': 'https://example.com',
    'maxPages': 10,
    'outputFormat': 'zip'
})

if zip_response.ok:
    with open('screenshots.zip', 'wb') as f:
        f.write(zip_response.content)
```
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

- **400 Bad Request**: Ugyldig parameter (manglende URL, ugyldig screenSize, ugyldigt format, ugyldig delay, etc.)
- **413 Payload Too Large**: Request body er for stor (øget til 100MB limit)
- **500 Internal Server Error**: Screenshot fejlede (timeout, connection refused, etc.)

Fejlbeskeder er på dansk og giver detaljerede beskrivelser af problemet.

## Crawler Funktionalitet

Website crawleren finder automatisk alle interne links på en side og tager screenshots af hver side.

**Funktioner:**
- 🔍 Finder automatisk alle interne URLs (samme domain)
- 🚫 Ignorerer eksterne links og duplikater
- ⚙️ Kontrollerbar max antal sider (1-100)
- 📊 Progress tracking med success/fail count
- 💾 Download som JSON eller ZIP
- 🖼️ Preview i browser før download (JSON mode)
- 📦 ZIP inkluderer metadata.json fil
- 📐 **Multiple Sizes Mode** - Crawler først, tag derefter screenshots i alle valgte størrelser
- 📝 **Smart filnavngivning** - domain_path_size.extension (f.eks. example_com_about_mobile.png)

**Filnavngivning:**
Alle screenshots navngives automatisk efter mønsteret: `domain_path_size.extension`

Eksempler:
- `example_com_index_desktop.png` - Homepage
- `example_com_about-us_mobile.png` - About side
- `example_com_products_category_laptop.jpeg` - Nested path

**Begrænsninger:**
- Max 100 sider per crawl
- Kun interne links (samme domain)
- 15 sekunders timeout per side
- URL fragments (#) fjernes automatisk

## Use Cases

### Websites med scroll-baserede animationer
```json
{
  "url": "https://example.com",
  "autoScroll": true,
  "disableAnimations": true,
  "delay": 2000
}
```
Auto-scroller gennem siden for at trigge alle animationer, disabler dem derefter for konsistent output.

### Hurtig viewport screenshot
```json
{
  "url": "https://example.com",
  "autoScroll": false,
  "delay": 0
}
```
Hurtigst muligt screenshot af viewport uden scroll eller delay.

### Full-page screenshot med alle animationer synlige
```json
{
  "url": "https://example.com",
  "fullPage": true,
  "autoScroll": true,
  "disableAnimations": false,
  "delay": 5000
}
```
Lader animationer køre i 5 sekunder og fanger dem i deres animerede tilstand.

### Crawler et helt website med multiple sizes
```json
{
  "url": "https://example.com",
  "maxPages": 20,
  "screenSizes": ["desktop", "tablet", "mobile"],
  "outputFormat": "zip"
}
```
Crawler op til 20 sider og tag screenshots i 3 størrelser. Download alle som ZIP med smart filnavngivning (f.eks. example_com_about_desktop.png).

## Teknologi Stack

- **Node.js**: Runtime miljø
- **Express**: Web framework
- **Puppeteer**: Headless browser automation
- **Archiver**: ZIP file generation
- **Docker**: Containerization
- **Alpine Linux**: Letvægts container base image

## License

MIT
