# 🚨 Map Loading 빠른 디버깅

## 즉시 확인 사항

### 1. **브라우저 콘솔 열기** (F12)

```javascript
// Console 탭에서 확인해야 할 로그:

✅ 정상:
🔄 Fetching maps... {}
✅ Maps fetched: { ok: true, data: { items: [...] } }
Dashboard - maps: [...]
Dashboard - isLoading: false
Dashboard - error: null

❌ 에러:
❌ Error fetching maps: {...}
Dashboard - error: {...}
```

### 2. **Network 탭 확인**

```
F12 → Network → XHR

GET http://localhost:8787/api/maps
Status: ???

✅ 200 OK → 정상
❌ 401 Unauthorized → 인증 문제
❌ 404 Not Found → Repository 없음
❌ 500 Server Error → Backend 에러
```

### 3. **Backend 터미널 확인**

```bash
# API 서버 터미널에서 확인:

✅ 정상:
📁 GitHubClient initialized for open-mindmap/dev-user
✅ Repository exists
✅ Listed 2 branches
✅ Fetched 2 maps

❌ 에러:
❌ Repository not found
❌ GitHub API error
❌ Redis connection failed
```

## 🔧 즉시 해결 방법

### Case 1: "401 Unauthorized"

```bash
# 해결: 재로그인
1. Logout 클릭
2. Login 다시 클릭
3. Dashboard 다시 확인
```

### Case 2: "404 Repository not found"

```bash
# 해결: 첫 맵 생성
1. "+ Create New Map" 클릭
2. 노드 하나 추가
3. "💾 Save" 클릭
4. Repository 자동 생성됨
5. Dashboard로 돌아오면 맵 표시
```

### Case 3: "CORS Error"

```bash
# 해결: CORS 설정 확인
cd api
grep CORS_ORIGIN .env

# 없으면 추가:
echo "CORS_ORIGIN=http://localhost:5173" >> .env

# API 서버 재시작
npm run dev
```

### Case 4: "Network Error"

```bash
# 해결: API 서버 확인
curl http://localhost:8787/api/health

# 응답 없으면 API 서버 재시작:
cd api
npm run dev
```

## 🎯 3초 체크

```bash
# 1. Redis 실행 중?
redis-cli ping
# → PONG ✅

# 2. API 서버 실행 중?
curl http://localhost:8787/api/health
# → {"ok":true} ✅

# 3. Frontend 서버 실행 중?
curl http://localhost:5173
# → HTML 응답 ✅

# 모두 OK면 브라우저 새로고침!
```

## 📱 빠른 명령어

```bash
# 모두 한번에 시작
brew services start redis && \
cd api && npm run dev & \
cd frontend && npm run dev &

# 브라우저
open http://localhost:5173
```

## 🔍 현재 상태 확인

```javascript
// 브라우저 Console에서 실행:

// 1. Auth 상태
console.log('Auth:', JSON.parse(localStorage.getItem('auth-storage')))

// 2. API 직접 호출
fetch('http://localhost:8787/api/maps', {
  headers: {
    'Authorization': 'Bearer ' + JSON.parse(localStorage.getItem('auth-storage')).state.token
  }
}).then(r => r.json()).then(console.log)

// 3. DEV_MODE 확인
console.log('DEV_MODE:', import.meta.env.VITE_DEV_MODE)
```

이제 브라우저를 **새로고침**하고 콘솔을 확인하세요! 🔍

