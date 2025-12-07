# PDF 내보내기 버튼 기획 문서

## 개요

마인드맵을 PDF로 내보낼 수 있는 기능을 제공하는 버튼을 추가합니다. Playwright 기반 서버사이드 렌더링을 활용하여 고품질 PDF를 생성합니다.

## 목표

1. **간편한 PDF 내보내기**: 한 번의 클릭으로 마인드맵을 PDF로 다운로드
2. **고품질 렌더링**: 서버사이드 렌더링을 통한 정확한 PDF 생성
3. **사용자 경험**: 로딩 상태 표시 및 에러 처리
4. **접근성**: 키보드 단축키 및 스크린 리더 지원

## 버튼 위치 및 디자인

### 위치 옵션

#### 옵션 1: Editor Header (권장)
- **위치**: Editor 페이지 헤더의 오른쪽 영역 (`editor-header-right`)
- **배치**: Share 버튼 옆 또는 Save 버튼 옆
- **장점**: 
  - 다른 액션 버튼들과 함께 배치되어 일관성 유지
  - 항상 보이는 위치
  - 공간 활용 효율적

#### 옵션 2: Toolbox
- **위치**: Floating Toolbox 내부
- **배치**: View Controls 그룹에 추가
- **장점**: 
  - 도구들과 함께 그룹화
  - 캔버스 공간 활용

#### 옵션 3: Share Page Header
- **위치**: Share 페이지 헤더
- **배치**: "Open in App" 버튼 옆
- **장점**: 
  - 공유 페이지에서도 PDF 내보내기 가능

### 최종 결정: 옵션 1 (Editor Header)

Editor Header의 `editor-actions` 영역에 배치합니다.

```
┌─────────────────────────────────────────────┐
│  Editor Header                               │
│  [Back] | Breadcrumb | [Share] [PDF] [Save] │
└─────────────────────────────────────────────┘
```

## 디자인 스펙

### 버튼 스타일

- **타입**: Secondary button (기존 Share 버튼과 동일한 스타일)
- **아이콘**: PDF 아이콘 (📄 또는 SVG)
- **레이블**: "Export PDF" 또는 "PDF"
- **크기**: 기존 Share 버튼과 동일
- **상태**:
  - Normal: 기본 상태
  - Loading: PDF 생성 중 (스피너 표시)
  - Disabled: 마인드맵이 없을 때

### 아이콘

```svg
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
  <polyline points="14,2 14,8 20,8"/>
  <line x1="16" y1="13" x2="8" y2="13"/>
  <line x1="16" y1="17" x2="8" y2="17"/>
  <polyline points="10,9 9,9 8,9"/>
</svg>
```

## 기능 명세

### 기본 동작

1. **버튼 클릭**
   - 현재 페이지 URL을 PDF API에 전달
   - 인증 토큰을 헤더에 포함
   - PDF 생성 요청

2. **로딩 상태**
   - 버튼에 스피너 표시
   - 버튼 비활성화
   - 툴팁: "Generating PDF..."

3. **성공 시**
   - PDF 파일 다운로드 시작
   - 파일명: `mindmap-{mapId}-{timestamp}.pdf`
   - 버튼 상태 복원

4. **실패 시**
   - 에러 토스트 메시지 표시
   - 버튼 상태 복원

### API 호출

```typescript
// POST 방식
POST /api/pdf/export
Authorization: Bearer <token>
Content-Type: application/json

{
  "url": "http://localhost:3000/editor/123",
  "options": {
    "format": "A4",
    "landscape": true,
    "margin": {
      "top": "0.5in",
      "right": "0.5in",
      "bottom": "0.5in",
      "left": "0.5in"
    }
  }
}
```

### 옵션 설정

- **Format**: A4 (기본값)
- **Orientation**: Landscape (기본값, 마인드맵에 적합)
- **Margin**: 0.5in (기본값)
- **Print Background**: true (기본값)

## 사용자 인터랙션

### Editor Page

1. **버튼 클릭**
   ```
   User clicks "Export PDF" button
   → Show loading spinner
   → Call PDF API with current editor URL
   → Download PDF file
   → Hide loading spinner
   ```

2. **에러 처리**
   ```
   PDF generation fails
   → Show error toast
   → Restore button state
   ```

### Share Page

1. **버튼 클릭**
   ```
   User clicks "Export PDF" button
   → Show loading spinner
   → Call PDF API with share token
   → Download PDF file
   → Hide loading spinner
   ```

## 상태 관리

### State Variables

```typescript
const [isExportingPDF, setIsExportingPDF] = useState(false);
const [pdfError, setPdfError] = useState<string | null>(null);
```

### Loading State

- 버튼에 스피너 아이콘 표시
- 버튼 비활성화
- 툴팁 변경: "Generating PDF..."

## 에러 처리

### 에러 케이스

1. **네트워크 에러**
   - 메시지: "Failed to connect to server"
   - 재시도 옵션 제공

2. **인증 에러**
   - 메시지: "Authentication required"
   - 로그인 페이지로 리다이렉트

3. **PDF 생성 실패**
   - 메시지: "Failed to generate PDF. Please try again."
   - 재시도 버튼 제공

4. **타임아웃**
   - 메시지: "PDF generation timed out. Please try again."
   - 재시도 버튼 제공

## 접근성

### 키보드 지원

- **Tab**: 버튼 포커스 이동
- **Enter/Space**: PDF 내보내기 실행

### 스크린 리더

- **aria-label**: "Export mindmap as PDF"
- **aria-busy**: 로딩 중일 때 `true`
- **aria-disabled**: 비활성화 상태

## 다국어 지원

### 번역 키

```json
{
  "editor": {
    "exportPDF": "Export PDF",
    "exportingPDF": "Generating PDF...",
    "pdfExportSuccess": "PDF exported successfully",
    "pdfExportError": "Failed to export PDF",
    "pdfExportTimeout": "PDF generation timed out"
  },
  "share": {
    "exportPDF": "Export PDF",
    "exportingPDF": "Generating PDF..."
  }
}
```

## 성능 고려사항

### 최적화

1. **캐싱**: 동일한 마인드맵의 PDF는 캐시에서 제공
2. **비동기 처리**: PDF 생성은 비동기로 처리
3. **타임아웃**: 최대 30초 타임아웃 설정

### 사용자 피드백

- 로딩 중에는 명확한 피드백 제공
- 진행률 표시 (선택사항)
- 예상 소요 시간 안내 (선택사항)

## 구현 계획

### Phase 1: 기본 기능
1. Editor Page에 PDF 버튼 추가
2. API 호출 구현
3. 기본 에러 처리

### Phase 2: UX 개선
1. 로딩 상태 표시
2. 에러 토스트 메시지
3. 다국어 지원

### Phase 3: 고급 기능
1. PDF 옵션 설정 다이얼로그
2. 진행률 표시
3. Share Page 지원

## 파일 구조

```
frontend/src/
├── pages/
│   ├── EditorPage.tsx          # PDF 버튼 추가
│   └── SharePage.tsx           # PDF 버튼 추가
├── components/
│   └── PdfExportButton.tsx     # PDF 내보내기 버튼 컴포넌트 (선택사항)
├── api/
│   └── pdf.ts                  # PDF API 클라이언트
└── i18n/
    └── locales/
        ├── ko.json             # 한국어 번역
        └── en.json             # 영어 번역
```

## 참고 자료

- [PLAYWRIGHT_PDF_RENDERING.md](./PLAYWRIGHT_PDF_RENDERING.md) - 서버사이드 PDF 렌더링 설계
- [pdf.md](./pdf.md) - PDF 변환 방법 가이드

