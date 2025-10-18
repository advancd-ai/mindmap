# 📋 Index DB Architecture

## 개요

맵 목록을 효율적으로 관리하기 위해 `maps/index.json` 파일을 main 브랜치에서 관리합니다.

## 🎯 핵심 개념

### **Hybrid Architecture**

- **Index**: main 브랜치의 `maps/index.json` (맵 목록 및 메타데이터)
- **Data**: 각 맵은 `maps/{mapId}` 브랜치에 저장

### **구조**

```
Repository: open-mindmap/john
│
├── Branch: main
│   └── maps/
│       └── index.json        # 맵 목록 (Index DB)
│           {
│             "generatedAt": "2025-10-12T...",
│             "items": [
│               {
│                 "id": "map_1234567890",
│                 "title": "My First Map",
│                 "tags": ["project"],
│                 "nodeCount": 5,
│                 "edgeCount": 3,
│                 "updatedAt": "2025-10-12T...",
│                 "version": 1
│               },
│               {
│                 "id": "map_9876543210",
│                 "title": "Second Map",
│                 "tags": ["notes"],
│                 "nodeCount": 10,
│                 "edgeCount": 8,
│                 "updatedAt": "2025-10-12T...",
│                 "version": 2
│               }
│             ]
│           }
│
├── Branch: maps/map_1234567890
│   └── map.json              # 실제 맵 데이터
│       {
│         "id": "map_1234567890",
│         "title": "My First Map",
│         "nodes": [...],
│         "edges": [...]
│       }
│
└── Branch: maps/map_9876543210
    └── map.json
```

## 🔄 CRUD 작업

### **CREATE: 새 맵 생성**

```typescript
// createMap(map)

Step 1: Update index.json in main
  ├─ GET maps/index.json (ref=main)
  ├─ Parse current index
  ├─ Add new item:
  │    {
  │      id: "map_xxx",
  │      title: "New Map",
  │      nodeCount: 0,
  │      edgeCount: 0,
  │      updatedAt: "...",
  │      version: 1
  │    }
  └─ PUT maps/index.json (branch=main)
     Commit: "Add map to index: New Map"

Step 2: Create new branch
  └─ POST git/refs
     ref: "refs/heads/maps/map_xxx"

Step 3: Create map.json in new branch
  └─ PUT map.json (branch=maps/map_xxx)
     Commit: "Create map: New Map"
```

### **READ: 맵 목록 조회**

```typescript
// getIndex()

Step 1: Fetch index.json from main
  └─ GET maps/index.json (ref=main)
     
Step 2: Return parsed index
  {
    generatedAt: "...",
    items: [...]
  }

// Fast! 브랜치를 일일이 조회할 필요 없음
```

### **UPDATE: 맵 수정**

```typescript
// updateMap(map)

Step 1: Update map.json in branch
  └─ PUT map.json (branch=maps/map_xxx)
     Commit: "Update map: ... (v2)"

Step 2: Update index.json in main
  ├─ GET maps/index.json (ref=main)
  ├─ Find item by id
  ├─ Update item metadata:
  │    {
  │      title: "Updated Title",
  │      nodeCount: 10,    // Updated
  │      edgeCount: 8,     // Updated
  │      version: 2        // Incremented
  │    }
  └─ PUT maps/index.json (branch=main)
     Commit: "Update map in index: ..."
```

### **DELETE: 맵 삭제**

```typescript
// deleteMap(id)

Step 1: Delete branch
  └─ DELETE git/refs/heads/maps/map_xxx

Step 2: Remove from index.json
  ├─ GET maps/index.json (ref=main)
  ├─ Filter out deleted map
  └─ PUT maps/index.json (branch=main)
     Commit: "Remove map from index: map_xxx"
```

## 💡 장점

### **1. 빠른 목록 조회**

```
Before (Branch-only):
GET /api/maps
→ List 100 branches (API call)
→ Fetch map.json from each branch (100 API calls)
→ Total: 101 API calls 😱

After (Index-based):
GET /api/maps
→ Fetch index.json from main (1 API call)
→ Total: 1 API call 🚀
```

### **2. 메타데이터 즉시 접근**

```javascript
// index.json에 이미 포함:
{
  "id": "map_xxx",
  "title": "My Map",
  "nodeCount": 5,    // ← 즉시 확인 가능
  "edgeCount": 3,    // ← 즉시 확인 가능
  "version": 2       // ← 즉시 확인 가능
}

// 브랜치에 접근할 필요 없음!
```

### **3. 검색/필터링 효율화**

```typescript
// 모든 작업이 index에서만 수행됨
const filtered = index.items.filter(item => 
  item.title.includes(query) ||
  item.tags.includes(tag)
)

// 브랜치 접근 불필요!
```

### **4. 일관성 보장**

```
index.json (main)
  ↓
Single Source of Truth
  ↓
모든 맵 목록 조회는 여기서만
```

## 📊 비교

| 작업 | Branch-only | Index-based |
|------|-------------|-------------|
| **맵 목록 조회** | 101 API calls | 1 API call ✅ |
| **검색** | 모든 브랜치 조회 | index만 조회 ✅ |
| **메타데이터** | 각 맵 조회 필요 | index에 있음 ✅ |
| **생성** | 1 API call | 3 API calls |
| **수정** | 1 API call | 3 API calls |
| **삭제** | 1 API call | 3 API calls |

**결론**: 조회(READ)가 압도적으로 많으므로 Index-based가 훨씬 효율적! 🎯

## 🗂️ index.json 스키마

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["generatedAt", "items"],
  "properties": {
    "generatedAt": {
      "type": "string",
      "format": "date-time",
      "description": "Index 생성/갱신 시각"
    },
    "items": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "title", "tags", "nodeCount", "edgeCount", "updatedAt", "version"],
        "properties": {
          "id": { "type": "string" },
          "title": { "type": "string" },
          "tags": { "type": "array", "items": { "type": "string" } },
          "nodeCount": { "type": "number" },
          "edgeCount": { "type": "number" },
          "updatedAt": { "type": "string", "format": "date-time" },
          "version": { "type": "number" }
        }
      }
    }
  }
}
```

## 🔄 작업 흐름

### **신규 사용자 첫 맵 생성**

```
1. 사용자 로그인: john@example.com
   ↓
2. Repository 생성: open-mindmap/john
   ↓
3. main 브랜치에 초기 구조 생성:
   - README.md
   - maps/ 디렉토리
   ↓
4. 첫 맵 생성 (map_123):
   
   STEP 1: index.json 생성/업데이트 (main)
   └─ Create maps/index.json
      {
        "generatedAt": "2025-10-12T...",
        "items": [
          {
            "id": "map_123",
            "title": "First Map",
            "nodeCount": 0,
            "edgeCount": 0,
            "version": 1
          }
        ]
      }
   
   STEP 2: 브랜치 생성
   └─ Create branch: maps/map_123
   
   STEP 3: 맵 데이터 저장
   └─ Create map.json in maps/map_123
```

### **기존 사용자 추가 맵 생성**

```
4. 두 번째 맵 생성 (map_456):
   
   STEP 1: index.json 업데이트 (main)
   ├─ GET maps/index.json
   ├─ Parse: { items: [...] }
   ├─ Push new item
   └─ PUT maps/index.json
      {
        "items": [
          { "id": "map_123", ... },
          { "id": "map_456", ... }  ← 추가
        ]
      }
   
   STEP 2: 브랜치 생성
   └─ Create branch: maps/map_456
   
   STEP 3: 맵 데이터 저장
   └─ Create map.json in maps/map_456
```

## 🧪 테스트 시나리오

### **1. 맵 목록 조회 (빠름)**

```bash
# API 호출
GET /api/maps

# Backend 처리:
📋 Index loaded with 2 maps

# Response (1 API call로 완료):
{
  "ok": true,
  "data": {
    "items": [
      { "id": "map_123", "title": "First Map", "nodeCount": 5, ... },
      { "id": "map_456", "title": "Second Map", "nodeCount": 10, ... }
    ]
  }
}
```

### **2. 새 맵 생성 (3단계)**

```bash
POST /api/maps
{
  "id": "map_789",
  "title": "Third Map",
  "nodes": [],
  "edges": []
}

# Backend 로그:
📋 Updating index.json in main branch
✅ Current index has 2 items
✅ Index updated with new map: map_789
🌿 Creating new branch: maps/map_789
✅ Branch created
📝 Creating map.json
✅ Map created

# GitHub 결과:
main: maps/index.json (updated)
  → items: [map_123, map_456, map_789]
Branch: maps/map_789 (created)
  → map.json (created)
```

### **3. 맵 수정 (2단계)**

```bash
PUT /api/maps/map_123
{
  "title": "Updated Title",
  "nodes": [...10 nodes...],
  "version": 2
}

# Backend 로그:
✅ Updated map in branch
📋 Updating index.json
✅ Index updated for map

# GitHub 결과:
maps/map_123: map.json (updated)
main: maps/index.json (updated)
  → item.title: "Updated Title"
  → item.nodeCount: 10
  → item.version: 2
```

### **4. 맵 삭제 (2단계)**

```bash
DELETE /api/maps/map_456

# Backend 로그:
✅ Deleted branch maps/map_456
📋 Removing map from index.json
✅ Map removed from index

# GitHub 결과:
Branch: maps/map_456 (deleted)
main: maps/index.json (updated)
  → items: [map_123, map_789]  (map_456 제거됨)
```

## 🚀 성능 개선

```
맵 100개 있을 때:

Branch-only 방식:
- 목록 조회: 101 API calls (10초+)
- 검색: 101 API calls (10초+)

Index-based 방식:
- 목록 조회: 1 API call (0.1초)
- 검색: 1 API call (0.1초)

→ 100배 빠름! 🚀
```

## 🔐 데이터 일관성

### **Atomic Updates**

각 작업은 트랜잭션처럼 처리:
```
CREATE:
1. Index 업데이트 (실패 시 중단)
2. Branch 생성 (실패 시 rollback 필요)
3. Data 저장

UPDATE:
1. Data 업데이트
2. Index 업데이트 (실패해도 계속)

DELETE:
1. Branch 삭제
2. Index 업데이트 (실패해도 계속)
```

### **에러 처리**

```typescript
// Index 업데이트 실패 시
catch (error) {
  console.warn(`⚠️ Failed to update index: ${error.message}`);
  // Continue even if index update fails
}

// 이유: 다음 조회 시 재동기화 가능
```

## 📁 파일 구조

```
open-mindmap/john/
│
├── main
│   ├── README.md
│   └── maps/
│       └── index.json          ← Index DB (맵 목록)
│
├── maps/map_1234567890
│   └── map.json                ← 맵 데이터 1
│
├── maps/map_9876543210
│   └── map.json                ← 맵 데이터 2
│
└── maps/map_5678901234
    └── map.json                ← 맵 데이터 3
```

## 🎯 결론

### **Index DB를 사용하는 이유**

1. **성능**: 목록 조회가 100배 빠름
2. **효율성**: 메타데이터 즉시 접근
3. **확장성**: 맵이 많아져도 성능 유지
4. **검색**: 빠른 필터링/검색
5. **일관성**: Single source of truth

### **브랜치를 사용하는 이유**

1. **독립성**: 각 맵이 독립적
2. **버전 관리**: Git 히스토리 활용
3. **충돌 방지**: 동시 편집 가능
4. **백업**: 브랜치별 스냅샷

→ **Best of Both Worlds!** 🎉

