const puppeteer = require('puppeteer');
const { DEFAULT_CONFIG } = require('./config');

/**
 * Crawler en URL og find alle interne links
 * @param {string} startUrl - Start URL at crawle fra
 * @param {number} maxPages - Maksimalt antal sider at crawle
 * @returns {Promise<string[]>} Array af unikke interne URLs
 */
async function crawlWebsite(startUrl, maxPages = 50) {
  let browser = null;
  const visited = new Set();
  const toVisit = [startUrl];
  const internalUrls = [];
  
  try {
    // Parse start URL for at få base domain
    const startUrlObj = new URL(startUrl);
    const baseDomain = startUrlObj.origin;

    browser = await puppeteer.launch({
      headless: 'new',
      args: DEFAULT_CONFIG.puppeteerArgs
    });

    while (toVisit.length > 0 && visited.size < maxPages) {
      const currentUrl = toVisit.shift();
      
      // Skip hvis allerede besøgt
      if (visited.has(currentUrl)) {
        continue;
      }

      visited.add(currentUrl);
      internalUrls.push(currentUrl);

      try {
        const page = await browser.newPage();
        
        // Naviger til siden med reduceret timeout
        await page.goto(currentUrl, {
          waitUntil: 'networkidle2',
          timeout: 15000
        });

        // Find alle links på siden
        const links = await page.evaluate(() => {
          const anchors = Array.from(document.querySelectorAll('a[href]'));
          return anchors.map(a => a.href).filter(href => href);
        });

        await page.close();

        // Filtrer og tilføj nye interne links
        for (const link of links) {
          try {
            const linkUrl = new URL(link);
            
            // Tjek om linket er internt (samme domain)
            if (linkUrl.origin === baseDomain) {
              // Fjern fragment (#) og normaliser URL
              linkUrl.hash = '';
              const normalizedUrl = linkUrl.toString();
              
              // Tilføj til listen hvis ikke besøgt
              if (!visited.has(normalizedUrl) && !toVisit.includes(normalizedUrl)) {
                toVisit.push(normalizedUrl);
              }
            }
          } catch (e) {
            // Ignorer ugyldige URLs
          }
        }
      } catch (error) {
        console.error(`Fejl ved crawling af ${currentUrl}:`, error.message);
        // Fortsæt til næste URL
      }
    }

    await browser.close();
    return internalUrls;

  } catch (error) {
    if (browser) {
      await browser.close();
    }
    throw new Error(`Crawler fejl: ${error.message}`);
  }
}

module.exports = {
  crawlWebsite
};
