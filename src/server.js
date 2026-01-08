const express = require('express');
const { captureScreenshot } = require('./screenshotService');
const { SCREEN_SIZES, DEFAULT_CONFIG } = require('./config');

const app = express();

// CORS middleware - tillad requests fra alle origins
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// Middleware til at parse JSON
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'screenshot-microservice'
  });
});

// Info endpoint - viser tilgængelige skærmstørrelser
app.get('/info', (req, res) => {
  res.json({
    screenSizes: Object.keys(SCREEN_SIZES).map(key => ({
      name: key,
      ...SCREEN_SIZES[key]
    })),
    formats: ['png', 'jpeg'],
    defaultFormat: DEFAULT_CONFIG.defaultFormat,
    defaultQuality: DEFAULT_CONFIG.defaultQuality,
    defaultDelay: `${DEFAULT_CONFIG.defaultDelay} millisekunder`,
    autoScroll: DEFAULT_CONFIG.autoScroll,
    timeout: `${DEFAULT_CONFIG.timeout / 1000} sekunder`,
    options: {
      fullPage: 'boolean - Tag screenshot af hele siden (default: false)',
      delay: 'number - Ekstra ventetid i ms efter side load (default: 2000)',
      disableAnimations: 'boolean - Disable CSS animationer (default: true)',
      autoScroll: 'boolean - Auto-scroll for at trigge scroll-animationer (default: true)'
    }
  });
});

// Screenshot endpoint
app.post('/screenshot', async (req, res) => {
  try {
    const { 
      url, 
      screenSize = 'desktop', 
      format = DEFAULT_CONFIG.defaultFormat,
      quality = DEFAULT_CONFIG.defaultQuality,
      fullPage = false,
      delay = DEFAULT_CONFIG.defaultDelay,
      disableAnimations = true,
      autoScroll = DEFAULT_CONFIG.autoScroll
    } = req.body;

    // Valider påkrævet parameter
    if (!url) {
      return res.status(400).json({
        error: 'Manglende parameter',
        message: 'URL er påkrævet',
        example: {
          url: 'https://example.com',
          screenSize: 'desktop',
          format: 'png',
          quality: 80,
          fullPage: false,
          delay: 2000,
          disableAnimations: true,
          autoScroll: true
        }
      });
    }

    // Valider skærmstørrelse
    if (!SCREEN_SIZES[screenSize]) {
      return res.status(400).json({
        error: 'Ugyldig skærmstørrelse',
        message: `Tilgængelige skærmstørrelser: ${Object.keys(SCREEN_SIZES).join(', ')}`,
        received: screenSize
      });
    }

    // Valider format
    const formatLower = format.toLowerCase();
    if (!['png', 'jpeg'].includes(formatLower)) {
      return res.status(400).json({
        error: 'Ugyldigt format',
        message: 'Format skal være "png" eller "jpeg"',
        received: format
      });
    }

    // Valider kvalitet
    const qualityNum = parseInt(quality);
    if (formatLower === 'jpeg' && (isNaN(qualityNum) || qualityNum < 0 || qualityNum > 100)) {
      return res.status(400).json({
        error: 'Ugyldig kvalitet',
        message: 'Kvalitet skal være et tal mellem 0 og 100',
        received: quality
      });
    }

    // Valider delay
    const delayNum = parseInt(delay);
    if (isNaN(delayNum) || delayNum < 0 || delayNum > 30000) {
      return res.status(400).json({
        error: 'Ugyldig delay',
        message: 'Delay skal være et tal mellem 0 og 30000 millisekunder',
        received: delay
      });
    }

    // Tag screenshot
    const screenshot = await captureScreenshot(
      url, 
      screenSize, 
      formatLower, 
      qualityNum, 
      Boolean(fullPage),
      delayNum,
      Boolean(disableAnimations),
      Boolean(autoScroll)
    );

    // Return base64 screenshot
    res.json({
      success: true,
      data: {
        screenshot: screenshot,
        format: formatLower,
        screenSize: screenSize,
        dimensions: SCREEN_SIZES[screenSize],
        fullPage: Boolean(fullPage),
        delay: delayNum,
        disableAnimations: Boolean(disableAnimations),
        autoScroll: Boolean(autoScroll),
        url: url,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Screenshot fejl:', error.message);
    
    // Return fejlbesked
    res.status(500).json({
      success: false,
      error: 'Screenshot fejlede',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint ikke fundet',
    message: `${req.method} ${req.path} findes ikke`,
    availableEndpoints: [
      'GET /health - Tjek service status',
      'GET /info - Vis tilgængelige skærmstørrelser og indstillinger',
      'POST /screenshot - Tag screenshot af en URL'
    ]
  });
});

// Start server
const PORT = DEFAULT_CONFIG.port;
app.listen(PORT, () => {
  console.log(`Screenshot microservice kører på port ${PORT}`);
  console.log(`Tilgængelige endpoints:`);
  console.log(`  GET  http://localhost:${PORT}/health`);
  console.log(`  GET  http://localhost:${PORT}/info`);
  console.log(`  POST http://localhost:${PORT}/screenshot`);
});

module.exports = app;
