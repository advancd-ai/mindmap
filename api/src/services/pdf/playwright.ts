/**
 * Playwright browser pool management
 */

import { chromium, type Browser, type BrowserContext } from 'playwright';

class BrowserPool {
  private browsers: Browser[] = [];
  private contexts: BrowserContext[] = [];
  private maxBrowsers = parseInt(process.env.PLAYWRIGHT_MAX_BROWSERS || '3', 10);
  private maxContextsPerBrowser = parseInt(process.env.PLAYWRIGHT_MAX_CONTEXTS || '5', 10);
  private isInitialized = false;

  async initialize() {
    if (this.isInitialized) return;

    console.log(`🚀 Initializing browser pool with ${this.maxBrowsers} browsers...`);

    for (let i = 0; i < this.maxBrowsers; i++) {
      try {
        const browser = await chromium.launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
          ],
        });
        this.browsers.push(browser);
        console.log(`✅ Browser ${i + 1}/${this.maxBrowsers} initialized`);
      } catch (error) {
        console.error(`❌ Failed to initialize browser ${i + 1}:`, error);
        throw error;
      }
    }

    this.isInitialized = true;
    console.log(`✅ Browser pool initialized with ${this.maxBrowsers} browsers`);
  }

  async getContext(): Promise<BrowserContext> {
    await this.initialize();

    // 기존 컨텍스트 재사용
    if (this.contexts.length > 0) {
      const context = this.contexts.pop()!;
      // 컨텍스트가 닫혔는지 확인
      if (!context.browser()?.isConnected()) {
        return this.createNewContext();
      }
      return context;
    }

    // 새 컨텍스트 생성
    return this.createNewContext();
  }

  private async createNewContext(): Promise<BrowserContext> {
    const browser = this.browsers[Math.floor(Math.random() * this.browsers.length)];
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
    return context;
  }

  async releaseContext(context: BrowserContext) {
    // 컨텍스트를 풀에 반환 (최대 개수 제한)
    if (this.contexts.length < this.maxBrowsers * this.maxContextsPerBrowser) {
      try {
        // 쿠키 및 캐시 정리
        await context.clearCookies();
        this.contexts.push(context);
      } catch (error) {
        // 컨텍스트가 이미 닫혔을 수 있음
        console.warn('⚠️ Failed to release context:', error);
      }
    } else {
      // 풀이 가득 차면 컨텍스트 닫기
      try {
        await context.close();
      } catch (error) {
        // 이미 닫혔을 수 있음
        console.warn('⚠️ Failed to close context:', error);
      }
    }
  }

  async close() {
    for (const context of this.contexts) {
      try {
        await context.close();
      } catch (error) {
        console.warn('⚠️ Error closing context:', error);
      }
    }
    this.contexts = [];

    for (const browser of this.browsers) {
      try {
        await browser.close();
      } catch (error) {
        console.warn('⚠️ Error closing browser:', error);
      }
    }
    this.browsers = [];

    this.isInitialized = false;
    console.log('✅ Browser pool closed');
  }
}

export const browserPool = new BrowserPool();

// Graceful shutdown
process.on('SIGTERM', async () => {
  await browserPool.close();
});

process.on('SIGINT', async () => {
  await browserPool.close();
});

