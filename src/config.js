// Foruddefinerede skærmstørrelser
const SCREEN_SIZES = {
  desktop: { width: 1920, height: 1080 },
  laptop: { width: 1366, height: 768 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 667 },
  'mobile-large': { width: 414, height: 896 }
};

// Default konfiguration
const DEFAULT_CONFIG = {
  timeout: 30000, // 30 sekunder
  defaultFormat: 'png',
  defaultQuality: 80,
  defaultDelay: 2000, // 2 sekunder ekstra ventetid
  autoScroll: true, // Auto-scroll for at trigge scroll-baserede animationer
  port: process.env.PORT || 3000,
  puppeteerArgs: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--no-first-run',
    '--no-zygote',
    '--disable-gpu'
  ]
};

module.exports = {
  SCREEN_SIZES,
  DEFAULT_CONFIG
};
