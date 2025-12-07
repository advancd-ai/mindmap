/**
 * PDF export routes
 */

import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth.js';
import { pdfService } from '../services/pdf/renderer.js';
import { getShareInfo, isShareAccessible } from '../services/share.js';
import type { Env, User } from '../types.js';

export const pdfRouter = new Hono<{ Bindings: Env; Variables: { user: User } }>();

// 인증이 필요한 PDF 생성 (POST)
pdfRouter.post('/export', requireAuth(), async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const { url, options } = body;
    
    if (!url) {
      return c.json({ 
        ok: false, 
        error: { code: 'PDF_400_MISSING_URL', message: 'URL is required' } 
      }, 400);
    }

    // URL 검증
    if (!isValidUrl(url)) {
      return c.json({ 
        ok: false, 
        error: { code: 'PDF_400_INVALID_URL', message: 'Invalid URL' } 
      }, 400);
    }

    const user = c.get('user');
    // Get actual session token from Authorization header
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    
    const pdfBuffer = await pdfService.generatePDF(url, {
      ...options,
      authToken: token || undefined, // 인증 토큰 전달
      userInfo: user, // 사용자 정보도 함께 전달
    });

    c.header('Content-Type', 'application/pdf');
    c.header('Content-Disposition', `attachment; filename="mindmap.pdf"`);
    return c.body(pdfBuffer);
  } catch (error: any) {
    console.error('PDF generation error:', error);
    return c.json({ 
      ok: false, 
      error: { code: 'PDF_500_GENERATION_FAILED', message: error.message || 'Failed to generate PDF' } 
    }, 500);
  }
});

// 인증이 필요한 PDF 생성 (GET)
pdfRouter.get('/export', requireAuth(), async (c) => {
  try {
    const url = c.req.query('url');
    const format = (c.req.query('format') as 'A4' | 'A3' | 'Letter' | 'Legal') || 'A4';
    const landscape = c.req.query('landscape') === 'true';

    if (!url) {
      return c.json({ 
        ok: false, 
        error: { code: 'PDF_400_MISSING_URL', message: 'URL parameter is required' } 
      }, 400);
    }

    // URL 검증
    if (!isValidUrl(url)) {
      return c.json({ 
        ok: false, 
        error: { code: 'PDF_400_INVALID_URL', message: 'Invalid URL' } 
      }, 400);
    }

    const user = c.get('user');
    // Get actual session token from Authorization header
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    
    const pdfBuffer = await pdfService.generatePDF(url, {
      format,
      landscape,
      authToken: token || undefined, // 인증 토큰 전달
      userInfo: user, // 사용자 정보도 함께 전달
    });

    c.header('Content-Type', 'application/pdf');
    c.header('Content-Disposition', `attachment; filename="mindmap.pdf"`);
    return c.body(pdfBuffer);
  } catch (error: any) {
    console.error('PDF generation error:', error);
    return c.json({ 
      ok: false, 
      error: { code: 'PDF_500_GENERATION_FAILED', message: error.message || 'Failed to generate PDF' } 
    }, 500);
  }
});

// 공유 링크 PDF 생성 (인증 불필요)
pdfRouter.get('/share/:token', async (c) => {
  try {
    const token = c.req.param('token');
    const format = (c.req.query('format') as 'A4' | 'A3' | 'Letter' | 'Legal') || 'A4';
    const landscape = c.req.query('landscape') === 'true';

    // 공유 정보 확인
    const shareInfo = await getShareInfo(token);
    if (!shareInfo || !isShareAccessible(shareInfo)) {
      return c.json({ 
        ok: false, 
        error: { code: 'PDF_404_SHARE_NOT_FOUND', message: 'Share not found or expired' } 
      }, 404);
    }

    // 공유 URL 생성
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const shareUrl = `${frontendUrl}/share/${token}`;
    
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
      error: { code: 'PDF_500_GENERATION_FAILED', message: error.message || 'Failed to generate PDF' } 
    }, 500);
  }
});

// URL 검증 헬퍼 함수
function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const allowedDomains = [
      process.env.FRONTEND_URL,
      process.env.API_URL,
      'http://localhost:3000',
      'http://localhost:8787',
    ].filter(Boolean);
    
    return allowedDomains.some(domain => {
      if (!domain) return false;
      try {
        const domainObj = new URL(domain);
        return urlObj.origin === domainObj.origin;
      } catch {
        return url.includes(domain);
      }
    });
  } catch {
    return false;
  }
}

export default pdfRouter;

