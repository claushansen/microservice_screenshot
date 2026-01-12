const express = require('express');
const archiver = require('archiver');
const { captureScreenshot, captureMultipleScreenshots } = require('./screenshotService');
const { crawlWebsite } = require('./crawlerService');
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

// Middleware til at parse JSON med øget size limit
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

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

// Crawler endpoint - tag screenshots af flere sider
app.post('/screenshot/crawl', async (req, res) => {
  try {
    const { 
      url, 
      screenSize = 'desktop', 
      format = DEFAULT_CONFIG.defaultFormat,
      quality = DEFAULT_CONFIG.defaultQuality,
      fullPage = false,
      delay = DEFAULT_CONFIG.defaultDelay,
      disableAnimations = true,
      autoScroll = DEFAULT_CONFIG.autoScroll,
      maxPages = 10,
      outputFormat = 'json' // 'json' eller 'zip'
    } = req.body;

    // Valider påkrævet parameter
    if (!url) {
      return res.status(400).json({
        error: 'Manglende parameter',
        message: 'URL er påkrævet'
      });
    }

    // Valider maxPages
    const maxPagesNum = parseInt(maxPages);
    if (isNaN(maxPagesNum) || maxPagesNum < 1 || maxPagesNum > 100) {
      return res.status(400).json({
        error: 'Ugyldig maxPages',
        message: 'maxPages skal være mellem 1 og 100',
        received: maxPages
      });
    }

    // Valider output format
    if (!['json', 'zip'].includes(outputFormat.toLowerCase())) {
      return res.status(400).json({
        error: 'Ugyldigt outputFormat',
        message: 'outputFormat skal være "json" eller "zip"',
        received: outputFormat
      });
    }

    // Crawler websitet for at finde alle interne URLs
    console.log(`Starter crawling af ${url} (max ${maxPagesNum} sider)...`);
    const urls = await crawlWebsite(url, maxPagesNum);
    console.log(`Fandt ${urls.length} sider. Tager screenshots...`);

    // Tag screenshots af alle URLs
    const screenshots = [];
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < urls.length; i++) {
      const pageUrl = urls[i];
      try {
        console.log(`Screenshot ${i + 1}/${urls.length}: ${pageUrl}`);
        
        const screenshot = await captureScreenshot(
          pageUrl,
          screenSize,
          format.toLowerCase(),
          parseInt(quality),
          Boolean(fullPage),
          parseInt(delay),
          Boolean(disableAnimations),
          Boolean(autoScroll)
        );

        screenshots.push({
          url: pageUrl,
          screenshot: screenshot,
          screenSize: screenSize,
          format: format.toLowerCase(),
          success: true,
          index: i + 1
        });
        
        successCount++;
      } catch (error) {
        console.error(`Fejl ved screenshot af ${pageUrl}:`, error.message);
        screenshots.push({
          url: pageUrl,
          screenshot: null,
          error: error.message,
          success: false,
          index: i + 1
        });
        failCount++;
      }
    }

    // Return som JSON eller ZIP
    if (outputFormat.toLowerCase() === 'zip') {
      // Generer ZIP fil
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="screenshots-${Date.now()}.zip"`);

      const archive = archiver('zip', {
        zlib: { level: 9 }
      });

      archive.on('error', (err) => {
        throw err;
      });

      archive.pipe(res);

      // Tilføj hver screenshot til ZIP
      for (const item of screenshots) {
        if (item.success && item.screenshot) {
          const buffer = Buffer.from(item.screenshot, 'base64');
          
          try {
            const urlObj = new URL(item.url);
            const domain = urlObj.hostname.replace(/\./g, '_');
            let path = urlObj.pathname.replace(/\//g, '_').replace(/^_/, '');
            if (!path || path === '') path = 'index';
            const sizeStr = item.screenSize ? `_${item.screenSize}` : '';
            const filename = `${domain}_${path}${sizeStr}.${item.format}`;
            archive.append(buffer, { name: filename });
          } catch (error) {
            console.error(`Error parsing URL ${item.url}:`, error);
            // Fallback til index-baseret navn hvis URL parsing fejler
            const filename = `screenshot_${item.index}.${item.format}`;
            archive.append(buffer, { name: filename });
          }
        }
      }

      // Tilføj metadata fil
      const metadata = {
        totalPages: urls.length,
        successCount: successCount,
        failCount: failCount,
        timestamp: new Date().toISOString(),
        screenSize: screenSize,
        dimensions: SCREEN_SIZES[screenSize],
        settings: {
          format: format.toLowerCase(),
          fullPage: Boolean(fullPage),
          delay: parseInt(delay),
          disableAnimations: Boolean(disableAnimations),
          autoScroll: Boolean(autoScroll)
        },
        pages: screenshots.map(s => ({
          index: s.index,
          url: s.url,
          success: s.success,
          error: s.error || null
        }))
      };

      archive.append(JSON.stringify(metadata, null, 2), { name: 'metadata.json' });

      await archive.finalize();

    } else {
      // Return som JSON
      res.json({
        success: true,
        data: {
          totalPages: urls.length,
          successCount: successCount,
          failCount: failCount,
          screenshots: screenshots,
          screenSize: screenSize,
          dimensions: SCREEN_SIZES[screenSize],
          timestamp: new Date().toISOString()
        }
      });
    }

  } catch (error) {
    console.error('Crawler fejl:', error.message);
    
    res.status(500).json({
      success: false,
      error: 'Crawler fejlede',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Screenshot endpoint - flere skærmstørrelser på én gang
app.post('/screenshot/multiple-sizes', async (req, res) => {
  try {
    const { 
      url, 
      screenSizes = ['desktop'],
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
        message: 'URL er påkrævet'
      });
    }

    // Valider screenSizes array
    if (!Array.isArray(screenSizes) || screenSizes.length === 0) {
      return res.status(400).json({
        error: 'Ugyldig screenSizes',
        message: 'screenSizes skal være et array med mindst én skærmstørrelse',
        available: Object.keys(SCREEN_SIZES)
      });
    }

    // Valider hver skærmstørrelse
    for (const size of screenSizes) {
      if (!SCREEN_SIZES[size]) {
        return res.status(400).json({
          error: 'Ugyldig skærmstørrelse',
          message: `"${size}" er ikke en gyldig skærmstørrelse`,
          available: Object.keys(SCREEN_SIZES)
        });
      }
    }

    // Valider format
    const formatLower = format.toLowerCase();
    if (!['png', 'jpeg'].includes(formatLower)) {
      return res.status(400).json({
        error: 'Ugyldigt format',
        message: 'Format skal være "png" eller "jpeg"'
      });
    }

    // Tag screenshots i alle størrelser
    console.log(`Tager screenshots af ${url} i ${screenSizes.length} størrelser...`);
    const screenshots = await captureMultipleScreenshots(
      url,
      screenSizes,
      formatLower,
      parseInt(quality),
      Boolean(fullPage),
      parseInt(delay),
      Boolean(disableAnimations),
      Boolean(autoScroll)
    );

    // Return screenshots
    res.json({
      success: true,
      data: {
        url: url,
        screenshots: screenshots,
        totalScreenshots: screenshots.length,
        settings: {
          format: formatLower,
          fullPage: Boolean(fullPage),
          delay: parseInt(delay),
          disableAnimations: Boolean(disableAnimations),
          autoScroll: Boolean(autoScroll)
        },
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Multiple screenshots fejl:', error.message);
    
    res.status(500).json({
      success: false,
      error: 'Multiple screenshots fejlede',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Generer ZIP fra eksisterende screenshots
app.post('/screenshot/generate-zip', async (req, res) => {
  try {
    const { screenshots, metadata } = req.body;

    if (!screenshots || !Array.isArray(screenshots)) {
      return res.status(400).json({
        error: 'Manglende parameter',
        message: 'screenshots array er påkrævet'
      });
    }

    // Generer ZIP fil
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="screenshots-${Date.now()}.zip"`);

    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    archive.on('error', (err) => {
      throw err;
    });

    archive.pipe(res);

    // Tilføj hver screenshot til ZIP
    for (const item of screenshots) {
      if (item.success && item.screenshot) {
        const buffer = Buffer.from(item.screenshot, 'base64');
        
        try {
          const urlObj = new URL(item.url);
          const domain = urlObj.hostname.replace(/\./g, '_');
          let path = urlObj.pathname.replace(/\//g, '_').replace(/^_/, '');
          if (!path || path === '') path = 'index';
          const sizeStr = item.screenSize ? `_${item.screenSize}` : '';
          const filename = `${domain}_${path}${sizeStr}.${item.format}`;
          archive.append(buffer, { name: filename });
        } catch (error) {
          console.error(`Error parsing URL ${item.url}:`, error);
          // Fallback til index-baseret navn hvis URL parsing fejler
          const filename = `screenshot_${item.index}.${item.format}`;
          archive.append(buffer, { name: filename });
        }
      }
    }

    // Tilføj metadata fil hvis provided
    if (metadata) {
      archive.append(JSON.stringify(metadata, null, 2), { name: 'metadata.json' });
    }

    await archive.finalize();

  } catch (error) {
    console.error('ZIP generation fejl:', error.message);
    
    res.status(500).json({
      success: false,
      error: 'ZIP generation fejlede',
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
      'POST /screenshot - Tag screenshot af en URL',
      'POST /screenshot/multiple-sizes - Tag screenshots i flere størrelser på én gang',
      'POST /screenshot/crawl - Crawler website og tag screenshots af alle sider',
      'POST /screenshot/generate-zip - Generer ZIP fra eksisterende screenshots'
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
  console.log(`  POST http://localhost:${PORT}/screenshot/multiple-sizes`);
  console.log(`  POST http://localhost:${PORT}/screenshot/crawl`);
  console.log(`  POST http://localhost:${PORT}/screenshot/generate-zip`);
});

module.exports = app;
