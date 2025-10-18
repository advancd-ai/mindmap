# Dashboard Refresh 디버깅 가이드

## 🔍 문제 확인

### 1. 브라우저 콘솔 확인

```
1. Dashboard 열기
2. Map card에서 ✏️ 버튼 클릭
3. Title/Tags 변경
4. Save 클릭
5. 브라우저 콘솔(F12) 확인
```

## 📋 예상 콘솔 로그

### 정상 동작 시

```
✏️ Editing map: map_123
💾 Dashboard: Updating map metadata: { id: "map_123", title: "New Title", tags: [...] }
🔄 Starting edit mutation: { id: "map_123", title: "New Title", tags: [...] }
📡 Calling updateMapMetadata API...
🔄 Updating map metadata: { id: "map_123", metadata: {...} }

[API Server]
📝 Updating map metadata: { id: "map_123", body: {...} }
📝 Updating map metadata in index.json: map_123 { title: "...", tags: [...] }
✅ Map metadata updated in index: map_123

[Frontend]
✅ Map metadata updated
✅ API call completed: undefined
✅ Map metadata updated successfully
🔄 Invalidating queries and refetching...
🔄 Fetching maps...
✅ Maps fetched: { items: [...] }
✅ Dashboard refreshed
```

## 🐛 문제 해결

### 문제 1: API 호출 실패

**증상:**
```
❌ Error updating map metadata: Network Error
```

**해결:**
```bash
# API 서버 실행 확인
cd api && npm run dev

# Redis 실행 확인
redis-cli ping
```

### 문제 2: 404 Not Found

**증상:**
```
❌ Error: Request failed with status code 404
```

**해결:**
```
1. API 엔드포인트 확인
   PATCH /maps/:id/metadata

2. 라우터 등록 확인
   api/src/routes/maps.ts
   mapsRouter.patch('/:id/metadata', ...)

3. 서버 재시작
   npm run dev
```

### 문제 3: Cache 문제

**증상:**
```
✅ API call completed
(하지만 Dashboard에 반영 안됨)
```

**해결:**
```typescript
// Backend에서 cache 삭제 확인
await cache.delete(`index:${owner}:${repo}`);

// 또는 Redis 직접 확인
redis-cli
> KEYS index:*
> DEL index:open-mindmap:john
```

### 문제 4: React Query refetch 실패

**증상:**
```
✅ Map metadata updated successfully
🔄 Invalidating queries and refetching...
(하지만 새로운 fetchMaps 호출 없음)
```

**해결:**
```typescript
// queryClient.refetchQueries 명시적 호출
await queryClient.invalidateQueries({ queryKey: ['maps'] });
await queryClient.refetchQueries({ queryKey: ['maps'] });

// 또는 직접 refetch
const { refetch } = useQuery({ ... });
refetch();
```

## 🧪 테스트 체크리스트

### Backend 확인

```bash
# 1. API 서버 실행 확인
curl http://localhost:3000/health

# 2. Maps 조회 확인
curl -H "Authorization: Bearer {token}" http://localhost:3000/maps

# 3. Metadata 업데이트 확인
curl -X PATCH http://localhost:3000/maps/{id}/metadata \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"title":"New Title","tags":["tag1"]}'

# 4. Redis 확인
redis-cli
> KEYS *
> GET index:open-mindmap:john
```

### Frontend 확인

```javascript
// 브라우저 콘솔에서 직접 테스트

// 1. API client 확인
const response = await fetch('http://localhost:3001/maps/{id}/metadata', {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ title: 'Test', tags: [] })
});
console.log(await response.json());

// 2. React Query 상태 확인
// React DevTools → Query Client → maps 쿼리 확인
```

## 💡 디버깅 팁

### 1. Network 탭 확인

```
1. F12 → Network 탭
2. Save 버튼 클릭
3. PATCH /maps/{id}/metadata 요청 확인
   - Status: 200 OK
   - Response: { ok: true, data: {...} }
4. GET /maps 요청 확인 (refetch)
   - Status: 200 OK
   - Response: { items: [...] }
```

### 2. React Query DevTools

```
1. React Query DevTools 설치
2. Dashboard에서 확인
3. 'maps' 쿼리 상태 확인
   - isFetching: true → false
   - data: updated data
   - dataUpdatedAt: timestamp
```

### 3. Redux/Zustand DevTools

```
Not applicable - React Query handles cache
```

## 🔧 강제 Refresh

### 옵션 1: Hard Refresh
```typescript
window.location.reload();
```

### 옵션 2: Query Reset
```typescript
queryClient.resetQueries({ queryKey: ['maps'] });
```

### 옵션 3: Manual Refetch
```typescript
const { refetch } = useQuery(...);
refetch();
```

## 📊 현재 구현

### DashboardPage.tsx

```typescript
const editMutation = useMutation({
  mutationFn: async ({ id, title, tags }) => {
    // Step 1: Prepare (300ms)
    // Step 2: Update metadata (API call)
    const result = await updateMapMetadata(id, { title, tags });
    // Step 3: Refresh (auto)
    return result;
  },
  onSuccess: async () => {
    // Invalidate + Refetch
    await queryClient.invalidateQueries({ queryKey: ['maps'] });
    await queryClient.refetchQueries({ queryKey: ['maps'] });
    
    // Show toast
    setToast({ message: 'Success!', type: 'success' });
  }
});
```

## ✅ 체크 포인트

- [ ] API 서버 실행 중
- [ ] Redis 실행 중
- [ ] PATCH /maps/:id/metadata 엔드포인트 존재
- [ ] updateMapMetadata 함수 호출 성공
- [ ] Backend에서 index.json 업데이트 확인
- [ ] Cache 무효화 확인
- [ ] Frontend API 호출 성공 (200 OK)
- [ ] queryClient.invalidateQueries 호출
- [ ] queryClient.refetchQueries 호출
- [ ] GET /maps 재호출 확인
- [ ] Dashboard maps 상태 업데이트
- [ ] UI 재렌더링 확인

