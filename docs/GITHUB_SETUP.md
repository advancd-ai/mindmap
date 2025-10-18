# 📦 GitHub 레포지토리 설정 가이드

## 개요

Open Mindmap은 각 사용자의 개인 GitHub 레포지토리를 사용하여 마인드맵 데이터를 저장합니다.

## 🔑 핵심 개념

### **사용자별 레포지토리**
- 각 사용자는 자신의 GitHub 계정에 별도의 레포지토리를 가짐
- 레포지토리 경로: `{username}/mindmap-data`
- Username은 사용자의 이메일에서 자동 추출 (예: `user@example.com` → `user`)

### **자동 경로 결정**
```typescript
// 예시
user.email = "choonho@example.com"
→ GitHub Repository: choonho/mindmap-data

user.email = "john.doe@gmail.com"  
→ GitHub Repository: john-doe/mindmap-data
```

## 🚀 설정 방법

### 1. GitHub Personal Access Token 생성

1. **GitHub 설정 이동**
   ```
   GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
   ```

2. **Generate new token (classic) 클릭**

3. **Token 설정**
   - **Note**: `Open Mindmap API Access`
   - **Expiration**: `No expiration` 또는 원하는 기간
   - **Select scopes**:
     - ✅ `repo` (전체 선택)
       - `repo:status`
       - `repo_deployment`
       - `public_repo`
       - `repo:invite`
       - `security_events`

4. **Generate token** 클릭

5. **토큰 복사** (한 번만 표시됩니다!)
   ```
   ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

### 2. 환경변수 설정

**`api/.env`** 파일에 추가:
```bash
# GitHub Personal Access Token
GITHUB_TOKEN=ghp_your_actual_token_here

# Optional: 레포지토리 이름 커스터마이징 (기본값: mindmap-data)
GITHUB_REPO=mindmap-data
```

### 3. 개인 레포지토리 생성 (사용자별)

각 사용자는 자신의 GitHub 계정에 레포지토리를 만들어야 합니다:

1. **GitHub에서 새 레포지토리 생성**
   ```
   Repository name: mindmap-data
   Description: My personal mindmap data storage
   Visibility: Private (권장)
   
   ✅ Add a README file
   ```

2. **디렉토리 구조 생성**
   
   레포지토리에 다음 파일을 추가:
   
   **`maps/index.json`**:
   ```json
   {
     "generatedAt": "2025-01-01T00:00:00.000Z",
     "items": []
   }
   ```

   **`maps/.gitkeep`**:
   ```
   # 빈 파일 (maps 디렉토리 유지용)
   ```

## 📁 레포지토리 구조

```
{username}/mindmap-data/
├── README.md
├── maps/
│   ├── index.json              # 맵 인덱스
│   ├── map_1234567890.json     # 개별 맵 파일
│   ├── map_9876543210.json
│   └── ...
└── .github/
    └── workflows/              # Optional: CI/CD
```

## 🔄 동작 방식

### **1. 사용자 로그인**
```
Google OAuth → Email: choonho@example.com
```

### **2. GitHub Username 추출**
```typescript
getGitHubUsername(user)
→ "choonho@example.com" → "choonho"
```

### **3. 레포지토리 경로 생성**
```typescript
getGitHubRepoPath(user)
→ { owner: "choonho", repo: "mindmap-data" }
```

### **4. GitHub API 호출**
```typescript
octokit.repos.getContent({
  owner: "choonho",
  repo: "mindmap-data",
  path: "maps/index.json"
})
```

## 🛠️ Username 추출 규칙

### **우선순위**
1. **`user.githubUsername`** (명시적으로 설정된 경우)
2. **Email prefix** (이메일의 @ 앞부분)
3. **Name** (사용자 이름)
4. **UserId** (Google User ID)

### **Sanitization 규칙**
GitHub username은 다음 규칙을 따릅니다:
- 알파벳 소문자, 숫자, 하이픈(`-`)만 허용
- 하이픈으로 시작하거나 끝날 수 없음
- 공백은 하이픈으로 변환
- 특수문자는 하이픈으로 변환

```typescript
// 예시
"john.doe@example.com"  → "john-doe"
"user_name@gmail.com"   → "user-name"
"John Smith"            → "john-smith"
"user@123.com"          → "user"
"_test_user"            → "test-user"
```

## 🔐 보안 고려사항

### **1. Private Repository 권장**
- 개인 마인드맵 데이터는 민감할 수 있음
- Private 레포지토리 사용 권장

### **2. Token 권한 최소화**
- `repo` scope만 부여
- 다른 권한은 부여하지 않음

### **3. Token 보안**
- 환경변수로 관리
- Git에 커밋하지 않기
- 정기적으로 갱신

## 🧪 테스트

### **로컬 테스트**

1. **GitHub Token 설정**
   ```bash
   export GITHUB_TOKEN=ghp_your_token
   ```

2. **API 서버 실행**
   ```bash
   cd api
   npm run dev
   ```

3. **로그 확인**
   ```
   📁 GitHubClient initialized for choonho/mindmap-data
   ```

### **API 테스트**

```bash
# 인덱스 조회
curl http://localhost:8787/api/maps \
  -H "Authorization: Bearer your_session_token"

# 맵 생성
curl -X POST http://localhost:8787/api/maps \
  -H "Authorization: Bearer your_session_token" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "map_test123",
    "title": "Test Map",
    "nodes": [],
    "edges": [],
    "updatedAt": "2025-01-01T00:00:00.000Z",
    "version": 1
  }'
```

## 🐛 문제 해결

### **"Repository not found" 오류**

**원인**: 사용자의 GitHub 계정에 레포지토리가 없음

**해결**:
1. 사용자의 GitHub 계정으로 로그인
2. `mindmap-data` 레포지토리 생성
3. `maps/index.json` 파일 추가

### **"Bad credentials" 오류**

**원인**: GitHub Token이 유효하지 않음

**해결**:
1. Token 재생성
2. 환경변수 업데이트
3. API 서버 재시작

### **Username 충돌**

**원인**: 여러 사용자가 같은 username을 가질 수 있음

**해결**: 
각 사용자는 자신의 GitHub 계정을 사용하므로 충돌 없음
- `user1@example.com` → `user1/mindmap-data`
- `user2@example.com` → `user2/mindmap-data`

## 📚 관련 문서

- [GitHub Personal Access Tokens 문서](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)
- [Octokit REST API 문서](https://octokit.github.io/rest.js/)
- [API README](./api/README.md)

## 💡 고급 설정

### **커스텀 레포지토리 이름**

환경변수로 기본 레포지토리 이름 변경:
```bash
GITHUB_REPO=my-custom-mindmap
```

결과: `{username}/my-custom-mindmap`

### **명시적 GitHub Username 설정**

사용자 정보에 `githubUsername` 직접 설정 (향후 지원 예정):
```typescript
user.githubUsername = "my-github-handle"
```

결과: `my-github-handle/mindmap-data`

