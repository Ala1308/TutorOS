/**
 * OAuth scopes requested on install. Keep aligned with tools we expose per
 * CONTRIBUTING.md §18 (Drive first; Gmail / Calendar added later with a
 * reconnect flow that requests additional scopes).
 */
export const GOOGLE_OAUTH_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/drive.file",
] as const;
