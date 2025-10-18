# 🐛 Fetch된 Map Data 그리기 문제 디버깅

## 문제: fetch된 map data로 그리기가 동작하지 않음

## 🔍 수정 사항

### 1. **useQuery onSuccess 대신 useEffect 사용**

**문제**: React Query v4+에서 `onSuccess`가 deprecated됨

**수정**: `frontend/src/pages/EditorPage.tsx`

```typescript
// Before (동작하지 않음)
useQuery({
  queryKey: ['map', mapId],
  queryFn: () => fetchMap(mapId!),
  enabled: !!mapId,
  onSuccess: (data) => {  // ❌ Deprecated
    setMap(data);
    setIsNewMap(false);
  },
});

// After (동작함)
const { data: fetchedMap, isLoading: isFetchingMap, error: fetchError } = useQuery({
  queryKey: ['map', mapId],
  queryFn: () => fetchMap(mapId!),
  enabled: !!mapId,
});

useEffect(() => {
  if (fetchedMap && mapId) {
    console.log('📖 Map fetched, setting state:', fetchedMap);
    setMap(fetchedMap);
    setIsNewMap(false);
  }
}, [fetchedMap, mapId, setMap]);
```

### 2. **디버깅 로그 추가**

**EditorPage**:
```typescript
useEffect(() => {
  console.log('EditorPage state:', {
    mapId,
    hasMap: !!map,
    mapData: map,
    isFetchingMap,
    fetchError,
    isNewMap,
  });
}, [mapId, map, isFetchingMap, fetchError, isNewMap]);
```

**MindMapCanvas**:
```typescript
useEffect(() => {
  console.log('🎨 MindMapCanvas render:', {
    hasMap: !!map,
    nodeCount: map?.nodes.length,
    edgeCount: map?.edges.length,
    mapTitle: map?.title,
  });
}, [map]);
```

**MindMap Store**:
```typescript
setMap: (map) => {
  console.log('📝 Setting map in store:', map);
  set({ map, isDirty: false });
}
```

### 3. **로딩 상태 개선**

```typescript
if (isFetchingMap) {
  return <div className="loading-page">
    <p>Loading map...</p>
  </div>;
}

if (fetchError) {
  return <div className="loading-page">
    <p>❌ Error loading map</p>
    <pre>{JSON.stringify(fetchError, null, 2)}</pre>
    <button onClick={handleBack} className="button">
      ← Back
    </button>
  </div>;
}
```

## 🧪 디버깅 단계

### **Step 1: 브라우저 콘솔 열기**

```
F12 → Console 탭
```

### **Step 2: 기존 맵 클릭**

Dashboard에서 맵 카드 클릭 → Editor로 이동

### **Step 3: 콘솔 로그 확인**

**정상 동작 시:**
```javascript
// 1. API 호출
🔄 Fetching map: map_1234567890
✅ Map fetched: {
  data: {
    id: "map_1234567890",
    title: "My Map",
    nodes: [
      { id: "n_1", label: "Node 1", x: 100, y: 100, w: 150, h: 80 },
      { id: "n_2", label: "Node 2", x: 300, y: 200, w: 150, h: 80 }
    ],
    edges: [
      { id: "e_1", source: "n_1", target: "n_2" }
    ],
    updatedAt: "...",
    version: 1
  }
}

// 2. Store 업데이트
📖 Map fetched, setting state: { id: "map_1234567890", ... }
📝 Setting map in store: { id: "map_1234567890", ... }

// 3. EditorPage 상태
EditorPage state: {
  mapId: "map_1234567890",
  hasMap: true,
  mapData: { id: "map_1234567890", nodes: [...], edges: [...] },
  isFetchingMap: false,
  fetchError: null,
  isNewMap: false
}

// 4. Canvas 렌더링
🎨 MindMapCanvas render: {
  hasMap: true,
  nodeCount: 2,
  edgeCount: 1,
  mapTitle: "My Map"
}
🖼️ Rendering canvas with 2 nodes and 1 edges
```

**문제 있을 때:**
```javascript
// API 호출 실패
🔄 Fetching map: map_1234567890
❌ Error fetching map map_1234567890: 404 Not Found

// 또는 Store 업데이트 안됨
EditorPage state: {
  mapId: "map_1234567890",
  hasMap: false,  // ❌ 문제!
  mapData: null,
  isFetchingMap: false,
  fetchError: null,
  isNewMap: false
}

// 또는 Canvas가 렌더링 안됨
⚠️ MindMapCanvas: No map data available
```

## 🔧 문제별 해결

### **Case 1: API 호출 실패**

**증상**:
```javascript
❌ Error fetching map: 404 Not Found
```

**원인**: 
- 브랜치가 존재하지 않음
- Repository가 없음

**해결**:
```bash
# GitHub에서 확인
gh api repos/open-mindmap/dev-user/branches | jq '.[].name'

# 브랜치가 없으면:
# → Dashboard로 돌아가서 맵 목록 확인
# → 맵이 실제로 존재하는지 확인
```

### **Case 2: Store 업데이트 안됨**

**증상**:
```javascript
📖 Map fetched, setting state: {...}  // 이 로그는 있음
📝 Setting map in store: {...}        // 이 로그가 없음
```

**원인**: setMap 함수 호출 안됨

**해결**:
```javascript
// 브라우저 Console에서 직접 테스트
import { useMindMapStore } from './store/mindmap'
const setMap = useMindMapStore.getState().setMap
setMap({ id: 'test', title: 'Test', nodes: [], edges: [], updatedAt: new Date().toISOString(), version: 1 })
```

### **Case 3: Canvas 렌더링 안됨**

**증상**:
```javascript
EditorPage state: { hasMap: true, ... }  // Map은 있음
⚠️ MindMapCanvas: No map data available  // Canvas는 못받음
```

**원인**: Zustand store와 컴포넌트 연결 문제

**해결**:
```typescript
// MindMapCanvas에서 직접 확인
const map = useMindMapStore((state) => state.map);
console.log('Direct map from store:', map);
```

### **Case 4: 노드/엣지 0개**

**증상**:
```javascript
🖼️ Rendering canvas with 0 nodes and 0 edges
```

**원인**: 
- 실제로 빈 맵
- 데이터 파싱 문제

**해결**:
```javascript
// 콘솔에서 확인
console.log('Map nodes:', map.nodes)
console.log('Map edges:', map.edges)

// GitHub에서 직접 확인
gh api repos/open-mindmap/dev-user/contents/map.json?ref=maps/map_xxx | \
  jq -r '.content' | base64 -d | jq '.nodes'
```

## 🎯 정상 동작 플로우

```
1. Dashboard에서 맵 클릭
   navigate('/editor/map_1234567890')
   ↓
2. EditorPage 로드
   mapId = 'map_1234567890'
   ↓
3. useQuery 실행
   enabled: true (mapId 있음)
   ↓
4. fetchMap(mapId) 호출
   GET /api/maps/map_1234567890
   ↓
5. API 응답
   {
     ok: true,
     data: {
       id: "map_1234567890",
       title: "My Map",
       nodes: [...],
       edges: [...]
     }
   }
   ↓
6. useEffect 트리거 (fetchedMap 변경)
   📖 Map fetched, setting state
   ↓
7. setMap(fetchedMap) 호출
   📝 Setting map in store
   ↓
8. Zustand store 업데이트
   map: { id: "...", nodes: [...], edges: [...] }
   ↓
9. MindMapCanvas 리렌더링
   🎨 MindMapCanvas render: { hasMap: true, nodeCount: 2, ... }
   🖼️ Rendering canvas with 2 nodes and 1 edges
   ↓
10. SVG 렌더링
    - <Node> 컴포넌트들 렌더링
    - <Edge> 컴포넌트들 렌더링
   ↓
11. 화면에 맵 표시! ✅
```

## 🧪 수동 테스트

### **Test 1: API 직접 호출**

```bash
# DEV_MODE=true인 경우
curl http://localhost:8787/api/maps/map_1234567890

# 예상 응답:
{
  "ok": true,
  "data": {
    "id": "map_1234567890",
    "title": "My Map",
    "nodes": [...],
    "edges": [...],
    "updatedAt": "...",
    "version": 1
  }
}
```

### **Test 2: Frontend Store 직접 확인**

```javascript
// 브라우저 Console에서

// 1. Store 상태 확인
window.mindmapStore = await import('./store/mindmap')
const state = window.mindmapStore.useMindMapStore.getState()
console.log('Store state:', state)

// 2. Map 데이터 확인
console.log('Map:', state.map)
console.log('Nodes:', state.map?.nodes)
console.log('Edges:', state.map?.edges)
```

### **Test 3: 수동으로 Map 설정**

```javascript
// Console에서 직접 map 설정 테스트
const testMap = {
  id: 'test_map',
  title: 'Test Map',
  tags: [],
  nodes: [
    { id: 'n_1', label: 'Test Node', x: 100, y: 100, w: 150, h: 80 }
  ],
  edges: [],
  updatedAt: new Date().toISOString(),
  version: 1
}

const setMap = window.mindmapStore.useMindMapStore.getState().setMap
setMap(testMap)

// Canvas에 노드가 나타나면 ✅
```

## 📊 문제 진단 플로차트

```
맵 클릭 → Editor 이동
    ↓
Console에 로그 있음?
    ↓
  YES → 🔄 Fetching map 로그 있음?
          ↓
        YES → ✅ Maps fetched 로그 있음?
                ↓
              YES → 📝 Setting map in store 로그 있음?
                      ↓
                    YES → 🎨 MindMapCanvas render 로그 있음?
                            ↓
                          YES → nodeCount > 0?
                                  ↓
                                YES → Canvas에 노드 보임?
                                        ↓
                                      NO → SVG 렌더링 문제
                                           (다른 이슈)
                                  ↓
                                NO → 빈 맵임 (정상)
                            ↓
                          NO → Canvas가 map을 못받음
                               (Store 연결 문제)
                    ↓
                  NO → Store 업데이트 안됨
                       (setMap 호출 안됨)
              ↓
            NO → API 에러
                 (404/401/500 확인)
        ↓
      NO → API 호출 안됨
           (useQuery enabled 확인)
  ↓
NO → React 렌더링 안됨
     (페이지 에러)
```

## 🚀 빠른 체크

```bash
# 1. 브라우저 새로고침
Cmd+Shift+R

# 2. Console 열기
F12 → Console

# 3. Dashboard에서 맵 클릭

# 4. 로그 순서대로 확인:
✅ 🔄 Fetching map: map_xxx
✅ ✅ Map fetched: {...}
✅ 📖 Map fetched, setting state: {...}
✅ 📝 Setting map in store: {...}
✅ 🎨 MindMapCanvas render: { hasMap: true, nodeCount: 2, ... }
✅ 🖼️ Rendering canvas with 2 nodes and 1 edges

# 모든 로그가 나타나면 정상! ✅
```

## 📝 체크리스트

### **Backend**
- [ ] API 서버 실행 중
- [ ] Redis 실행 중
- [ ] GITHUB_TOKEN 설정됨
- [ ] GITHUB_ORG 설정됨
- [ ] DEV_MODE=true (개발 시)

### **Frontend**
- [ ] Frontend 서버 실행 중
- [ ] 로그인 상태
- [ ] VITE_DEV_MODE=true (개발 시)

### **GitHub**
- [ ] Repository 존재: `open-mindmap/dev-user`
- [ ] Branch 존재: `maps/map_xxx`
- [ ] map.json 파일 존재

### **Browser**
- [ ] Console에 에러 없음
- [ ] Network 탭에서 API 응답 200 OK
- [ ] localStorage에 auth-storage 있음

## 🔍 예상되는 로그 흐름

```javascript
// === EditorPage 마운트 ===
EditorPage state: {
  mapId: "map_1234567890",
  hasMap: false,
  mapData: null,
  isFetchingMap: true,  // ← 로딩 중
  fetchError: null,
  isNewMap: false
}

// === API 호출 ===
🔄 Fetching map: map_1234567890

// === API 응답 ===
✅ Map fetched: {
  ok: true,
  data: {
    id: "map_1234567890",
    title: "My Map",
    nodes: [...],
    edges: [...]
  }
}

// === Store 업데이트 ===
📖 Map fetched, setting state: { id: "map_1234567890", ... }
📝 Setting map in store: { id: "map_1234567890", ... }

// === EditorPage 상태 변경 ===
EditorPage state: {
  mapId: "map_1234567890",
  hasMap: true,       // ← true로 변경
  mapData: {...},     // ← 데이터 있음
  isFetchingMap: false,
  fetchError: null,
  isNewMap: false
}

// === Canvas 렌더링 ===
🎨 MindMapCanvas render: {
  hasMap: true,
  nodeCount: 2,
  edgeCount: 1,
  mapTitle: "My Map"
}
🖼️ Rendering canvas with 2 nodes and 1 edges

// === 화면에 표시 ===
// SVG에 노드와 엣지가 그려짐
```

## 🚨 문제 발생 시

### **로그가 중단된 지점 확인**

1. **🔄 Fetching map까지만 나옴**
   → API 호출은 했지만 응답이 없음
   → Network 탭에서 요청 상태 확인
   → Backend 터미널에서 에러 확인

2. **✅ Map fetched까지만 나옴**
   → API는 성공했지만 useEffect가 실행 안됨
   → fetchedMap 값 확인
   → useEffect 의존성 배열 확인

3. **📖 Map fetched, setting state까지만 나옴**
   → setMap 호출은 했지만 store 업데이트 안됨
   → Store 함수 확인
   → Zustand 설정 확인

4. **📝 Setting map in store까지만 나옴**
   → Store는 업데이트됐지만 컴포넌트 리렌더링 안됨
   → React DevTools에서 state 확인

5. **🎨 MindMapCanvas render에서 hasMap: false**
   → Store의 map이 null
   → Store 구독 문제
   → useMindMapStore 호출 확인

## 💡 즉시 해결 방법

```bash
# 1. 모든 서버 재시작
pkill -f "npm run dev"
cd api && npm run dev &
cd frontend && npm run dev &

# 2. 브라우저 하드 리프레시
Cmd+Shift+R

# 3. localStorage 클리어 (필요시)
# Console에서:
localStorage.clear()

# 4. 재로그인
# 5. 맵 다시 클릭
```

이제 **브라우저를 새로고침**하고 **맵을 클릭**한 후 **Console 로그**를 확인하세요! 🔍

