# Google AdSense 광고 Unit 추가 가이드

## 개요
이 문서는 프로젝트에 Google AdSense 광고 unit을 추가하는 방법을 설명합니다.

## 사전 준비

### 1. Google AdSense 계정 설정
1. [Google AdSense](https://www.google.com/adsense/)에 로그인
2. 사이트를 등록하고 승인을 받아야 합니다
3. 현재 프로젝트의 AdSense Publisher ID: `ca-pub-6929869719862616`

### 2. 광고 Unit 생성
1. AdSense 대시보드에서 **광고** > **광고 단위** 메뉴로 이동
2. **새 광고 단위** 클릭
3. 광고 형식 선택:
   - **디스플레이 광고**: `horizontal` (가로형), `vertical` (세로형), `rectangle` (사각형)
   - **자동 광고**: `auto` (자동 크기 조정)
4. 광고 단위 이름 지정 (예: "Dashboard Top Banner", "Editor Sidebar")
5. 광고 크기 선택 (반응형 권장)
6. **만들기** 클릭
7. 생성된 광고 단위의 **슬롯 ID** 복사 (예: `1234567890`)

## 코드에 광고 Unit 추가하기

### 기본 사용법

현재 프로젝트에는 `GoogleAdSense` 컴포넌트가 이미 구현되어 있습니다:

```tsx
import GoogleAdSense from '../components/GoogleAdSense';

// 기본 사용 (슬롯 ID 없이 - 자동 광고)
<GoogleAdSense
  adFormat="horizontal"
  fullWidthResponsive={true}
/>

// 특정 광고 Unit 사용 (슬롯 ID 지정)
<GoogleAdSense
  adSlot="1234567890"  // Google AdSense에서 생성한 슬롯 ID
  adFormat="horizontal"
  fullWidthResponsive={true}
/>
```

### 컴포넌트 Props

| Prop | Type | Default | 설명 |
|------|------|---------|------|
| `adSlot` | `string?` | `undefined` | Google AdSense에서 생성한 광고 단위의 슬롯 ID |
| `adFormat` | `'auto' \| 'rectangle' \| 'vertical' \| 'horizontal'` | `'auto'` | 광고 형식 |
| `fullWidthResponsive` | `boolean` | `true` | 반응형 전체 너비 광고 여부 |
| `style` | `React.CSSProperties?` | `undefined` | 추가 스타일 |
| `className` | `string?` | `''` | 추가 CSS 클래스 |

### 예제: Dashboard 페이지에 광고 추가

```tsx
// DashboardPage.tsx
import GoogleAdSense from '../components/GoogleAdSense';

export default function DashboardPage() {
  return (
    <div className="dashboard-page">
      {/* 상단 배너 광고 */}
      <div className="dashboard-ad-top">
        <GoogleAdSense
          adSlot="1234567890"  // Dashboard 상단 배너 슬롯 ID
          adFormat="horizontal"
          fullWidthResponsive={true}
        />
      </div>

      {/* 메인 콘텐츠 */}
      <div className="dashboard-content">
        {/* ... */}
      </div>

      {/* 하단 배너 광고 */}
      <div className="dashboard-ad-bottom">
        <GoogleAdSense
          adSlot="0987654321"  // Dashboard 하단 배너 슬롯 ID
          adFormat="horizontal"
          fullWidthResponsive={true}
        />
      </div>
    </div>
  );
}
```

### 예제: Editor 페이지에 사이드바 광고 추가

```tsx
// EditorPage.tsx
import GoogleAdSense from '../components/GoogleAdSense';

export default function EditorPage() {
  return (
    <div className="editor-page">
      <div className="editor-content">
        {/* 메인 에디터 */}
        <MindMapCanvas />
      </div>

      {/* 오른쪽 사이드바 광고 */}
      <div className="editor-sidebar">
        <GoogleAdSense
          adSlot="1122334455"  // Editor 사이드바 슬롯 ID
          adFormat="vertical"
          fullWidthResponsive={true}
          style={{ width: '300px', margin: '20px auto' }}
        />
      </div>
    </div>
  );
}
```

### 예제: Share 페이지에 여러 광고 Unit 추가

```tsx
// SharePage.tsx
import GoogleAdSense from '../components/GoogleAdSense';

export default function SharePage() {
  return (
    <div className="share-page">
      {/* 상단 광고 */}
      <div className="share-ad-top">
        <GoogleAdSense
          adSlot="1111111111"
          adFormat="horizontal"
          fullWidthResponsive={true}
        />
      </div>

      <div className="share-content">
        {/* 중간 광고 (현재 사용 중) */}
        <div className="share-ad-container">
          <GoogleAdSense
            adSlot="2222222222"  // 기존 광고를 특정 슬롯으로 변경
            adFormat="horizontal"
            fullWidthResponsive={true}
          />
        </div>

        <MindMapCanvas />
      </div>

      {/* 하단 광고 */}
      <div className="share-ad-bottom">
        <GoogleAdSense
          adSlot="3333333333"
          adFormat="horizontal"
          fullWidthResponsive={true}
        />
      </div>
    </div>
  );
}
```

## 스타일링

광고를 스타일링하려면 CSS 파일에 스타일을 추가하거나 `style` prop을 사용하세요:

```tsx
// 인라인 스타일 사용
<GoogleAdSense
  adSlot="1234567890"
  adFormat="horizontal"
  style={{
    margin: '20px 0',
    borderRadius: '8px',
    overflow: 'hidden'
  }}
/>

// CSS 클래스 사용
<GoogleAdSense
  adSlot="1234567890"
  adFormat="horizontal"
  className="custom-ad-style"
/>
```

```css
/* CSS 파일 */
.custom-ad-style {
  margin: 20px 0;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
```

## 주의사항

1. **광고 정책 준수**
   - Google AdSense 정책을 준수해야 합니다
   - 클릭 유도 문구 사용 금지
   - 광고 클릭을 직접 요청하지 마세요

2. **광고 Unit 개수**
   - 한 페이지에 너무 많은 광고를 배치하지 마세요
   - 사용자 경험을 해치지 않도록 주의하세요

3. **슬롯 ID 관리**
   - 각 광고 위치마다 고유한 슬롯 ID를 사용하세요
   - 슬롯 ID는 환경 변수나 설정 파일로 관리하는 것을 권장합니다

4. **반응형 디자인**
   - `fullWidthResponsive={true}`를 사용하면 모바일에서도 잘 작동합니다
   - 필요시 미디어 쿼리를 사용하여 모바일/데스크톱에서 다른 광고를 표시할 수 있습니다

## 환경 변수로 관리하기

### AdSense 활성화/비활성화

AdSense 광고 표시를 환경 변수로 제어할 수 있습니다:

```bash
# .env 파일
# AdSense 활성화 (기본값: true)
VITE_ADSENSE_ENABLED=true

# AdSense 비활성화
VITE_ADSENSE_ENABLED=false
```

**지원되는 값:**
- 활성화: `true`, `1`, `yes`, `on`
- 비활성화: `false`, `0`, `no`, `off`
- 미설정 시 기본값: `true` (하위 호환성)

**참고:** Vite에서는 클라이언트 측에서 접근 가능한 환경변수에 `VITE_` 접두사가 필요합니다.

**사용 예시:**
```bash
# 개발 환경에서 광고 비활성화
VITE_ADSENSE_ENABLED=false

# 프로덕션 환경에서 광고 활성화
VITE_ADSENSE_ENABLED=true
```

### 광고 슬롯 ID 관리 (선택사항)

광고 슬롯 ID를 환경 변수로 관리하려면:

```bash
# .env 파일
VITE_ADSENSE_SLOT_DASHBOARD_TOP=1234567890
VITE_ADSENSE_SLOT_DASHBOARD_BOTTOM=0987654321
VITE_ADSENSE_SLOT_EDITOR_SIDEBAR=1122334455
VITE_ADSENSE_SLOT_SHARE_MIDDLE=2222222222
```

```tsx
// 컴포넌트에서 사용
<GoogleAdSense
  adSlot={import.meta.env.VITE_ADSENSE_SLOT_DASHBOARD_TOP}
  adFormat="horizontal"
  fullWidthResponsive={true}
/>
```

## 현재 구현된 광고 위치

1. **SharePage** (`/share/:token`)
   - 위치: 화면 높이의 1/3 지점
   - 형식: 가로형 배너
   - 슬롯 ID: 미지정 (자동 광고)

2. **EditorPage** (`/editor/:mapId`)
   - 위치: 화면 높이의 1/3 지점
   - 형식: 가로형 배너
   - 슬롯 ID: 미지정 (자동 광고)

## 문제 해결

### 광고가 표시되지 않는 경우
1. AdSense 계정이 승인되었는지 확인
2. 슬롯 ID가 올바른지 확인
3. 브라우저 콘솔에서 에러 확인
4. 광고 차단 확장 프로그램 비활성화
5. AdSense 대시보드에서 광고 단위 상태 확인

### 광고가 너무 느리게 로드되는 경우
1. 광고 스크립트가 `index.html`에 올바르게 로드되었는지 확인
2. 네트워크 탭에서 스크립트 로딩 상태 확인
3. 필요시 광고 로딩을 지연시키는 옵션 고려

## 참고 자료

- [Google AdSense 공식 문서](https://support.google.com/adsense/)
- [AdSense 광고 단위 생성 가이드](https://support.google.com/adsense/answer/9183563)
- [AdSense 정책](https://support.google.com/adsense/answer/48182)

