# 페이지 PDF 변환 가이드

이 문서는 Open Mindmap 애플리케이션의 페이지를 PDF로 변환하는 다양한 방법을 설명합니다.

## 개요

웹 페이지를 PDF로 변환하는 방법은 여러 가지가 있습니다. 각 방법은 사용 사례와 요구사항에 따라 적합합니다.

## 방법 1: 브라우저 인쇄 기능 사용 (가장 간단)

가장 간단하고 즉시 사용 가능한 방법입니다.

### 단계

1. **페이지 열기**
   - PDF로 변환하고 싶은 페이지를 브라우저에서 엽니다
   - 예: 마인드맵 에디터 페이지 (`/editor/:mapId`) 또는 공유 페이지 (`/share/:token`)

2. **인쇄 대화상자 열기**
   - **Mac**: `Cmd + P` 또는 `File > Print`
   - **Windows/Linux**: `Ctrl + P` 또는 `File > Print`

3. **대상 선택**
   - "대상" 또는 "Destination" 드롭다운에서 **"PDF로 저장"** 또는 **"Save as PDF"** 선택

4. **설정 조정 (선택사항)**
   - **레이아웃**: 세로 또는 가로 방향 선택
   - **여백**: 필요에 따라 조정
   - **옵션**:
     - ✅ 배경 그래픽 포함 (CSS 배경색/이미지 포함)
     - ✅ 머리글 및 바닥글 제거 (필요시)

5. **저장**
   - "저장" 또는 "Save" 버튼 클릭
   - 파일 이름과 저장 위치 선택

### 장점

- ✅ 추가 도구나 라이브러리 불필요
- ✅ 모든 브라우저에서 지원
- ✅ 즉시 사용 가능
- ✅ 무료

### 단점

- ❌ 자동화 불가능
- ❌ 일부 복잡한 레이아웃에서 품질 저하 가능
- ❌ 동적 콘텐츠(애니메이션 등)는 정적 이미지로 변환됨

### 브라우저별 팁

#### Chrome/Edge
- 인쇄 미리보기에서 "더 많은 설정" 클릭
- "배경 그래픽" 옵션 활성화
- "여백" 설정으로 레이아웃 조정

#### Firefox
- 인쇄 대화상자에서 "PDF로 저장" 선택
- "페이지 설정"에서 배경 색상 및 이미지 포함 옵션 확인

#### Safari
- 인쇄 대화상자에서 "PDF" 드롭다운 선택
- "PDF로 저장" 선택
- "페이지 설정"에서 배경 그래픽 포함 옵션 확인

## 방법 2: 클라이언트 사이드 라이브러리 사용 (html2pdf.js)

JavaScript 라이브러리를 사용하여 브라우저에서 직접 PDF를 생성합니다.

### 설치

```bash
npm install html2pdf.js
# 또는
yarn add html2pdf.js
```

### 기본 사용법

```typescript
import html2pdf from 'html2pdf.js';

// PDF로 변환할 요소 선택
const element = document.getElementById('mindmap-container');

// PDF 생성 옵션
const options = {
  margin: 1,
  filename: 'mindmap.pdf',
  image: { type: 'jpeg', quality: 0.98 },
  html2canvas: { scale: 2 },
  jsPDF: { unit: 'in', format: 'letter', orientation: 'landscape' }
};

// PDF 생성
html2pdf().set(options).from(element).save();
```

### React 컴포넌트 예제

```typescript
import { useRef } from 'react';
import html2pdf from 'html2pdf.js';

function MindMapPDFExport() {
  const containerRef = useRef<HTMLDivElement>(null);

  const exportToPDF = () => {
    if (!containerRef.current) return;

    const options = {
      margin: [0.5, 0.5, 0.5, 0.5],
      filename: 'mindmap.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      },
      jsPDF: { 
        unit: 'in', 
        format: 'a4', 
        orientation: 'landscape' 
      }
    };

    html2pdf()
      .set(options)
      .from(containerRef.current)
      .save()
      .catch((err: Error) => {
        console.error('PDF export failed:', err);
      });
  };

  return (
    <div>
      <button onClick={exportToPDF}>Export to PDF</button>
      <div ref={containerRef}>
        {/* 마인드맵 콘텐츠 */}
      </div>
    </div>
  );
}
```

### 고급 옵션

```typescript
const options = {
  margin: [0.5, 0.5, 0.5, 0.5], // [top, right, bottom, left]
  filename: 'custom-name.pdf',
  image: { 
    type: 'jpeg', 
    quality: 0.98 
  },
  html2canvas: { 
    scale: 2,                    // 해상도 배율
    useCORS: true,               // CORS 이미지 허용
    logging: false,              // 로그 비활성화
    backgroundColor: '#ffffff',  // 배경색
    windowWidth: 1920,           // 캔버스 너비
    windowHeight: 1080           // 캔버스 높이
  },
  jsPDF: { 
    unit: 'in',                  // 단위: inch
    format: 'a4',                // 용지 크기
    orientation: 'landscape',    // 방향: landscape 또는 portrait
    compress: true               // 압축 활성화
  },
  pagebreak: { 
    mode: ['avoid-all', 'css', 'legacy'] 
  }
};
```

### 장점

- ✅ 클라이언트 사이드에서 처리 (서버 부하 없음)
- ✅ 사용자 인터랙션 가능 (버튼 클릭 등)
- ✅ 커스터마이징 가능
- ✅ 오프라인 작동 가능

### 단점

- ❌ 대용량 페이지에서 성능 저하 가능
- ❌ 일부 복잡한 CSS가 제대로 렌더링되지 않을 수 있음
- ❌ 외부 리소스(CORS 문제) 로딩 제한

## 방법 3: 서버 사이드 PDF 생성 (Puppeteer)

Node.js 서버에서 헤드리스 브라우저를 사용하여 PDF를 생성합니다.

### 설치

```bash
npm install puppeteer
# 또는
yarn add puppeteer
```

### 기본 사용법

```typescript
import puppeteer from 'puppeteer';

async function generatePDF(url: string, outputPath: string) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  // 페이지 로드 대기
  await page.goto(url, { 
    waitUntil: 'networkidle0' 
  });

  // PDF 생성
  await page.pdf({
    path: outputPath,
    format: 'A4',
    landscape: true,
    printBackground: true,
    margin: {
      top: '0.5in',
      right: '0.5in',
      bottom: '0.5in',
      left: '0.5in'
    }
  });

  await browser.close();
}

// 사용 예제
generatePDF('https://example.com/mindmap/123', './output.pdf');
```

### API 엔드포인트 예제

```typescript
// api/src/routes/pdf.ts
import { Hono } from 'hono';
import puppeteer from 'puppeteer';

const pdf = new Hono();

pdf.post('/generate', async (c) => {
  const { url, options } = await c.req.json();

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({
      format: options?.format || 'A4',
      landscape: options?.landscape || false,
      printBackground: true,
      margin: options?.margin || {
        top: '0.5in',
        right: '0.5in',
        bottom: '0.5in',
        left: '0.5in'
      }
    });

    await browser.close();

    c.header('Content-Type', 'application/pdf');
    c.header('Content-Disposition', 'attachment; filename="mindmap.pdf"');
    return c.body(pdfBuffer);
  } catch (error) {
    await browser.close();
    return c.json({ error: 'Failed to generate PDF' }, 500);
  }
});

export default pdf;
```

### 고급 옵션

```typescript
await page.pdf({
  path: 'output.pdf',
  format: 'A4',                    // A4, Letter 등
  landscape: true,                  // 가로/세로
  printBackground: true,            // 배경 포함
  scale: 1,                         // 스케일
  margin: {
    top: '0.5in',
    right: '0.5in',
    bottom: '0.5in',
    left: '0.5in'
  },
  displayHeaderFooter: true,        // 헤더/푸터 표시
  headerTemplate: '<div>Header</div>',
  footerTemplate: '<div>Footer</div>',
  preferCSSPageSize: false,         // CSS 페이지 크기 우선
  tagged: true,                     // 접근성 태그 포함
  outline: true                     // 아웃라인 생성
});
```

### 장점

- ✅ 고품질 PDF 생성
- ✅ 모든 브라우저 기능 지원 (JavaScript 실행 등)
- ✅ 자동화 가능
- ✅ 일관된 결과

### 단점

- ❌ 서버 리소스 필요 (메모리, CPU)
- ❌ 설치 및 설정 복잡
- ❌ 대용량 페이지에서 느릴 수 있음

## 방법 4: Playwright 사용

Puppeteer의 대안으로, 더 많은 브라우저를 지원합니다.

### 설치

```bash
npm install playwright
# 또는
yarn add playwright

# 브라우저 설치
npx playwright install chromium
```

### 기본 사용법

```typescript
import { chromium } from 'playwright';

async function generatePDF(url: string, outputPath: string) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.goto(url, { waitUntil: 'networkidle' });
  
  await page.pdf({
    path: outputPath,
    format: 'A4',
    landscape: true,
    printBackground: true
  });

  await browser.close();
}
```

## 방법 5: jsPDF + html2canvas 조합

더 세밀한 제어가 필요한 경우 두 라이브러리를 함께 사용합니다.

### 설치

```bash
npm install jspdf html2canvas
# 또는
yarn add jspdf html2canvas
```

### 사용 예제

```typescript
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

async function exportToPDF(element: HTMLElement) {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('landscape', 'mm', 'a4');
  
  const imgWidth = 297; // A4 width in mm
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  
  pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
  pdf.save('mindmap.pdf');
}
```

## 마인드맵 특화 고려사항

### SVG 렌더링

마인드맵은 SVG로 렌더링되므로, PDF 변환 시 다음을 고려해야 합니다:

1. **SVG를 이미지로 변환**
   ```typescript
   const svgElement = document.querySelector('svg');
   const svgData = new XMLSerializer().serializeToString(svgElement);
   const svgBlob = new Blob([svgData], { type: 'image/svg+xml' });
   const url = URL.createObjectURL(svgBlob);
   ```

2. **ViewBox 조정**
   - 마인드맵의 전체 영역을 포함하도록 viewBox 설정 확인

3. **확대/축소 상태**
   - PDF 생성 전에 "Fit to Screen" 적용 권장

### 권장 접근 방법

1. **사용자 요청 시**: 브라우저 인쇄 기능 (방법 1)
2. **프로그래밍 방식 (클라이언트)**: html2pdf.js (방법 2)
3. **프로그래밍 방식 (서버)**: Puppeteer (방법 3)
4. **고품질 요구**: jsPDF + html2canvas (방법 5)

## 문제 해결

### 배경이 흰색으로 나오는 경우

```typescript
html2canvas(element, {
  backgroundColor: null,  // 또는 '#ffffff'
  useCORS: true
});
```

### 이미지가 로드되지 않는 경우

```typescript
html2canvas(element, {
  useCORS: true,
  allowTaint: true,
  logging: true  // 디버깅용
});
```

### 페이지가 잘리는 경우

```typescript
// 페이지 크기 조정
jsPDF: { 
  format: 'a3',  // 더 큰 용지 사용
  orientation: 'landscape'
}
```

### 폰트가 제대로 렌더링되지 않는 경우

```typescript
// 폰트 로드 대기
await document.fonts.ready;

// 또는 특정 폰트 로드 대기
await document.fonts.load('16px "Your Font"');
```

## 참고 자료

- [html2pdf.js 문서](https://ekoopmans.github.io/html2pdf.js/)
- [Puppeteer PDF API](https://pptr.dev/#?product=Puppeteer&version=v21.0.0&show=api-pagepdfoptions)
- [Playwright PDF API](https://playwright.dev/docs/api/class-page#page-pdf)
- [jsPDF 문서](https://github.com/parallax/jsPDF)
- [html2canvas 문서](https://html2canvas.hertzen.com/)

## 예제 코드

전체 예제 코드는 프로젝트의 `examples/pdf-export/` 디렉토리를 참고하세요.

