const puppeteer = require('puppeteer');
const { SCREEN_SIZES, DEFAULT_CONFIG } = require('./config');

let browser = null;

/**
 * Initialiserer Puppeteer browser
 */
async function initBrowser() {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: 'new',
      args: DEFAULT_CONFIG.puppeteerArgs
    });
  }
  return browser;
}

/**
 * Tager screenshot af en URL
 * @param {string} url - URL til at tage screenshot af
 * @param {string} screenSize - Skærmstørrelse (desktop, laptop, tablet, mobile, mobile-large)
 * @param {string} format - Billedformat (png eller jpeg)
 * @param {number} quality - JPEG kvalitet (0-100), kun relevant for JPEG
 * @param {boolean} fullPage - Tag screenshot af hele siden eller kun viewport
 * @param {number} delay - Ekstra ventetid i millisekunder efter side load (for animationer)
 * @param {boolean} disableAnimations - Disable CSS animationer og transitions
 * @param {boolean} autoScroll - Auto-scroll gennem siden for at trigge scroll-baserede animationer
 * @returns {Promise<string>} Base64-kodet screenshot
 */
async function captureScreenshot(url, screenSize = 'desktop', format = 'png', quality = 80, fullPage = false, delay = 2000, disableAnimations = true, autoScroll = true) {
  // Valider URL
  if (!url || !url.startsWith('http')) {
    throw new Error('Ugyldig URL. URL skal starte med http:// eller https://');
  }

  // Valider skærmstørrelse
  if (!SCREEN_SIZES[screenSize]) {
    throw new Error(`Ugyldig skærmstørrelse. Tilgængelige: ${Object.keys(SCREEN_SIZES).join(', ')}`);
  }

  // Valider format
  if (!['png', 'jpeg'].includes(format.toLowerCase())) {
    throw new Error('Ugyldigt format. Brug "png" eller "jpeg"');
  }

  // Valider kvalitet
  if (format.toLowerCase() === 'jpeg' && (quality < 0 || quality > 100)) {
    throw new Error('Kvalitet skal være mellem 0 og 100');
  }

  const viewport = SCREEN_SIZES[screenSize];
  let page = null;

  try {
    // Initialiser browser
    const browserInstance = await initBrowser();
    page = await browserInstance.newPage();

    // Sæt viewport
    await page.setViewport({
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: 1
    });

    // Naviger til URL og vent på network idle
    await page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: DEFAULT_CONFIG.timeout
    });

    // Auto-scroll gennem siden for at trigge scroll-baserede animationer
    if (autoScroll) {
      await page.evaluate(async () => {
        await new Promise((resolve) => {
          let totalHeight = 0;
          const distance = 100; // Scroll 100px ad gangen
          const timer = setInterval(() => {
            const scrollHeight = document.body.scrollHeight;
            window.scrollBy(0, distance);
            totalHeight += distance;

            // Stop når vi når bunden
            if (totalHeight >= scrollHeight) {
              clearInterval(timer);
              // Scroll tilbage til toppen
              window.scrollTo(0, 0);
              resolve();
            }
          }, 100); // Vent 100ms mellem hvert scroll
        });
      });

      // Kort pause efter scroll er færdig
      await page.waitForTimeout(500);
    }

    // Disable animationer og transitions hvis ønsket
    if (disableAnimations) {
      await page.addStyleTag({
        content: `
          *, *::before, *::after {
            animation-duration: 0s !important;
            animation-delay: 0s !important;
            transition-duration: 0s !important;
            transition-delay: 0s !important;
            scroll-behavior: auto !important;
          }
        `
      });
    }

    // Vent ekstra tid for at lade animationer og dynamisk indhold rendere
    if (delay > 0) {
      await page.waitForTimeout(delay);
    }

    // Tag screenshot
    const screenshotOptions = {
      encoding: 'base64',
      fullPage: fullPage,
      type: format.toLowerCase()
    };

    // Tilføj kvalitet kun for JPEG
    if (format.toLowerCase() === 'jpeg') {
      screenshotOptions.quality = quality;
    }

    const screenshot = await page.screenshot(screenshotOptions);

    return screenshot;
  } catch (error) {
    // Håndter specifikke fejl
    if (error.name === 'TimeoutError') {
      throw new Error(`Timeout: Kunne ikke indlæse siden inden for ${DEFAULT_CONFIG.timeout / 1000} sekunder`);
    }
    
    if (error.message.includes('net::ERR_NAME_NOT_RESOLVED')) {
      throw new Error('Kunne ikke finde serveren. Tjek at URL er korrekt');
    }

    if (error.message.includes('net::ERR_CONNECTION_REFUSED')) {
      throw new Error('Forbindelsen blev afvist af serveren');
    }

    // Generisk fejlhåndtering
    throw new Error(`Fejl ved screenshot: ${error.message}`);
  } finally {
    // Luk siden
    if (page) {
      await page.close();
    }
  }
}

/**
 * Luk browser når processen afsluttes
 */
async function closeBrowser() {
  if (browser) {
    await browser.close();
    browser = null;
  }
}

/**
 * Tag screenshots af samme URL i flere forskellige skærmstørrelser
 * @param {string} url - URL til at tage screenshots af
 * @param {string[]} screenSizes - Array af skærmstørrelser
 * @param {string} format - Billedformat (png eller jpeg)
 * @param {number} quality - JPEG kvalitet (0-100)
 * @param {boolean} fullPage - Tag screenshot af hele siden
 * @param {number} delay - Ekstra ventetid i millisekunder
 * @param {boolean} disableAnimations - Disable CSS animationer
 * @param {boolean} autoScroll - Auto-scroll gennem siden
 * @returns {Promise<Array>} Array af screenshots med metadata
 */
async function captureMultipleScreenshots(
  url, 
  screenSizes = ['desktop'], 
  format = 'png', 
  quality = 80, 
  fullPage = false, 
  delay = 2000, 
  disableAnimations = true, 
  autoScroll = true
) {
  // Valider URL
  if (!url || !url.startsWith('http')) {
    throw new Error('Ugyldig URL. URL skal starte med http:// eller https://');
  }

  // Valider skærmstørrelser
  for (const size of screenSizes) {
    if (!SCREEN_SIZES[size]) {
      throw new Error(`Ugyldig skærmstørrelse: ${size}. Tilgængelige: ${Object.keys(SCREEN_SIZES).join(', ')}`);
    }
  }

  let browserInstance = null;
  let page = null;
  const screenshots = [];

  try {
    // Initialiser browser
    browserInstance = await puppeteer.launch({
      headless: 'new',
      args: DEFAULT_CONFIG.puppeteerArgs
    });

    page = await browserInstance.newPage();

    // Naviger til URL én gang
    await page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: DEFAULT_CONFIG.timeout
    });

    // Auto-scroll hvis ønsket
    if (autoScroll) {
      await page.evaluate(async () => {
        await new Promise((resolve) => {
          let totalHeight = 0;
          const distance = 100;
          const timer = setInterval(() => {
            const scrollHeight = document.body.scrollHeight;
            window.scrollBy(0, distance);
            totalHeight += distance;

            if (totalHeight >= scrollHeight) {
              clearInterval(timer);
              window.scrollTo(0, 0);
              resolve();
            }
          }, 100);
        });
      });

      await page.waitForTimeout(500);
    }

    // Disable animationer hvis ønsket
    if (disableAnimations) {
      await page.addStyleTag({
        content: `
          *, *::before, *::after {
            animation-duration: 0s !important;
            animation-delay: 0s !important;
            transition-duration: 0s !important;
            transition-delay: 0s !important;
            scroll-behavior: auto !important;
          }
        `
      });
    }

    // Vent ekstra tid
    if (delay > 0) {
      await page.waitForTimeout(delay);
    }

    // Tag screenshot i hver skærmstørrelse
    for (const screenSize of screenSizes) {
      const viewport = SCREEN_SIZES[screenSize];

      // Sæt viewport
      await page.setViewport({
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: 1
      });

      // Kort pause efter viewport change
      await page.waitForTimeout(300);

      // Tag screenshot
      const screenshotOptions = {
        encoding: 'base64',
        fullPage: fullPage,
        type: format.toLowerCase()
      };

      if (format.toLowerCase() === 'jpeg') {
        screenshotOptions.quality = quality;
      }

      const screenshot = await page.screenshot(screenshotOptions);

      screenshots.push({
        screenSize: screenSize,
        dimensions: viewport,
        screenshot: screenshot,
        format: format.toLowerCase(),
        success: true
      });

      console.log(`Screenshot ${screenSize} (${viewport.width}x${viewport.height}) - Success`);
    }

    await page.close();
    await browserInstance.close();

    return screenshots;

  } catch (error) {
    if (page) await page.close();
    if (browserInstance) await browserInstance.close();

    // Håndter specifikke fejl
    if (error.name === 'TimeoutError') {
      throw new Error(`Timeout: Kunne ikke indlæse siden inden for ${DEFAULT_CONFIG.timeout / 1000} sekunder`);
    }
    
    if (error.message.includes('net::ERR_NAME_NOT_RESOLVED')) {
      throw new Error('Kunne ikke finde serveren. Tjek at URL er korrekt');
    }

    if (error.message.includes('net::ERR_CONNECTION_REFUSED')) {
      throw new Error('Forbindelsen blev afvist af serveren');
    }

    throw new Error(`Fejl ved screenshots: ${error.message}`);
  }
}

// Luk browser ved proces afslutning
process.on('SIGINT', async () => {
  await closeBrowser();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeBrowser();
  process.exit(0);
});

module.exports = {
  captureScreenshot,
  captureMultipleScreenshots,
  closeBrowser
};
