# Guest Mode Guide

Guest mode allows users to try Open Mindmap without signing in with Google.

## 🎯 Overview

Guest mode provides a **shared account** experience where:
- ✅ No Google authentication required
- ✅ All features available (create, edit, delete maps)
- ✅ Data stored in **GitHub** (same as authenticated users)
- ✅ Uses backend API with guest session
- ⚠️ **Shared repository** - all guest users share `guest@example.com` account
- ⚠️ **No private data** - other guests can see your maps

## 🚀 How to Use Guest Mode

### 1. Login as Guest

On the login page, click **"Continue as Guest"** button:

```
┌─────────────────────────────┐
│  Open Mindmap              │
│                            │
│  [🔵 Sign in with Google]  │
│                            │
│         or                 │
│                            │
│  [👤 Continue as Guest]    │
│                            │
│  ℹ️ Guest mode: Your data  │
│  will be stored locally... │
└─────────────────────────────┘
```

### 2. Guest Mode Banner

After logging in as guest, you'll see a banner in the dashboard:

```
┌──────────────────────────────────────────────┐
│ ℹ️ Guest Mode                                │
│ Your maps are stored locally. Sign in with   │
│ Google to sync across devices.               │
│                              [Sign In] ───────┤
└──────────────────────────────────────────────┘
```

### 3. Create and Edit Maps

- Works exactly like authenticated mode
- All features available (nodes, edges, shapes, etc.)
- Data saved to **GitHub** via backend API
- Uses shared guest repository

### 4. Sign In Later

Click **"Sign In"** button in the banner to:
1. Login with Google
2. Get your own private repository
3. Start with empty dashboard (guest maps stay in guest repo)

## 🔄 Operations

All operations use the backend API (same as authenticated users):

### Create Map
1. Click "+ Create New Mind Map"
2. Enter title and tags
3. Edit in canvas
4. Click "💾 Save" → `POST /maps` → Creates branch in guest repository

### Update Map
1. Open existing map
2. Make changes
3. Click "💾 Save" → `PUT /maps/:id` → Updates branch in guest repository

### Delete Map
1. Click "🗑️ Delete" on map card
2. Confirm deletion
3. `DELETE /maps/:id` → Deletes branch from guest repository

### Search Maps
- `GET /search?q=...` → Searches guest repository
- Filters by title and tags

## ⚠️ Limitations & Considerations

### Shared Repository

- ✅ **Data persists**: Stored in GitHub, not lost on browser clear
- ✅ **Cross-device**: Access from any device with guest login
- ✅ **Automatic backup**: Git history maintained
- ⚠️ **Public to guests**: Other guest users can see/edit your maps
- ⚠️ **No privacy**: All guests share `guest@example.com` repository

### Not Recommended For

- ❌ **Sensitive data**: Other guests can access
- ❌ **Long-term storage**: Get your own account for privacy
- ❌ **Collaboration**: Everyone is "guest", hard to attribute changes
- ❌ **Production use**: For testing/demo purposes only

### Data Safety

Guest data is:
- ✅ **Stored in GitHub**: Same reliability as authenticated users
- ✅ **Version controlled**: Full Git history
- ⚠️ **Shared access**: No isolation between guest users

## 🔐 Security & Privacy

### What Guest Mode Stores

- **User info**: Shared guest user (`guest@example.com`)
- **Map data**: All nodes, edges, and metadata in GitHub
- **Auth token**: Guest session token (24h expiry)
- **GitHub**: Stored in `{owner}/guest` repository

### Security Notes

- ⚠️ **No isolation**: All guest users share one repository
- ⚠️ **Public to guests**: Any guest can access all guest maps
- ⚠️ **Not for sensitive data**: Use Google sign in for privacy
- ✅ **Session-based**: Each guest gets unique session token
- ✅ **Temporary**: Sessions expire after 24 hours

## 📱 Use Cases

### Good for Guest Mode

- ✅ **Quick trial**: Test the app without commitment
- ✅ **Demo/presentation**: Show features to others
- ✅ **Temporary work**: Short-term brainstorming
- ✅ **Testing features**: Try before signing in

### Better with Google Sign In

- 🌟 **Private data**: Your own isolated repository
- 🌟 **Regular use**: Daily mind mapping
- 🌟 **Data safety**: No sharing with other users
- 🌟 **Long-term**: Keep maps permanently
- 🌟 **Collaboration**: Future sharing features
- 🌟 **Attribution**: Maps attributed to your account

## 🔄 Migrating from Guest to Authenticated

Guest maps **remain in guest repository**. To move data:

### Option 1: Manual Recreation
1. View your guest maps
2. Sign in with Google
3. Recreate maps in your private repository

### Option 2: GitHub Manual Copy (Advanced)
1. Find maps in `{owner}/guest` repository
2. Manually copy branches to your private repo
3. Update index.json

### Future: One-Click Migration (Not Implemented)
- Export guest maps as JSON
- Import to authenticated account
- Automatic branch migration

## 🛠️ Technical Details

### Implementation

**Backend:**
- `POST /auth/guest`: Creates guest session
  ```typescript
  {
    userId: 'guest',
    email: 'guest@example.com',
    name: 'Guest User'
  }
  ```
- Session token: `guest_session_{random_id}`
- Same API endpoints as authenticated users
- Guest repository: `{owner}/guest`

**Frontend:**
- `useAuthStore.isGuest` flag
- Same API calls as authenticated users
- `LoginPage.tsx`: Guest login button → calls `POST /auth/guest`
- `DashboardPage.tsx`: Guest banner + same API operations
- `EditorPage.tsx`: Same save/load via API
- `AuthCallback.tsx`: Skips OAuth, works with guest token

### Code Flow

```typescript
// Backend: Guest Login
authRouter.post('/guest', async (c) => {
  const guestToken = `guest_session_${nanoid(32)}`;
  const guestUser = {
    userId: 'guest',
    email: 'guest@example.com',
    name: 'Guest User',
  };
  
  await cache.put(`session:${guestToken}`, JSON.stringify(guestUser), {
    expirationTtl: 86400,
  });
  
  return c.json({ ok: true, data: { token: guestToken, user: guestUser } });
});

// Frontend: Guest Login
const handleGuestLogin = async () => {
  const response = await fetch(`${apiUrl}/auth/guest`, { method: 'POST' });
  const data = await response.json();
  
  login(data.data.token, {
    ...data.data.user,
    isGuest: true  // ← Key flag for UI
  });
};

// Save (same for both guest and authenticated)
await createMap(map); // POST /maps → creates branch in guest repository

// Load (same for both guest and authenticated)
await fetchMaps(); // GET /maps → reads from guest repository

// GitHub Repository Resolution
// guest@example.com → {owner}/guest
// user@gmail.com → {owner}/user
```

## 📊 Analytics & Metrics

To track guest mode usage, add analytics:

```typescript
// On guest login
analytics.track('guest_login');

// On guest map create
analytics.track('guest_map_create', { mapId });

// On guest to auth conversion
analytics.track('guest_converted_to_auth');
```

## 🎯 Future Enhancements

- [ ] Export guest maps to JSON
- [ ] Import JSON to authenticated account
- [ ] One-click migration tool
- [ ] localStorage quota monitoring
- [ ] Warn when approaching storage limit
- [ ] IndexedDB for larger storage (100+ maps)
- [ ] Offline mode for authenticated users

## 📖 Related Documentation

- **[DEV_MODE_GUIDE.md](./DEV_MODE_GUIDE.md)** - Development mode (different from guest mode)
- **[GITHUB_SETUP.md](./GITHUB_SETUP.md)** - GitHub setup for authenticated users
- **[../README.md](../README.md)** - Main project documentation

## ❓ FAQ

### Q: Is guest mode secure?
**A:** Data is stored in GitHub, but **shared with all guests**. Not private. Use Google sign in for privacy.

### Q: Can other guests see my maps?
**A:** Yes! All guests share one repository. Don't store sensitive information.

### Q: Can I use guest mode permanently?
**A:** Yes, but not recommended. Data is shared and not private.

### Q: How much data can I store?
**A:** Same as authenticated users - unlimited (GitHub limits apply).

### Q: Can I share guest maps?
**A:** All guest maps are already "shared" with other guests.

### Q: What happens if I sign in with Google?
**A:** You get your own private repository. Guest maps stay in guest repository.

### Q: Can I switch from guest to authenticated?
**A:** Yes! Click "Sign In" in the guest banner. Data won't auto-migrate.

### Q: Will my guest session expire?
**A:** Yes, after 24 hours. Just click "Continue as Guest" again to get a new session.

---

**Guest Mode** - Perfect for trying out Open Mindmap! 🚀

