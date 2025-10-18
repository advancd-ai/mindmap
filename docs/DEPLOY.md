# 배포 가이드 (Linux Server)

Open Mindmap을 리눅스 서버에 배포하는 상세 가이드입니다.

## 📋 요구사항

- Ubuntu 20.04+ / Debian 11+ (또는 다른 리눅스 배포판)
- Node.js 18.0.0 이상
- Redis 6.0 이상
- Nginx 또는 Apache (역방향 프록시용)
- PM2 (프로세스 관리, 권장)
- Git

## 1. 서버 준비

### 1.1 시스템 업데이트

```bash
sudo apt update
sudo apt upgrade -y
```

### 1.2 Node.js 설치

```bash
# NodeSource repository 추가
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Node.js 설치
sudo apt-get install -y nodejs

# 버전 확인
node --version  # v20.x.x
npm --version   # 10.x.x
```

### 1.3 Redis 설치 및 설정

```bash
# Redis 설치
sudo apt-get install -y redis-server

# Redis 설정 (선택사항: 비밀번호 설정)
sudo nano /etc/redis/redis.conf
# requirepass your_redis_password 주석 해제 및 비밀번호 설정

# Redis 시작 및 자동 시작 설정
sudo systemctl start redis-server
sudo systemctl enable redis-server

# 상태 확인
sudo systemctl status redis-server
redis-cli ping  # PONG 응답 확인
```

### 1.4 PM2 설치 (권장)

```bash
sudo npm install -g pm2
```

## 2. 애플리케이션 배포

### 2.1 코드 다운로드

```bash
# 배포 디렉토리 생성
sudo mkdir -p /var/www/open-mindmap
sudo chown $USER:$USER /var/www/open-mindmap

# 저장소 클론
cd /var/www/open-mindmap
git clone <repository-url> .
```

### 2.2 의존성 설치

```bash
# 루트 레벨 의존성
npm install

# API 의존성
cd api
npm install

# Frontend 의존성
cd ../frontend
npm install
cd ..
```

### 2.3 환경 변수 설정

```bash
# API 환경 변수
cp api/.env.example api/.env
nano api/.env
```

다음 값들을 설정:
```bash
PORT=8787
NODE_ENV=production
CORS_ORIGIN=https://yourdomain.com

GITHUB_APP_ID=...
GITHUB_APP_PRIVATE_KEY="..."
GITHUB_WEBHOOK_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
SESSION_SECRET=... # 32자 이상의 랜덤 문자열

REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=  # Redis 비밀번호 설정한 경우
```

### 2.4 API 빌드 및 실행

```bash
cd api
npm run build

# PM2로 실행
pm2 start dist/index.js --name open-mindmap-api

# PM2 설정 저장 및 자동 시작 설정
pm2 save
pm2 startup  # 출력되는 명령어 실행
```

### 2.5 Frontend 빌드

```bash
cd ../frontend

# 환경 변수 설정
echo "VITE_API_URL=https://api.yourdomain.com" > .env.production

# 빌드
npm run build
```

## 3. Nginx 설정

### 3.1 Nginx 설치

```bash
sudo apt-get install -y nginx
```

### 3.2 사이트 설정

```bash
sudo nano /etc/nginx/sites-available/open-mindmap
```

다음 내용 입력:

```nginx
# API 서버
upstream api_backend {
    server 127.0.0.1:8787;
}

# Frontend (Main domain)
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    root /var/www/open-mindmap/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    gzip_comp_level 6;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

# API subdomain
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Webhook endpoint (larger body size)
    location /webhooks {
        proxy_pass http://api_backend;
        client_max_body_size 10M;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### 3.3 사이트 활성화

```bash
# 심볼릭 링크 생성
sudo ln -s /etc/nginx/sites-available/open-mindmap /etc/nginx/sites-enabled/

# 기본 사이트 비활성화 (선택사항)
sudo rm /etc/nginx/sites-enabled/default

# 설정 테스트
sudo nginx -t

# Nginx 재시작
sudo systemctl restart nginx
```

## 4. SSL/TLS 설정 (Let's Encrypt)

```bash
# Certbot 설치
sudo apt-get install -y certbot python3-certbot-nginx

# SSL 인증서 발급
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com

# 자동 갱신 테스트
sudo certbot renew --dry-run
```

## 5. GitHub 설정

### 5.1 GitHub App 설정

1. GitHub Settings → Developer settings → GitHub Apps → New GitHub App
2. 설정:
   - Homepage URL: `https://yourdomain.com`
   - Callback URL: `https://yourdomain.com/auth/callback`
   - Webhook URL: `https://api.yourdomain.com/webhooks/github`
   - Webhook Secret: (생성 후 `.env`에 추가)
   
3. Permissions:
   - Repository permissions:
     - Contents: Read & Write
     - Pull requests: Read & Write
   - User permissions:
     - Email addresses: Read-only

4. Subscribe to events:
   - Push
   - Pull request

### 5.2 OAuth 앱 설정

1. GitHub Settings → Developer settings → OAuth Apps → New OAuth App
2. 설정:
   - Application name: Open Mindmap
   - Homepage URL: `https://yourdomain.com`
   - Authorization callback URL: `https://yourdomain.com/auth/callback`
3. Client ID와 Secret을 `.env`에 추가

## 6. 모니터링

### 6.1 PM2 모니터링

```bash
# 프로세스 상태 확인
pm2 status

# 실시간 로그 확인
pm2 logs open-mindmap-api

# 메모리/CPU 사용량
pm2 monit
```

### 6.2 로그 로테이션

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

## 7. 업데이트

```bash
cd /var/www/open-mindmap

# 최신 코드 가져오기
git pull

# API 업데이트
cd api
npm install
npm run build
pm2 restart open-mindmap-api

# Frontend 업데이트
cd ../frontend
npm install
npm run build

# Nginx 재시작 (필요시)
sudo systemctl reload nginx
```

## 8. 백업

### 8.1 자동 백업 스크립트

```bash
sudo nano /usr/local/bin/backup-open-mindmap.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/open-mindmap"
DATE=$(date +%Y%m%d_%H%M%S)

# 디렉토리 생성
mkdir -p $BACKUP_DIR

# Redis 백업
redis-cli BGSAVE
cp /var/lib/redis/dump.rdb $BACKUP_DIR/redis_$DATE.rdb

# 환경 변수 백업
cp /var/www/open-mindmap/api/.env $BACKUP_DIR/env_$DATE

# 오래된 백업 삭제 (30일 이상)
find $BACKUP_DIR -name "*.rdb" -mtime +30 -delete
find $BACKUP_DIR -name "env_*" -mtime +30 -delete

echo "Backup completed: $DATE"
```

```bash
sudo chmod +x /usr/local/bin/backup-open-mindmap.sh

# Cron 설정 (매일 새벽 2시)
sudo crontab -e
```

추가:
```
0 2 * * * /usr/local/bin/backup-open-mindmap.sh >> /var/log/backup-open-mindmap.log 2>&1
```

## 9. 트러블슈팅

### API가 시작되지 않는 경우

```bash
# 로그 확인
pm2 logs open-mindmap-api

# 포트 사용 확인
sudo netstat -tulpn | grep 8787

# Redis 연결 확인
redis-cli ping
```

### Frontend가 API에 연결되지 않는 경우

1. CORS 설정 확인 (`api/.env`의 `CORS_ORIGIN`)
2. Nginx 프록시 설정 확인
3. 브라우저 개발자 도구에서 네트워크 탭 확인

### 메모리 부족

```bash
# PM2 메모리 제한 설정
pm2 start dist/index.js --name open-mindmap-api --max-memory-restart 500M
pm2 save
```

## 10. 보안 체크리스트

- [ ] Redis 비밀번호 설정
- [ ] Firewall 설정 (ufw 또는 iptables)
- [ ] SSH 키 기반 인증 사용
- [ ] 정기적인 시스템 업데이트
- [ ] fail2ban 설치 및 설정
- [ ] SSL/TLS 인증서 자동 갱신 확인
- [ ] 환경 변수 파일 권한 설정 (600)
- [ ] GitHub Webhook 서명 검증 활성화

```bash
# 환경 변수 파일 권한
chmod 600 /var/www/open-mindmap/api/.env

# Firewall 설정 (ufw)
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

배포 완료! 🎉

