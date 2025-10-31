# Nginx HTTPS 설정

이 디렉토리는 HTTPS를 처리하는 nginx 리버스 프록시 설정을 포함합니다.

## 빠른 시작 (개발용 자체 서명 인증서)

### 1. SSL 인증서 생성

```bash
cd deployment/nginx
./generate-ssl.sh
```

이 명령어는 `ssl/` 디렉토리에 자체 서명 인증서를 생성합니다.

### 2. Docker Compose 실행

```bash
# 프로젝트 루트에서
docker-compose up -d
```

### 3. 접속

- **HTTP**: http://localhost → 자동으로 HTTPS로 리다이렉트
- **HTTPS**: https://localhost (브라우저에서 보안 경고 무시)

## 프로덕션 환경 (Let's Encrypt)

프로덕션 환경에서는 Let's Encrypt 인증서를 사용하는 것을 권장합니다.

### 1. 도메인 설정

`.env` 파일에 도메인 설정:

```bash
DOMAIN=yourdomain.com
```

### 2. Certbot으로 인증서 발급

```bash
# Certbot 컨테이너 추가 (docker-compose에 certbot 서비스 추가 필요)
docker run -it --rm \
  -v $(pwd)/deployment/nginx/ssl:/etc/letsencrypt \
  -v certbot-www:/var/www/certbot \
  certbot/certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email \
  -d yourdomain.com \
  -d www.yourdomain.com
```

### 3. 인증서 자동 갱신

```bash
# certbot 서비스를 docker-compose에 추가하거나 cron 작업 설정
docker run -it --rm \
  -v $(pwd)/deployment/nginx/ssl:/etc/letsencrypt \
  -v certbot-www:/var/www/certbot \
  certbot/certbot renew
```

## 설정 파일 구조

- `nginx.conf`: 메인 nginx 설정 파일
- `generate-ssl.sh`: 개발용 자체 서명 인증서 생성 스크립트
- `ssl/`: SSL 인증서 디렉토리 (gitignore에 추가됨)

## 주요 기능

1. **HTTP → HTTPS 리다이렉트**: 모든 HTTP 요청을 HTTPS로 리다이렉트
2. **프론트엔드 프록시**: `/` 경로를 프론트엔드로 프록시
3. **API 프록시**: `/api` 경로를 백엔드 API로 프록시
4. **보안 헤더**: HSTS, XSS 보호 등 보안 헤더 추가
5. **Gzip 압축**: 성능 최적화
6. **Let's Encrypt 지원**: `.well-known/acme-challenge/` 경로 지원

## 문제 해결

### SSL 인증서 오류

자체 서명 인증서를 사용하는 경우 브라우저에서 보안 경고가 나타납니다. 개발 환경에서는 "고급 설정" → "계속 진행"을 클릭하세요.

### 502 Bad Gateway

- Backend나 Frontend 서비스가 실행 중인지 확인:
  ```bash
  docker-compose ps
  ```

- 로그 확인:
  ```bash
  docker-compose logs api
  docker-compose logs frontend
  docker-compose logs nginx
  ```

### 포트 충돌

포트 80 또는 443이 이미 사용 중인 경우, docker-compose.yml에서 포트를 변경하세요.

