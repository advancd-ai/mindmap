# Local Git Backend Design

## 1. 목표
- 현재 GitHub에 의존하는 저장소 계층을 **로컬 Git 서버**로도 선택할 수 있도록 확장한다.
- API 형태는 기존 GitHub REST v3 호출과 동일하게 유지하여 프론트엔드/백엔드 로직 수정 최소화.
- 배포 환경에 따라 두 모드를 전환할 수 있게 `GIT_PROVIDER=github|local` 형태의 설정을 도입한다.

## 2. 기존 구조 요약
- 백엔드는 `GitHubClient`를 통해 GitHub REST API(`repos.getContent`, `createOrUpdateFileContents`, `git.createRef` 등)를 호출한다.
- 각 마인드맵은 `maps/<mapId>` 브랜치에 저장되며 `maps/index.json`이 메타데이터다.
- 업로드/다운로드, map CRUD, history 조회가 모두 GitHub API에 의존한다.

## 3. 설계 방향
### 3.1 Git Provider 추상화
- `src/github/client.ts`, `src/routes/maps.ts`, `src/routes/upload.ts` 등에서 공통적으로 사용되는 GitHub 전용 로직을 `GitProvider` 인터페이스로 추상화한다.
  ```ts
  interface GitProvider {
    ensureRepo(): Promise<void>;
    ensureBranch(mapId: string): Promise<void>;
    getFile(mapId: string, path: string): Promise<FileObject>;
    upsertFile(mapId: string, path: string, content: Buffer, message: string, options?: { encoding?: 'base64' | 'utf-8' }): Promise<void>;
    deleteBranch(mapId: string): Promise<void>;
    listBranches(): Promise<string[]>;
    listCommits(mapId: string, params?: { perPage?: number }): Promise<CommitInfo[]>;
    getMapIndex(): Promise<IndexJson>;
    updateMapIndex(transform: (index: IndexJson) => IndexJson): Promise<void>;
    // 추가: file upload/download, snapshot 등 현재 GitHubClient에서 제공하는 메서드
  }
  ```
- 환경 변수 `GIT_PROVIDER`에 따라 `GitHubProvider` 또는 `LocalGitProvider` 인스턴스를 주입한다.

### 3.2 Local Git Provider 구조
- 저장소 위치: `data/repos/<owner>/<repo>.git` (bare repository) 혹은 `data/repos/<owner>/<repo>`(worktree).
- 필요한 연산:
  - **브랜치 생성/삭제:** NodeJS에서 `simple-git`, `isomorphic-git`, 혹은 `git` CLI를 `child_process`로 호출.
  - **파일 읽기/쓰기:** worktree 체크아웃 후 FS로 조작하거나, `isomorphic-git`의 `readBlob`, `writeBlob`, `commit`, `push` 등을 활용.
  - **커밋 메타데이터:** author, message를 직접 지정하여 `git commit` 실행.
- REST API 형태:
  - `GET /upload/download/:mapId/:filename` → 로컬 파일을 스트림으로 반환.
  - `GET /maps/:id` → 브랜치 체크아웃 후 `map.json` 읽기.
  - `PUT /maps/:id` → 파일 생성/수정 후 commit.
  - `GET /maps/:id/history` → `git log` 결과를 포맷.
  - `upload.post('/')` → 파일을 `files/` 아래에 저장.
- GitHub REST API를 사용할 때와 동일한 데이터 구조를 유지하고, 응답 형식을 맞춘다 (`content` base64 등).

### 3.3 라우팅 단계별 동작
| 기능 | GitHub 모드 | Local Git 모드 |
| --- | --- | --- |
| 맵 생성 | `createMap` → `createOrUpdateFileContents` + `git.createRef` | 로컬 브랜치 생성 후 `map.json` commit |
| 맵 조회 | `repos.getContent` | `git show <branch>:map.json` |
| 맵 저장 | `updateMap` → PR/branch update | 로컬 브랜치에 파일 쓰기 + commit |
| 파일 업로드 | upload route에서 `uploadFileToGitHub` | 로컬 Git provider에서 blob 생성 후 commit |
| 다운로드 | `/upload/download` → GitHub `repos.getContent` | 로컬 파일을 읽어 스트림 |
| History | `repos.listCommits` | `git log` |

### 3.4 구조도
```
┌───────────────┐            ┌────────────────────────┐
│   Frontend    │  REST API  │        Backend          │
│ (React + API) │───────────►│ Hono routes + provider │
└───────────────┘            ├──────────────┬─────────┤
                             │GitHubProvider│LocalGit │
                             │(REST v3)     │Provider │
                             └──────────────┴─────────┘
                                            │
                                            ▼
                                   Local bare repository
```

## 4. Local Git Provider 구현 세부
### 4.1 저장 구조
- `data/repos/<repo>` 디렉토리(환경변수 `LOCAL_GIT_ROOT`).
- 초기화: `git init --bare` 혹은 worktree용 `git init`.
- 각 맵: `maps/<mapId>` 브랜치.
- index: `maps/index.json` (main 브랜치 혹은 별도 브랜치).

### 4.2 의존 라이브러리 후보
- `simple-git`: git CLI wrapper. 설치 간단, 시스템에 git 필요.
- `isomorphic-git`: pure JS. Vite/Cloudflare 등에서 사용 가능.
- `nodegit`: libgit2 기반; 빌드 부담.
- 설계에서는 `simple-git`을 기본으로 가정. 컨테이너/배포 환경에서 git 설치 필수.

### 4.3 트랜잭션 처리
- 저장/업로드는 다음 순서:
  1. 작업 디렉토리 (temporary checkout) 준비.
  2. 파일 수정/추가.
  3. `git add`, `git commit`.
  4. 필요한 경우 main 브랜치 업데이트 및 merge.
- 실패 시 작업 디렉토리를 정리.

### 4.4 인증 & 권한
- 로컬 모드에서는 GitHub OAuth 토큰이 필요 없음.
- 백엔드가 사용자별 repo를 구분하기 위해 기존처럼 `getGitHubRepoName(user)` 로 repo 이름을 생성.
- 토큰이 없어도 로컬 provider는 user 정보를 기반으로 repo path만 결정하면 됨.

### 4.5 설정
| 환경변수 | 설명 | 기본값 |
| --- | --- | --- |
| `GIT_PROVIDER` | `github` 또는 `local` | `github` |
| `LOCAL_GIT_ROOT` | 로컬 저장소 루트 디렉토리 | `./data/repos` |
| `LOCAL_GIT_SHELL` | git 실행 경로(선택) | `git` |

백엔드 시작 시 provider 선택:
```ts
const gitProvider = GIT_PROVIDER === 'local'
  ? new LocalGitProvider({ root: LOCAL_GIT_ROOT })
  : new GitHubProvider({ token: GITHUB_TOKEN, ... });
```

## 5. 마이그레이션 전략
1. Git provider 인터페이스 및 DI 적용.
2. GitHub provider를 인터페이스에 맞게 리팩터링.
3. Local provider 구현 및 기본 CRUD/업로드/다운로드 지원.
4. 설정(ENV)로 프로바이더 선택 가능하도록 수정.
5. 문서/배포 가이드 업데이트 (예: `docs/local_git.md`).

## 6. 테스트 계획
- Unit 테스트: Local provider의 branch/file 연산을 tmp 디렉토리에서 검증.
- Integration: `GIT_PROVIDER=local` 로 API를 실행해 map 생성→업로드→조회→history 확인.
- 회귀 테스트: `GIT_PROVIDER=github`로 기존 기능 유지 확인.

## 7. 향후 개선
- GitHub과 로컬 간 동기화 옵션 (예: 백업).
- 로컬 provider를 위한 관리 UI (repo 상태, 용량 모니터링).
- 분산 락/동시성 제어 강화.

