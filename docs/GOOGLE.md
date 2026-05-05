# Google Workspace integration

Per `CONTRIBUTING.md` §18. OAuth tokens are stored encrypted (`TOKEN_ENCRYPTION_KEY` → AES-256-GCM) in `google_tokens`.

## Local setup

1. **Google Cloud Console** → APIs & Services → Credentials → Create OAuth
   client ID → Web application.

2. **Authorized redirect URIs** — must match exactly:

   ```
   http://localhost:3000/api/google/oauth/callback
   ```

3. Copy **Client ID** and **Client secret** into `.env.local`:

   ```dotenv
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   GOOGLE_REDIRECT_URI=http://localhost:3000/api/google/oauth/callback
   ```

4. **Encryption key** — any strong secret string (sha256-derived internally):

   ```dotenv
   TOKEN_ENCRYPTION_KEY=your-long-random-secret-at-least-32-chars
   ```

5. **Enable Google Drive API** (required for `drive.file` scope).

6. Restart `npm run dev`, sign in as **OWNER** or **ADMIN**, open **Google** in
   the sidebar → **Connect Google**.

## Scopes (Phase 4a)

Installed scopes live in `lib/google/constants.ts`:

- `openid`, `email`, `profile`
- `https://www.googleapis.com/auth/drive.file`

Gmail / Calendar scopes arrive in a later phase with a reconnect flow.

## Drive tools — Phase 4b/4c

All tools are registered in `lib/ai/tools/drive.ts` and bootstrapped via `lib/ai/registry.bootstrap.ts`. They share the same OAuth-subject contract:

- **`USER` actor** — uses the actor's own linked Google account (any explicit `googleOAuthUserId` is rejected as a spoof).
- **`SYSTEM` / `AGENT` actor** — must set `ctx.googleOAuthUserId` to the TutorOS user id whose Drive link should be used.

| Tool                 | Category | Risk   | Purpose                                                                             |
| -------------------- | -------- | ------ | ----------------------------------------------------------------------------------- |
| `drive.createFolder` | medium   | MEDIUM | Create a folder. Inserts `drive_files`, audits `drive.folder.created`.              |
| `drive.uploadFile`   | medium   | MEDIUM | Upload small inline content (utf8 or base64, ≤ 2 MB). Audits `drive.file.uploaded`. |
| `drive.listFiles`    | read     | LOW    | List non-trashed files in a folder (paginated, max page 100). Read-only.            |

**Parent folder resolution** (write tools): explicit `parentFolderId` → `GOOGLE_DRIVE_DEFAULT_PARENT_FOLDER_ID` → My Drive root.

**UI smoke test:** when Google is connected, **Settings → Integrations → Google** has a **Create test folder in Drive** button (runs `drive.createFolder` end-to-end).

### Optional env

```dotenv
# Folder id under which app-created folders are nested (shared drive or My Drive subfolder).
GOOGLE_DRIVE_DEFAULT_PARENT_FOLDER_ID=
```

- **`state`** is signed with `TOKEN_ENCRYPTION_KEY` and carries the TutorOS
  `users.id` — no session-store dependency.
- **`prompt=consent`** + **`access_type=offline`** — ensures Google returns a
  **refresh_token** on first link (required for background jobs).
- Only **OWNER** and **ADMIN** may link or disconnect (`integration.google.link`).
- Agents cannot link (`can()` explicitly denies `integration.google.link`).

## Troubleshooting

| Symptom                          | Fix                                                                                                        |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Redirect URI mismatch            | Exact match in Google Console vs `GOOGLE_REDIRECT_URI`.                                                    |
| No refresh token                 | Revoke TutorOS at [myaccount.google.com/permissions](https://myaccount.google.com/permissions), reconnect. |
| Decrypt errors                   | Wrong `TOKEN_ENCRYPTION_KEY` vs value used when tokens were saved — reconnect.                             |
| “Google OAuth is not configured” | All four env vars must be non-empty (`hasGoogleOAuth()` in `lib/env.ts`).                                  |

## Code map

| Piece                | Path                                              |
| -------------------- | ------------------------------------------------- |
| Start OAuth          | `app/api/google/oauth/start/route.ts`             |
| Callback             | `app/api/google/oauth/callback/route.ts`          |
| Encrypted upsert     | `lib/services/googleTokenService.ts`              |
| AES helpers          | `lib/google/crypto.ts`                            |
| Signed state         | `lib/google/oauthState.ts`                        |
| Authenticated client | `lib/google/client.ts`                            |
| Drive service        | `lib/services/driveService.ts`                    |
| OAuth subject helper | `lib/google/resolveOAuthSubject.ts`               |
| UI                   | `app/(app)/settings/integrations/google/page.tsx` |
