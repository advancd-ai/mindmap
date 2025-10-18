# 🛠️ Development Mode Guide

## 개요

`DEV_MODE`는 개발 중 Google OAuth를 우회하여 빠르게 테스트할 수 있게 해주는 기능입니다.

## 🔧 설정 방법

### Backend (API)

`api/.env`:
```bash
DEV_MODE=true
```

### Frontend

`frontend/.env.local`:
```bash
VITE_DEV_MODE=true
```

## 📝 개발용 로그인 결과 코드

### Backend Response (`api/src/routes/auth.ts`)

#### **GET /api/auth/google (DEV_MODE=true)**

```typescript
// Request
GET http://localhost:8787/api/auth/google

// Response (200 OK)
{
  "ok": true,
  "message": "Development mode: Auth bypassed",
  "token": "dev_token_xxxxxxxxxx",  // Random 16-char token
  "user": {
    "userId": "dev_user_123",
    "email": "dev-user@example.com",
    "name": "Dev User",
    "picture": undefined  // Optional
  }
}
```

#### **GET /api/auth/me (DEV_MODE=true)**

```typescript
// Request
GET http://localhost:8787/api/auth/me
Authorization: Bearer dev_token_12345

// Response (200 OK)
{
  "ok": true,
  "data": {
    "userId": "dev_user_123",
    "email": "dev-user@example.com",
    "name": "Dev User"
  }
}
```

### Frontend Mock User (`frontend/src/store/auth.ts`)

#### **Initial State (VITE_DEV_MODE=true)**

```typescript
// Auto-login with mock user
const initialState = {
  token: 'dev_token_12345',
  user: {
    userId: 'dev_user_123',
    email: 'dev-user@example.com',
    name: 'Dev User',
    picture: 'https://example.com/dev-avatar.png'
  },
  isAuthenticated: true
}
```

#### **Login Function (VITE_DEV_MODE=true)**

```typescript
// pages/LoginPage.tsx
const handleLogin = () => {
  if (isDev) {
    login('dev_token_12345', {
      userId: 'dev_user_123',
      email: 'dev-user@example.com',
      name: 'Dev User',
    });
    navigate('/dashboard');
    return;
  }
  
  // Production: Redirect to Google OAuth
  window.location.href = '/api/auth/google';
}
```

### Middleware Mock User (`api/src/middleware/auth.ts`)

#### **requireAuth() Middleware (DEV_MODE=true)**

```typescript
// All authenticated routes bypass auth in dev mode
if (process.env.DEV_MODE === 'true') {
  const devUser: User = {
    userId: 'dev_user_123',
    email: 'dev-user@example.com',
    name: 'Dev User',
  };
  c.set('user', devUser);
  await next();
  return;
}
```

## 🔄 전체 흐름

### **DEV_MODE=true (개발 모드)**

```
┌──────────────┐
│  Frontend    │
│  Loads       │
└──────┬───────┘
       │
       ├─ VITE_DEV_MODE=true 감지
       │
       ├─ Auto-login:
       │  token: 'dev_token_12345'
       │  user: { email: 'dev-user@example.com' }
       │
       └─ Navigate to /dashboard
          ↓
┌──────────────┐
│  Dashboard   │
│  Page        │
└──────┬───────┘
       │
       ├─ API Call: GET /api/maps
       │  Authorization: Bearer dev_token_12345
       │
       ↓
┌──────────────┐
│  API Server  │
│  Middleware  │
└──────┬───────┘
       │
       ├─ DEV_MODE=true 감지
       │
       ├─ Mock user 자동 설정:
       │  c.set('user', devUser)
       │
       └─ API 처리 계속
          ↓
┌──────────────┐
│  GitHub      │
│  Operations  │
└──────────────┘
       │
       └─ Repository: open-mindmap/dev-user
          Branch: maps/map_xxx
```

### **DEV_MODE=false (프로덕션 모드)**

```
┌──────────────┐
│  Frontend    │
│  Login       │
└──────┬───────┘
       │
       └─ "Sign in with Google" 클릭
          window.location.href = '/api/auth/google'
          ↓
┌──────────────┐
│  API Server  │
│  /auth/google│
└──────┬───────┘
       │
       └─ Redirect to Google OAuth
          ↓
┌──────────────┐
│  Google      │
│  OAuth       │
└──────┬───────┘
       │
       ├─ User grants permission
       │
       └─ Redirect to /api/auth/google/callback?code=xxx&state=yyy
          ↓
┌──────────────┐
│  API Server  │
│  /callback   │
└──────┬───────┘
       │
       ├─ Exchange code for token
       │
       ├─ Fetch user info from Google
       │
       ├─ Create session in Redis
       │
       └─ Redirect to frontend with token
          ↓
┌──────────────┐
│  Frontend    │
│  /auth/callback?token=xxx
└──────┬───────┘
       │
       ├─ Store token
       │
       └─ Navigate to /dashboard
```

## 📊 Mock User 정보

### **Backend (API)**

```typescript
// api/src/routes/auth.ts
const devUser: User = {
  userId: 'dev_user_123',
  email: 'dev-user@example.com',
  name: 'Dev User',
  picture: undefined  // Optional
}

// Session Token
const devToken = 'dev_token_' + nanoid(16)
// 예: 'dev_token_a1b2c3d4e5f6g7h8'

// Redis Storage
Key: session:dev_token_a1b2c3d4e5f6g7h8
Value: {"userId":"dev_user_123","email":"dev-user@example.com","name":"Dev User"}
TTL: 86400 seconds (24 hours)
```

### **Frontend**

```typescript
// frontend/src/store/auth.ts
const devUser = {
  userId: 'dev_user_123',
  email: 'dev-user@example.com',
  name: 'Dev User',
  picture: 'https://example.com/dev-avatar.png'
}

// Session Token
const devToken = 'dev_token_12345'

// localStorage
Key: auth-storage
Value: {
  "state": {
    "token": "dev_token_12345",
    "user": {...devUser},
    "isAuthenticated": true
  }
}
```

## 🧪 테스트 예제

### **1. API 직접 호출**

```bash
# Development Mode 활성화된 상태

# 1. Google OAuth 엔드포인트 (DEV_MODE)
curl http://localhost:8787/api/auth/google

# Response:
# {
#   "ok": true,
#   "message": "Development mode: Auth bypassed",
#   "token": "dev_token_xyz123abc456",
#   "user": {
#     "userId": "dev_user_123",
#     "email": "dev-user@example.com",
#     "name": "Dev User"
#   }
# }

# 2. 현재 사용자 조회
curl http://localhost:8787/api/auth/me \
  -H "Authorization: Bearer dev_token_12345"

# Response:
# {
#   "ok": true,
#   "data": {
#     "userId": "dev_user_123",
#     "email": "dev-user@example.com",
#     "name": "Dev User"
#   }
# }

# 3. 맵 목록 조회 (인증 필요)
curl http://localhost:8787/api/maps \
  -H "Authorization: Bearer dev_token_12345"

# DEV_MODE=true면 토큰 없이도 동작:
curl http://localhost:8787/api/maps
```

### **2. Frontend 로그인 플로우**

```typescript
// 1. 페이지 로드
// VITE_DEV_MODE=true 확인
const isDev = import.meta.env.VITE_DEV_MODE === 'true'

// 2. Auto-login (auth store)
if (isDev) {
  // 자동으로 로그인 상태 설정
  token: 'dev_token_12345'
  user: { userId: 'dev_user_123', email: 'dev-user@example.com' }
  isAuthenticated: true
}

// 3. Dashboard로 자동 이동
navigate('/dashboard')
```

### **3. GitHub Repository 경로**

```typescript
// Dev User의 GitHub 경로
user.email = 'dev-user@example.com'
↓
getGitHubRepoPath(user)
↓
{
  owner: 'open-mindmap',      // GITHUB_ORG
  repo: 'dev-user'            // Email prefix
}
↓
GitHub Repository: open-mindmap/dev-user
Branch: maps/map_xxx
```

## 📋 환경변수 체크리스트

### **개발 환경 (로컬)**

```bash
# Backend (api/.env)
✅ DEV_MODE=true
✅ GITHUB_TOKEN=ghp_xxx
✅ GITHUB_ORG=open-mindmap
✅ REDIS_URL=redis://localhost:6379
✅ PORT=8787

# Frontend (frontend/.env.local)
✅ VITE_DEV_MODE=true
✅ VITE_API_URL=http://localhost:8787
```

### **프로덕션 환경**

```bash
# Backend (api/.env)
❌ DEV_MODE=false (or unset)
✅ GOOGLE_CLIENT_ID=...
✅ GOOGLE_CLIENT_SECRET=...
✅ GOOGLE_REDIRECT_URI=https://yourdomain.com/api/auth/google/callback
✅ GITHUB_TOKEN=ghp_xxx
✅ GITHUB_ORG=open-mindmap
✅ REDIS_URL=redis://...
✅ REDIS_PASSWORD=...

# Frontend (frontend/.env.production)
❌ VITE_DEV_MODE=false (or unset)
✅ VITE_API_URL=https://yourdomain.com
```

## 🎯 사용 시나리오

### **시나리오 1: 빠른 로컬 테스트**

```bash
# 1. 환경변수 설정
echo "DEV_MODE=true" >> api/.env
echo "VITE_DEV_MODE=true" >> frontend/.env.local

# 2. 서버 실행
cd api && npm run dev &
cd frontend && npm run dev &

# 3. 브라우저 접속
# http://localhost:5173
# → 자동 로그인 ✅
# → Dashboard 즉시 표시 ✅
```

### **시나리오 2: API만 테스트**

```bash
# Backend만 DEV_MODE
echo "DEV_MODE=true" >> api/.env
cd api && npm run dev

# Frontend는 일반 모드
# VITE_DEV_MODE=false (or unset)
cd frontend && npm run dev

# 결과:
# - Frontend: Google 로그인 화면 표시
# - API: 모든 요청에 mock user 자동 설정
```

### **시나리오 3: Frontend만 테스트**

```bash
# Frontend만 DEV_MODE
echo "VITE_DEV_MODE=true" >> frontend/.env.local

# Backend는 일반 모드
# DEV_MODE=false
cd api && npm run dev
cd frontend && npm run dev

# 결과:
# - Frontend: 자동 로그인, mock token 사용
# - API: 실제 인증 필요 (401 Unauthorized)
# ⚠️ 추천하지 않음 (충돌 발생)
```

## 🔍 디버깅

### **로그 확인**

#### **Backend Logs**

```bash
# DEV_MODE 활성화 시
[DEV] Development mode enabled - authentication bypassed

# Auth 엔드포인트 호출 시
GET /api/auth/google
→ Development mode: Auth bypassed
→ Token: dev_token_xyz123

# 모든 API 요청에 mock user 설정
📁 GitHubClient initialized for open-mindmap/dev-user
```

#### **Frontend Logs**

```javascript
// Browser Console
console.log('isDev:', import.meta.env.VITE_DEV_MODE)
// → isDev: true

// Auth Store
console.log('auth state:', useAuthStore.getState())
// → {
//     token: 'dev_token_12345',
//     user: { userId: 'dev_user_123', email: 'dev-user@example.com' },
//     isAuthenticated: true
//   }
```

### **브라우저 DevTools**

#### **Application → Local Storage**

```
Key: auth-storage
Value: {
  "state": {
    "token": "dev_token_12345",
    "user": {
      "userId": "dev_user_123",
      "email": "dev-user@example.com",
      "name": "Dev User",
      "picture": "https://example.com/dev-avatar.png"
    },
    "isAuthenticated": true,
    "_persist": {...}
  }
}
```

#### **Network → API Requests**

```
GET http://localhost:8787/api/maps
Request Headers:
  Authorization: Bearer dev_token_12345

Response: 200 OK
{
  "ok": true,
  "data": {
    "items": [...]
  }
}
```

## 🎨 UI에서 확인

### **로그인 페이지**

```
DEV_MODE=true인 경우:
- "Sign in with Google" 클릭
→ 즉시 Dashboard로 이동 (OAuth 화면 없음)
```

### **Dashboard**

```
우측 상단:
👤 Dev User  🌐 🇺🇸  [Logout]
```

### **Editor Footer**

```
좌측: 👤 dev-user@example.com
중앙: 🌐 Language
우측: 5 Nodes · 3 Edges · v1
```

## 📁 GitHub Repository

### **Dev User의 레포지토리**

```
Organization: open-mindmap
Repository: dev-user  (← email "dev-user@example.com")

Branches:
├── main
├── maps/map_1234567890
├── maps/map_9876543210
└── ...
```

### **맵 생성 시**

```
User: dev-user@example.com
↓
Repository: open-mindmap/dev-user
↓
Branch: maps/map_xxx
↓
File: map.json
```

## ⚙️ 코드 위치

### **Backend**

| 파일 | 위치 | 설명 |
|------|------|------|
| `routes/auth.ts` | Line 19-36 | `/auth/google` DEV_MODE 처리 |
| `middleware/auth.ts` | Line 20-28 | 모든 요청에 mock user 설정 |

### **Frontend**

| 파일 | 위치 | 설명 |
|------|------|------|
| `store/auth.ts` | Line 24-41 | Auto-login 초기 상태 |
| `pages/LoginPage.tsx` | Line 26-34 | 로그인 버튼 DEV_MODE 처리 |

## 🚨 주의사항

### **프로덕션에서는 절대 사용 금지**

```bash
# ❌ 프로덕션에서 이렇게 하지 마세요!
NODE_ENV=production
DEV_MODE=true  # ← 보안 위험!
```

### **DEV_MODE 비활성화**

```bash
# Backend
DEV_MODE=false  # 또는 주석 처리

# Frontend
VITE_DEV_MODE=false  # 또는 주석 처리
```

### **Git에 커밋하지 말 것**

```gitignore
# .gitignore
.env
.env.local
.env.production
```

## 🔐 보안 체크

### **개발 모드 확인**

```typescript
// Backend
if (process.env.NODE_ENV === 'production' && process.env.DEV_MODE === 'true') {
  console.error('⚠️ WARNING: DEV_MODE is enabled in production!');
  process.exit(1);
}

// Frontend
if (import.meta.env.PROD && import.meta.env.VITE_DEV_MODE === 'true') {
  console.error('⚠️ WARNING: DEV_MODE is enabled in production!');
}
```

## 📚 참고

### **Mock User 커스터마이징**

필요시 mock user 정보를 변경할 수 있습니다:

```typescript
// api/src/middleware/auth.ts
const devUser: User = {
  userId: 'custom_dev_user',
  email: 'myemail@test.com',  // ← 변경
  name: 'My Test User',       // ← 변경
  picture: 'https://...',     // ← 변경
};
```

→ GitHub Repository: `open-mindmap/myemail`

## 🎯 요약

### **개발 모드 활성화**

```bash
# Backend
DEV_MODE=true

# Frontend  
VITE_DEV_MODE=true
```

### **Mock User 정보**

```json
{
  "userId": "dev_user_123",
  "email": "dev-user@example.com",
  "name": "Dev User",
  "picture": "https://example.com/dev-avatar.png"
}
```

### **Mock Token**

```
Backend: dev_token_{random16chars}
Frontend: dev_token_12345
```

### **GitHub Repository**

```
open-mindmap/dev-user
```

이제 개발 모드를 활용하여 Google OAuth 없이도 빠르게 테스트할 수 있습니다! 🚀

