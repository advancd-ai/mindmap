# Google OAuth 설정 가이드

Open Mindmap에서 Google 로그인을 사용하기 위한 설정 가이드입니다.

## 📋 Google Cloud Console 설정

### 1. Google Cloud Project 생성

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 새 프로젝트 생성 또는 기존 프로젝트 선택
3. 프로젝트 이름: `open-mindmap` (또는 원하는 이름)

### 2. OAuth 동의 화면 구성

1. **APIs & Services** → **OAuth consent screen** 이동
2. User Type 선택:
   - **External** (누구나 로그인 가능)
   - **Internal** (조직 내부만, Google Workspace 필요)
3. 앱 정보 입력:
   ```
   App name: Open Mindmap
   User support email: your-email@example.com
   Developer contact: your-email@example.com
   ```
4. Scopes 설정:
   ```
   - openid
   - email
   - profile
   ```
5. Test users 추가 (External 선택 시)

### 3. OAuth 2.0 Client ID 생성

1. **APIs & Services** → **Credentials** 이동
2. **+ CREATE CREDENTIALS** → **OAuth client ID** 클릭
3. Application type: **Web application**
4. 이름: `Open Mindmap Web Client`
5. **Authorized redirect URIs** 추가:
   ```
   개발 환경:
   http://localhost:8787/api/auth/google/callback
   
   프로덕션:
   https://your-domain.com/api/auth/google/callback
   ```
6. **CREATE** 클릭
7. **Client ID**와 **Client Secret** 복사

## ⚙️ 환경 변수 설정

### Backend (api/.env)

```bash
# Google OAuth Configuration
GOOGLE_CLIENT_ID=123456789-xxxxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxx
GOOGLE_REDIRECT_URI=http://localhost:8787/api/auth/google/callback

# Frontend URL
FRONTEND_URL=http://localhost:5173

# Redis
REDIS_URL=redis://localhost:6379

# Development Mode (선택사항)
DEV_MODE=false
```

### Frontend (frontend/.env)

```bash
# Development Mode (선택사항)
VITE_DEV_MODE=false

# API URL
VITE_API_URL=http://localhost:8787
```

## 🧪 테스트

### 1. Backend 시작

```bash
cd api
npm run dev
```

### 2. Frontend 시작

```bash
cd frontend
npm run dev
```

### 3. 로그인 테스트

1. http://localhost:5173 접속
2. "Sign in with Google" 버튼 클릭
3. Google 계정 선택
4. 권한 승인
5. Dashboard로 리디렉션

## 🔐 보안 고려사항

### Production 환경

1. **HTTPS 필수**
   ```
   Authorized redirect URIs: https://your-domain.com/api/auth/google/callback
   ```

2. **Environment Variables 보안**
   ```bash
   # .env 파일을 git에 커밋하지 마세요
   # .gitignore에 추가되어 있는지 확인
   ```

3. **Session Secret 설정**
   ```bash
   SESSION_SECRET=$(openssl rand -base64 32)
   ```

4. **CORS 설정**
   - api/src/index.ts에서 CORS origin 설정 확인

## 📊 Google OAuth Flow

```
1. User clicks "Sign in with Google"
   ↓
2. Redirect to Google OAuth
   https://accounts.google.com/o/oauth2/v2/auth
   ↓
3. User authorizes app
   ↓
4. Google redirects back with code
   http://localhost:8787/api/auth/google/callback?code=xxx&state=yyy
   ↓
5. Backend exchanges code for access token
   POST https://oauth2.googleapis.com/token
   ↓
6. Backend gets user info
   GET https://www.googleapis.com/oauth2/v2/userinfo
   ↓
7. Backend creates session token
   ↓
8. Redirect to frontend with session
   http://localhost:5173/auth/callback?token=session_xxx
   ↓
9. Frontend stores token & user info
   ↓
10. User is logged in!
```

## 🆘 Troubleshooting

### Error: redirect_uri_mismatch

**원인**: Redirect URI가 Google Console 설정과 일치하지 않음

**해결**:
1. Google Cloud Console의 Authorized redirect URIs 확인
2. `.env`의 `GOOGLE_REDIRECT_URI` 확인
3. 정확히 일치하는지 확인 (trailing slash 주의)

### Error: invalid_client

**원인**: Client ID 또는 Client Secret 잘못됨

**해결**:
1. Google Cloud Console에서 Credentials 재확인
2. `.env` 파일의 값 재확인
3. 공백이나 특수문자 확인

### Error: access_denied

**원인**: 사용자가 권한을 거부했거나 Test users에 추가되지 않음

**해결**:
1. OAuth consent screen의 Test users에 이메일 추가
2. Publishing status를 "In production"으로 변경 (심사 필요)

## 📚 참고 문서

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Cloud Console](https://console.cloud.google.com/)
- [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)

