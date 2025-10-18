# 📝 Title Management Architecture

## 개요

맵의 타이틀은 **생성 시점에 결정**되며, 이후 index.json에서는 변경되지 않습니다.

## 🎯 핵심 원칙

### **Index Title = 불변 (Immutable)**

```typescript
// 맵 생성 시
index.json:
{
  "items": [
    {
      "id": "map_123",
      "title": "Project Planning",  ← 최초 입력값
      "nodeCount": 0,
      "edgeCount": 0
    }
  ]
}

// 맵 수정 시 (에디터에서 title 변경)
map.json (branch):
{
  "id": "map_123",
  "title": "Updated Planning",  ← 변경됨
  "nodes": [...]
}

// Index는 변경되지 않음!
index.json (main):
{
  "items": [
    {
      "id": "map_123",
      "title": "Project Planning",  ← 그대로 유지
      "nodeCount": 5,
      "edgeCount": 3
    }
  ]
}
```

## 🔄 동작 방식

### **CREATE: 맵 생성**

```typescript
// 1. 사용자 입력
CreateMapDialog:
  title: "Project Planning"
  tags: ["project", "planning"]

// 2. Index에 추가 (main 브랜치)
maps/index.json:
{
  "items": [
    {
      "id": "map_123",
      "title": "Project Planning",  ← 사용자 입력
      "tags": ["project", "planning"],
      "nodeCount": 0,
      "edgeCount": 0,
      "version": 1
    }
  ]
}

// Commit message:
"Add map to index: Project Planning"
```

### **UPDATE: 맵 수정**

```typescript
// 1. 에디터에서 타이틀 변경
EditorPage:
  <input value="Updated Planning" />
  
// 2. 맵 데이터 업데이트 (maps/map_123 브랜치)
map.json:
{
  "id": "map_123",
  "title": "Updated Planning",  ← 변경됨
  "nodes": [...],
  "edges": [...]
}

// Commit message:
"Update map: Updated Planning (v2)"

// 3. Index 메타데이터만 업데이트 (main 브랜치)
maps/index.json:
{
  "items": [
    {
      "id": "map_123",
      "title": "Project Planning",  ← 변경되지 않음 (원본 유지)
      "tags": ["project", "planning"],
      "nodeCount": 5,               ← 업데이트됨
      "edgeCount": 3,               ← 업데이트됨
      "version": 2                  ← 업데이트됨
    }
  ]
}

// Commit message:
"Update map metadata: Updated Planning (v2)"
                       ↑
              현재 타이틀을 commit 메시지에 포함
              (index의 title은 변경 안함)
```

## 💡 이유

### **1. Index는 카탈로그 역할**

```
Index = 도서관 카드 카탈로그
- 최초 등록된 이름으로 분류
- 책 내용이 바뀌어도 카탈로그는 그대로
- 빠른 검색과 브라우징을 위함
```

### **2. 타이틀 변경 이력 추적**

```
Index Title (불변):
"Project Planning"  ← 최초 의도

Map Title (변경 가능):
v1: "Project Planning"
v2: "Updated Planning"
v3: "Final Planning"

→ Git commit message에서 변경 이력 확인 가능
```

### **3. 일관된 참조**

```
Dashboard:
- "Project Planning" (index의 원본 타이틀)
- 항상 일관된 이름으로 표시

Editor:
- "Updated Planning" (현재 작업 중인 타이틀)
- 실시간 반영
```

## 🔧 코드 구현

### **Index 업데이트 (title 보존)**

```typescript:api/src/github/client.ts
async updateMap(map: Map): Promise<PRTransaction> {
  // ...
  
  // Find and update metadata only
  const itemIndex = currentIndex.items.findIndex(item => item.id === map.id);
  if (itemIndex >= 0) {
    // Keep original title, only update metadata
    currentIndex.items[itemIndex] = {
      ...currentIndex.items[itemIndex],  // ← Spread existing (title 유지)
      nodeCount: map.nodes.length,       // ← Update metadata
      edgeCount: map.edges.length,
      updatedAt: map.updatedAt,
      version: map.version,
    };
    
    // Commit message includes current title
    await createOrUpdateFileContents({
      message: `Update map metadata: ${map.title} (v${map.version})`,
      //                               ↑ 현재 타이틀 (commit 메시지용)
    });
  }
}
```

### **맵 데이터 저장 (title 업데이트)**

```typescript:api/src/github/client.ts
async updateMap(map: Map): Promise<PRTransaction> {
  // STEP 1: Update map.json in branch (title 포함)
  await this.octokit.repos.createOrUpdateFileContents({
    path: MAP_FILE_PATH,
    message: `Update map: ${map.title} (v${map.version})`,
    //                      ↑ 현재 타이틀 (commit 메시지)
    content: Buffer.from(JSON.stringify(map, null, 2)).toString('base64'),
    //                                   ↑ 전체 맵 데이터 (title 포함)
    branch: branchName,
  });
}
```

## 📊 데이터 흐름

### **맵 생성**

```
CreateMapDialog
  ↓
title: "Project Planning"
  ↓
main/maps/index.json:
  items[0].title = "Project Planning"  ← 원본 저장
  ↓
maps/map_123/map.json:
  title: "Project Planning"  ← 동일
```

### **타이틀 수정 후 저장**

```
EditorPage
  <input value="Updated Planning" />  ← 사용자 변경
  ↓
Save 클릭
  ↓
maps/map_123/map.json:
  title: "Updated Planning"  ← 업데이트됨
  
Commit: "Update map: Updated Planning (v2)"
        ↑ 변경된 타이틀을 메시지에 포함
  ↓
main/maps/index.json:
  items[0].title = "Project Planning"  ← 변경 안됨!
  items[0].nodeCount = 5  ← 메타데이터만 업데이트
  
Commit: "Update map metadata: Updated Planning (v2)"
        ↑ 현재 타이틀을 메시지에 포함
```

## 📋 Git Commit History

```bash
# main 브랜치 (index.json)
git log --oneline main -- maps/index.json

abc123 Update map metadata: Updated Planning (v2)
def456 Add map to index: Project Planning

# maps/map_123 브랜치 (map.json)
git log --oneline maps/map_123 -- map.json

xyz789 Update map: Updated Planning (v2)
uvw012 Create map: Project Planning

# Commit 메시지에서 타이틀 변경 이력 확인 가능!
```

## 🎨 UI 표시

### **Dashboard (Index Title)**

```tsx
{/* Index의 원본 타이틀 표시 */}
<div className="map-card">
  <h3>{map.title}</h3>  {/* "Project Planning" */}
  <p>5 nodes · 3 edges</p>
</div>
```

### **Editor (Current Title)**

```tsx
{/* 현재 작업 중인 타이틀 표시 */}
<input
  value={map.title}  {/* "Updated Planning" */}
  onChange={(e) => updateTitle(e.target.value)}
/>
```

### **Footer (Current Stats)**

```tsx
{/* 현재 상태 표시 */}
<span>5 nodes · 3 edges · v2</span>
```

## 🧪 테스트 시나리오

### **시나리오: 타이틀 변경 후 저장**

```
1. 맵 생성
   title: "My First Map"
   
2. Dashboard
   표시: "My First Map"  ✅
   
3. Editor 열기
   입력 필드: "My First Map"
   
4. 타이틀 변경
   입력 필드: "Updated Map Title"
   
5. 노드 추가 (5개)
   
6. 저장
   
7. Backend 처리:
   
   STEP 1: map.json 업데이트
   {
     "title": "Updated Map Title",  ← 새 타이틀
     "nodes": [5 nodes],
     "version": 2
   }
   Commit: "Update map: Updated Map Title (v2)"
   
   STEP 2: index.json 업데이트
   {
     "title": "My First Map",      ← 원본 유지
     "nodeCount": 5,               ← 업데이트
     "version": 2                  ← 업데이트
   }
   Commit: "Update map metadata: Updated Map Title (v2)"
            ↑ 현재 타이틀은 메시지에만
   
8. Dashboard로 돌아오기
   표시: "My First Map"  ✅ (원본 유지)
   
9. Editor 다시 열기
   입력 필드: "Updated Map Title"  ✅ (현재 값)
```

## 🎯 장점

### **1. 일관된 참조**
```
Dashboard는 항상 원본 타이틀 표시
→ 사용자가 "어떤 맵인지" 쉽게 인식
→ 타이틀을 여러 번 바꿔도 혼란 없음
```

### **2. 변경 이력 추적**
```
Commit messages:
- "Update map: Planning v1"
- "Update map: Updated Planning v2"
- "Update map: Final Planning v3"

→ 타이틀 변경 히스토리 확인 가능
```

### **3. Index 안정성**
```
Index는 메타데이터만 업데이트
→ 타이틀 충돌 방지
→ 검색 인덱스 안정성 유지
```

### **4. 유연성**
```
Editor에서는 자유롭게 타이틀 변경 가능
→ 작업 중 의미 있는 이름으로 수정
→ Dashboard에서는 원본 참조
```

## 📚 요약

| 위치 | Title 값 | 변경 가능 |
|------|----------|-----------|
| **Index (main)** | 원본 | ❌ 불변 |
| **Map Data (branch)** | 현재 | ✅ 변경 가능 |
| **Commit Message** | 현재 | ✅ 반영됨 |
| **Dashboard UI** | 원본 | 표시만 |
| **Editor UI** | 현재 | 편집 가능 |

## 🎉 결과

- ✅ Index의 title은 생성 시점 값 유지
- ✅ 맵 데이터의 title은 자유롭게 변경 가능
- ✅ Commit 메시지에 현재 title 포함
- ✅ Dashboard는 원본 title 표시
- ✅ Editor는 현재 title 표시/편집

이제 타이틀 관리가 명확하고 일관성 있게 동작합니다! 🎯

