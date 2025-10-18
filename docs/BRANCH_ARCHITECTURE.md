# 🌿 Branch-Based Architecture

## 개요

Open Mindmap은 Git 브랜치를 활용하여 각 마인드맵을 독립적으로 저장합니다.

## 🎯 핵심 개념

### **1 Map = 1 Branch**
- 각 마인드맵은 고유한 Git 브랜치에 저장
- 브랜치 이름: `maps/{mapId}`
- 파일 경로: `map.json` (브랜치의 루트)

### **브랜치 구조**
```
Repository: {username}/mindmap-data

Branches:
├── main                    # 문서만 포함 (README.md)
├── maps/map_1234567890    # 마인드맵 1
├── maps/map_9876543210    # 마인드맵 2
├── maps/map_5678901234    # 마인드맵 3
└── ...
```

### **맵 파일 구조**
```
Branch: maps/map_1234567890
└── map.json               # 마인드맵 데이터
```

## 🔄 작동 방식

### **1. 맵 목록 조회**
```typescript
// GitHub API: List branches
GET /repos/{owner}/{repo}/branches

// Filter branches starting with "maps/"
branches = branches.filter(b => b.name.startsWith('maps/'))

// Extract mapId from branch name
mapId = branchName.replace('maps/', '')

// Fetch each map.json from each branch
```

### **2. 맵 생성**
```typescript
// 1. Create new branch from main
git branch maps/map_new123 main

// 2. Create map.json in new branch
git checkout maps/map_new123
echo '{...mapData...}' > map.json
git add map.json
git commit -m "Create map: My New Map"
git push
```

### **3. 맵 조회**
```typescript
// Get map.json from specific branch
GET /repos/{owner}/{repo}/contents/map.json?ref=maps/map_1234567890
```

### **4. 맵 수정**
```typescript
// Update map.json in the branch
PUT /repos/{owner}/{repo}/contents/map.json
{
  "branch": "maps/map_1234567890",
  "message": "Update map: v2",
  "content": "{base64 encoded map data}",
  "sha": "{current file sha}"
}
```

### **5. 맵 삭제**
```typescript
// Delete the branch
DELETE /repos/{owner}/{repo}/git/refs/heads/maps/map_1234567890
```

## 🎨 Architecture 다이어그램

```
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Repository                         │
│                  {username}/mindmap-data                     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ├── main (README.md)
                            │
                            ├── maps/project-planning
                            │   └── map.json
                            │       {
                            │         "id": "project-planning",
                            │         "title": "Project Planning",
                            │         "nodes": [...],
                            │         "edges": [...]
                            │       }
                            │
                            ├── maps/meeting-notes
                            │   └── map.json
                            │
                            └── maps/architecture-design
                                └── map.json
```

## 💡 장점

### **1. 독립성**
- 각 맵이 완전히 독립적
- 한 맵의 변경이 다른 맵에 영향 없음

### **2. 버전 관리**
- Git의 네이티브 버전 관리 활용
- 각 커밋이 자동으로 히스토리
- 롤백 용이

### **3. 확장성**
- 맵 개수 제한 없음
- 브랜치 수만큼 확장 가능

### **4. 성능**
- 인덱스 파일 불필요
- 브랜치 리스트로 맵 목록 파악
- 필요한 맵만 fetch

### **5. 협업**
- Git 브랜치 보호 규칙 활용
- PR 기반 협업 가능
- 충돌 관리 용이

## 📊 비교: 이전 vs 현재

### **이전 아키텍처 (파일 기반)**
```
main branch:
├── maps/
│   ├── index.json           # 맵 목록 (수동 관리)
│   ├── map_1234567890.json  # 맵 1
│   ├── map_9876543210.json  # 맵 2
│   └── ...
```

**문제점:**
- `index.json` 수동 업데이트 필요
- 모든 맵이 같은 브랜치
- 동시 편집 시 충돌 위험
- PR이 여러 맵에 영향

### **현재 아키텍처 (브랜치 기반)**
```
Repository:
├── main                    # 문서
├── maps/map_1234567890    # 맵 1 (독립)
├── maps/map_9876543210    # 맵 2 (독립)
└── ...
```

**장점:**
- 인덱스 자동 생성 (브랜치 리스트)
- 각 맵이 독립적 브랜치
- 동시 편집 충돌 없음
- 맵별 독립 히스토리

## 🔧 API 변경사항

### **맵 목록 조회**
```typescript
// Before
GET /api/maps
→ Reads maps/index.json from main branch

// After
GET /api/maps
→ Lists branches starting with "maps/"
→ Fetches map.json from each branch
```

### **맵 생성**
```typescript
// Before
POST /api/maps
→ Create PR to main branch
→ Add map_xxx.json to maps/
→ Update maps/index.json

// After
POST /api/maps
→ Create new branch: maps/map_xxx
→ Add map.json to branch root
→ No index update needed
```

### **맵 삭제**
```typescript
// Before
DELETE /api/maps/:id
→ Create PR to main branch
→ Delete maps/map_xxx.json
→ Update maps/index.json

// After
DELETE /api/maps/:id
→ Delete branch: maps/map_xxx
→ No index update needed
```

## 🧪 테스트 시나리오

### **1. 새 레포지토리 생성**
```bash
# 1. Create repository on GitHub
gh repo create mindmap-data --private

# 2. Clone repository
git clone https://github.com/{username}/mindmap-data.git
cd mindmap-data

# 3. Create README in main
echo "# Mindmap Data Repository" > README.md
git add README.md
git commit -m "Initial commit"
git push origin main

# 4. API will auto-create branches for maps
```

### **2. 첫 맵 생성**
```bash
POST /api/maps
{
  "id": "map_test123",
  "title": "Test Map",
  "nodes": [],
  "edges": []
}

# Result: Creates branch "maps/map_test123"
# With file: map.json
```

### **3. 맵 목록 확인**
```bash
GET /api/maps

# Response:
{
  "ok": true,
  "data": {
    "generatedAt": "2025-01-01T00:00:00Z",
    "items": [
      {
        "id": "map_test123",
        "title": "Test Map",
        "nodeCount": 0,
        "edgeCount": 0,
        "updatedAt": "2025-01-01T00:00:00Z",
        "version": 1
      }
    ]
  }
}
```

### **4. GitHub에서 확인**
```bash
# List branches
gh repo view {username}/mindmap-data --json defaultBranchRef,branches

# View branch
git ls-remote origin | grep maps/

# Result:
# refs/heads/maps/map_test123
```

## 🚀 마이그레이션 가이드

### **기존 데이터를 브랜치로 변환**

```bash
#!/bin/bash
# migrate-to-branches.sh

REPO_PATH="."
MAPS_DIR="maps"

# For each map file
for map_file in $MAPS_DIR/map_*.json; do
  # Extract map ID
  map_id=$(basename "$map_file" .json)
  
  # Create branch
  git checkout main
  git checkout -b "maps/$map_id"
  
  # Move map file to root
  mv "$map_file" map.json
  git add map.json
  git commit -m "Migrate $map_id to branch-based storage"
  git push origin "maps/$map_id"
done

# Clean up main branch
git checkout main
rm -rf maps/
git add maps/
git commit -m "Remove old maps directory"
git push origin main
```

## 📚 참고사항

### **브랜치 명명 규칙**
- Prefix: `maps/`
- Format: `maps/{mapId}`
- 예시: `maps/map_1234567890`

### **파일 위치**
- 브랜치 루트에 `map.json`
- 다른 파일은 포함하지 않음

### **브랜치 보호**
- `main` 브랜치: 보호 권장
- `maps/*` 브랜치: 개별 수정 허용

### **성능 고려사항**
- 브랜치 목록은 페이지네이션 지원
- 한 번에 최대 100개 브랜치 조회
- 필요시 추가 요청으로 더 많은 브랜치 조회

## 🎯 결론

브랜치 기반 아키텍처는:
- ✅ Git의 네이티브 기능 활용
- ✅ 인덱스 파일 자동 생성
- ✅ 맵별 독립성 보장
- ✅ 버전 관리 강화
- ✅ 확장성 향상

이는 "GitHub를 데이터베이스로 사용"하는 Open Mindmap의 철학에 더 부합합니다.

