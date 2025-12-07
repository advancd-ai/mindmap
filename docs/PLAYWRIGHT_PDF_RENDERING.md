# Playwright 서버사이드 PDF 렌더링 설계

## 개요

Playwright를 활용하여 마인드맵 페이지를 서버에서 PDF로 변환하는 기능을 구현합니다. 이 방식은 고품질 PDF 생성과 일관된 렌더링을 보장합니다.

## 목표

1. **고품질 PDF 생성**: 브라우저 렌더링 엔진을 활용한 정확한 PDF 생성
2. **서버사이드 처리**: 클라이언트 부하 없이 서버에서 처리
3. **인증 및 권한 관리**: 사용자 인증 및 공유 링크 지원
4. **성능 최적화**: 브라우저 인스턴스 풀링 및 캐싱
5. **에러 처리**: 안정적인 에러 핸들링 및 재시도 로직

## 아키텍처

### 컴포넌트 구조

```
api/
├── src/
│   ├── routes/
│   │   └── pdf.ts              # PDF 생성 라우트
│   ├── services/
│   │   ├── pdf/
│   │   │   ├── playwright.ts   # Playwright 브라우저 관리
│   │   │   ├── renderer.ts     # PDF 렌더링 로직
│   │   │   └── cache.ts         # PDF 캐싱
│   │   └── auth.ts             # 인증 서비스 (기존)
│   └── lib/
│       └── redis.ts             # Redis 캐싱 (기존)
```

### 데이터 흐름

```
Client Request
    ↓
API Route (/api/pdf/export)
    ↓
Auth Middleware (인증 확인)
    ↓
PDF Service
    ├── Cache Check (Redis)
    ├── Playwright Browser Pool
    ├── Page Navigation
    ├── Wait for Content Load
    ├── PDF Generation
    └── Cache Storage
    ↓
Response (PDF Buffer or Stream)
```

## API 설계

### 엔드포인트

#### 1. PDF 생성 (POST /api/pdf/export)

**요청**

```typescript
POST /api/pdf/export
Content-Type: application/json
Authorization: Bearer <token>

{
  "url": "https://mindmap.example.com/share/abc123",
  "options": {
    "format": "A4",
    "landscape": true,
    "margin": {
      "top": "0.5in",
      "right": "0.5in",
      "bottom": "0.5in",
      "left": "0.5in"
    },
    "printBackground": true,
    "scale": 1.0,
    "waitFor": "networkidle" // "load" | "domcontentloaded" | "networkidle"
  }
}
```

**응답**

```typescript
// 성공
Content-Type: application/pdf
Content-Disposition: attachment; filename="mindmap.pdf"
<PDF Buffer>

// 실패
{
  "ok": false,
  "error": {
    "code": "PDF_500_GENERATION_FAILED",
    "message": "Failed to generate PDF"
  }
}
```

#### 2. PDF 생성 (GET /api/pdf/export?url=...)

**요청**

```
GET /api/pdf/export?url=https://mindmap.example.com/share/abc123&format=A4&landscape=true
Authorization: Bearer <token>
```

**응답**

```typescript
Content-Type: application/pdf
Content-Disposition: attachment; filename="mindmap.pdf"
<PDF Buffer>
```

#### 3. 공유 링크 PDF 생성 (GET /api/pdf/share/:token)

**요청**

```
GET /api/pdf/share/abc123?format=A4&landscape=true
```

**응답**

```typescript
Content-Type: application/pdf
Content-Disposition: attachment; filename="mindmap.pdf"
<PDF Buffer>
```

## 구현 상세

### 1. PDF 라우트 (api/src/routes/pdf.ts)

```typescript
/**
 * PDF export routes
 */

import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth.js';
import { pdfService } from '../services/pdf/renderer.js';
import { getShareInfo, isShareAccessible } from '../services/share.js';
import type { Env, User } from '../types.js';

export const pdfRouter = new Hono<{ Bindings: Env; Variables: { user: User } }>();

// 인증이 필요한 PDF 생성
pdfRouter.post('/export', requireAuth(), async (c) => {
  const { url, options } = await c.req.json();
  
  if (!url) {
    return c.json({ 
      ok: false, 
      error: { code: 'PDF_400_MISSING_URL', message: 'URL is required' } 
    }, 400);
  }

  try {
    const user = c.get('user');
    const pdfBuffer = await pdfService.generatePDF(url, {
      ...options,
      authToken: user.token, // 인증 토큰 전달
    });

    c.header('Content-Type', 'application/pdf');
    c.header('Content-Disposition', `attachment; filename="mindmap.pdf"`);
    return c.body(pdfBuffer);
  } catch (error: any) {
    console.error('PDF generation error:', error);
    return c.json({ 
      ok: false, 
      error: { code: 'PDF_500_GENERATION_FAILED', message: error.message } 
    }, 500);
  }
});

// GET 방식 PDF 생성
pdfRouter.get('/export', requireAuth(), async (c) => {
  const url = c.req.query('url');
  const format = c.req.query('format') || 'A4';
  const landscape = c.req.query('landscape') === 'true';

  if (!url) {
    return c.json({ 
      ok: false, 
      error: { code: 'PDF_400_MISSING_URL', message: 'URL parameter is required' } 
    }, 400);
  }

  try {
    const user = c.get('user');
    const pdfBuffer = await pdfService.generatePDF(url, {
      format,
      landscape,
      authToken: user.token,
    });

    c.header('Content-Type', 'application/pdf');
    c.header('Content-Disposition', `attachment; filename="mindmap.pdf"`);
    return c.body(pdfBuffer);
  } catch (error: any) {
    console.error('PDF generation error:', error);
    return c.json({ 
      ok: false, 
      error: { code: 'PDF_500_GENERATION_FAILED', message: error.message } 
    }, 500);
  }
});

// 공유 링크 PDF 생성 (인증 불필요)
pdfRouter.get('/share/:token', async (c) => {
  const token = c.req.param('token');
  const format = c.req.query('format') || 'A4';
  const landscape = c.req.query('landscape') === 'true';

  try {
    // 공유 정보 확인
    const shareInfo = await getShareInfo(token);
    if (!shareInfo || !isShareAccessible(shareInfo)) {
      return c.json({ 
        ok: false, 
        error: { code: 'PDF_404_SHARE_NOT_FOUND', message: 'Share not found or expired' } 
      }, 404);
    }

    // 공유 URL 생성
    const shareUrl = `${process.env.FRONTEND_URL}/share/${token}`;
    
    const pdfBuffer = await pdfService.generatePDF(shareUrl, {
      format,
      landscape,
      shareToken: token,
    });

    c.header('Content-Type', 'application/pdf');
    c.header('Content-Disposition', `attachment; filename="mindmap.pdf"`);
    return c.body(pdfBuffer);
  } catch (error: any) {
    console.error('PDF generation error:', error);
    return c.json({ 
      ok: false, 
      error: { code: 'PDF_500_GENERATION_FAILED', message: error.message } 
    }, 500);
  }
});

export default pdfRouter;
```

### 2. Playwright 브라우저 관리 (api/src/services/pdf/playwright.ts)

```typescript
/**
 * Playwright browser pool management
 */

import { chromium, type Browser, type BrowserContext } from 'playwright';

class BrowserPool {
  private browsers: Browser[] = [];
  private contexts: BrowserContext[] = [];
  private maxBrowsers = 3;
  private maxContextsPerBrowser = 5;
  private isInitialized = false;

  async initialize() {
    if (this.isInitialized) return;

    for (let i = 0; i < this.maxBrowsers; i++) {
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
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    });
    return context;
  }

  async releaseContext(context: BrowserContext) {
    // 컨텍스트를 풀에 반환 (최대 개수 제한)
    if (this.contexts.length < this.maxBrowsers * this.maxContextsPerBrowser) {
      // 쿠키 및 캐시 정리
      await context.clearCookies();
      this.contexts.push(context);
    } else {
      // 풀이 가득 차면 컨텍스트 닫기
      await context.close();
    }
  }

  async close() {
    for (const context of this.contexts) {
      await context.close();
    }
    this.contexts = [];

    for (const browser of this.browsers) {
      await browser.close();
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
  process.exit(0);
});

process.on('SIGINT', async () => {
  await browserPool.close();
  process.exit(0);
});
```

### 3. PDF 렌더링 서비스 (api/src/services/pdf/renderer.ts)

```typescript
/**
 * PDF rendering service using Playwright
 */

import { browserPool } from './playwright.js';
import { pdfCache } from './cache.js';
import type { PDFOptions } from '../types.js';

interface GeneratePDFOptions {
  format?: 'A4' | 'A3' | 'Letter' | 'Legal';
  landscape?: boolean;
  margin?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  printBackground?: boolean;
  scale?: number;
  waitFor?: 'load' | 'domcontentloaded' | 'networkidle';
  authToken?: string;
  shareToken?: string;
  timeout?: number;
}

export class PDFService {
  async generatePDF(url: string, options: GeneratePDFOptions = {}): Promise<Buffer> {
    // 캐시 확인
    const cacheKey = this.getCacheKey(url, options);
    const cached = await pdfCache.get(cacheKey);
    if (cached) {
      console.log('📄 PDF served from cache:', cacheKey);
      return cached;
    }

    const context = await browserPool.getContext();
    const page = await context.newPage();

    try {
      // 인증 토큰 설정 (쿠키 또는 헤더)
      if (options.authToken) {
        await page.setExtraHTTPHeaders({
          'Authorization': `Bearer ${options.authToken}`,
        });
      }

      // 공유 토큰이 있는 경우 URL에 추가
      let targetUrl = url;
      if (options.shareToken) {
        const urlObj = new URL(url);
        urlObj.searchParams.set('shareToken', options.shareToken);
        targetUrl = urlObj.toString();
      }

      // 페이지 로드
      console.log('📄 Loading page for PDF:', targetUrl);
      await page.goto(targetUrl, {
        waitUntil: options.waitFor || 'networkidle',
        timeout: options.timeout || 30000,
      });

      // 추가 대기 (동적 콘텐츠 로드)
      await page.waitForTimeout(1000);

      // 마인드맵이 로드될 때까지 대기
      await this.waitForMindMapReady(page);

      // PDF 생성
      const pdfBuffer = await page.pdf({
        format: options.format || 'A4',
        landscape: options.landscape ?? true,
        margin: options.margin || {
          top: '0.5in',
          right: '0.5in',
          bottom: '0.5in',
          left: '0.5in',
        },
        printBackground: options.printBackground ?? true,
        scale: options.scale || 1.0,
      });

      // 캐시 저장
      await pdfCache.set(cacheKey, pdfBuffer);

      return Buffer.from(pdfBuffer);
    } catch (error: any) {
      console.error('❌ PDF generation failed:', error);
      throw new Error(`PDF generation failed: ${error.message}`);
    } finally {
      await page.close();
      await browserPool.releaseContext(context);
    }
  }

  private async waitForMindMapReady(page: any): Promise<void> {
    try {
      // SVG 요소가 로드될 때까지 대기
      await page.waitForSelector('svg.mindmap-canvas', { timeout: 10000 });
      
      // 노드가 렌더링될 때까지 대기
      await page.waitForFunction(
        () => {
          const svg = document.querySelector('svg.mindmap-canvas');
          return svg && svg.querySelectorAll('g.node').length > 0;
        },
        { timeout: 10000 }
      );

      // 추가 안정화 대기
      await page.waitForTimeout(500);
    } catch (error) {
      console.warn('⚠️ MindMap ready check timeout, proceeding anyway');
    }
  }

  private getCacheKey(url: string, options: GeneratePDFOptions): string {
    const keyParts = [
      url,
      options.format || 'A4',
      options.landscape ? 'landscape' : 'portrait',
      options.scale || 1.0,
    ];
    return `pdf:${Buffer.from(keyParts.join(':')).toString('base64')}`;
  }
}

export const pdfService = new PDFService();
```

### 4. PDF 캐싱 (api/src/services/pdf/cache.ts)

```typescript
/**
 * PDF caching service using Redis
 */

import { cache } from '../../lib/redis.js';

const CACHE_TTL = 3600; // 1 hour

export class PDFCache {
  async get(key: string): Promise<Buffer | null> {
    try {
      const cached = await cache.get(key);
      if (cached) {
        return Buffer.from(cached, 'base64');
      }
      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key: string, value: Buffer): Promise<void> {
    try {
      await cache.set(key, value.toString('base64'), CACHE_TTL);
    } catch (error) {
      console.error('Cache set error:', error);
      // 캐시 실패는 치명적이지 않으므로 무시
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await cache.del(key);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  async clear(pattern: string): Promise<void> {
    try {
      const keys = await cache.keys(`pdf:${pattern}*`);
      if (keys.length > 0) {
        await cache.del(...keys);
      }
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }
}

export const pdfCache = new PDFCache();
```

## 환경 변수

```env
# Playwright 설정
PLAYWRIGHT_BROWSER_PATH=/usr/bin/chromium  # 선택사항
PLAYWRIGHT_MAX_BROWSERS=3
PLAYWRIGHT_MAX_CONTEXTS=5

# PDF 캐싱
PDF_CACHE_TTL=3600  # 초 단위

# 프론트엔드 URL (공유 링크용)
FRONTEND_URL=http://localhost:3000
```

## 의존성 설치

### package.json 업데이트

```json
{
  "dependencies": {
    "playwright": "^1.40.0"
  }
}
```

### 설치 명령어

```bash
cd api
npm install playwright
npx playwright install chromium
```

## 배포 고려사항

### Dockerfile 업데이트

```dockerfile
# Playwright 브라우저 설치
RUN npx playwright install chromium
RUN npx playwright install-deps chromium
```

### Kubernetes 리소스

```yaml
resources:
  requests:
    memory: "2Gi"
    cpu: "1000m"
  limits:
    memory: "4Gi"
    cpu: "2000m"
```

## 성능 최적화

### 1. 브라우저 풀링

- 브라우저 인스턴스를 재사용하여 시작 시간 단축
- 컨텍스트 풀링으로 메모리 사용량 최적화

### 2. 캐싱

- Redis를 사용한 PDF 캐싱
- 동일한 요청에 대해 캐시된 PDF 반환

### 3. 타임아웃 관리

- 페이지 로드 타임아웃 설정
- 최대 대기 시간 제한

### 4. 리소스 제한

- 동시 PDF 생성 개수 제한
- 메모리 사용량 모니터링

## 에러 처리

### 에러 코드

- `PDF_400_MISSING_URL`: URL 파라미터 누락
- `PDF_404_SHARE_NOT_FOUND`: 공유 링크를 찾을 수 없음
- `PDF_500_GENERATION_FAILED`: PDF 생성 실패
- `PDF_503_TIMEOUT`: 타임아웃 발생
- `PDF_503_BROWSER_BUSY`: 브라우저 풀이 가득 참

### 재시도 로직

```typescript
async function generatePDFWithRetry(url: string, options: GeneratePDFOptions, maxRetries = 3): Promise<Buffer> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await pdfService.generatePDF(url, options);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  throw new Error('Max retries exceeded');
}
```

## 보안 고려사항

### 1. URL 검증

```typescript
function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const allowedDomains = [process.env.FRONTEND_URL, process.env.API_URL];
    return allowedDomains.some(domain => urlObj.origin === domain);
  } catch {
    return false;
  }
}
```

### 2. Rate Limiting

- 사용자별 PDF 생성 요청 제한
- IP 기반 Rate Limiting

### 3. 리소스 제한

- 최대 PDF 크기 제한
- 최대 페이지 로드 시간 제한

## 모니터링

### 메트릭

- PDF 생성 성공/실패율
- 평균 PDF 생성 시간
- 브라우저 풀 사용률
- 캐시 히트율

### 로깅

```typescript
console.log('📄 PDF generation started:', { url, options });
console.log('✅ PDF generation completed:', { size: pdfBuffer.length, duration });
console.error('❌ PDF generation failed:', { error, url });
```

## 테스트

### 단위 테스트

```typescript
describe('PDFService', () => {
  it('should generate PDF from URL', async () => {
    const buffer = await pdfService.generatePDF('http://localhost:3000/share/test');
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });
});
```

### 통합 테스트

```typescript
describe('PDF API', () => {
  it('should return PDF for authenticated request', async () => {
    const response = await request(app)
      .post('/api/pdf/export')
      .set('Authorization', `Bearer ${token}`)
      .send({ url: 'http://localhost:3000/editor/123' });
    
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toBe('application/pdf');
  });
});
```

## 마이그레이션 계획

### Phase 1: 기본 구현
1. Playwright 설치 및 설정
2. 기본 PDF 생성 라우트 구현
3. 브라우저 풀 관리

### Phase 2: 최적화
1. 캐싱 구현
2. 에러 처리 개선
3. 성능 모니터링

### Phase 3: 고급 기능
1. Rate Limiting
2. 비동기 PDF 생성 (큐 시스템)
3. PDF 미리보기 기능

## 참고 자료

- [Playwright Documentation](https://playwright.dev/)
- [Playwright PDF API](https://playwright.dev/docs/api/class-page#page-pdf)
- [Browser Pooling Best Practices](https://playwright.dev/docs/best-practices#reuse-a-single-browser-context)

