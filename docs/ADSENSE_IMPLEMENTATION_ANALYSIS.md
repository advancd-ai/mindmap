# Google AdSense 광고 노출 기능 분석

## 개요

이 프로젝트는 Google AdSense를 사용하여 광고를 노출하는 기능을 구현하고 있습니다. 광고는 **SharePage**와 **EditorPage**에서 표시되며, 사용자 경험을 고려한 인터랙티브한 UI로 구현되어 있습니다.

## 아키텍처

### 1. 핵심 컴포넌트

#### `GoogleAdSense` 컴포넌트
- **위치**: `frontend/src/components/GoogleAdSense.tsx`
- **역할**: AdSense 광고를 렌더링하는 재사용 가능한 React 컴포넌트

**주요 기능:**
```typescript
interface GoogleAdSenseProps {
  adSlot?: string;                    // 광고 슬롯 ID (선택사항)
  adFormat?: 'auto' | 'rectangle' | 'vertical' | 'horizontal';  // 광고 형식
  fullWidthResponsive?: boolean;      // 반응형 전체 너비 여부
  style?: React.CSSProperties;        // 추가 스타일
  className?: string;                 // CSS 클래스
}
```

**구현 세부사항:**
1. 환경변수 `VITE_ADSENSE_ENABLED` 확인하여 활성화 여부 결정
2. 비활성화 시 `null` 반환 (렌더링하지 않음)
3. `useEffect`에서 `window.adsbygoogle` 배열을 초기화하고 푸시
4. `<ins>` 태그를 사용하여 AdSense 광고 요소 생성
5. `data-ad-client`: Publisher ID (`ca-pub-6929869719862616`)
6. `data-ad-slot`: 선택적 슬롯 ID
7. `data-ad-format`: 광고 형식 지정
8. `data-full-width-responsive`: 반응형 설정

### 2. 스크립트 로드

**위치**: `frontend/src/main.tsx`

```typescript
// Dynamically load AdSense script if enabled
if (isAdSenseEnabled()) {
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6929869719862616';
  script.crossOrigin = 'anonymous';
  document.head.appendChild(script);
}
```

- 환경변수 `VITE_ADSENSE_ENABLED`에 따라 동적으로 스크립트 로드
- 비활성화 시 스크립트를 로드하지 않아 성능 최적화
- Publisher ID가 URL에 포함됨

### 3. ads.txt 파일

**위치**: `frontend/public/ads.txt`

```
google.com, pub-6929869719862616, DIRECT, f08c47fec0942fa0
```

- Google AdSense 정책 준수를 위한 파일
- Publisher ID와 인증 정보 포함

## 페이지별 구현

### SharePage (`/share/:token`)

**위치**: `frontend/src/pages/SharePage.tsx`

**광고 표시 로직:**
1. **초기 상태**: `showAd = true` (페이지 로드 시 즉시 표시)
2. **자동 숨김**: 30초 후 자동으로 숨김
3. **카운트다운**: 30초부터 역순으로 카운트다운 표시
4. **수동 닫기**: 사용자가 클릭하여 닫을 수 있음

**상태 관리:**
```typescript
const [showAd, setShowAd] = useState(true);
const [adCountdown, setAdCountdown] = useState(30);
```

**카운트다운 로직:**
```typescript
useEffect(() => {
  if (map && data?.ok && showAd) {
    setAdCountdown(30);
    const interval = setInterval(() => {
      setAdCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setShowAd(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }
}, [map, data, showAd]);
```

**UI 구조:**
```
┌─────────────────────────────────────┐
│  ✨ 광고 배너 (클릭하여 닫기) [30]  │
├─────────────────────────────────────┤
│                                     │
│      Google AdSense 광고            │
│      (horizontal, responsive)       │
│                                     │
└─────────────────────────────────────┘
```

### EditorPage (`/editor/:mapId`)

**위치**: `frontend/src/pages/EditorPage.tsx`

**광고 표시 로직:**
1. **초기 상태**: `showAd = false` (기본적으로 숨김)
2. **트리거**: 저장 버튼 클릭 시 표시
3. **자동 숨김**: 10초 후 자동으로 숨김
4. **카운트다운**: 10초부터 역순으로 카운트다운 표시
5. **수동 닫기**: 사용자가 클릭하여 닫을 수 있음

**상태 관리:**
```typescript
const [showAd, setShowAd] = useState(false);
const [adCountdown, setAdCountdown] = useState(10);
```

**저장 버튼 클릭 핸들러:**
```typescript
onClick={() => {
  if (!isSaving) {
    canvasSaveHandlerRef.current?.();
    // Show ad when save button is clicked
    setShowAd(true);
    setAdCountdown(10);
  }
}}
```

**카운트다운 로직:**
```typescript
useEffect(() => {
  if (showAd) {
    setAdCountdown(10);
    const interval = setInterval(() => {
      setAdCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setShowAd(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }
}, [showAd]);
```

## UI/UX 디자인

### 광고 컨테이너 스타일

**공통 특징:**
- **위치**: 화면 높이의 1/3 지점에 중앙 정렬
- **애니메이션**: `slideDownFade` 애니메이션으로 부드럽게 등장
- **스타일**: 글래스모피즘 디자인 (backdrop-filter, blur 효과)
- **반응형**: 모바일에서도 적절히 표시

**광고 배너:**
- 그라데이션 배경 (파란색 → 초록색 → 보라색)
- 아이콘: ✨ (애니메이션 효과)
- 메시지: `t('share.adBanner')` (i18n 지원)
- 카운트다운: 원형 배지 형태

**광고 영역:**
- 둥근 모서리 (border-radius: 16px)
- 그림자 효과
- 반투명 배경
- 광고 클릭 허용 (`pointer-events: auto`)

### 인터랙션

1. **광고 클릭**: 광고 자체를 클릭하면 100ms 지연 후 컨테이너가 닫힘 (광고 클릭 이벤트가 먼저 처리되도록)
2. **컨테이너 클릭**: 광고 외부 영역 클릭 시 즉시 닫힘
3. **배너 클릭**: 광고 배너 클릭 시 닫힘 (이벤트 전파 방지)

**클릭 핸들링 로직:**
```typescript
// 광고 클릭 시 (100ms 지연 후 닫기)
<div
  style={{
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 10,
    pointerEvents: 'none'
  }}
  onClick={() => {
    setTimeout(() => {
      setShowAd(false);
      setAdCountdown(0);
    }, 100);
  }}
/>

// 컨테이너 클릭 시 (즉시 닫기)
<div 
  onClick={() => {
    setShowAd(false);
    setAdCountdown(0);
  }}
  style={{ cursor: 'pointer' }}
>
```

## 스타일링

### CSS 파일 구조

1. **GoogleAdSense.css**: 기본 광고 스타일
   - `.adsbygoogle` 기본 스타일
   - 반응형 컨테이너 클래스들
   - 모바일 대응

2. **EditorPage.css**: EditorPage 전용 광고 스타일
   - `.editor-ad-container`
   - `.editor-ad-banner`
   - `.editor-ad-icon`, `.editor-ad-message`, `.editor-ad-countdown`
   - 애니메이션 정의

3. **SharePage.css**: SharePage 전용 광고 스타일
   - `.share-ad-container`
   - `.share-ad-banner`
   - `.share-ad-icon`, `.share-ad-message`, `.share-ad-countdown`
   - 다크 모드 지원
   - 모바일 반응형

### 주요 스타일 특징

**글래스모피즘 효과:**
```css
backdrop-filter: blur(20px) saturate(180%);
-webkit-backdrop-filter: blur(20px) saturate(180%);
background: rgba(255, 255, 255, 0.95);
```

**애니메이션:**
- `slideDownFade`: 위에서 아래로 슬라이드하며 페이드인
- `iconFloat`: 아이콘 부유 효과
- `pulse`: 카운트다운 배지 펄스 효과

**반응형 디자인:**
```css
@media (max-width: 768px) {
  .share-ad-container {
    padding: 0 16px;
    top: 30%; /* 모바일에서 약간 위로 */
  }
}
```

## 광고 설정

### 현재 사용 중인 설정

- **Publisher ID**: `ca-pub-6929869719862616`
- **광고 형식**: `horizontal` (가로형 배너)
- **반응형**: `fullWidthResponsive={true}`
- **슬롯 ID**: 미지정 (자동 광고 모드)

### 광고 위치

1. **SharePage**: 
   - 화면 높이의 1/3 지점
   - 페이지 로드 시 즉시 표시
   - 30초 후 자동 숨김

2. **EditorPage**:
   - 화면 높이의 1/3 지점
   - 저장 버튼 클릭 시 표시
   - 10초 후 자동 숨김

## 사용자 경험 고려사항

### 장점

1. **비침투적**: 
   - EditorPage에서는 저장 시에만 표시
   - SharePage에서는 30초 후 자동 숨김
   - 사용자가 언제든지 닫을 수 있음

2. **시각적 피드백**:
   - 카운트다운으로 남은 시간 표시
   - 부드러운 애니메이션 효과
   - 현대적인 글래스모피즘 디자인

3. **반응형**:
   - 모바일과 데스크톱 모두 지원
   - 화면 크기에 맞게 자동 조정

### 개선 가능한 부분

1. **광고 슬롯 ID**: 현재는 자동 광고 모드를 사용하지만, 특정 슬롯 ID를 지정하면 더 나은 수익 최적화 가능
2. **A/B 테스트**: 광고 위치, 타이밍, 디자인에 대한 A/B 테스트 가능
3. **분석**: 광고 노출률, 클릭률, 수익 추적

## 기술적 세부사항

### AdSense 초기화 프로세스

1. **스크립트 로드**: `index.html`에서 AdSense 스크립트 비동기 로드
2. **컴포넌트 마운트**: `GoogleAdSense` 컴포넌트가 마운트될 때
3. **배열 초기화**: `window.adsbygoogle = window.adsbygoogle || []`
4. **푸시**: `window.adsbygoogle.push({})`로 광고 요청
5. **렌더링**: AdSense가 `<ins>` 요소를 감지하고 광고 삽입

### 에러 처리

```typescript
try {
  if (typeof window !== 'undefined') {
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  }
} catch (err) {
  console.error('AdSense error:', err);
}
```

## 정책 준수

1. **ads.txt 파일**: Publisher ID 인증
2. **클릭 유도 금지**: 광고 클릭을 직접 요청하지 않음
3. **적절한 배치**: 사용자 경험을 해치지 않는 위치에 배치
4. **명확한 표시**: 광고임을 명확히 표시 (배너 메시지)

## 환경변수 제어

### AdSense 활성화/비활성화

**환경변수**: `VITE_ADSENSE_ENABLED`

```bash
# 활성화 (기본값)
VITE_ADSENSE_ENABLED=true

# 비활성화
VITE_ADSENSE_ENABLED=false
```

**참고:** Vite에서는 클라이언트 측 환경변수에 `VITE_` 접두사가 필요합니다.

**지원되는 값:**
- 활성화: `true`, `1`, `yes`, `on`
- 비활성화: `false`, `0`, `no`, `off`
- 미설정 시 기본값: `true` (하위 호환성)

**구현 위치:**
- `frontend/src/utils/adsense.ts`: 환경변수 체크 유틸리티 함수
- `frontend/src/components/GoogleAdSense.tsx`: 컴포넌트 레벨 체크
- `frontend/src/pages/EditorPage.tsx`: 페이지 레벨 체크
- `frontend/src/pages/SharePage.tsx`: 페이지 레벨 체크
- `frontend/src/main.tsx`: 스크립트 동적 로드

**동작 방식:**
1. `main.tsx`에서 환경변수 확인 후 스크립트 동적 로드
2. 각 페이지에서 환경변수 확인 후 광고 컨테이너 렌더링 여부 결정
3. `GoogleAdSense` 컴포넌트에서도 환경변수 확인 후 `null` 반환

## 향후 개선 방향

1. **다중 광고 단위**: 페이지별로 다른 광고 단위 사용
2. **성능 최적화**: 광고 로딩 지연 옵션 추가
3. **분석 통합**: Google Analytics와 연동하여 광고 성과 추적
4. **사용자 설정**: 광고 표시 빈도 조절 옵션 제공

## 참고 자료

- [Google AdSense 공식 문서](https://support.google.com/adsense/)
- [AdSense 광고 단위 생성 가이드](https://support.google.com/adsense/answer/9183563)
- [AdSense 정책](https://support.google.com/adsense/answer/48182)
- 프로젝트 내 문서: `docs/GOOGLE_ADSENSE_SETUP.md`

