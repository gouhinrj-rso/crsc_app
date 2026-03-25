# Electron Local App Conversion — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the CRSC Filing Assistant from a cloud web app to a local Mac desktop application using Electron + SQLite, removing auth and payments.

**Architecture:** Electron wraps the existing React/Vite frontend. The Electron main process hosts IPC handlers that replace Supabase Edge Functions. SQLite (better-sqlite3) replaces PostgreSQL. Claude API is called directly from the main process.

**Tech Stack:** Electron, electron-vite, React 19, Vite 7, better-sqlite3, @anthropic-ai/sdk, pdf-lib, TypeScript

**Spec:** `docs/superpowers/specs/2026-03-24-electron-local-app-design.md`

---

## File Map

### New Files (electron/)

| File | Responsibility |
|------|---------------|
| `electron/main.ts` | Electron main process entry: create window, register IPC handlers, init DB |
| `electron/preload.ts` | contextBridge exposing typed `electronAPI` to renderer |
| `electron/ipc/settings.ts` | IPC handlers for get/set settings (API key, storage path) |
| `electron/ipc/formData.ts` | IPC handlers for CRUD on all form data tables |
| `electron/ipc/chat.ts` | IPC handler for streaming chat + history |
| `electron/ipc/documents.ts` | IPC handlers for file upload/list/delete + OCR extraction |
| `electron/ipc/pdf.ts` | IPC handlers for PDF generation and package assembly |
| `electron/db/database.ts` | SQLite connection singleton, init, close |
| `electron/db/migrations.ts` | Run SQL migrations on startup |
| `electron/db/migrations/001_initial.sql` | SQLite schema (converted from PostgreSQL) |
| `electron/services/claude.ts` | Anthropic SDK client with streaming |
| `electron/services/storage.ts` | Local file storage (copy, delete, list, path resolution) |
| `electron/services/pdfGenerator.ts` | DD 2860 fill, cover letter, package assembly |

### New Files (src/)

| File | Responsibility |
|------|---------------|
| `src/lib/ipc.ts` | Renderer-side IPC client (replaces api.ts + supabase.ts) |
| `src/pages/Settings.tsx` | API key input, storage path config |
| `src/types/electron.d.ts` | TypeScript declarations for `window.electronAPI` |

### Modified Files

| File | Changes |
|------|---------|
| `src/App.tsx` | Remove auth/payment routes, add Settings route, strip providers |
| `src/hooks/useChat.ts` | Replace `sendChatMessageStream` with IPC calls |
| `src/hooks/useFormData.ts` | Replace all api.ts imports with ipc.ts calls, remove userId param |
| `src/hooks/index.ts` | Remove useAuth, usePayment, useSessionTimeout exports |
| `src/types/database.ts` | Remove users/payments/audit_log types, drop user_id fields |
| `package.json` | Add electron deps, remove supabase/stripe, add electron scripts |
| `vite.config.ts` | Replaced by electron.vite.config.ts |

### Deleted Files

- `src/pages/Login.tsx`, `Register.tsx`, `ResetPassword.tsx`, `AuthCallback.tsx` — no auth
- `src/pages/VerifyVeteran.tsx` — no ID.me
- `src/pages/Payment.tsx` — no payments
- `src/pages/Privacy.tsx`, `Terms.tsx` — no legal pages
- `src/contexts/AuthContext.tsx`, `DevModeContext.tsx` — no auth/dev mode
- `src/hooks/useAuth.ts`, `usePayment.ts`, `useSessionTimeout.ts` — no auth/payments
- `src/components/MfaSetup.tsx`, `SessionTimeoutWarning.tsx` — no auth
- `src/lib/supabase.ts`, `src/lib/api.ts` — replaced by ipc.ts
- `supabase/` (entire directory) — edge functions replaced by electron/ipc/

### Resource Files

| File | Source |
|------|--------|
| `resources/dd2860-template.pdf` | Download official DD Form 2860 PDF |
| `resources/crsc_va.txt` | Move from project root |
| `resources/CRSC_REFERENCE.pdf` | Move from project root |

---

## Task 1: Project Setup — Electron Shell with electron-vite

**Files:**
- Create: `electron/main.ts`
- Create: `electron/preload.ts`
- Create: `src/types/electron.d.ts`
- Create: `electron.vite.config.ts`
- Modify: `package.json`
- Delete: `vite.config.ts`

- [ ] **Step 1: Install electron-vite and Electron dependencies**

Run: `npm install --save-dev electron electron-vite @electron/rebuild`
Run: `npm install --save better-sqlite3 pdf-lib`
Run: `npm install --save-dev @types/better-sqlite3`

Note: `pdf-lib` must be in `dependencies` (not `devDependencies`) because the Electron main process uses it at runtime for PDF generation. It's currently in devDeps — this step moves it.

- [ ] **Step 2: Update package.json**

Set `"main": "dist-electron/main.js"` and update scripts:
- `"dev": "electron-vite dev"`
- `"build": "electron-vite build"`
- `"preview": "electron-vite preview"`
- `"postinstall": "electron-rebuild"`
- `"package": "electron-vite build && electron-builder"`
- Keep `"lint"`, `"test"`, `"test:watch"` as-is

- [ ] **Step 3: Create electron.vite.config.ts**

Configure three build targets:
- `main`: externalize deps, output to `dist-electron/`, external `better-sqlite3`. **No `@` alias** — electron code must not import from `src/`. If shared types are needed between electron and renderer, create a `shared/types/` directory at the project root.
- `preload`: externalize deps, output to `dist-electron/`. **No `@` alias** — same reason.
- `renderer`: use react + tailwindcss plugins, resolve `@` alias to `./src`, output to `dist/`

- [ ] **Step 4: Create electron/main.ts — minimal window**

Create a BrowserWindow (1200x800) with:
- `contextIsolation: true`, `nodeIntegration: false`
- Preload script: `path.join(__dirname, 'preload.js')`
- In dev: load the dev server URL from `electron-vite` (typically `http://localhost:5173` but use the `ELECTRON_RENDERER_URL` env var or `electron-vite`'s provided URL rather than hardcoding)
- In prod: load `path.join(__dirname, '../dist/index.html')`
- Handle `window-all-closed` (quit on non-darwin)
- Handle `activate` (recreate window on macOS dock click)

- [ ] **Step 5: Create electron/preload.ts — empty bridge**

Expose an empty `electronAPI` object via `contextBridge.exposeInMainWorld`.

- [ ] **Step 6: Create src/types/electron.d.ts**

Declare the `ElectronAPI` interface (empty for now) and augment `Window` with `electronAPI`.

- [ ] **Step 7: Delete vite.config.ts**

Replaced by `electron.vite.config.ts`.

- [ ] **Step 8: Verify Electron opens with the React app**

Run: `npm run dev`
Expected: Electron window opens showing the current Landing page (broken API calls are expected).

- [ ] **Step 9: Commit**

Message: `feat: add Electron shell with electron-vite`

---

## Task 2: Strip Auth, Payments, and Cloud Dependencies

**Files:**
- Delete: 8 page files, 2 context files, 3 hook files, 2 component files, 2 lib files (see File Map)
- Modify: `src/App.tsx`, `src/hooks/index.ts`, `package.json`

- [ ] **Step 1: Delete auth/payment files**

Delete all files listed under "Deleted Files" in the File Map above.

- [ ] **Step 2: Remove cloud dependencies**

Run: `npm uninstall @supabase/supabase-js @stripe/react-stripe-js @stripe/stripe-js next-themes uuid @types/uuid`

Note: `uuid` is replaced by `crypto.randomUUID()` (per spec). `next-themes` is Next.js-specific and unused in Electron.

- [ ] **Step 3: Update src/hooks/index.ts**

Keep only: `useFormData`, `useChat`, `Message` type export.

- [ ] **Step 4: Rewrite src/App.tsx**

Remove all auth imports, `AuthProvider`, `DevModeProvider`, `SessionTimeoutWrapper`, `ProtectedRoute`, `PublicRoute`. Simplify to flat routes:
- `/` → Landing
- `/onboarding` → Onboarding
- `/dashboard` → Dashboard
- `/chat` → Chat
- `/review` → Review
- `/download` → Download
- `/status` → StatusTracking
- `/settings` → placeholder (Settings page created in Task 5, add comment: `{/* Settings page added in Task 5 */}`)
- `*` → Navigate to `/`

Note: `supabase/` directory is intentionally kept as reference during Tasks 5-9 (porting edge function logic). It will be deleted in Task 13 (Cleanup).

- [ ] **Step 5: Verify compile**

Run: `npm run dev`
Expected: App compiles (pages with broken api.ts imports may need temporary stubs).

- [ ] **Step 6: Commit**

Message: `feat: remove auth, payments, and cloud dependencies`

---

## Task 3: SQLite Database Layer

**Files:**
- Create: `electron/db/migrations/001_initial.sql`
- Create: `electron/db/database.ts`
- Create: `electron/db/migrations.ts`
- Modify: `electron/main.ts`

- [ ] **Step 1: Create 001_initial.sql**

Convert the PostgreSQL schema to SQLite. Key differences:
- `TEXT PRIMARY KEY` instead of `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `TEXT DEFAULT (datetime('now'))` instead of `TIMESTAMP DEFAULT NOW()`
- `INTEGER DEFAULT 0` instead of `BOOLEAN DEFAULT FALSE`
- No `user_id` columns
- No `users`, `payments`, or `audit_log` tables
- Add `settings` table (key TEXT PRIMARY KEY, value TEXT)
- Insert default `packet_status` rows with `INSERT OR IGNORE`

See spec section 4 for full schema details.

- [ ] **Step 2: Create electron/db/database.ts**

Singleton pattern:
- `initDb()`: create DB file at `app.getPath('userData')/crsc.db`, enable WAL mode and foreign keys
- `getDb()`: return initialized instance or throw
- `closeDb()`: close and null out

- [ ] **Step 3: Create electron/db/migrations.ts**

- Create `_migrations` tracking table
- Read `.sql` files from migrations directory, sorted by name
- Skip already-applied migrations
- Apply new ones within a transaction

- [ ] **Step 4: Update electron/main.ts**

In `app.whenReady()`: call `initDb()`, then `runMigrations()`, then `createWindow()`.
On `before-quit`: call `closeDb()`.

- [ ] **Step 5: Verify DB creation**

Run: `npm run dev`
Check: `sqlite3 ~/Library/Application\ Support/crsc_temp/crsc.db ".tables"`
Expected: All tables present.

- [ ] **Step 6: Commit**

Message: `feat: add SQLite database layer with migrations`

---

## Task 4: Update TypeScript Types for SQLite

**Files:**
- Modify: `src/types/database.ts`

This task must come before IPC handlers so the types match the SQLite schema from the start.

- [ ] **Step 1: Rewrite database.ts**

Remove `users`, `payments`, `audit_log` types. Remove `user_id` from all table Row/Insert/Update types. Change `boolean` fields to `number` (SQLite uses 0/1). Remove ID.me-related fields (`idme_uuid`, `military_status`, `veteran_verified`, etc.).

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Note: Some pages will have type errors from removed auth/payment code — that's expected and will be fixed in Task 10.

- [ ] **Step 3: Commit**

Message: `feat: update TypeScript types for SQLite single-user schema`

---

## Task 5: Settings IPC + Settings Page

**Files:**
- Create: `electron/ipc/settings.ts`
- Create: `src/pages/Settings.tsx`
- Modify: `electron/main.ts`, `electron/preload.ts`, `src/types/electron.d.ts`, `src/App.tsx`

- [ ] **Step 1: Create electron/ipc/settings.ts**

Three handlers:
- `settings:get` (key) → returns value or null
- `settings:set` (key, value) → INSERT OR REPLACE
- `settings:getAll` → returns Record of all settings

- [ ] **Step 2: Update preload.ts and electron.d.ts**

Expose `settings.get`, `settings.set`, `settings.getAll` methods.

- [ ] **Step 3: Register handlers in main.ts**

- [ ] **Step 4: Create src/pages/Settings.tsx**

Simple form with:
- API key input (password type, placeholder `sk-ant-...`)
- Storage path input (optional, shows default)
- Save and Save & Continue buttons
- Loads existing settings on mount

- [ ] **Step 5: Add `/settings` route to App.tsx**

- [ ] **Step 6: Verify — navigate to /settings, save an API key, refresh, confirm it persists**

- [ ] **Step 7: Commit**

Message: `feat: add Settings page with API key and storage path config`

---

## Task 6: Form Data IPC Layer + Rewrite useFormData

**Files:**
- Create: `electron/ipc/formData.ts`
- Modify: `electron/preload.ts`, `src/types/electron.d.ts`, `electron/main.ts`
- Modify: `src/hooks/useFormData.ts`

- [ ] **Step 1: Create electron/ipc/formData.ts**

Largest IPC module. Handles CRUD for all data tables:
- `personal_information`: get (LIMIT 1), upsert (INSERT or UPDATE based on existing row)
- `military_service`: same pattern
- `va_disability_info`: same pattern
- `disability_claims`: get all, create, update, delete
- `secondary_conditions`: get by claim_id, create, delete
- `documents`: get all, create, delete
- `packet_status`: get all, update step, reset all

Use `crypto.randomUUID()` for new IDs. Use named parameters with `@param` syntax.

**SSN Encryption:** For the `personal_information` handler, use Electron's `safeStorage` API:
- On save: if `ssn_encrypted` field is present, call `safeStorage.encryptString(ssn)` and store the base64-encoded result
- On read: if `ssn_encrypted` is present, call `safeStorage.decryptString(Buffer.from(value, 'base64'))` before returning
- Check `safeStorage.isEncryptionAvailable()` on app startup; if unavailable, warn the user that SSN data won't be encrypted at rest

- [ ] **Step 2: Update preload.ts and electron.d.ts with form data methods**

- [ ] **Step 3: Register handlers in main.ts**

- [ ] **Step 4: Rewrite src/hooks/useFormData.ts**

Key changes:
- Remove `userId` parameter entirely (single user)
- Replace all `api.ts` imports with `window.electronAPI.formData.*` calls
- Remove `'Not authenticated'` checks
- Remove `'payment'` from `calculateProgress` steps
- Keep the same public API shape so page components don't need changes

- [ ] **Step 5: Verify — Dashboard loads, form sections show empty data, no errors**

- [ ] **Step 6: Commit**

Message: `feat: add form data IPC layer and rewrite useFormData hook`

---

## Task 7: Chat IPC Layer + Rewrite useChat

**Files:**
- Create: `electron/services/claude.ts`
- Create: `electron/ipc/chat.ts`
- Modify: `electron/preload.ts`, `src/types/electron.d.ts`, `electron/main.ts`
- Modify: `src/hooks/useChat.ts`

- [ ] **Step 1: Install Anthropic SDK**

Run: `npm install @anthropic-ai/sdk`

- [ ] **Step 2: Create electron/services/claude.ts**

- Read API key from settings table
- Cache system prompt (loaded from bundled `resources/crsc_va.txt` + `resources/crsc_reference_text.txt`)
- Export `streamChat()` async generator that yields text chunks
- Use `client.messages.stream()` from Anthropic SDK

- [ ] **Step 3: Create electron/ipc/chat.ts**

Three handlers:
- `chat:send` (message, history): stream via `webContents.send('chat:stream-chunk')`, save to DB
- `chat:history`: return all chat rows ordered by created_at
- `chat:clear`: delete all chat rows

- [ ] **Step 4: Update preload.ts**

Add `chat.send()`, `chat.onStreamChunk()` (returns cleanup function), `chat.history()`, `chat.clear()`.

- [ ] **Step 5: Register handlers in main.ts**

- [ ] **Step 6: Rewrite src/hooks/useChat.ts**

Key changes:
- Remove `userId` parameter
- Replace `sendChatMessageStream` with IPC send + stream listener
- Set up stream listener before calling `chat:send`
- **Critical:** call the cleanup function returned by `onStreamChunk()` in the `invoke` promise's `.finally()` handler to prevent memory leaks. Pattern: `const removeListener = window.electronAPI.chat.onStreamChunk(callback); try { await window.electronAPI.chat.send(...); } finally { removeListener(); }`
- Replace `getChatHistory`/`clearChatHistory` with IPC

- [ ] **Step 7: Test — go to /chat, send a message, verify streaming response**

Requires valid API key in Settings.

- [ ] **Step 8: Commit**

Message: `feat: add chat IPC with Claude API streaming`

---

## Task 8: Document Upload IPC + Storage Service

**Files:**
- Create: `electron/services/storage.ts`
- Create: `electron/ipc/documents.ts`
- Modify: `electron/preload.ts`, `src/types/electron.d.ts`, `electron/main.ts`

- [ ] **Step 1: Create electron/services/storage.ts**

Functions:
- `getStorageBasePath()`: check settings for custom path, default to `app.getPath('userData')/documents`
- `ensureStorageDir()`: mkdirSync + return path
- `saveBufferToStorage(buffer, fileName)`: write file with timestamp prefix
- `deleteFromStorage(filePath)`: unlink if exists

- [ ] **Step 2: Create electron/ipc/documents.ts**

Handlers:
- `documents:upload` (fileBase64, fileName, mimeType, documentType): decode base64, save to storage, insert DB row
- `documents:list`: return all document rows
- `documents:delete` (docId): delete file from storage + delete DB row
- `documents:extract` (fileBase64, mimeType, documentType): send to Claude Vision API as base64, return extracted text. Port from `supabase/functions/extract-document/index.ts`. Uses the same Anthropic SDK client as the chat service.

- [ ] **Step 3: Update preload.ts, types, main.ts**

- [ ] **Step 4: Test — upload a file, verify it appears in storage directory and DB**

- [ ] **Step 5: Commit**

Message: `feat: add document upload/storage IPC layer`

---

## Task 9: PDF Generation + Package Assembly + Reference Text Extraction

**Files:**
- Create: `scripts/extract-reference.ts`
- Create: `electron/services/pdfGenerator.ts`
- Create: `electron/ipc/pdf.ts`
- Modify: `electron/preload.ts`, `src/types/electron.d.ts`, `electron/main.ts`
- Move: `CRSC_REFERENCE.pdf` and `crsc_va.txt` → `resources/`

- [ ] **Step 1: Install pdf-parse and move reference files**

Run: `npm install --save-dev pdf-parse @types/pdf-parse`
Copy `CRSC_REFERENCE.pdf` and `crsc_va.txt` from project root to `resources/`.

- [ ] **Step 2: Create scripts/extract-reference.ts**

Build-time script that reads `resources/CRSC_REFERENCE.pdf` using `pdf-parse` and writes the extracted text to `resources/crsc_reference_text.txt`. This file is loaded by `electron/services/claude.ts` as part of the system prompt.

Add npm script: `"extract-reference": "tsx scripts/extract-reference.ts"`
Run it: `npm run extract-reference`
Verify: `resources/crsc_reference_text.txt` exists and contains readable text.

- [ ] **Step 3: Download and inspect the DD Form 2860 template**

Save to `resources/dd2860-template.pdf`. Write a small script to load with pdf-lib and log all AcroForm field names. Document the field name mapping.

- [ ] **Step 4: Create electron/services/pdfGenerator.ts**

Port from `supabase/functions/generate-pdf/index.ts`:
- `generateDD2860()`: load template, fill fields from SQLite, flatten, return bytes
- `generateCoverLetter()`: use Claude to generate text, render to PDF with pdf-lib
- `generateSubmissionInstructions()`: static PDF with branch-specific addresses
- `assemblePackage()`: create output folder, generate all PDFs, copy supporting docs, return folder path

- [ ] **Step 5: Create electron/ipc/pdf.ts**

Handlers:
- `pdf:generate`: call `assemblePackage()`, return path
- `pdf:preview`: call `generateDD2860()`, return base64
- `pdf:openFolder` (path): call `shell.openPath()`

- [ ] **Step 6: Update preload, types, main**

- [ ] **Step 7: Test — generate a preview from Download page**

- [ ] **Step 8: Commit**

Message: `feat: add PDF generation, package assembly, and reference text extraction`

---

## Task 10: Fix Remaining Pages

**Files:**
- Modify: `src/pages/Landing.tsx`
- Modify: `src/pages/Dashboard.tsx`
- Modify: `src/pages/Chat.tsx`
- Modify: `src/pages/Review.tsx`
- Modify: `src/pages/Download.tsx`
- Modify: `src/pages/Onboarding.tsx`
- Modify: `src/pages/StatusTracking.tsx`

- [ ] **Step 1: Update Landing.tsx**

Remove sign up/sign in. Add "Get Started" button → checks for API key → redirects to `/settings` or `/onboarding`.

- [ ] **Step 2: Update Dashboard.tsx**

Remove `useAuthContext()`, `DevModeContext` usage. Call `useFormData()` without userId. Remove payment step from progress.

- [ ] **Step 3: Update Chat.tsx**

Remove userId from `useChat()`. Remove auth UI elements.

- [ ] **Step 4: Update Review.tsx**

Remove userId from `useFormData()`. Remove auth guards.

- [ ] **Step 5: Update Download.tsx**

Replace `generatePDF()` with `window.electronAPI.pdf.generate()`. Remove payment checks.

- [ ] **Step 6: Update Onboarding.tsx and StatusTracking.tsx**

Remove auth/userId references.

- [ ] **Step 7: Full smoke test — Landing → Settings → Onboarding → Dashboard → Chat → Review → Download**

- [ ] **Step 8: Commit**

Message: `feat: update all pages for local Electron app`

---

## Task 11: Electron Builder Packaging

**Files:**
- Create: `electron-builder.yml`

- [ ] **Step 1: Create electron-builder.yml**

Configure:
- `appId`: `com.crsc-assistant.app`
- `productName`: `CRSC Filing Assistant`
- `mac.target`: `dmg` with `arch: ["universal"]`
- `extraResources`: `[{ from: "resources/", to: "resources/", filter: ["**/*"] }]`
- `directories.output`: `release`
- `mac.category`: `public.app-category.productivity`

The `extraResources` config ensures reference PDFs and text files are accessible at runtime via `process.resourcesPath`.

- [ ] **Step 2: Build and package**

Run: `npm run package`
Expected: `.dmg` file in `release/` directory.

- [ ] **Step 3: Open .dmg and verify app launches**

- [ ] **Step 4: Commit**

Message: `feat: add Electron Builder packaging config`

---

## Task 13: Cleanup and Final Verification

- [ ] **Step 1: Delete the supabase/ directory**

- [ ] **Step 2: Search for remaining cloud references**

Search all `.ts` and `.tsx` files for: `supabase`, `stripe`, `auth.uid`, `useAuth`, `AuthProvider`, `DevModeProvider`. Fix any remaining references.

- [ ] **Step 3: TypeScript check**

Run: `npx tsc --noEmit`

- [ ] **Step 4: Lint**

Run: `npm run lint`

- [ ] **Step 5: Full end-to-end smoke test**

1. `npm run dev` — app opens in Electron
2. Navigate to Settings, enter API key
3. Go through Onboarding
4. Use Chat to collect sample data
5. Check Dashboard progress
6. Review collected information
7. Generate PDF package on Download page
8. Verify package folder opens in Finder

- [ ] **Step 6: Commit**

Message: `chore: cleanup cloud dependencies and final verification`
