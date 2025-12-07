/**
 * PDF rendering service using Playwright
 */

import { browserPool } from './playwright.js';
import { pdfCache } from './cache.js';

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
  userInfo?: {
    userId: string;
    email: string;
    name: string;
    picture?: string;
  };
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
    
    // 인증 토큰이 있는 경우 페이지 로드 전에 localStorage 설정 스크립트 추가
    if (options.authToken && options.userInfo) {
      // 인자를 하나의 객체로 묶어서 전달
      const authData = {
        token: options.authToken,
        userInfo: options.userInfo,
      };
      // @ts-ignore - Playwright browser context has DOM APIs
      await context.addInitScript((data: { token: string; userInfo: any }) => {
        // Zustand persist 형식에 맞게 auth-storage 설정
        const authStorage = {
          state: {
            token: data.token,
            user: data.userInfo,
            isAuthenticated: true,
            isGuest: false,
          },
          version: 0
        };
        // @ts-ignore - localStorage is available in browser context
        localStorage.setItem('auth-storage', JSON.stringify(authStorage));
        // @ts-ignore - console is available in browser context
        console.log('✅ Auth token set in localStorage before page load');
      }, authData);
    }
    
    const page = await context.newPage();

    try {
      // 공유 토큰이 있는 경우 URL에 추가
      let targetUrl = url;
      if (options.shareToken) {
        try {
          const urlObj = new URL(url);
          urlObj.searchParams.set('shareToken', options.shareToken);
          targetUrl = urlObj.toString();
        } catch {
          // URL 파싱 실패 시 쿼리 파라미터로 추가
          const separator = url.includes('?') ? '&' : '?';
          targetUrl = `${url}${separator}shareToken=${options.shareToken}`;
        }
      }

      // 페이지 로드
      console.log('📄 Loading page for PDF:', targetUrl);
      await page.goto(targetUrl, {
        waitUntil: options.waitFor || 'networkidle',
        timeout: options.timeout || 30000,
      });

      // 추가 대기 (React가 인증 상태를 확인하고 렌더링할 시간)
      await page.waitForTimeout(2000);

      // 추가 대기 (동적 콘텐츠 로드)
      await page.waitForTimeout(1000);

      // 마인드맵이 로드될 때까지 대기
      await this.waitForMindMapReady(page);

      // 이미지가 모두 로드될 때까지 대기
      await this.waitForImagesLoaded(page);

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

      const buffer = Buffer.from(pdfBuffer);

      // 캐시 저장
      await pdfCache.set(cacheKey, buffer);

      console.log('✅ PDF generated successfully:', { size: buffer.length, cacheKey });
      return buffer;
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
          // @ts-ignore - document is available in browser context
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

  private async waitForImagesLoaded(page: any): Promise<void> {
    try {
      console.log('🖼️ Waiting for images to load...');
      
      // 네트워크가 idle 상태가 될 때까지 대기
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {
        console.warn('⚠️ Network idle timeout, continuing...');
      });

      // 이미지 로딩 대기 (최대 15초)
      await page.waitForFunction(
        () => {
          // @ts-ignore - document is available in browser context
          const images = document.querySelectorAll('img');
          const imageElements = Array.from(images);
          
          if (imageElements.length === 0) {
            return true; // 이미지가 없으면 완료
          }

          // 모든 이미지가 로드되었는지 확인
          const allLoaded = imageElements.every((img: any) => {
            // 완전히 로드된 이미지 (naturalWidth > 0)
            if (img.complete && img.naturalWidth > 0) {
              return true;
            }
            // 로딩 중이거나 에러 상태
            if (!img.complete && img.src) {
              return false; // 아직 로딩 중
            }
            return true; // src가 없는 경우는 무시
          });

          // ImageDisplay 컴포넌트의 로딩 상태도 확인
          // "Downloading image..." 텍스트가 없어야 함
          // @ts-ignore - document is available in browser context
          const bodyText = document.body?.textContent || '';
          const hasLoadingImage = bodyText.includes('Downloading image');

          return allLoaded && !hasLoadingImage;
        },
        { timeout: 15000 }
      );

      // 추가 대기 (이미지 렌더링 완료 및 blob URL 처리)
      await page.waitForTimeout(2000);
      
      console.log('✅ All images loaded');
    } catch (error) {
      console.warn('⚠️ Image loading check timeout, proceeding anyway');
    }
  }

  private getCacheKey(url: string, options: GeneratePDFOptions): string {
    const keyParts = [
      url,
      options.format || 'A4',
      options.landscape ? 'landscape' : 'portrait',
      String(options.scale || 1.0),
      options.authToken ? 'auth' : 'no-auth',
      options.shareToken || '',
    ];
    return `pdf:${Buffer.from(keyParts.join(':')).toString('base64')}`;
  }
}

export const pdfService = new PDFService();

