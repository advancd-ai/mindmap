# 이미지 다운로드 기능 코드 분석

## 개요

이 문서는 마인드맵 애플리케이션의 이미지 다운로드 기능에 대한 상세한 코드 분석을 제공합니다. 이 기능은 이미지를 GitHub에 업로드하고, 이후 브라우저에서 다운로드하거나 표시할 수 있게 합니다.

## 아키텍처

### 전체 플로우

```
1. 사용자가 이미지 업로드 (복사-붙여넣기 또는 파일 업로드)
   ↓
2. Frontend: 이미지를 Backend API로 업로드
   ↓
3. Backend: GitHub API를 통해 파일을 GitHub 저장소의 map branch에 저장
   ↓
4. Backend: 다운로드 URL 반환 (예: /upload/download/:mapId/:filename)
   ↓
5. Frontend: 이미지 노드 생성 시 다운로드 URL 사용
   ↓
6. Frontend: ImageDisplay 컴포넌트에서 이미지 다운로드 및 표시
```

## 백엔드 구현

### 1. 파일 업로드 엔드포인트

**파일**: `api/src/routes/upload.ts`

```typescript
upload.post('/', requireAuth(), async (c) => {
  // 1. FormData에서 파일과 mapId 추출
  const formData = await c.req.formData();
  const file = formData.get('file') as File;
  const mapId = formData.get('mapId') as string;
  
  // 2. 파일 타입 검증 (이미지 및 PDF만 허용)
  const allowedTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
    'image/webp', 'image/svg+xml', 'image/bmp', 'application/pdf'
  ];
  
  // 3. 파일 크기 검증 (최대 10MB)
  const maxSize = 10 * 1024 * 1024;
  
  // 4. 고유한 파일명 생성
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 8);
  const filename = `upload_${timestamp}_${randomId}.${extension}`;
  
  // 5. GitHub에 파일 업로드
  const fileUrl = await uploadFileToGitHub(user, mapId, filename, buffer, file.type);
  
  // 6. 다운로드 URL 반환
  return c.json({ url: fileUrl, filename, size: file.size, type: file.type });
});
```

**특징**:
- 인증 필수 (`requireAuth()`)
- 파일 타입 및 크기 검증
- 고유한 파일명 생성 (타임스탬프 + 랜덤 ID)
- GitHub API를 통한 파일 저장

### 2. 파일 다운로드 엔드포인트

**파일**: `api/src/routes/upload.ts` (line 128-219)

```typescript
upload.get('/download/:mapId/:filename', async (c) => {
  // 주의: 이 엔드포인트는 공개 접근 가능 (인증 불필요)
  // 이유: <img> 태그에서 직접 접근해야 하기 때문
  
  const mapId = c.req.param('mapId');
  const filename = c.req.param('filename');
  
  // 1. GitHub에서 파일 내용 가져오기
  const { data } = await octokit.repos.getContent({
    owner: process.env.GITHUB_OWNER || 'choonho',
    repo: process.env.GITHUB_REPO || 'guest',
    path: `files/${filename}`,
    ref: `maps/${mapId}`,  // map별 branch
  });
  
  // 2. Base64 디코딩
  const fileBuffer = Buffer.from(data.content, 'base64');
  
  // 3. 파일 확장자로 Content-Type 결정
  const extension = filename.split('.').pop()?.toLowerCase();
  let contentType = 'application/octet-stream';
  // ... switch문으로 다양한 이미지 타입 처리
  
  // 4. 적절한 헤더 설정
  c.header('Content-Type', contentType);
  c.header('Content-Length', fileBuffer.length.toString());
  c.header('Cache-Control', 'public, max-age=3600'); // 1시간 캐시
  c.header('Content-Disposition', `inline; filename="${filename}"`);
  
  // 5. 바이너리 데이터 반환
  return c.body(fileBuffer);
});
```

**주요 특징**:
- ✅ **공개 엔드포인트**: 인증 불필요 (이유: `<img>` 태그에서 직접 접근)
- ✅ **보안**: 파일은 mapId와 랜덤 파일명으로 식별 (obscurity 기반 보안)
- ✅ **캐싱**: 1시간 캐시 (`max-age=3600`)
- ✅ **Content-Type 자동 감지**: 파일 확장자 기반
- ✅ **GitHub 저장소 구조**: `maps/{mapId}/files/{filename}`

**지원 파일 타입**:
- 이미지: JPEG, PNG, GIF, WebP, SVG, BMP
- 문서: PDF

### 3. GitHub 파일 업로드 유틸리티

**파일**: `api/src/utils/github.ts`

```typescript
export async function uploadFileToGitHub(
  user: User,
  mapId: string,
  filename: string,
  content: Buffer,
  contentType: string
): Promise<string> {
  // 1. 저장소 경로 결정
  const { owner, repo } = getGitHubRepoPath(user);
  const branchName = `maps/${mapId}`;
  const path = `files/${filename}`;
  
  // 2. 파일을 base64로 인코딩
  const base64Content = content.toString('base64');
  
  // 3. GitHub API로 파일 업로드
  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message: `Upload file: ${filename}`,
    content: base64Content,
    branch: branchName,
  });
  
  // 4. 다운로드 URL 생성
  const apiUrl = process.env.API_URL || 'http://localhost:8787';
  return `${apiUrl}/upload/download/${mapId}/${filename}`;
}
```

**저장소 구조**:
```
{owner}/{repo}/
  └── maps/{mapId}/          # 각 맵별 브랜치
      ├── map.json           # 맵 데이터
      └── files/             # 업로드된 파일들
          └── upload_1234567890_abc123.png
```

## 프론트엔드 구현

### 1. ImageDisplay 컴포넌트

**파일**: `frontend/src/components/ImageDisplay.tsx`

이 컴포넌트는 이미지를 표시하고 다운로드 기능을 제공합니다.

#### 이미지 다운로드 및 표시

```typescript
useEffect(() => {
  const downloadAndDisplayImage = async () => {
    // 1. localStorage에서 인증 토큰 가져오기
    const auth = localStorage.getItem('auth-storage');
    let authToken = null;
    if (auth) {
      const { token } = JSON.parse(auth).state;
      authToken = token;
    }
    
    // 2. 인증 헤더와 함께 이미지 다운로드
    const response = await fetch(imageUrl, {
      mode: 'cors',
      credentials: 'omit',
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    });
    
    // 3. Blob으로 변환 후 Object URL 생성
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    setImageData(objectUrl);
    
    // 4. 컴포넌트 언마운트 시 Object URL 정리
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  };
  
  downloadAndDisplayImage();
}, [imageUrl, onError]);
```

**특징**:
- ✅ 인증 토큰을 localStorage에서 가져와 헤더에 포함
- ✅ Blob API를 사용하여 이미지 다운로드
- ✅ Object URL을 생성하여 로컬에서 표시
- ✅ 메모리 누수 방지를 위한 `URL.revokeObjectURL()` 호출
- ⚠️ **참고**: 다운로드 엔드포인트가 공개이므로 인증 토큰은 선택적

#### 로컬 파일 다운로드

```typescript
const handleDownload = async () => {
  // 1. 이미지 다운로드
  const response = await fetch(imageUrl, { headers });
  const blob = await response.blob();
  
  // 2. Object URL 생성
  const url = URL.createObjectURL(blob);
  
  // 3. 임시 <a> 태그 생성 및 클릭하여 다운로드
  const link = document.createElement('a');
  link.href = url;
  link.download = alt || 'image';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // 4. Object URL 정리
  URL.revokeObjectURL(url);
};
```

**특징**:
- ✅ 프로그래밍 방식으로 파일 다운로드 트리거
- ✅ `download` 속성을 사용하여 파일명 지정
- ✅ 메모리 정리 자동화

#### 전체 화면 열기

```typescript
const handleOpenFullPage = () => {
  // 인증 토큰이 있으면 인증 헤더와 함께 fetch
  // 그 후 Blob을 Object URL로 변환하여 새 창에서 열기
  fetch(imageUrl, {
    headers: { Authorization: `Bearer ${token}` }
  }).then(response => {
    response.blob().then(blob => {
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
    });
  });
};
```

**특징**:
- ✅ 새 창에서 이미지 열기
- ✅ 인증 토큰이 있을 경우 사용 (선택적)
- ✅ 보안을 위한 `noopener, noreferrer` 속성

### 2. 이미지 업로드 플로우

**파일**: `frontend/src/components/MindMapCanvas.tsx`

이미지 복사-붙여넣기 시:

```typescript
const handlePaste = async (e: ClipboardEvent) => {
  // 1. 클립보드에서 이미지 데이터 추출
  const items = Array.from(e.clipboardData.items);
  const imageItem = items.find(item => item.type.startsWith('image/'));
  
  if (imageItem) {
    const file = imageItem.getAsFile();
    
    // 2. FormData 생성 및 업로드
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mapId', map.id);
    
    // 3. Backend API로 업로드
    const response = await fetch(`${apiUrl}/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: formData,
    });
    
    const result = await response.json();
    const imageUrl = result.url;  // 예: /upload/download/{mapId}/{filename}
    
    // 4. 이미지 노드 생성
    const newNode = {
      id: `n_${Date.now()}`,
      embedUrl: imageUrl,
      embedType: 'image',
      // ...
    };
    
    addNode(newNode);
  }
};
```

## 보안 고려사항

### 현재 구현

1. **보안 방식**: Obscurity (은폐 기반)
   - 파일은 mapId와 랜덤 파일명으로 식별
   - URL만 알면 접근 가능 (예: `/upload/download/{mapId}/{filename}`)
   
2. **인증 불필요한 이유**:
   - `<img>` 태그에서 직접 접근해야 함
   - 브라우저가 자동으로 헤더를 추가하지 않음
   
3. **접근 제어 한계**:
   - mapId를 알면 해당 맵의 모든 파일에 접근 가능
   - 파일명을 예측하거나 목록을 얻을 수 있으면 접근 가능

### 개선 가능한 방안

1. **서명된 URL (Signed URLs)**:
   - 다운로드 URL에 만료 시간과 서명 추가
   - 예: `/upload/download/{mapId}/{filename}?expires={timestamp}&signature={hash}`

2. **토큰 기반 인증**:
   - 쿼리 파라미터로 임시 토큰 전달
   - 예: `/upload/download/{mapId}/{filename}?token={tempToken}`

3. **공유 맵의 경우**:
   - Share 기능과 연동하여 공유된 맵의 파일만 공개 접근
   - 맵 메타데이터에 공개 여부 플래그 추가

4. **파일 접근 로그**:
   - 다운로드 엔드포인트에 접근 로그 추가
   - 의심스러운 접근 패턴 감지

## 성능 고려사항

### 현재 구현

1. **캐싱**:
   - HTTP 헤더: `Cache-Control: public, max-age=3600` (1시간)
   - 브라우저가 이미지를 캐시하여 반복 요청 감소

2. **Blob 처리**:
   - `URL.createObjectURL()` 사용
   - 메모리 누수 방지를 위한 정리 로직 포함

3. **GitHub API 호출**:
   - 각 다운로드마다 GitHub API 호출
   - Base64 디코딩 오버헤드

### 개선 가능한 방안

1. **CDN 통합**:
   - GitHub 대신 CDN에 파일 저장
   - 전역 캐싱 및 빠른 다운로드 속도

2. **캐시 레이어**:
   - Redis나 메모리 캐시를 사용하여 파일 캐싱
   - GitHub API 호출 감소

3. **스트리밍**:
   - 대용량 파일의 경우 스트리밍 응답
   - 전체 파일을 메모리에 로드하지 않음

## 에러 처리

### 백엔드

```typescript
try {
  // 파일 다운로드 로직
} catch (error: any) {
  if (error.status === 404) {
    return c.json({ error: 'File not found' }, 404);
  }
  return c.json({ error: 'Failed to download file' }, 500);
}
```

### 프론트엔드

```typescript
try {
  const response = await fetch(imageUrl, { headers });
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }
  // 성공 처리
} catch (err) {
  console.error('❌ Failed to download image:', err);
  setError(true);
  onError();  // 상위 컴포넌트에 에러 알림
}
```

## 파일 저장 구조

```
GitHub 저장소 구조:
{owner}/{repo}/
  └── maps/
      ├── {mapId1}/
      │   ├── map.json
      │   └── files/
      │       ├── upload_1234567890_abc123.png
      │       ├── upload_1234567891_def456.jpg
      │       └── upload_1234567892_ghi789.pdf
      └── {mapId2}/
          ├── map.json
          └── files/
              └── upload_1234567893_jkl012.png
```

**특징**:
- 각 맵은 별도의 브랜치 (`maps/{mapId}`)
- 모든 파일은 `files/` 디렉토리에 저장
- 파일명: `upload_{timestamp}_{randomId}.{extension}`

## API 엔드포인트 요약

### 업로드
- **Method**: `POST`
- **Path**: `/upload`
- **Auth**: 필수 (Bearer token)
- **Request**: `FormData` (file, mapId)
- **Response**: `{ url, filename, size, type, mapId }`

### 다운로드
- **Method**: `GET`
- **Path**: `/upload/download/:mapId/:filename`
- **Auth**: 불필요 (공개 엔드포인트)
- **Response**: Binary file data
- **Headers**: 
  - `Content-Type`: 파일 타입 (image/jpeg, image/png 등)
  - `Content-Length`: 파일 크기 (bytes)
  - `Cache-Control`: `public, max-age=3600`
  - `Content-Disposition`: `inline; filename="{filename}"`

### 정보 조회
- **Method**: `GET`
- **Path**: `/upload/info`
- **Auth**: 필수
- **Response**: `{ maxFileSize, allowedTypes, userId }`

## 테스트 시나리오

### 정상 플로우
1. ✅ 이미지 복사 (클립보드)
2. ✅ 캔버스에 붙여넣기
3. ✅ 백엔드로 업로드 성공
4. ✅ 이미지 노드 생성 및 표시
5. ✅ 다운로드 버튼 클릭 시 파일 다운로드

### 에러 시나리오
1. ❌ 파일 타입이 허용되지 않음 → 400 에러
2. ❌ 파일 크기가 10MB 초과 → 400 에러
3. ❌ GitHub API 오류 → 500 에러
4. ❌ 파일을 찾을 수 없음 → 404 에러
5. ❌ 네트워크 오류 → 프론트엔드 에러 처리

## 개선 제안

### 단기 개선
1. **에러 메시지 개선**: 사용자 친화적인 에러 메시지
2. **로딩 인디케이터**: 업로드 중 진행 상황 표시
3. **다중 파일 업로드**: 여러 파일 동시 업로드 지원

### 중기 개선
1. **이미지 최적화**: 업로드 시 자동 리사이징/압축
2. **썸네일 생성**: 미리보기용 썸네일 자동 생성
3. **이미지 편집**: 회전, 크롭 등 기본 편집 기능

### 장기 개선
1. **CDN 통합**: CloudFront, Cloudflare 등 CDN 사용
2. **파일 관리 UI**: 업로드된 파일 목록 및 관리
3. **버전 관리**: 파일 업데이트 시 이전 버전 유지

## 결론

현재 이미지 다운로드 기능은 기본적인 요구사항을 충족하지만, 보안과 성능 측면에서 개선의 여지가 있습니다. 특히 공개 다운로드 엔드포인트는 보안 강화가 필요하며, 대용량 파일 처리와 캐싱 전략 개선이 성능 향상에 기여할 수 있습니다.
