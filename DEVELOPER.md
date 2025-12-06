# 개발자 가이드 - 로컬 테스트 실행

이 문서는 로컬 환경에서 프로젝트를 테스트하기 위한 실행 코드와 설정 방법을 설명합니다.

## 📋 목차

- [필수 요구사항](#필수-요구사항)
- [환경 설정](#환경-설정)
- [로컬 실행 방법](#로컬-실행-방법)
- [테스트 명령어](#테스트-명령어)
- [문제 해결](#문제-해결)

## 필수 요구사항

로컬 테스트를 위해 다음이 필요합니다:

- **Node.js** >= 18.0.0
- **Redis** 서버 (세션 및 캐시 저장용)
- **npm** 또는 **yarn** 패키지 매니저
- **Git** (선택사항: GitHub 연동 테스트용)

### Redis 설치

```bash
# macOS
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt-get install redis-server
sudo systemctl start redis

# Windows (WSL 또는 Docker 사용 권장)
# 또는 Redis for Windows 다운로드
```

Redis가 실행 중인지 확인:

```bash
redis-cli ping
# 응답: PONG
```

## 환경 설정

### 1. 저장소 클론 및 의존성 설치

```bash
# 저장소 클론
git clone https://github.com/yourusername/mindmap.git
cd mindmap

# 루트 의존성 설치
npm install

# API 의존성 설치
cd api
npm install

# Frontend 의존성 설치
cd ../frontend
npm install
```

또는 Makefile 사용:

```bash
make install
```

### 2. 환경 변수 설정

#### API 환경 변수 (`api/.env`)

```bash
# api/.env 파일 생성
cd api
cat > .env << EOF
# Server
PORT=8787
NODE_ENV=development

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=

# Google OAuth (선택사항 - DEV_MODE 사용 시 불필요)
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8787/auth/google/callback
FRONTEND_URL=http://localhost:3000

# GitHub Storage (선택사항 - Local Git 사용 시 불필요)
GITHUB_TOKEN=ghp_your_personal_access_token
GITHUB_OWNER=your-github-username
# 또는 조직 사용 시:
# GITHUB_ORG=your-organization-name

# CORS
CORS_ORIGIN=http://localhost:3000

# Development Mode (인증 우회 - 빠른 테스트용)
DEV_MODE=true

# Git Provider (github 또는 local)
GIT_PROVIDER=local

# Local Git 설정 (GIT_PROVIDER=local일 때 사용)
LOCAL_GIT_ROOT=./data/repos
LOCAL_GIT_OWNER=local
LOCAL_GIT_AUTHOR_NAME=Mindmap Ziin
LOCAL_GIT_AUTHOR_EMAIL=mindmap@ziin.ai
EOF
```

#### Frontend 환경 변수 (`frontend/.env.local`)

```bash
# frontend/.env.local 파일 생성
cd frontend
cat > .env.local << EOF
VITE_API_URL=http://localhost:8787
VITE_DEV_MODE=true
EOF
```

## 로컬 실행 방법

### 방법 1: Makefile 사용 (권장)

가장 간단한 방법입니다:

```bash
# 루트 디렉토리에서

# API와 Frontend 동시 실행 (병렬)
make dev

# 또는 개별 실행
make dev-api      # API만 실행 (포트 8787)
make dev-frontend # Frontend만 실행 (포트 3000)
```

### 방법 2: npm 스크립트 사용

#### 옵션 A: 루트에서 실행

```bash
# 루트 디렉토리에서
npm run dev              # API와 Frontend 동시 실행
npm run dev:api          # API만 실행
npm run dev:frontend     # Frontend만 실행
```

#### 옵션 B: 개별 디렉토리에서 실행

**터미널 1 - API 서버:**

```bash
cd api
npm install
npm run dev
```

API 서버는 `http://localhost:8787`에서 실행됩니다.

**터미널 2 - Frontend 서버:**

```bash
cd frontend
npm install
npm run dev
```

Frontend는 `http://localhost:3000` (또는 Vite 기본 포트)에서 실행됩니다.

### 방법 3: Docker Compose 사용

전체 스택을 Docker로 실행:

```bash
# 루트 디렉토리에서
docker-compose up -d

# 로그 확인
docker-compose logs -f

# 서비스 중지
docker-compose down
```

자세한 내용은 [README-DOCKER.md](./README-DOCKER.md)를 참조하세요.

### 방법 4: 수동 실행 (디버깅용)

개별 프로세스로 실행하여 로그를 명확히 확인:

```bash
# 터미널 1: Redis 확인
redis-cli ping

# 터미널 2: API 실행
cd api
npm run dev

# 터미널 3: Frontend 실행
cd frontend
npm run dev
```

## 테스트 명령어

### API 헬스 체크

```bash
# API가 정상 작동하는지 확인
curl http://localhost:8787/health

# 예상 응답:
# {"ok":true,"message":"API is healthy"}
```

### API 엔드포인트 테스트

```bash
# 개발 모드에서 인증 없이 맵 목록 조회
curl http://localhost:8787/api/maps

# 인증 토큰 사용 (DEV_MODE=false일 때)
curl -H "Authorization: Bearer your-token" \
  http://localhost:8787/api/maps

# 맵 조회
curl http://localhost:8787/api/maps/map_1234567890

# 맵 생성
curl -X POST http://localhost:8787/api/maps \
  -H "Content-Type: application/json" \
  -d '{
    "id": "map_test_001",
    "title": "Test Map",
    "nodes": [],
    "edges": []
  }'
```

### Frontend 접속

브라우저에서 다음 URL로 접속:

- **Frontend**: http://localhost:3000 (또는 Vite가 표시하는 포트)
- **API**: http://localhost:8787

### 타입 체크

```bash
# API 타입 체크
cd api
npm run type-check

# Frontend 타입 체크
cd frontend
npm run type-check
```

### 린트 실행

```bash
# 루트에서 전체 린트
npm run lint

# 또는 개별 실행
cd api
npm run lint

cd frontend
npm run lint
```

### 스키마 검증

```bash
# 맵 스키마 검증
cd scripts
node validate.mjs ../schemas/map.schema.json
```

## 개발 모드 (DEV_MODE)

개발 모드를 활성화하면 Google OAuth 없이 빠르게 테스트할 수 있습니다.

### 설정

**`api/.env`:**
```bash
DEV_MODE=true
```

**`frontend/.env.local`:**
```bash
VITE_DEV_MODE=true
```

### 동작 방식

- **Backend**: 모든 인증 요청을 우회하고 mock 사용자 자동 설정
- **Frontend**: 자동 로그인, Google OAuth 화면 없이 바로 Dashboard 접근

자세한 내용은 [docs/DEV_MODE_GUIDE.md](./docs/DEV_MODE_GUIDE.md)를 참조하세요.

## Git Provider 설정

### Local Git 사용 (GitHub 없이 테스트)

로컬 파일 시스템에 Git 저장소를 생성하여 테스트:

```bash
# api/.env
GIT_PROVIDER=local
LOCAL_GIT_ROOT=./data/repos
LOCAL_GIT_OWNER=local
```

데이터는 `./data/repos/local/` 디렉토리에 저장됩니다.

### GitHub 사용

```bash
# api/.env
GIT_PROVIDER=github
GITHUB_TOKEN=ghp_your_token
GITHUB_OWNER=your-username
# 또는
GITHUB_ORG=your-organization
```

## 문제 해결

### Redis 연결 오류

```bash
# Redis가 실행 중인지 확인
redis-cli ping

# Redis 재시작 (macOS)
brew services restart redis

# Redis 재시작 (Linux)
sudo systemctl restart redis
```

### 포트 충돌

```bash
# 포트 사용 중인 프로세스 확인
lsof -i :8787  # API 포트
lsof -i :3000  # Frontend 포트
lsof -i :6379  # Redis 포트

# 프로세스 종료
kill -9 <PID>
```

### 의존성 오류

```bash
# node_modules 삭제 후 재설치
rm -rf node_modules package-lock.json
npm install

# API와 Frontend 모두 재설치
cd api && rm -rf node_modules && npm install
cd ../frontend && rm -rf node_modules && npm install
```

### 환경 변수 로드 오류

```bash
# .env 파일이 올바른 위치에 있는지 확인
ls -la api/.env
ls -la frontend/.env.local

# 환경 변수 확인 (API)
cd api
node -e "require('dotenv').config(); console.log(process.env.DEV_MODE)"
```

### 빌드 오류

```bash
# TypeScript 컴파일 오류 확인
cd api
npm run type-check

cd ../frontend
npm run type-check

# 캐시 삭제 후 재빌드
cd api
rm -rf dist
npm run build
```

### CORS 오류

Frontend에서 API 호출 시 CORS 오류가 발생하면:

```bash
# api/.env 확인
CORS_ORIGIN=http://localhost:3000

# 또는 Vite가 다른 포트를 사용하는 경우
CORS_ORIGIN=http://localhost:5173
```

## 빠른 시작 체크리스트

로컬 테스트를 빠르게 시작하려면:

```bash
# 1. Redis 시작
redis-server
# 또는
brew services start redis

# 2. 환경 변수 설정 (최소 설정)
echo "DEV_MODE=true" > api/.env
echo "REDIS_URL=redis://localhost:6379" >> api/.env
echo "GIT_PROVIDER=local" >> api/.env
echo "LOCAL_GIT_ROOT=./data/repos" >> api/.env

echo "VITE_API_URL=http://localhost:8787" > frontend/.env.local
echo "VITE_DEV_MODE=true" >> frontend/.env.local

# 3. 의존성 설치
make install

# 4. 개발 서버 실행
make dev

# 5. 브라우저에서 접속
# http://localhost:3000
```

## 추가 리소스

- [README.md](./README.md) - 프로젝트 전체 개요
- [docs/DEV_MODE_GUIDE.md](./docs/DEV_MODE_GUIDE.md) - 개발 모드 상세 가이드
- [docs/GITHUB_SETUP.md](./docs/GITHUB_SETUP.md) - GitHub 설정 가이드
- [docs/GOOGLE_OAUTH_SETUP.md](./docs/GOOGLE_OAUTH_SETUP.md) - Google OAuth 설정
- [README-DOCKER.md](./README-DOCKER.md) - Docker 실행 가이드

## 유용한 명령어 요약

```bash
# 개발 서버 실행
make dev                    # API + Frontend 동시 실행
make dev-api               # API만 실행
make dev-frontend          # Frontend만 실행

# 의존성 관리
make install               # 모든 의존성 설치
npm install                # 루트 의존성 설치

# 빌드 및 검증
npm run build              # 전체 빌드
npm run type-check         # 타입 체크 (workspace)
npm run lint               # 린트 실행

# Docker
docker-compose up -d       # Docker로 실행
docker-compose logs -f     # 로그 확인
docker-compose down        # 중지

# 테스트
curl http://localhost:8787/health  # API 헬스 체크
```

---

**참고**: 이 가이드는 로컬 개발 환경을 위한 것입니다. 프로덕션 배포는 [docs/DEPLOY.md](./docs/DEPLOY.md) 또는 [deployment/README.md](./deployment/README.md)를 참조하세요.

