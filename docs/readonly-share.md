# 🔗 Readonly Share Feature

## 개요

Open Mindmap의 읽기 전용 공유 기능을 통해 맵을 인증 없이 안전하게 공유할 수 있습니다.
공유 링크를 생성하면 누구나 해당 링크를 통해 맵을 읽기 전용으로 볼 수 있습니다.

## 🎯 핵심 개념

### **공유 토큰 기반 접근**
- 각 맵마다 고유한 공유 토큰 생성
- 토큰은 URL-safe base64 인코딩된 랜덤 문자열
- 예: `share_AbC123XyZ789`
- 토큰을 통해 맵에 읽기 전용 접근 권한 부여

### **공유 상태 관리**
- 공유 활성화/비활성화 가능
- 토큰 재생성 가능 (기존 링크 무효화)
- 만료 시간 설정 가능 (선택적)
- 공유 통계 추적 (조회수, 최근 접근 시간)

## 🔄 작동 방식

### **1. 공유 링크 생성**

```typescript
// POST /api/maps/:id/share
{
  "enabled": true,
  "expiresAt": "2025-12-31T23:59:59Z",  // Optional
  "allowEmbed": false,                   // Optional, default: false
  "password": "optional-password"        // Optional
}

// Response
{
  "ok": true,
  "data": {
    "shareToken": "share_AbC123XyZ789",
    "shareUrl": "https://mindmap.example.com/share/share_AbC123XyZ789",
    "expiresAt": "2025-12-31T23:59:59Z",
    "enabled": true,
    "createdAt": "2025-01-01T00:00:00Z"
  }
}
```

### **2. 공유 링크로 맵 조회**

```typescript
// GET /api/share/:token
// No authentication required

// Response
{
  "ok": true,
  "data": {
    "map": {
      "id": "map_1234567890",
      "title": "My Shared Map",
      "nodes": [...],
      "edges": [...],
      "viewState": {...}
    },
    "shareInfo": {
      "token": "share_AbC123XyZ789",
      "expiresAt": "2025-12-31T23:59:59Z",
      "readOnly": true
    }
  }
}
```

### **3. 공유 설정 업데이트**

```typescript
// PUT /api/maps/:id/share
{
  "enabled": false,  // 공유 비활성화
  // 또는
  "regenerateToken": true,  // 토큰 재생성
  // 또는
  "expiresAt": "2025-12-31T23:59:59Z"  // 만료 시간 변경
}
```

### **4. 공유 상태 조회**

```typescript
// GET /api/maps/:id/share
// Requires authentication (map owner only)

// Response
{
  "ok": true,
  "data": {
    "shareToken": "share_AbC123XyZ789",
    "shareUrl": "https://mindmap.example.com/share/share_AbC123XyZ789",
    "enabled": true,
    "expiresAt": "2025-12-31T23:59:59Z",
    "allowEmbed": false,
    "stats": {
      "viewCount": 42,
      "lastViewedAt": "2025-01-15T10:30:00Z"
    },
    "createdAt": "2025-01-01T00:00:00Z"
  }
}
```

## 🏗️ 아키텍처

### **데이터 저장 구조**

#### **Redis 캐시 (공유 토큰 → 맵 ID 매핑)**
```
Key: share:token:{shareToken}
Value: {
  mapId: "map_1234567890",
  userId: "user_123",
  enabled: true,
  expiresAt: "2025-12-31T23:59:59Z",
  allowEmbed: false,
  password: "hashed_password",  // Optional
  viewCount: 42,
  lastViewedAt: "2025-01-15T10:30:00Z",
  createdAt: "2025-01-01T00:00:00Z"
}
TTL: 만료 시간까지 (또는 무제한)
```

#### **GitHub 저장소 (메타데이터)**
```
Branch: maps/map_1234567890
└── map.json
    └── (기존 맵 데이터)

Main branch:
└── maps/
    └── index.json
        └── items[]
            └── [{
                "id": "map_1234567890",
                "shareToken": "share_AbC123XyZ789",  // 추가
                "shareEnabled": true,                // 추가
                ...
              }]
```

### **인증 및 권한**

```typescript
// 공유 링크 접근 (인증 불필요)
GET /api/share/:token
→ Redis에서 토큰 조회
→ 토큰이 유효하면 맵 데이터 반환 (읽기 전용)
→ 토큰이 만료되었거나 비활성화면 404/403

// 공유 설정 관리 (인증 필요)
POST/PUT/DELETE /api/maps/:id/share
→ requireAuth() 미들웨어로 소유자 확인
→ 맵 소유자만 공유 설정 변경 가능
```

## 📊 API 엔드포인트

### **공유 링크 생성/업데이트**

```
POST /api/maps/:id/share
PUT /api/maps/:id/share
```

**Request Body:**
```typescript
{
  enabled: boolean;           // 공유 활성화/비활성화
  expiresAt?: string;         // ISO 8601 날짜 (선택적)
  allowEmbed?: boolean;       // iframe 임베드 허용 (기본: false)
  regenerateToken?: boolean; // 토큰 재생성 (기존 링크 무효화)
  password?: string;         // 비밀번호 보호 (선택적, 해시 저장)
}
```

**Response:**
```typescript
{
  ok: boolean;
  data: {
    shareToken: string;
    shareUrl: string;
    enabled: boolean;
    expiresAt?: string;
    allowEmbed: boolean;
    createdAt: string;
  };
}
```

### **공유 링크로 맵 조회**

```
GET /api/share/:token
```

**Query Parameters:**
- `password`: 비밀번호가 설정된 경우 (선택적)

**Response:**
```typescript
{
  ok: boolean;
  data: {
    map: Map;  // 읽기 전용 맵 데이터
    shareInfo: {
      token: string;
      expiresAt?: string;
      readOnly: true;
    };
  };
}
```

### **공유 상태 조회**

```
GET /api/maps/:id/share
```

**Response:**
```typescript
{
  ok: boolean;
  data: {
    shareToken: string;
    shareUrl: string;
    enabled: boolean;
    expiresAt?: string;
    allowEmbed: boolean;
    passwordProtected: boolean;  // 비밀번호 설정 여부
    stats: {
      viewCount: number;
      lastViewedAt?: string;
    };
    createdAt: string;
  };
}
```

### **공유 비활성화/삭제**

```
DELETE /api/maps/:id/share
```

**Response:**
```typescript
{
  ok: true;
  data: {
    message: "Share disabled";
  };
}
```

## 🔐 보안 고려사항

### **토큰 생성**
- **알고리즘**: URL-safe base64 인코딩된 32바이트 랜덤 문자열
- **형식**: `share_{32자리 랜덤 문자열}`
- **예측 불가능성**: Cryptographically secure random 사용
- **충돌 방지**: Redis에서 기존 토큰 확인 후 재시도

### **접근 제어**
- **읽기 전용**: 공유 링크로는 맵 수정 불가
- **소유자 확인**: 공유 설정 변경은 맵 소유자만 가능
- **만료 시간**: 선택적 만료 시간으로 임시 공유 가능
- **비밀번호 보호**: 선택적 비밀번호 (bcrypt 해시 저장)

### **데이터 노출**
- **민감 정보**: 사용자 이메일, GitHub 저장소 정보 등은 공유 데이터에서 제외
- **메타데이터**: 맵 제목, 태그, 노드/엣지 데이터만 공유
- **임베드 제어**: `allowEmbed: false`로 iframe 임베드를 기본 차단

### **Rate Limiting**
- 공유 링크 조회: IP당 분당 60회 제한
- 공유 링크 생성: 사용자당 시간당 10회 제한

## 💾 데이터 저장 전략

### **Redis 구조**

```typescript
// 토큰 → 맵 정보 매핑
Key: share:token:{shareToken}
Value: JSON.stringify({
  mapId: string;
  userId: string;
  enabled: boolean;
  expiresAt?: string;
  allowEmbed: boolean;
  passwordHash?: string;  // bcrypt 해시
  viewCount: number;
  lastViewedAt?: string;
  createdAt: string;
})
TTL: expiresAt까지 또는 undefined (무제한)

// 맵 ID → 토큰 매핑 (역참조용)
Key: share:map:{mapId}
Value: shareToken
TTL: expiresAt까지 또는 undefined
```

### **Index.json 업데이트**

```typescript
// maps/index.json의 IndexItem에 추가
interface IndexItem {
  id: string;
  title: string;
  tags: string[];
  nodeCount: number;
  edgeCount: number;
  updatedAt: string;
  version: number;
  shareToken?: string;      // 공유 토큰 (있으면 공유 활성화)
  shareEnabled?: boolean;     // 공유 활성화 여부
}
```

## 🎨 프론트엔드 통합

### **공유 링크 생성 UI**

```typescript
// MapEditorPage.tsx 또는 MapSettings.tsx
const handleShare = async () => {
  const response = await apiClient.post(`/maps/${mapId}/share`, {
    enabled: true,
    allowEmbed: false,
    // expiresAt: optional
  });
  
  setShareUrl(response.data.shareUrl);
  setShareToken(response.data.shareToken);
};
```

### **공유 페이지 컴포넌트**

```typescript
// SharePage.tsx
const SharePage = () => {
  const { token } = useParams();
  const { data, isLoading } = useQuery({
    queryKey: ['shared-map', token],
    queryFn: () => apiClient.get(`/share/${token}`),
  });

  if (isLoading) return <Loading />;
  if (!data?.ok) return <NotFound />;

  return (
    <ReadOnlyMapViewer 
      map={data.data.map}
      readOnly={true}
    />
  );
};
```

### **공유 설정 모달**

```typescript
// ShareSettingsModal.tsx
- 공유 링크 생성/비활성화 토글
- 링크 복사 버튼
- 만료 시간 설정 (선택적)
- 임베드 허용 토글
- 비밀번호 설정 (선택적)
- 조회수 통계 표시
- 토큰 재생성 버튼
```

## 🔄 구현 단계

### **Phase 1: 기본 공유 기능**
1. 공유 토큰 생성 로직
2. Redis 캐시 구조 설계
3. 공유 링크 생성 API (`POST /api/maps/:id/share`)
4. 공유 링크 조회 API (`GET /api/share/:token`)
5. 공유 상태 조회 API (`GET /api/maps/:id/share`)

### **Phase 2: 고급 기능**
1. 만료 시간 설정
2. 토큰 재생성
3. 공유 통계 추적
4. 비밀번호 보호

### **Phase 3: 프론트엔드 통합**
1. 공유 설정 UI
2. 공유 페이지 (`/share/:token`)
3. 읽기 전용 맵 뷰어
4. 공유 링크 복사 기능

### **Phase 4: 보안 강화**
1. Rate limiting
2. IP 기반 추적 (선택적)
3. 임베드 제어
4. 보안 헤더 설정

## 📈 사용 시나리오

### **시나리오 1: 프레젠테이션 공유**
1. 맵 소유자가 공유 링크 생성
2. 만료 시간을 프레젠테이션 날짜로 설정
3. 링크를 참석자들에게 공유
4. 프레젠테이션 후 자동 만료

### **시나리오 2: 지속적인 문서 공유**
1. 공유 링크 생성 (만료 시간 없음)
2. 문서나 웹사이트에 링크 또는 iframe 임베드
3. 독자들이 인증 없이 맵 조회

### **시나리오 3: 비밀번호 보호된 공유**
1. 공유 링크 생성 시 비밀번호 설정
2. 링크 공유 (비밀번호는 별도로 전달)
3. 접근 시 비밀번호 입력 요구

### **시나리오 4: 공유 링크 무효화**
1. 맵 소유자가 토큰 재생성
2. 기존 공유 링크 자동 무효화
3. 새 링크 생성

## 🚨 에러 처리

### **에러 코드**

```typescript
// SHARE_404_NOT_FOUND
// 공유 토큰이 존재하지 않음
{
  ok: false;
  error: {
    code: "SHARE_404_NOT_FOUND",
    message: "Share token not found"
  };
}

// SHARE_403_EXPIRED
// 공유 링크가 만료됨
{
  ok: false;
  error: {
    code: "SHARE_403_EXPIRED",
    message: "Share link has expired"
  };
}

// SHARE_403_DISABLED
// 공유가 비활성화됨
{
  ok: false;
  error: {
    code: "SHARE_403_DISABLED",
    message: "Share is disabled"
  };
}

// SHARE_401_PASSWORD_REQUIRED
// 비밀번호가 필요함
{
  ok: false;
  error: {
    code: "SHARE_401_PASSWORD_REQUIRED",
    message: "Password required"
  };
}

// SHARE_401_PASSWORD_INVALID
// 비밀번호가 잘못됨
{
  ok: false;
  error: {
    code: "SHARE_401_PASSWORD_INVALID",
    message: "Invalid password"
  };
}
```

## 🎯 결론

읽기 전용 공유 기능은:
- ✅ 인증 없이 안전한 맵 공유
- ✅ 만료 시간 및 비밀번호 보호 옵션
- ✅ 읽기 전용 접근으로 데이터 보호
- ✅ 통계 추적으로 공유 효과 측정
- ✅ 간단한 API로 쉬운 통합

이는 Open Mindmap을 협업 및 프레젠테이션 도구로 확장하는 중요한 기능입니다.

