# 이미지 복사/붙여넣기 코드 리뷰

**작성일**: 2024-12-19  
**리뷰 대상**: `frontend/src/components/MindMapCanvas.tsx` (이미지 붙여넣기 기능)

## 📋 개요

현재 구현된 이미지 복사/붙여넣기 기능의 코드 품질, 성능, 사용자 경험, 보안 등을 종합적으로 검토하고 개선 사항을 제안합니다.

## ✅ 잘 구현된 부분

### 1. 기본 기능 구현
- ✅ 클립보드 이미지 감지 및 검증이 잘 구현됨
- ✅ 업로드 중 로딩 인디케이터 표시
- ✅ 이미지 크기에 맞춰 노드 크기 자동 조정
- ✅ 편집 모드 감지로 텍스트 편집 중에는 이미지 붙여넣기 무시

### 2. 에러 처리
- ✅ try-catch 블록으로 에러 처리
- ✅ 파일 크기 및 형식 검증
- ✅ 업로드 실패 시 finally 블록에서 상태 초기화

### 3. 사용자 경험
- ✅ 마우스 위치 기반 노드 배치
- ✅ 이미지 비율 유지하며 크기 조정
- ✅ 자동 노드 선택으로 즉시 피드백

## 🔍 개선 필요 사항

### 1. 🔴 높은 우선순위 (Critical)

#### 1.1 중복 코드 제거
**문제**: `uploadImageFile` 함수가 `EmbedDialog.tsx`와 거의 동일한 로직을 중복 구현하고 있습니다.

```typescript
// 현재: MindMapCanvas.tsx와 EmbedDialog.tsx에 동일한 로직
const uploadImageFile = async (file: File): Promise<string> => {
  // ... auth token 가져오기
  // ... FormData 생성
  // ... fetch 업로드
}
```

**개선 방안**:
- 공통 업로드 유틸 함수 생성 (`frontend/src/utils/upload.ts`)
- API 클라이언트에 업로드 메서드 추가 (`frontend/src/api/upload.ts`)

```typescript
// frontend/src/utils/upload.ts
export async function uploadFile(file: File, mapId: string): Promise<string> {
  const auth = localStorage.getItem('auth-storage');
  let authToken = null;
  if (auth) {
    try {
      const { token } = JSON.parse(auth).state;
      authToken = token;
    } catch (e) {
      console.error('Failed to parse auth storage:', e);
    }
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('mapId', mapId);

  const headers: HeadersInit = {};
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8787';
  const response = await fetch(`${apiUrl}/upload`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Upload failed: ${response.status} ${errorText}`);
  }

  const result = await response.json();
  return result.url;
}
```

#### 1.2 에러 UI 개선
**문제**: `alert()` 사용은 사용자 경험이 좋지 않고, 접근성에도 문제가 있습니다.

```typescript
// 현재
alert(error instanceof Error ? error.message : '이미지 붙여넣기에 실패했습니다.');
```

**개선 방안**:
- 토스트 메시지 시스템 도입 (기존에 있다면 활용)
- 에러 타입에 따른 적절한 메시지 표시

```typescript
// 개선안
import { toast } from 'sonner'; // 또는 기존 토스트 시스템

catch (error) {
  console.error('❌ Failed to paste image:', error);
  
  let errorMessage = '이미지 붙여넣기에 실패했습니다.';
  if (error instanceof Error) {
    if (error.message.includes('Unsupported image type')) {
      errorMessage = '지원하지 않는 이미지 형식입니다.';
    } else if (error.message.includes('too large')) {
      errorMessage = '이미지 크기가 너무 큽니다. (최대 10MB)';
    } else if (error.message.includes('network') || error.message.includes('fetch')) {
      errorMessage = '네트워크 오류가 발생했습니다. 다시 시도해주세요.';
    } else {
      errorMessage = error.message;
    }
  }
  
  toast.error(errorMessage);
}
```

#### 1.3 이미지 로드 타임아웃 처리
**문제**: 이미지 로드 시 타임아웃이 없어 무한 대기 가능성이 있습니다.

```typescript
// 현재
const imageDimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve({ width: img.width, height: img.height });
  img.onerror = reject;
  img.src = imageUrl;
});
```

**개선 방안**:
- 타임아웃 추가 (5초)
- 에러 처리 개선

```typescript
const imageDimensions = await Promise.race([
  new Promise<{ width: number; height: number }>((resolve, reject) => {
    const img = new Image();
    const timeoutId = setTimeout(() => {
      reject(new Error('Image load timeout'));
    }, 5000);
    
    img.onload = () => {
      clearTimeout(timeoutId);
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = (e) => {
      clearTimeout(timeoutId);
      reject(new Error('Failed to load image'));
    };
    img.src = imageUrl;
  }),
]);
```

### 2. 🟡 중간 우선순위 (Important)

#### 2.1 상수 정의
**문제**: 매직 넘버들이 하드코딩되어 있습니다.

```typescript
// 현재
const maxSize = 10 * 1024 * 1024; // 10MB
const maxDimension = 600;
nodeWidth = Math.max(nodeWidth, 200);
nodeHeight = Math.max(nodeHeight, 150);
```

**개선 방안**:
```typescript
// 상수 정의
const IMAGE_UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_NODE_DIMENSION: 600,
  MIN_NODE_WIDTH: 200,
  MIN_NODE_HEIGHT: 150,
  IMAGE_LOAD_TIMEOUT: 5000, // 5 seconds
  ALLOWED_IMAGE_TYPES: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/bmp',
  ] as const,
} as const;
```

#### 2.2 메모리 관리
**문제**: Image 객체나 Blob URL 정리가 명시적이지 않습니다.

**개선 방안**:
- 필요시 URL.revokeObjectURL 호출
- 컴포넌트 언마운트 시 정리

#### 2.3 마우스 위치 추적 최적화
**문제**: `handleMouseMove`에서 매번 `setLastMousePosition`를 호출합니다.

```typescript
// 현재
const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
  const svgCoords = screenToSVG(e.clientX, e.clientY);
  setLastMousePosition({ x: e.clientX, y: e.clientY });
  // ...
};
```

**개선 방안**:
- throttle/debounce 적용 (선택사항)
- 또는 paste 이벤트에서만 필요할 때 업데이트

#### 2.4 파일명 처리 개선
**문제**: `file.name`이 없을 때 기본값 "Image"가 한글이 아닐 수 있습니다.

```typescript
// 현재
label: file.name || 'Image',
```

**개선 방안**:
```typescript
// 개선안
label: file.name || t('editor.imageNode.defaultName', 'Image'),
// 또는
label: file.name || '이미지',
```

### 3. 🟢 낮은 우선순위 (Nice to Have)

#### 3.1 진행률 표시
**문제**: 대용량 이미지 업로드 시 진행률이 표시되지 않습니다.

**개선 방안**:
- `XMLHttpRequest` 사용하여 진행률 추적
- 또는 `fetch`의 `ReadableStream` 사용

```typescript
// 예시: 진행률 추적
const xhr = new XMLHttpRequest();
xhr.upload.addEventListener('progress', (e) => {
  if (e.lengthComputable) {
    const progress = (e.loaded / e.total) * 100;
    setUploadProgress(progress);
  }
});
```

#### 3.2 다중 이미지 지원
**문제**: 현재는 한 번에 하나의 이미지만 처리합니다.

**개선 방안**:
```typescript
// 여러 이미지 처리
const imageItems = items.filter(item => item.type.startsWith('image/'));
if (imageItems.length > 1) {
  // 순차 또는 병렬 업로드
}
```

#### 3.3 드래그 앤 드롭 지원
**문제**: 현재는 붙여넣기만 지원합니다.

**개선 방안**:
- `onDrop` 이벤트 핸들러 추가
- Phase 3에 포함될 예정

#### 3.4 업로드 취소 기능
**문제**: 업로드 중 취소할 수 없습니다.

**개선 방안**:
- AbortController 사용
- 취소 버튼 추가

```typescript
const abortController = useRef<AbortController | null>(null);

const handlePaste = async (e: React.ClipboardEvent<SVGSVGElement>) => {
  abortController.current = new AbortController();
  
  // fetch에 signal 추가
  const response = await fetch(`${apiUrl}/upload`, {
    method: 'POST',
    headers,
    body: formData,
    signal: abortController.current.signal,
  });
  
  // 취소 버튼 클릭 시
  abortController.current.abort();
};
```

## 📊 코드 품질 점수

| 항목 | 점수 | 평가 |
|------|------|------|
| 기능 완성도 | 9/10 | ✅ 기본 기능 잘 구현됨 |
| 에러 처리 | 6/10 | ⚠️ alert 사용, 타임아웃 부재 |
| 코드 재사용성 | 5/10 | ⚠️ 중복 코드 존재 |
| 성능 | 7/10 | ⚠️ 최적화 여지 있음 |
| 사용자 경험 | 7/10 | ⚠️ 에러 피드백 개선 필요 |
| 타입 안정성 | 8/10 | ✅ TypeScript 잘 활용됨 |
| 메모리 관리 | 7/10 | ⚠️ 정리 로직 명시 필요 |
| **종합 점수** | **7.1/10** | ✅ 양호, 개선 필요 |

## 🎯 우선순위별 개선 계획

### Phase 1: 즉시 개선 (1-2일)
1. ✅ 중복 코드 제거 (공통 업로드 함수)
2. ✅ 에러 UI 개선 (토스트 메시지)
3. ✅ 이미지 로드 타임아웃 추가
4. ✅ 상수 정의

### Phase 2: 단기 개선 (3-5일)
1. ✅ 파일명 i18n 지원
2. ✅ 메모리 관리 개선
3. ✅ 마우스 위치 추적 최적화
4. ✅ 진행률 표시 (대용량 이미지용)

### Phase 3: 장기 개선 (1-2주)
1. ✅ 다중 이미지 지원
2. ✅ 업로드 취소 기능
3. ✅ 드래그 앤 드롭 지원
4. ✅ 이미지 최적화 (클라이언트 사이드 리사이징)

## 🔒 보안 고려사항

### 현재 구현의 보안 상태
- ✅ 파일 타입 검증 수행
- ✅ 파일 크기 제한
- ✅ 인증 토큰 사용

### 추가 권장 사항
- ⚠️ 파일명 sanitization (경로 탐색 공격 방지)
- ⚠️ 이미지 메타데이터 제거 (EXIF 데이터 보안)
- ⚠️ CORS 설정 확인

```typescript
// 파일명 sanitization 예시
const sanitizeFileName = (fileName: string): string => {
  return fileName
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/^\.+/, '')
    .substring(0, 255);
};
```

## 🧪 테스트 권장 사항

### 단위 테스트
- [ ] `uploadImageFile` 함수 테스트
- [ ] 이미지 크기 계산 로직 테스트
- [ ] 에러 케이스 테스트

### 통합 테스트
- [ ] 붙여넣기 플로우 전체 테스트
- [ ] 다양한 이미지 형식 테스트
- [ ] 네트워크 오류 시나리오 테스트

### E2E 테스트
- [ ] 실제 브라우저에서 붙여넣기 테스트
- [ ] 다양한 브라우저 호환성 테스트
- [ ] 스크린샷 붙여넣기 테스트

## 📝 참고사항

### 브라우저 호환성
- ✅ Chrome/Edge: Clipboard API 완벽 지원
- ✅ Firefox: Clipboard API 지원 (일부 제한)
- ⚠️ Safari: 이전 버전에서는 제한적 지원
- ⚠️ Mobile: 일부 모바일 브라우저에서 제한적

### 성능 최적화 팁
1. **이미지 리사이징**: 클라이언트에서 리사이징하여 업로드 크기 감소
2. **Web Workers**: 대용량 이미지 처리를 Web Worker로 이동
3. **Lazy Loading**: 이미지 노드 렌더링 시 lazy loading 적용

## ✅ 결론

현재 구현은 기본 기능이 잘 작동하며, 사용자 경험도 양호합니다. 다만 다음과 같은 개선이 필요합니다:

1. **즉시 개선**: 중복 코드 제거, 에러 UI 개선, 타임아웃 처리
2. **단기 개선**: 상수 정의, 메모리 관리, i18n 지원
3. **장기 개선**: 다중 이미지, 진행률 표시, 업로드 취소

전체적으로 **7.1/10점**으로 평가되며, 개선 후 **9/10점** 이상 달성 가능합니다.

