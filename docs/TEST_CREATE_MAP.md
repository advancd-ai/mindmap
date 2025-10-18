# 🧪 맵 생성 테스트 가이드

## 개요

새로운 맵을 생성할 때 GitHub에 브랜치가 자동으로 생성되는지 테스트합니다.

## 🔧 사전 준비

### 1. GitHub Organization 설정

1. **Organization 생성**
   ```
   https://github.com/organizations/new
   이름: open-mindmap (또는 원하는 이름)
   ```

2. **Personal Access Token 생성**
   - Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Generate new token (classic)
   - Scopes:
     - ✅ `repo` (전체)
     - ✅ `admin:org` → `read:org`
   - 토큰 복사

3. **환경변수 설정**
   ```bash
   # api/.env
   GITHUB_TOKEN=ghp_your_token_here
   GITHUB_ORG=open-mindmap
   ```

### 2. 서버 실행

```bash
# Terminal 1: Redis
brew services start redis

# Terminal 2: API
cd api
npm run dev

# Terminal 3: Frontend
cd frontend
npm run dev
```

## 📝 테스트 시나리오

### 시나리오 1: 첫 맵 생성 (레포지토리 자동 생성)

**사용자**: `test@example.com`

**예상 동작:**
```
1. 사용자 로그인
   → Email: test@example.com
   
2. "+ Create New Map" 클릭
   → 에디터 페이지로 이동
   → 새 맵 생성: map_1234567890
   
3. 노드 추가, 연결 작업
   
4. "💾 Save (Preview)" 클릭
   → JSON 미리보기 다이얼로그 표시
   
5. "Confirm & Save" 클릭
   → API 호출: POST /api/maps
   
6. API 처리:
   ✅ 레포지토리 확인: open-mindmap/test
   ❌ 404 Not Found
   ✅ 레포지토리 자동 생성: open-mindmap/test
   ✅ main 브랜치 생성 (README.md)
   ✅ 새 브랜치 생성: maps/map_1234567890
   ✅ map.json 파일 커밋
   
7. 결과 확인:
   ✅ GitHub에서 확인:
      https://github.com/open-mindmap/test
      https://github.com/open-mindmap/test/tree/maps/map_1234567890
   
   ✅ 대시보드에 맵 표시
```

### 시나리오 2: 추가 맵 생성 (기존 레포지토리)

**사용자**: `test@example.com` (계속)

**예상 동작:**
```
1. "+ Create New Map" 클릭
   → 새 맵 생성: map_9876543210
   
2. 작업 후 저장
   
3. API 처리:
   ✅ 레포지토리 확인: open-mindmap/test (있음)
   ✅ main 브랜치 HEAD 가져오기
   ✅ 새 브랜치 생성: maps/map_9876543210
   ✅ map.json 파일 커밋
   
4. 결과 확인:
   https://github.com/open-mindmap/test/tree/maps/map_9876543210
```

### 시나리오 3: 다른 사용자 (새 레포지토리)

**사용자**: `alice.doe@company.com`

**예상 동작:**
```
1. 로그인
   → Email: alice.doe@company.com
   → Repository 이름: alice-doe
   
2. 맵 생성 및 저장
   
3. API 처리:
   ✅ 레포지토리 생성: open-mindmap/alice-doe
   ✅ 브랜치 생성: maps/map_xxx
   
4. 결과:
   https://github.com/open-mindmap/alice-doe/tree/maps/map_xxx
```

## 🔍 로그 확인

### API 서버 로그

```bash
# 성공적인 맵 생성 로그

📁 GitHubClient initialized for open-mindmap/test
📦 Repository open-mindmap/test not found. Creating...
✅ Repository open-mindmap/test created successfully
🌿 Creating new branch: maps/map_1234567890 from main (abc123...)
✅ Branch maps/map_1234567890 created successfully
📝 Creating map.json in branch maps/map_1234567890
✅ Map map_1234567890 created successfully in branch maps/map_1234567890
🔗 View at: https://github.com/open-mindmap/test/tree/maps/map_1234567890
```

### 에러 로그 예시

**권한 부족:**
```
❌ Error creating map: Resource not accessible by integration
→ GitHub 토큰에 Organization 접근 권한 없음
→ 해결: read:org scope 추가
```

**브랜치 중복:**
```
❌ Error creating map: Branch maps/map_xxx already exists
→ 같은 ID로 이미 생성됨
→ 해결: 다른 맵 생성 또는 기존 맵 업데이트
```

## ✅ 검증 체크리스트

### Frontend

- [ ] 로그인 성공
- [ ] "+ Create New Map" 버튼 클릭 가능
- [ ] 에디터 페이지로 이동
- [ ] 노드 추가 가능
- [ ] "💾 Save (Preview)" 버튼 클릭 시 JSON 미리보기 표시
- [ ] "Confirm & Save" 클릭 시 저장 진행
- [ ] 성공 메시지 표시: "✅ Map created in branch: maps/map_xxx"
- [ ] 대시보드로 돌아가면 맵 표시

### Backend (API Logs)

- [ ] GitHubClient 초기화: `📁 GitHubClient initialized for {org}/{repo}`
- [ ] 레포지토리 생성 (첫 맵): `✅ Repository {org}/{repo} created successfully`
- [ ] 브랜치 생성: `✅ Branch maps/{mapId} created successfully`
- [ ] 파일 커밋: `✅ Map {mapId} created successfully`
- [ ] GitHub 링크 표시: `🔗 View at: https://github.com/{org}/{repo}/tree/maps/{mapId}`

### GitHub

- [ ] Organization에 새 레포지토리 생성됨
  ```
  https://github.com/open-mindmap/{email-id}
  ```

- [ ] main 브랜치에 README.md 존재
  ```
  https://github.com/open-mindmap/{email-id}/blob/main/README.md
  ```

- [ ] maps/{mapId} 브랜치 생성됨
  ```
  https://github.com/open-mindmap/{email-id}/tree/maps/map_xxx
  ```

- [ ] 브랜치에 map.json 파일 존재
  ```
  https://github.com/open-mindmap/{email-id}/blob/maps/map_xxx/map.json
  ```

## 🧪 수동 API 테스트

### 1. 맵 생성

```bash
# DEV_MODE=true 인 경우
curl -X POST http://localhost:8787/api/maps \
  -H "Content-Type: application/json" \
  -d '{
    "id": "map_test_'$(date +%s)'",
    "title": "Test Map",
    "tags": ["test"],
    "nodes": [
      {
        "id": "n_test1",
        "label": "Node 1",
        "x": 100,
        "y": 100,
        "w": 150,
        "h": 80
      }
    ],
    "edges": [],
    "updatedAt": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'",
    "version": 1
  }'
```

### 2. 맵 목록 확인

```bash
curl http://localhost:8787/api/maps
```

### 3. GitHub에서 확인

```bash
# Organization의 레포지토리 목록
gh repo list open-mindmap

# 브랜치 목록
gh api repos/open-mindmap/{email-id}/branches | jq '.[].name'

# 특정 브랜치 파일 확인
gh api repos/open-mindmap/{email-id}/contents/map.json?ref=maps/map_xxx
```

## 🐛 문제 해결

### "Resource not accessible by integration"

**원인**: GitHub 토큰에 Organization 권한 없음

**해결**:
```
1. GitHub Settings → Developer settings → Personal access tokens
2. 토큰 재생성 또는 수정
3. Scopes:
   ✅ repo (전체)
   ✅ admin:org → read:org
4. Organization Settings → Third-party access
   → Personal access token 승인
```

### "Repository creation failed"

**원인**: Organization이 존재하지 않거나 권한 없음

**해결**:
```
1. GitHub에서 Organization 생성
2. 자신이 Owner 또는 Member인지 확인
3. GITHUB_ORG 환경변수 확인
```

### "Branch already exists"

**원인**: 같은 map ID로 이미 브랜치 생성됨

**해결**:
```
1. 다른 맵 생성 (새 ID 자동 생성)
2. 또는 기존 맵 업데이트 (PUT /api/maps/:id)
3. 또는 브랜치 수동 삭제 후 재시도
```

## 📊 성공 시 구조

```
GitHub Organization: open-mindmap
│
└── Repository: test
    ├── main
    │   └── README.md
    │
    ├── maps/map_1234567890
    │   └── map.json
    │       {
    │         "id": "map_1234567890",
    │         "title": "Test Map",
    │         "nodes": [...],
    │         "edges": [...]
    │       }
    │
    └── maps/map_9876543210
        └── map.json
```

## 🎯 핵심 포인트

### **자동 생성 프로세스**

1. **레포지토리 확인**
   - 존재 → 다음 단계
   - 없음 → 자동 생성

2. **main 브랜치 확인**
   - 존재 → SHA 가져오기
   - 없음 → 초기 커밋 생성

3. **maps/{mapId} 브랜치 생성**
   - main에서 새 브랜치 생성
   - map.json 파일 커밋

4. **결과 반환**
   - branch: "maps/map_xxx"
   - mapId: "map_xxx"

### **사용자별 격리**

각 사용자는:
- ✅ 독립된 레포지토리 (`{org}/{email-id}`)
- ✅ 독립된 브랜치들
- ✅ 다른 사용자와 충돌 없음

이제 실제로 테스트해보세요! 🚀

