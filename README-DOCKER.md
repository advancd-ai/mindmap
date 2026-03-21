# Docker Compose 실행 가이드

이 프로젝트는 Docker Compose를 사용하여 backend, frontend, redis, nginx(HTTPS)를 한번에 실행할 수 있습니다.

## 빠른 시작

### 1. SSL 인증서 생성 (개발용)

개발 환경에서는 자체 서명 인증서를 사용합니다:

```bash
cd deployment/nginx
./generate-ssl.sh
```

이 명령어는 `deployment/nginx/ssl/` 디렉토리에 자체 서명 인증서를 생성합니다.

프로덕션 환경에서는 Let's Encrypt 인증서를 사용하세요 (자세한 내용은 `deployment/nginx/README.md` 참조).

### 2. 환경 변수 설정

`.env.example` 파일을 `.env`로 복사하고 필요한 값들을 설정하세요:

```bash
cp .env.example .env
```

`.env` 파일에서 다음 값들을 설정해야 합니다:

- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: Google OAuth 사용 시 필요
- `GOOGLE_REDIRECT_URI`: `https://localhost/auth/callback` (HTTPS 사용)
- `FRONTEND_URL`: `https://localhost` (HTTPS 사용)
- `CORS_ORIGIN`: `https://localhost` (HTTPS 사용)
- `VITE_API_URL`, `VITE_ADSENSE_ENABLED`: **컨테이너 시작 시** `runtime-config.js`로 주입됩니다(이미지 재빌드 없이 `.env` 수정 후 `docker compose up -d frontend`로 반영). 자세한 설명은 [docs/ENVIRONMENT.md](./docs/ENVIRONMENT.md) 참고.
- `GITHUB_TOKEN`: GitHub API 사용 시 필요
- `GITHUB_OWNER`, `GITHUB_ORG`: GitHub 저장소 설정

개발 모드로 실행하려면:
```
DEV_MODE=true
```

### 3. Docker Compose 실행

```bash
# 모든 서비스 빌드 및 실행
docker-compose up -d

# 로그 확인
docker-compose logs -f

# 특정 서비스 로그만 확인
docker-compose logs -f api
docker-compose logs -f frontend
docker-compose logs -f nginx
docker-compose logs -f redis
```

### 4. 서비스 접속

- **Frontend**: https://localhost (HTTP는 자동으로 HTTPS로 리다이렉트)
- **Backend API**: https://localhost/api
- **Redis**: localhost:6379 (내부 네트워크에서만 접근 가능)

**참고**: 자체 서명 인증서를 사용하는 경우 브라우저에서 보안 경고가 나타납니다. 개발 환경에서는 "고급 설정" → "계속 진행"을 클릭하세요.

## 주요 명령어

```bash
# 서비스 시작
docker-compose up -d

# 서비스 중지
docker-compose down

# 서비스 중지 및 볼륨 삭제 (Redis 데이터 포함)
docker-compose down -v

# 재빌드 후 시작
docker-compose up -d --build

# 특정 서비스만 재빌드
docker-compose build api

# 서비스 상태 확인
docker-compose ps

# 컨테이너 쉘 접속
docker-compose exec api sh
docker-compose exec frontend sh
docker-compose exec redis sh
```

## 서비스 구조

- **nginx**: HTTPS 리버스 프록시 (포트 80, 443)
- **redis**: 세션 및 캐시 저장소 (포트 6379 - 내부 네트워크만)
- **api**: Node.js 기반 백엔드 API (내부 네트워크만, nginx를 통해 접근)
- **frontend**: React 기반 프론트엔드 (내부 네트워크만, nginx를 통해 접근)

### 네트워크 구조

```
인터넷
  ↓
nginx (포트 80, 443)
  ├─ / → frontend:80
  └─ /api → api:8787
```

모든 트래픽은 nginx를 통해 라우팅되며, Frontend와 API는 외부에서 직접 접근할 수 없습니다.

## 개발 모드

개발 중에는 Docker 없이 로컬에서 실행할 수도 있습니다:

```bash
# Redis만 Docker로 실행
docker-compose up redis -d

# Backend 로컬 실행
cd api && npm run dev

# Frontend 로컬 실행
cd frontend && npm run dev
```

## HTTPS 설정

자세한 내용은 [`deployment/nginx/README.md`](deployment/nginx/README.md)를 참조하세요.

### 개발 환경
- 자체 서명 인증서 사용
- 브라우저 보안 경고 무시 가능

### 프로덕션 환경
- Let's Encrypt 인증서 사용 권장
- Certbot으로 인증서 발급 및 자동 갱신

## 문제 해결

### 포트 충돌
포트 80 또는 443이 이미 사용 중인 경우 `docker-compose.yml`에서 포트를 변경하세요.

### SSL 인증서 오류
- 자체 서명 인증서를 사용하는 경우 브라우저에서 보안 경고가 나타납니다. 개발 환경에서는 "고급 설정" → "계속 진행"을 클릭하세요.
- 인증서 파일이 없는 경우: `deployment/nginx/generate-ssl.sh` 실행

### 502 Bad Gateway
- Backend나 Frontend 서비스가 실행 중인지 확인: `docker-compose ps`
- 로그 확인: `docker-compose logs nginx api frontend`

### Redis 연결 오류
Redis가 완전히 시작될 때까지 기다려야 합니다. `docker-compose ps`로 상태를 확인하세요.

### 환경 변수 문제
`.env` 파일이 올바르게 설정되었는지 확인하세요. **HTTPS를 사용하는 경우 모든 URL을 `https://`로 설정해야 합니다.**

### CORS 오류
`CORS_ORIGIN` 환경 변수가 올바른 HTTPS URL로 설정되어 있는지 확인하세요.

