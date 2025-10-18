# 🔍 Repository 찾기 코드 정리

## 📍 코드 위치

### 1. **Repository 경로 생성** (`api/src/utils/github.ts`)

```typescript
/**
 * Get GitHub organization name from environment
 * Defaults to "open-mindmap" if not set
 */
export function getGitHubOrg(): string {
  return process.env.GITHUB_ORG || 'open-mindmap';
}

/**
 * Extract repository name from user information
 * This will be used as the repository name under the organization
 */
export function getGitHubRepoName(user: User): string {
  // Extract from email (most common case)
  if (user.email) {
    const emailPrefix = user.email.split('@')[0];
    const sanitized = emailPrefix
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-')
      .replace(/^[-_]+|[-_]+$/g, '');
    
    if (sanitized) {
      return sanitized;
    }
  }

  // Try name
  if (user.name) {
    const sanitized = user.name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-_]/g, '')
      .replace(/^[-_]+|[-_]+$/g, '');
    
    if (sanitized) {
      return sanitized;
    }
  }

  // Fallback to userId
  return user.userId.toLowerCase().replace(/[^a-z0-9-_]/g, '-');
}

/**
 * Get full GitHub repository path (owner/repo)
 */
export function getGitHubRepoPath(user: User): { owner: string; repo: string } {
  const owner = getGitHubOrg();       // "open-mindmap"
  const repo = getGitHubRepoName(user); // "john"
  
  return { owner, repo };               // { owner: "open-mindmap", repo: "john" }
}
```

**파일**: `api/src/utils/github.ts`  
**라인**: 1-69

---

### 2. **GitHubClient 초기화** (`api/src/github/client.ts`)

```typescript
export class GitHubClient {
  private octokit: Octokit;
  private user: User;
  private owner: string;  // Organization name
  private repo: string;   // User repository name

  constructor(user: User) {
    // Get user-specific repository path
    const repoPath = getGitHubRepoPath(user);
    this.owner = repoPath.owner;  // "open-mindmap"
    this.repo = repoPath.repo;    // "john"

    // Initialize Octokit with GitHub token
    this.octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN || 'placeholder-token',
    });
    this.user = user;

    console.log(`📁 GitHubClient initialized for ${this.owner}/${this.repo}`);
  }
}
```

**파일**: `api/src/github/client.ts`  
**라인**: 17-31

---

### 3. **Repository 확인/생성** (`api/src/github/client.ts`)

```typescript
async createMap(map: Map): Promise<PRTransaction> {
  const branchName = `${BRANCH_PREFIX}${map.id}`;  // maps/map_xxx

  try {
    // ==========================================
    // STEP 1: Repository 확인
    // ==========================================
    try {
      await this.octokit.repos.get({
        owner: this.owner,  // "open-mindmap"
        repo: this.repo,    // "john"
      });
      
      console.log(`✅ Repository ${this.owner}/${this.repo} exists`);
      
    } catch (error: any) {
      if (error.status === 404) {
        // ==========================================
        // STEP 2: Repository 생성 (없을 경우)
        // ==========================================
        console.log(`📦 Repository ${this.owner}/${this.repo} not found. Creating...`);
        
        await this.octokit.repos.createInOrg({
          org: this.owner,        // Organization name
          name: this.repo,        // Repository name
          description: `Personal mindmap data storage for Open Mindmap (${this.user.email})`,
          private: true,
          auto_init: true,        // Create with initial commit
        });
        
        console.log(`✅ Repository ${this.owner}/${this.repo} created successfully`);
        
        // Wait for repository initialization
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        throw error;  // Other errors
      }
    }
    
    // Repository is now ready, continue with branch creation...
    
  } catch (error: any) {
    console.error(`❌ Error creating map:`, error.message);
    throw error;
  }
}
```

**파일**: `api/src/github/client.ts`  
**라인**: 133-163

---

### 4. **Repository 조회 (맵 목록)** (`api/src/github/client.ts`)

```typescript
async getIndex(): Promise<Index> {
  try {
    // List all branches in repository
    const { data: branches } = await this.octokit.repos.listBranches({
      owner: this.owner,  // "open-mindmap"
      repo: this.repo,    // "john"
      per_page: 100,
    });

    // Filter branches that start with "maps/"
    const mapBranches = branches.filter((branch) => 
      branch.name.startsWith(BRANCH_PREFIX)  // "maps/"
    );

    // Fetch map data for each branch
    const itemsPromises = mapBranches.map(async (branch) => {
      try {
        const mapId = branch.name.substring(BRANCH_PREFIX.length);
        const map = await this.getMap(mapId);
        
        return {
          id: map.id,
          title: map.title,
          tags: map.tags || [],
          nodeCount: map.nodes.length,
          edgeCount: map.edges.length,
          updatedAt: map.updatedAt,
          version: map.version,
        };
      } catch (error) {
        console.error(`Failed to fetch map from branch ${branch.name}:`, error);
        return null;
      }
    });

    const items = await Promise.all(itemsPromises);
    const validItems: IndexItem[] = items.filter((item) => item !== null) as IndexItem[];

    return {
      generatedAt: new Date().toISOString(),
      items: validItems,
    };
  } catch (error: any) {
    if (error.status === 404) {
      // Repository doesn't exist yet
      console.log(`📦 Repository ${this.owner}/${this.repo} not found (empty index)`);
      return {
        generatedAt: new Date().toISOString(),
        items: [],
      };
    }
    throw error;
  }
}
```

**파일**: `api/src/github/client.ts`  
**라인**: 43-99

---

## 🔄 전체 흐름

### **사용자 로그인 → Repository 경로 결정**

```typescript
// 1. 사용자 정보
const user = {
  userId: 'google_123456',
  email: 'john@example.com',
  name: 'John Doe',
  picture: 'https://...'
}

// 2. Repository 경로 생성
import { getGitHubRepoPath } from './utils/github.js';

const repoPath = getGitHubRepoPath(user);
console.log(repoPath);
// → { owner: 'open-mindmap', repo: 'john' }

// 3. GitHubClient 초기화
const client = new GitHubClient(user);
// 내부적으로:
// this.owner = 'open-mindmap'
// this.repo = 'john'
```

### **맵 생성 시 Repository 확인**

```typescript
// client.createMap(map) 호출

// Step 1: Repository 존재 확인
await octokit.repos.get({
  owner: 'open-mindmap',
  repo: 'john'
})

// Case A: 200 OK
// → Repository 존재
// → 다음 단계로 진행 (브랜치 생성)

// Case B: 404 Not Found
// → Repository 없음
// → 자동 생성:
await octokit.repos.createInOrg({
  org: 'open-mindmap',
  name: 'john',
  private: true,
  auto_init: true
})
```

## 📂 코드 파일 경로

| 기능 | 파일 | 라인 |
|------|------|------|
| **Org 이름 가져오기** | `api/src/utils/github.ts` | 48-50 |
| **Repo 이름 생성** | `api/src/utils/github.ts` | 16-44 |
| **Repo 경로 생성** | `api/src/utils/github.ts` | 58-64 |
| **GitHubClient 초기화** | `api/src/github/client.ts` | 17-31 |
| **Repo 확인** | `api/src/github/client.ts` | 139-142 |
| **Repo 생성** | `api/src/github/client.ts` | 148-154 |
| **Branch 리스트 조회** | `api/src/github/client.ts` | 48-53 |
| **Map 파일 조회** | `api/src/github/client.ts` | 109-114 |

## 🎯 핵심 코드 요약

### **Repository 경로 결정**

```typescript:api/src/utils/github.ts
export function getGitHubRepoPath(user: User): { owner: string; repo: string } {
  const owner = getGitHubOrg();        // GITHUB_ORG || 'open-mindmap'
  const repo = getGitHubRepoName(user); // email prefix
  
  return { owner, repo };
}
```

### **Repository 확인**

```typescript:api/src/github/client.ts
// Line 139-142
await this.octokit.repos.get({
  owner: this.owner,  // 'open-mindmap'
  repo: this.repo,    // 'john'
});
```

### **Repository 생성**

```typescript:api/src/github/client.ts
// Line 148-154
await this.octokit.repos.createInOrg({
  org: this.owner,             // 'open-mindmap'
  name: this.repo,             // 'john'
  description: `Personal mindmap data storage for Open Mindmap (${this.user.email})`,
  private: true,
  auto_init: true,
});
```

## 🧪 디버깅 방법

### **로그 확인**

```bash
# API 서버 실행
cd api
npm run dev

# 맵 생성 시 로그:
📁 GitHubClient initialized for open-mindmap/john
📦 Repository open-mindmap/john not found. Creating...
✅ Repository open-mindmap/john created successfully
```

### **수동 테스트**

```bash
# Repository 확인
gh repo view open-mindmap/john

# 또는 curl
curl -H "Authorization: token ghp_xxx" \
  https://api.github.com/repos/open-mindmap/john

# 200 OK → 존재
# 404 Not Found → 없음
```

## 🔧 커스터마이징

### **다른 Organization 사용**

```bash
# api/.env
GITHUB_ORG=my-company
```

결과: `my-company/john`, `my-company/alice-doe`, ...

### **Repository 이름 규칙 변경**

`api/src/utils/github.ts` 수정:

```typescript
export function getGitHubRepoName(user: User): string {
  // 커스텀 로직
  return `mindmap-${user.email.split('@')[0]}`;
}
```

결과: `open-mindmap/mindmap-john`, `open-mindmap/mindmap-alice`, ...

이제 repo를 찾고 생성하는 전체 코드를 확인하셨습니다! 🎯

