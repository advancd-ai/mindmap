/**
 * PDF export API functions
 */

import apiClient from './client';

export interface PDFExportOptions {
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
}

/**
 * Export mindmap as PDF (authenticated)
 */
export async function exportPDF(url: string, options: PDFExportOptions = {}): Promise<Blob> {
  try {
    const response = await apiClient.post(
      '/pdf/export',
      {
        url,
        options: {
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
        },
      },
      {
        responseType: 'blob',
      }
    );

    return response.data;
  } catch (error: any) {
    console.error('❌ PDF export error:', error);
    throw new Error(error.response?.data?.error?.message || 'Failed to export PDF');
  }
}

/**
 * Export shared mindmap as PDF (no authentication required)
 */
export async function exportSharedPDF(token: string, options: PDFExportOptions = {}): Promise<Blob> {
  try {
    const format = options.format || 'A4';
    const landscape = options.landscape ?? true;
    const url = `/pdf/share/${token}?format=${format}&landscape=${landscape}`;
    
    const response = await apiClient.get(url, {
      responseType: 'blob',
    });

    return response.data;
  } catch (error: any) {
    console.error('❌ PDF export error:', error);
    throw new Error(error.response?.data?.error?.message || 'Failed to export PDF');
  }
}

/**
 * Download PDF blob as file
 */
export function downloadPDF(blob: Blob, filename: string = 'mindmap.pdf'): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * View PDF blob in new tab/window
 */
export function viewPDF(blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const newWindow = window.open(url, '_blank');
  
  // Clean up the blob URL after the window is closed or after a delay
  if (newWindow) {
    newWindow.addEventListener('beforeunload', () => {
      URL.revokeObjectURL(url);
    });
    // Fallback: revoke after 5 minutes if window is still open
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 5 * 60 * 1000);
  } else {
    // If popup was blocked, fall back to download
    console.warn('⚠️ Popup blocked, falling back to download');
    downloadPDF(blob);
  }
}

