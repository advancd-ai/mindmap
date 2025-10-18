# 🏢 GitHub Organization Architecture

## 개요

Open Mindmap은 단일 GitHub Organization 내에서 각 사용자별로 독립적인 레포지토리를 관리합니다.

## 🎯 핵심 개념

### **1 Organization, N Users, N Repositories**

- **Organization**: 환경변수로 설정 (예: `open-mindmap`)
- **Repository**: 사용자별로 자동 생성 (이메일 ID 기반)
- **Branch per Map**: 각 레포지토리 내에서 맵별 브랜치

### **구조 예시**

```
GitHub Organization: open-mindmap
│
├── Repository: john        (john@example.com 사용자)
│   ├── main
│   ├── maps/map_1234567890
│   ├── maps/map_9876543210
│   └── ...
│
├── Repository: alice       (alice@company.com 사용자)
│   ├── main
│   ├── maps/map_5678901234
│   └── ...
│
└── Repository: bob-smith   (bob.smith@gmail.com 사용자)
    ├── main
    ├── maps/map_3456789012
    └── ...
```

## 🔄 레포지토리 이름 생성 규칙

### **이메일 → 레포지토리 이름**

```typescript
// 규칙:
// 1. 이메일의 @ 앞부분 추출
// 2. 소문자 변환
// 3. 알파벳, 숫자, 하이픈(-), 언더스코어(_)만 허용
// 4. 특수문자는 하이픈으로 변환
// 5. 앞뒤 하이픈/언더스코어 제거

// 예시:
"john@example.com"           → "john"
"alice.doe@company.com"      → "alice-doe"
"bob_smith@gmail.com"        → "bob_smith"
"user+tag@domain.com"        → "user-tag"
"123user@test.com"           → "123user"
```

## 🏗️ 전체 구조

```
┌────────────────────────────────────────────────────────┐
│         GitHub Organization: open-mindmap              │
│                                                        │
│  ┌─────────────────────────────────────────────────┐  │
│  │ Repository: john                                │  │
│  │ Owner: john@example.com                         │  │
│  │                                                 │  │
│  │ Branches:                                       │  │
│  │ ├── main (README.md)                           │  │
│  │ ├── maps/map_1234567890 (map.json)            │  │
│  │ ├── maps/map_9876543210 (map.json)            │  │
│  │ └── maps/map_5678901234 (map.json)            │  │
│  └─────────────────────────────────────────────────┘  │
│                                                        │
│  ┌─────────────────────────────────────────────────┐  │
│  │ Repository: alice-doe                           │  │
│  │ Owner: alice.doe@company.com                    │  │
│  │                                                 │  │
│  │ Branches:                                       │  │
│  │ ├── main                                        │  │
│  │ ├── maps/map_3456789012 (map.json)            │  │
│  │ └── maps/map_7890123456 (map.json)            │  │
│  └─────────────────────────────────────────────────┘  │
│                                                        │
└────────────────────────────────────────────────────────┘
```

## 💡 장점

### **1. 중앙 집중식 관리**
- 모든 사용자 데이터가 하나의 Organization에 집중
- Organization 레벨에서 백업, 보안 정책 관리
- Team 권한으로 관리자 접근 제어

### **2. 사용자 간 격리**
- 각 사용자는 독립적인 레포지토리 보유
- 다른 사용자의 데이터 접근 불가 (Organization 권한 제외)
- 레포지토리별 독립적인 설정 가능

### **3. 확장성**
- Organization은 무제한 레포지토리 지원
- 각 레포지토리는 무제한 브랜치 지원
- 사용자 수 제한 없음

### **4. 관리 효율성**
- Organization 설정 한 곳에서 관리
- Webhook 중앙 설정
- API 토큰 Organization 레벨 관리

### **5. 협업 가능성**
- 필요시 레포지토리 간 협업 가능
- Organization Team으로 권한 관리
- 공유 레포지토리 쉽게 생성 가능

## 🔧 설정 방법

### **1. GitHub Organization 생성**

1. GitHub에서 새 Organization 생성
   ```
   https://github.com/organizations/new
   ```

2. Organization 이름 선택 (예: `open-mindmap`)

3. Free plan 선택 가능

### **2. Personal Access Token 생성**

Organization에 접근 가능한 PAT 필요:

1. GitHub Settings → Developer settings → Personal access tokens
2. "Generate new token (classic)"
3. Scopes 선택:
   - ✅ `repo` (전체)
   - ✅ `admin:org` → `read:org` (Organization 읽기)
4. Token 복사

### **3. 환경변수 설정**

```bash
# api/.env
GITHUB_TOKEN=ghp_your_organization_token
GITHUB_ORG=open-mindmap
```

### **4. API 재시작**

```bash
cd api
npm run dev
```

## 🔄 동작 흐름

### **사용자 로그인 시**

```typescript
// 1. 사용자 로그인
user.email = "john@example.com"

// 2. 레포지토리 경로 생성
const repoPath = getGitHubRepoPath(user)
// { owner: "open-mindmap", repo: "john" }

// 3. GitHubClient 초기화
new GitHubClient(user)
// 📁 open-mindmap/john

// 4. 레포지토리 확인/생성
// 없으면 자동 생성:
// https://github.com/open-mindmap/john
```

### **맵 생성 시**

```typescript
// POST /api/maps
{
  "id": "map_1234567890",
  "title": "My Project",
  ...
}

// 1. 레포지토리: open-mindmap/john
// 2. 브랜치 생성: maps/map_1234567890
// 3. 파일 생성: map.json
// 4. 커밋 & 푸시
```

### **맵 목록 조회 시**

```typescript
// GET /api/maps

// 1. 레포지토리: open-mindmap/john
// 2. 브랜치 리스트 조회
// 3. "maps/"로 시작하는 브랜치 필터
// 4. 각 브랜치에서 map.json 조회
// 5. 목록 반환
```

## 📊 비교: 이전 vs 현재

### **이전 아키텍처 (사용자별 Organization)**

```
john/mindmap-data
alice/mindmap-data
bob/mindmap-data
```

**문제점:**
- ❌ 사용자가 개인 계정에 레포지토리 생성 필요
- ❌ 관리 분산 (각 사용자 레포 별도 관리)
- ❌ Organization 레벨 권한 관리 불가
- ❌ 중앙 백업/모니터링 어려움

### **현재 아키텍처 (중앙 Organization)**

```
open-mindmap/john
open-mindmap/alice
open-mindmap/bob
```

**장점:**
- ✅ 자동 레포지토리 생성 (API가 처리)
- ✅ 중앙 집중식 관리
- ✅ Organization 레벨 권한 제어
- ✅ 쉬운 백업/모니터링

## 🔐 권한 관리

### **Organization Members**

```
Organization: open-mindmap
├── Owners (관리자)
│   └── admin@example.com
│       - 전체 레포 접근
│       - Organization 설정 관리
│       - 멤버 관리
│
├── Members (일반 사용자)
│   ├── john@example.com
│   │   - 자신의 레포(john)만 접근
│   │
│   ├── alice@company.com
│   │   - 자신의 레포(alice-doe)만 접근
│   │
│   └── bob@gmail.com
│       - 자신의 레포(bob)만 접근
│
└── Teams (선택적)
    ├── Admins Team
    │   - 모든 레포 read/write
    │
    └── Viewers Team
        - 모든 레포 read only
```

### **Repository 권한**

```
Repository: open-mindmap/john

Access:
- john@example.com: Admin (자동)
- Organization Owners: Admin
- Organization Members: No access (기본)
- Teams: Team 설정에 따름
```

## 🧪 테스트 시나리오

### **1. 신규 사용자 첫 로그인**

```bash
# 1. 사용자 로그인
POST /api/auth/google
user = { email: "newuser@example.com" }

# 2. 맵 생성 시도
POST /api/maps
{
  "id": "map_first",
  "title": "First Map"
}

# 3. API가 자동으로 처리:
# - 레포지토리 생성: open-mindmap/newuser
# - 브랜치 생성: maps/map_first
# - 파일 생성: map.json
```

### **2. 기존 사용자 맵 추가**

```bash
# 1. 사용자 로그인
user = { email: "john@example.com" }

# 2. 맵 생성
POST /api/maps
{
  "id": "map_project2",
  "title": "Project 2"
}

# 3. 기존 레포지토리에 브랜치 추가:
# - 레포지토리: open-mindmap/john (기존)
# - 브랜치: maps/map_project2 (신규)
```

### **3. 여러 사용자 동시 작업**

```bash
# User 1: john@example.com
POST /api/maps → open-mindmap/john/maps/map_xxx

# User 2: alice@company.com
POST /api/maps → open-mindmap/alice-doe/maps/map_yyy

# User 3: bob@gmail.com
POST /api/maps → open-mindmap/bob/maps/map_zzz

# 충돌 없음 - 각자 다른 레포지토리
```

## 🐛 문제 해결

### **"Repository not found"**

**원인**: Organization에 사용자의 레포지토리가 없음

**해결**:
1. API가 자동으로 레포지토리 생성 시도
2. 실패 시 GitHub 토큰 권한 확인:
   - `repo` 권한 필요
   - Organization 접근 권한 필요

### **"Permission denied"**

**원인**: GitHub 토큰이 Organization 접근 권한 없음

**해결**:
1. PAT 재생성 시 Organization 선택
2. `admin:org` → `read:org` scope 추가
3. Organization Settings → Third-party access 확인

### **"Bad credentials"**

**원인**: GitHub 토큰이 유효하지 않음

**해결**:
1. 토큰 만료 확인
2. 새 토큰 생성
3. 환경변수 업데이트
4. API 서버 재시작

## 📚 관련 문서

- **[BRANCH_ARCHITECTURE.md](./BRANCH_ARCHITECTURE.md)** - 브랜치 기반 저장소
- **[GITHUB_SETUP.md](./GITHUB_SETUP.md)** - GitHub 설정 가이드
- **[GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md)** - Google OAuth 설정
- **[DEPLOY.md](./DEPLOY.md)** - 배포 가이드
- **[README.md](../README.md)** - 전체 프로젝트 개요

## 🎯 결론

**중앙 Organization 아키텍처는:**
- ✅ 관리가 쉽고
- ✅ 확장성이 뛰어나며
- ✅ 보안이 강화되고
- ✅ 사용자 경험이 향상됩니다

모든 사용자 데이터가 `open-mindmap` Organization 아래에서 체계적으로 관리됩니다.

