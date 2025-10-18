# 🐛 Map Loading 디버깅 가이드

## 문제: Map loading 기능 동작하지 않음

## 🔍 수정 사항

### 1. **Frontend 타입 불일치 수정**

**문제**: Backend의 `IndexItem`과 Frontend의 `MapListItem` 타입이 불일치

**수정**: `frontend/src/api/maps.ts`

```typescript
// Before
export interface MapListItem {
  id: string;
  title: string;
  tags: string[];
  updatedAt: string;
  commitSha: string;  // ❌ Backend에서 제공하지 않음
}

// After
export interface MapListItem {
  id: string;
  title: string;
  tags: string[];
  nodeCount: number;  // ✅ 추가
  edgeCount: number;  // ✅ 추가
  updatedAt: string;
  version: number;    // ✅ 추가
}
```

### 2. **에러 처리 및 로깅 추가**

**`frontend/src/api/maps.ts`**:

```typescript
export async function fetchMaps(query?: string): Promise<MapListItem[]> {
  try {
    const params = query ? { q: query } : {};
    console.log('🔄 Fetching maps...', params);
    
    const { data } = await apiClient.get('/maps', { params });
    console.log('✅ Maps fetched:', data);
    
    return data.data.items || [];  // Fallback to empty array
  } catch (error: any) {
    console.error('❌ Error fetching maps:', error.response?.data || error.message);
    throw error;
  }
}
```

### 3. **Dashboard 에러 표시**

**`frontend/src/pages/DashboardPage.tsx`**:

```typescript
const { data: maps, isLoading, error } = useQuery({
  queryKey: ['maps', searchQuery],
  queryFn: () => (searchQuery ? searchMaps(searchQuery) : fetchMaps()),
  onError: (err: any) => {
    console.error('❌ Query error:', err);
  },
});

// Debug logging
console.log('Dashboard - maps:', maps);
console.log('Dashboard - isLoading:', isLoading);
console.log('Dashboard - error:', error);
```

**UI 에러 표시**:
```tsx
{error && (
  <div className="error-state">
    <p>❌ Error loading maps</p>
    <pre>{JSON.stringify(error, null, 2)}</pre>
  </div>
)}
```

## 🧪 디버깅 단계

### **1. 브라우저 콘솔 확인**

```javascript
// F12 → Console

// 예상되는 로그:
🔄 Fetching maps... {}
✅ Maps fetched: {
  ok: true,
  data: {
    items: [
      {
        id: "map_xxx",
        title: "My Map",
        tags: [],
        nodeCount: 5,
        edgeCount: 3,
        updatedAt: "2025-...",
        version: 1
      }
    ],
    total: 1
  }
}

Dashboard - maps: [{...}]
Dashboard - isLoading: false
Dashboard - error: null
```

### **2. Network 탭 확인**

```
F12 → Network → Filter: XHR

GET http://localhost:8787/api/maps
Status: 200 OK

Response:
{
  "ok": true,
  "data": {
    "items": [...],
    "total": 1
  }
}
```

### **3. Backend 로그 확인**

```bash
# Terminal (API server)

📁 GitHubClient initialized for open-mindmap/dev-user
🔍 Fetching index from GitHub...
✅ Found 2 branches starting with 'maps/'
📖 Fetching map from branch: maps/map_1234567890
✅ Map fetched successfully
📖 Fetching map from branch: maps/map_9876543210
✅ Map fetched successfully
✅ Index created with 2 items
```

## 🔧 일반적인 문제와 해결

### **문제 1: "Repository not found"**

**증상**:
```javascript
❌ Error fetching maps: {
  "ok": false,
  "error": {
    "code": "GITHUB_404",
    "message": "Repository not found"
  }
}
```

**원인**: 
- Organization에 사용자 레포지토리가 없음
- 첫 맵을 아직 생성하지 않음

**해결**:
1. 맵을 하나라도 생성하면 자동으로 레포지토리 생성됨
2. 또는 GitHub에서 수동으로 레포지토리 생성:
   ```bash
   gh repo create open-mindmap/dev-user --private
   ```

### **문제 2: "Bad credentials"**

**증상**:
```javascript
❌ Error fetching maps: Bad credentials
```

**원인**: GitHub 토큰이 유효하지 않음

**해결**:
```bash
# 1. GitHub Token 확인
echo $GITHUB_TOKEN

# 2. Token 테스트
curl -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/user

# 3. 실패 시 새 토큰 생성
# GitHub Settings → Developer settings → Personal access tokens
```

### **문제 3: "No branches found"**

**증상**:
```javascript
✅ Maps fetched: {
  ok: true,
  data: {
    items: [],  // 빈 배열
    total: 0
  }
}
```

**원인**: 
- 레포지토리는 있지만 `maps/` 브랜치가 없음
- 아직 맵을 생성하지 않음

**해결**:
1. "+ Create New Map" 클릭
2. 맵 편집 후 저장
3. 브랜치 자동 생성됨

### **문제 4: "CORS Error"**

**증상**:
```javascript
Access to XMLHttpRequest at 'http://localhost:8787/api/maps' 
from origin 'http://localhost:5173' has been blocked by CORS policy
```

**원인**: Backend CORS 설정 문제

**해결**:
```bash
# api/.env
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
```

### **문제 5: "Unauthorized"**

**증상**:
```javascript
❌ Error fetching maps: 401 Unauthorized
```

**원인**: 
- Session token이 없거나 만료됨
- Redux에서 token이 제대로 전송되지 않음

**해결**:
```javascript
// 1. localStorage 확인
localStorage.getItem('auth-storage')

// 2. Token 확인
const { token } = JSON.parse(localStorage.getItem('auth-storage')).state

// 3. 재로그인
// Logout → Login
```

## 🧪 수동 테스트

### **API 직접 호출**

```bash
# 1. DEV_MODE로 토큰 없이 테스트
export DEV_MODE=true
curl http://localhost:8787/api/maps

# 2. 토큰 사용
export TOKEN="dev_token_12345"
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8787/api/maps

# 예상 응답:
{
  "ok": true,
  "data": {
    "items": [
      {
        "id": "map_1234567890",
        "title": "My First Map",
        "tags": ["test"],
        "nodeCount": 5,
        "edgeCount": 3,
        "updatedAt": "2025-10-12T...",
        "version": 1
      }
    ],
    "total": 1
  }
}
```

### **GitHub 직접 확인**

```bash
# 1. Repository 존재 확인
gh repo view open-mindmap/dev-user

# 2. Branch 목록 확인
gh api repos/open-mindmap/dev-user/branches | jq '.[].name'

# 예상 출력:
# "main"
# "maps/map_1234567890"
# "maps/map_9876543210"

# 3. 특정 브랜치의 map.json 확인
gh api repos/open-mindmap/dev-user/contents/map.json?ref=maps/map_1234567890
```

## 📊 정상 동작 플로우

```
1. Dashboard 페이지 로드
   ↓
2. useQuery 실행
   queryKey: ['maps', '']
   queryFn: fetchMaps()
   ↓
3. fetchMaps() 호출
   GET /api/maps
   ↓
4. Backend: mapsRouter.get('/')
   ↓
5. GitHubClient.getIndex()
   ↓
6. GitHub API:
   - repos.listBranches()
   - Filter "maps/"로 시작하는 브랜치
   - 각 브랜치에서 map.json 조회
   ↓
7. Response:
   {
     ok: true,
     data: {
       items: [...]
     }
   }
   ↓
8. Frontend: maps 상태 업데이트
   ↓
9. UI: 맵 카드 렌더링
```

## 🎯 빠른 체크리스트

### **Backend**
- [ ] Redis 실행 중: `redis-cli ping`
- [ ] API 서버 실행 중: `curl http://localhost:8787/api/health`
- [ ] GITHUB_TOKEN 설정: `echo $GITHUB_TOKEN`
- [ ] GITHUB_ORG 설정: `echo $GITHUB_ORG`
- [ ] DEV_MODE 설정 (선택): `echo $DEV_MODE`

### **Frontend**
- [ ] 서버 실행 중: `http://localhost:5173`
- [ ] 로그인 상태: localStorage `auth-storage` 확인
- [ ] Token 존재: Console에서 `localStorage.getItem('auth-storage')`
- [ ] API URL 설정: `.env.local`에 `VITE_API_URL=http://localhost:8787`

### **GitHub**
- [ ] Organization 존재: `https://github.com/open-mindmap`
- [ ] Repository 존재: `https://github.com/open-mindmap/dev-user`
- [ ] Branches 존재: Repository의 Branches 탭 확인
- [ ] Token 권한: `repo`, `read:org`

## 🚀 테스트 명령어

```bash
# 1. 모든 서비스 시작
brew services start redis
cd api && npm run dev &
cd frontend && npm run dev &

# 2. 브라우저 콘솔 열기
# http://localhost:5173
# F12 → Console

# 3. Dashboard 접속 후 로그 확인
# 🔄 Fetching maps...
# ✅ Maps fetched: {...}

# 4. 에러 발생 시 전체 에러 객체 확인
# ❌ Error fetching maps: {...}
```

## 📝 다음 단계

1. **브라우저 새로고침** (Cmd+Shift+R 또는 Ctrl+Shift+F5)
2. **Console 로그 확인**
3. **Network 탭에서 API 응답 확인**
4. **Backend 터미널에서 로그 확인**
5. **에러 메시지 복사하여 공유**

모든 로그가 정상적으로 표시되면 맵 loading이 정상 작동합니다! ✅

