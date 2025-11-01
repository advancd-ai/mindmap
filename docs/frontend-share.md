# 🎨 Frontend Share Feature Design

## 개요

Open Mindmap 프론트엔드에서 맵을 읽기 전용으로 공유하는 기능의 설계 문서입니다.
백엔드 API가 이미 구현되어 있으므로, 프론트엔드 UI/UX와 통합 방법을 정의합니다.

## 🎯 핵심 기능

### **1. 공유 링크 생성 및 관리**
- 맵 편집 페이지에서 공유 설정 모달
- 공유 링크 생성/비활성화
- 공유 링크 복사
- 만료 시간 설정
- 비밀번호 보호 설정
- 임베드 허용 토글

### **2. 공유 페이지 (읽기 전용)**
- 공유 링크로 접근하는 독립 페이지
- 읽기 전용 맵 뷰어
- 비밀번호 입력 (필요한 경우)
- 만료/비활성화 상태 표시

### **3. 대시보드 통합**
- 맵 카드에 공유 상태 표시
- 공유 링크 빠른 복사

## 📁 파일 구조

```
frontend/src/
├── pages/
│   ├── SharePage.tsx           # 공유 페이지 (읽기 전용 뷰어)
│   └── EditorPage.tsx          # 기존 편집 페이지 (공유 설정 추가)
├── components/
│   ├── ShareSettingsModal.tsx  # 공유 설정 모달
│   ├── ShareLinkDialog.tsx     # 공유 링크 표시/복사 다이얼로그
│   ├── PasswordPrompt.tsx      # 비밀번호 입력 다이얼로그
│   └── ShareStatusBadge.tsx    # 공유 상태 배지
├── api/
│   └── share.ts                # 공유 API 함수
└── hooks/
    └── useShare.ts             # 공유 기능 커스텀 훅
```

## 🔄 페이지 및 컴포넌트 설계

### **1. SharePage.tsx - 공유 페이지**

```typescript
/**
 * Share Page - Read-only map viewer via share link
 * Route: /share/:token
 * No authentication required
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchSharedMap } from '../api/share';
import MindMapCanvas from '../components/MindMapCanvas';
import PasswordPrompt from '../components/PasswordPrompt';
import ShareErrorView from '../components/ShareErrorView';
import './SharePage.css';

export default function SharePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [password, setPassword] = useState<string | null>(null);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);

  // Fetch shared map
  const { data, isLoading, error } = useQuery({
    queryKey: ['shared-map', token, password],
    queryFn: () => fetchSharedMap(token!, password || undefined),
    enabled: !!token,
    retry: false,
  });

  // Show password prompt if password required
  useEffect(() => {
    if (error?.response?.status === 401 && error?.response?.data?.error?.code === 'SHARE_401_PASSWORD_REQUIRED') {
      setShowPasswordPrompt(true);
    }
  }, [error]);

  const handlePasswordSubmit = (pwd: string) => {
    setPassword(pwd);
    setShowPasswordPrompt(false);
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ShareErrorView error={error} />;
  }

  if (!data?.ok || !data.data) {
    return <ShareErrorView message="Map not found" />;
  }

  const { map, shareInfo } = data.data;

  return (
    <div className="share-page">
      <header className="share-header">
        <div className="share-header-content">
          <h1>{map.title}</h1>
          <p className="share-readonly-badge">Read-only</p>
        </div>
        <button 
          className="share-open-in-app"
          onClick={() => navigate('/login')}
        >
          Open in App
        </button>
      </header>

      <div className="share-content">
        <MindMapCanvas 
          isReadOnly={true}
          initialMap={map}
        />
      </div>

      {showPasswordPrompt && (
        <PasswordPrompt
          onSubmit={handlePasswordSubmit}
          onCancel={() => navigate('/')}
        />
      )}
    </div>
  );
}
```

**주요 특징:**
- 인증 불필요 (공개 접근)
- 읽기 전용 모드 (`isReadOnly={true}`)
- 비밀번호 프롬프트 (필요시)
- 에러 상태 처리 (만료, 비활성화, 404 등)

### **2. ShareSettingsModal.tsx - 공유 설정 모달**

```typescript
/**
 * Share Settings Modal
 * Accessed from EditorPage toolbar
 */

import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  getShareStatus, 
  createShare, 
  updateShare, 
  disableShare 
} from '../api/share';
import Toast from './Toast';

interface ShareSettingsModalProps {
  mapId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ShareSettingsModal({
  mapId,
  isOpen,
  onClose
}: ShareSettingsModalProps) {
  const queryClient = useQueryClient();
  const [shareUrl, setShareUrl] = useState('');
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [allowEmbed, setAllowEmbed] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Fetch current share status
  const { data: shareStatus } = useQuery({
    queryKey: ['share-status', mapId],
    queryFn: () => getShareStatus(mapId),
    enabled: isOpen && !!mapId,
  });

  // Create/Update share mutation
  const shareMutation = useMutation({
    mutationFn: (config: ShareConfig) => 
      shareStatus?.enabled 
        ? updateShare(mapId, config)
        : createShare(mapId, config),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['share-status', mapId] });
      setShareUrl(data.shareUrl);
      Toast.show('Share link created!', 'success');
    },
    onError: (error) => {
      Toast.show('Failed to create share link', 'error');
    },
  });

  // Disable share mutation
  const disableMutation = useMutation({
    mutationFn: () => disableShare(mapId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['share-status', mapId] });
      Toast.show('Share disabled', 'success');
      onClose();
    },
  });

  // Initialize form when share status loads
  useEffect(() => {
    if (shareStatus) {
      setShareUrl(shareStatus.shareUrl || '');
      setExpiresAt(shareStatus.expiresAt || '');
      setAllowEmbed(shareStatus.allowEmbed || false);
    }
  }, [shareStatus]);

  const handleEnable = () => {
    shareMutation.mutate({
      enabled: true,
      expiresAt: expiresAt || undefined,
      allowEmbed,
      password: password || undefined,
    });
  };

  const handleRegenerate = () => {
    shareMutation.mutate({
      regenerateToken: true,
    });
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      Toast.show('Link copied to clipboard!', 'success');
    } catch (error) {
      Toast.show('Failed to copy link', 'error');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content share-settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Share Map</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {shareStatus?.enabled ? (
            // Share is enabled
            <>
              <div className="share-link-section">
                <label>Share Link</label>
                <div className="share-link-input-group">
                  <input 
                    type="text" 
                    value={shareUrl} 
                    readOnly 
                    className="share-link-input"
                  />
                  <button 
                    className="btn-copy"
                    onClick={handleCopyLink}
                  >
                    Copy
                  </button>
                </div>
                <p className="share-link-hint">
                  Anyone with this link can view the map (read-only)
                </p>
              </div>

              <div className="share-stats">
                <div className="stat-item">
                  <span className="stat-label">Views:</span>
                  <span className="stat-value">{shareStatus.stats?.viewCount || 0}</span>
                </div>
                {shareStatus.stats?.lastViewedAt && (
                  <div className="stat-item">
                    <span className="stat-label">Last viewed:</span>
                    <span className="stat-value">
                      {new Date(shareStatus.stats.lastViewedAt).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              <div className="share-settings-section">
                <label>
                  <input 
                    type="checkbox"
                    checked={allowEmbed}
                    onChange={(e) => setAllowEmbed(e.target.checked)}
                  />
                  Allow embedding (iframe)
                </label>

                <div className="form-group">
                  <label>Expiration Date (Optional)</label>
                  <input 
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>
                    Password Protection (Optional)
                    {shareStatus.passwordProtected && (
                      <span className="badge">Active</span>
                    )}
                  </label>
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div className="share-actions">
                <button 
                  className="btn-secondary"
                  onClick={handleRegenerate}
                  disabled={shareMutation.isPending}
                >
                  Regenerate Link
                </button>
                <button 
                  className="btn-danger"
                  onClick={() => disableMutation.mutate()}
                  disabled={disableMutation.isPending}
                >
                  Disable Share
                </button>
                <button 
                  className="btn-primary"
                  onClick={handleEnable}
                  disabled={shareMutation.isPending}
                >
                  Update Settings
                </button>
              </div>
            </>
          ) : (
            // Share is disabled
            <>
              <p>Create a share link to allow anyone to view this map without authentication.</p>
              
              <div className="share-settings-section">
                <label>
                  <input 
                    type="checkbox"
                    checked={allowEmbed}
                    onChange={(e) => setAllowEmbed(e.target.checked)}
                  />
                  Allow embedding (iframe)
                </label>

                <div className="form-group">
                  <label>Expiration Date (Optional)</label>
                  <input 
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Password Protection (Optional)</label>
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter password (optional)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="share-actions">
                <button 
                  className="btn-secondary"
                  onClick={onClose}
                >
                  Cancel
                </button>
                <button 
                  className="btn-primary"
                  onClick={handleEnable}
                  disabled={shareMutation.isPending}
                >
                  Create Share Link
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
```

### **3. PasswordPrompt.tsx - 비밀번호 입력**

```typescript
/**
 * Password Prompt Dialog
 * Shown when accessing password-protected shared map
 */

interface PasswordPromptProps {
  onSubmit: (password: string) => void;
  onCancel: () => void;
  error?: string;
}

export default function PasswordPrompt({
  onSubmit,
  onCancel,
  error
}: PasswordPromptProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim()) {
      onSubmit(password);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content password-prompt">
        <h2>Password Required</h2>
        <p>This map is password protected. Please enter the password to view it.</p>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              autoFocus
            />
            <button
              type="button"
              className="btn-toggle-password"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>

          {error && (
            <div className="error-message">{error}</div>
          )}

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Access Map
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

### **4. ShareStatusBadge.tsx - 공유 상태 배지**

```typescript
/**
 * Share Status Badge
 * Displays share status on map cards in dashboard
 */

interface ShareStatusBadgeProps {
  isShared: boolean;
  viewCount?: number;
  onClick?: () => void;
}

export default function ShareStatusBadge({
  isShared,
  viewCount,
  onClick
}: ShareStatusBadgeProps) {
  if (!isShared) return null;

  return (
    <div 
      className="share-status-badge"
      onClick={onClick}
      title="This map is shared"
    >
      <span className="share-icon">🔗</span>
      {viewCount !== undefined && viewCount > 0 && (
        <span className="share-views">{viewCount}</span>
      )}
    </div>
  );
}
```

### **5. api/share.ts - 공유 API 함수**

```typescript
/**
 * Share API functions
 */

import apiClient from './client';

export interface ShareStatus {
  shareToken: string;
  shareUrl: string;
  enabled: boolean;
  expiresAt?: string;
  allowEmbed: boolean;
  passwordProtected: boolean;
  stats: {
    viewCount: number;
    lastViewedAt?: string;
  };
  createdAt: string;
}

export interface ShareConfig {
  enabled?: boolean;
  expiresAt?: string;
  allowEmbed?: boolean;
  regenerateToken?: boolean;
  password?: string;
}

export interface SharedMapData {
  map: any; // MindMap type
  shareInfo: {
    token: string;
    expiresAt?: string;
    readOnly: true;
  };
}

/**
 * Get share status for a map
 */
export async function getShareStatus(mapId: string): Promise<ShareStatus> {
  const { data } = await apiClient.get(`/maps/${mapId}/share`);
  return data.data;
}

/**
 * Create share link
 */
export async function createShare(
  mapId: string, 
  config: ShareConfig
): Promise<ShareStatus> {
  const { data } = await apiClient.post(`/maps/${mapId}/share`, config);
  return data.data;
}

/**
 * Update share configuration
 */
export async function updateShare(
  mapId: string, 
  config: ShareConfig
): Promise<ShareStatus> {
  const { data } = await apiClient.put(`/maps/${mapId}/share`, config);
  return data.data;
}

/**
 * Disable share
 */
export async function disableShare(mapId: string): Promise<void> {
  await apiClient.delete(`/maps/${mapId}/share`);
}

/**
 * Fetch shared map (no auth required)
 */
export async function fetchSharedMap(
  token: string, 
  password?: string
): Promise<{ ok: boolean; data: SharedMapData }> {
  const params = password ? { password } : {};
  const { data } = await apiClient.get(`/share/${token}`, { params });
  return data;
}
```

### **6. hooks/useShare.ts - 공유 기능 커스텀 훅**

```typescript
/**
 * Custom hook for share functionality
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  getShareStatus, 
  createShare, 
  updateShare, 
  disableShare 
} from '../api/share';
import type { ShareConfig } from '../api/share';

export function useShare(mapId: string) {
  const queryClient = useQueryClient();

  const { data: shareStatus, isLoading } = useQuery({
    queryKey: ['share-status', mapId],
    queryFn: () => getShareStatus(mapId),
    enabled: !!mapId,
  });

  const createShareMutation = useMutation({
    mutationFn: (config: ShareConfig) => createShare(mapId, config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['share-status', mapId] });
    },
  });

  const updateShareMutation = useMutation({
    mutationFn: (config: ShareConfig) => updateShare(mapId, config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['share-status', mapId] });
    },
  });

  const disableShareMutation = useMutation({
    mutationFn: () => disableShare(mapId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['share-status', mapId] });
      queryClient.invalidateQueries({ queryKey: ['maps'] });
    },
  });

  const copyShareLink = async () => {
    if (shareStatus?.shareUrl) {
      try {
        await navigator.clipboard.writeText(shareStatus.shareUrl);
        return true;
      } catch (error) {
        console.error('Failed to copy:', error);
        return false;
      }
    }
    return false;
  };

  return {
    shareStatus,
    isLoading,
    isShared: shareStatus?.enabled || false,
    shareUrl: shareStatus?.shareUrl,
    createShare: createShareMutation.mutate,
    updateShare: updateShareMutation.mutate,
    disableShare: disableShareMutation.mutate,
    copyShareLink,
    isCreating: createShareMutation.isPending,
    isUpdating: updateShareMutation.isPending,
    isDisabling: disableShareMutation.isPending,
  };
}
```

## 🔄 통합 포인트

### **1. EditorPage.tsx 수정**

```typescript
// EditorPage.tsx에 추가
import ShareSettingsModal from '../components/ShareSettingsModal';

// State 추가
const [showShareModal, setShowShareModal] = useState(false);

// 툴바에 공유 버튼 추가
<button 
  className="toolbar-btn"
  onClick={() => setShowShareModal(true)}
  title="Share map"
>
  🔗 Share
</button>

// ShareSettingsModal 추가
{showShareModal && (
  <ShareSettingsModal
    mapId={mapId!}
    isOpen={showShareModal}
    onClose={() => setShowShareModal(false)}
  />
)}
```

### **2. DashboardPage.tsx 수정**

```typescript
// DashboardPage.tsx에 추가
import ShareStatusBadge from '../components/ShareStatusBadge';

// MapListItem 타입에 공유 정보 추가
interface MapListItem {
  // ... existing fields
  shareToken?: string;
  shareEnabled?: boolean;
}

// 맵 카드에 배지 표시
{map.shareEnabled && (
  <ShareStatusBadge 
    isShared={true}
    onClick={() => handleQuickCopyShareLink(map.id)}
  />
)}
```

### **3. App.tsx 수정**

```typescript
// App.tsx에 SharePage 라우트 추가
import SharePage from './pages/SharePage';

<Routes>
  {/* ... existing routes */}
  <Route 
    path="/share/:token" 
    element={<SharePage />}  // No auth required
  />
</Routes>
```

## 🎨 UI/UX 설계

### **공유 설정 모달**
- **레이아웃**: 중앙 모달, 반투명 오버레이
- **섹션**: 
  1. 공유 링크 표시 및 복사
  2. 통계 (조회수, 최근 조회)
  3. 설정 (만료, 비밀번호, 임베드)
  4. 액션 버튼 (재생성, 비활성화, 업데이트)

### **공유 페이지**
- **헤더**: 맵 제목, "Read-only" 배지, "Open in App" 버튼
- **콘텐츠**: 읽기 전용 MindMapCanvas
- **스타일**: 깔끔한 레이아웃, 브랜드 색상 사용

### **공유 상태 배지**
- **위치**: 맵 카드 우측 상단
- **디자인**: 작은 아이콘 + 조회수 (있는 경우)
- **인터랙션**: 클릭 시 공유 링크 빠른 복사

## 🔐 보안 고려사항

1. **비밀번호 입력**: 클라이언트에서 평문 전송 (HTTPS 필수)
2. **토큰 노출**: URL에 토큰이 포함되므로 브라우저 히스토리 관리 주의
3. **에러 메시지**: 보안 정보 노출 방지를 위해 일반적인 메시지 사용

## 📊 구현 단계

### **Phase 1: 기본 공유 기능**
1. `api/share.ts` 구현
2. `SharePage.tsx` 구현
3. 라우트 등록

### **Phase 2: 공유 설정 UI**
1. `ShareSettingsModal.tsx` 구현
2. `EditorPage.tsx`에 통합
3. `hooks/useShare.ts` 구현

### **Phase 3: 대시보드 통합**
1. `ShareStatusBadge.tsx` 구현
2. `DashboardPage.tsx`에 통합
3. 빠른 복사 기능

### **Phase 4: 고급 기능**
1. `PasswordPrompt.tsx` 구현
2. 에러 처리 개선
3. 로딩 상태 및 스켈레톤 UI

## 🎯 사용자 시나리오

### **시나리오 1: 공유 링크 생성**
1. 사용자가 맵 편집 페이지에서 "Share" 버튼 클릭
2. 공유 설정 모달 열림
3. 설정 입력 (선택적: 만료 시간, 비밀번호, 임베드 허용)
4. "Create Share Link" 클릭
5. 공유 링크 생성 및 표시
6. "Copy" 버튼으로 링크 복사

### **시나리오 2: 공유 맵 조회**
1. 공유 링크 접근 (`/share/:token`)
2. 비밀번호가 설정된 경우 비밀번호 입력 요청
3. 맵 로드 후 읽기 전용 뷰어 표시
4. 편집 불가, "Read-only" 표시

### **시나리오 3: 공유 설정 업데이트**
1. 공유 설정 모달에서 설정 변경
2. "Update Settings" 클릭
3. 통계 자동 갱신

## 🎨 결론

이 설계는:
- ✅ 직관적인 UI/UX
- ✅ 백엔드 API와 완벽 통합
- ✅ 읽기 전용 뷰어 지원
- ✅ 공유 링크 관리 기능
- ✅ 확장 가능한 구조

프론트엔드 공유 기능을 단계적으로 구현할 수 있는 완전한 설계입니다.

