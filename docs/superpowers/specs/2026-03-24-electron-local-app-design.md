# CRSC Filing Assistant — Electron Local App Design

**Date:** 2026-03-24
**Status:** Approved
**Summary:** Convert the CRSC Filing Assistant from a cloud-hosted web app (Supabase + GCP) to a local Mac desktop application using Electron, SQLite, and direct Anthropic API calls. Remove authentication and payment modules.

---

## 1. Architecture Overview

**Before (Cloud):**
React → Supabase Edge Functions → Google Cloud PostgreSQL

**After (Local):**
React (Electron Renderer) → IPC → Electron Main Process → SQLite + Claude API + Local File System

### Technology Stack

| Layer | Cloud Version | Local Version |
|-------|--------------|---------------|
| Frontend | React + Vite | React + Vite (in Electron renderer) |
| Backend | Supabase Edge Functions (Deno) | Electron main process (Node.js) |
| Database | PostgreSQL on GCP | SQLite via better-sqlite3 |
| AI | Claude API via edge function proxy | Claude API direct from main process |
| Payments | Stripe | **Removed** |
| Auth | Supabase Auth + ID.me | **Removed** |
| File Storage | Google Cloud Storage | Local filesystem |
| Distribution | Web (Vercel/Netlify) | `.dmg` via electron-builder |

---

## 2. Project Structure

```
crsc_app/
├── electron/
│   ├── main.ts              # Electron main process entry
│   ├── preload.ts            # Secure bridge (contextBridge)
│   ├── ipc/
│   │   ├── chat.ts           # Chat IPC handlers
│   │   ├── formData.ts       # CRUD IPC handlers
│   │   ├── documents.ts      # Upload/extract handlers
│   │   ├── pdf.ts            # PDF generation handlers
│   │   └── settings.ts       # App settings handlers
│   ├── db/
│   │   ├── database.ts       # SQLite connection + initialization
│   │   ├── migrations.ts     # Schema migrations runner
│   │   └── migrations/
│   │       └── 001_initial.sql
│   └── services/
│       ├── claude.ts          # Direct Anthropic API client
│       ├── storage.ts         # Local file storage manager
│       └── pdfGenerator.ts    # DD Form 2860 + package assembly
├── src/                       # React frontend (modified)
│   ├── components/            # Keep: forms, chat, dashboard, review, download
│   ├── pages/                 # 8 pages (down from 15)
│   ├── hooks/                 # Rewritten to use IPC
│   ├── lib/
│   │   ├── ipc.ts             # Renderer-side IPC client
│   │   ├── utils.ts            # Keep as-is (cn() utility, etc.)
│   │   ├── validation.ts      # Keep as-is
│   │   └── constants.ts       # Keep as-is
│   └── App.tsx                # Simplified routing
├── resources/
│   ├── dd2860-template.pdf    # Official DD Form 2860 blank template
│   ├── crsc_va.txt            # CRSC reference (bundled)
│   ├── CRSC_REFERENCE.pdf     # CRSC reference (bundled)
│   └── icon.icns              # Mac app icon
└── electron-builder.yml       # Packaging config
```

---

## 3. Data Flow & IPC Architecture

### Communication Pattern

```
React Component
    → hook (useChat, useFormData, etc.)
    → ipc.ts client
    → window.electronAPI.invoke('channel', data)
    → preload.ts (contextBridge)
    → ipcRenderer.invoke('channel', data)
    → Electron Main Process (ipcMain.handle)
    → IPC Handler
    → SQLite | Claude API | Local File System
```

### IPC Channels

| Channel | Replaces | Purpose |
|---------|----------|---------|
| `chat:send` | chat-handler edge fn | Send message, stream Claude response |
| `chat:history` | db-proxy (chat) | Load/clear chat history |
| `form:get` | db-proxy (read) | Get form data by section |
| `form:save` | db-proxy (write) | Save form data by section |
| `documents:upload` | upload-document edge fn | Copy file to app storage |
| `documents:extract` | extract-document edge fn | OCR via Claude Vision API |
| `documents:list` | db-proxy (documents) | List uploaded documents |
| `pdf:generate` | generate-pdf edge fn | Generate DD 2860 + package |
| `pdf:preview` | generate-pdf edge fn | Preview without saving |
| `settings:get` | — (new) | Get API key, storage path |
| `settings:set` | — (new) | Save API key, storage path |

### Streaming Chat

`ipcMain.handle` does not support streaming natively. The pattern:

1. Renderer calls `window.electronAPI.invoke('chat:send', { message })`
2. Main process starts Claude API stream
3. Main process sends chunks via `webContents.send('chat:stream-chunk', chunk)`
4. Renderer listens with `window.electronAPI.on('chat:stream-chunk', callback)`
5. When complete, the original `invoke` promise resolves with the full response (or an error field if streaming failed mid-stream)

**Cleanup:** The renderer must remove the `chat:stream-chunk` listener after each chat call completes to avoid memory leaks. Use a scoped listener that is removed in the `invoke` promise's `.finally()` handler.

---

## 4. SQLite Schema

### Tables Kept (modified for single-user)

All tables drop the `user_id` column. Each form data table has at most one row.

- `personal_information` — name, SSN (encrypted), DOB, contact info
- `military_service` — branch, rank, service dates, retirement info
- `va_disability_info` — VA file number, rating, decision date
- `disability_claims` — individual disabilities with combat-related codes
- `secondary_conditions` — conditions secondary to a primary claim
- `documents` — uploaded file metadata (path, type, name)
- `chat_history` — message history (role, content, timestamp)
- `packet_status` — workflow step tracking

### Tables Removed

- `users` — no auth, single user
- `payments` — no payments
- `audit_log` — no cloud HIPAA compliance needed

### Tables Added

```sql
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT
);
```

Stores: `api_key`, `storage_path`, `model` (Claude model preference).

### Type Conversions (PostgreSQL → SQLite)

| PostgreSQL | SQLite |
|-----------|--------|
| `UUID PRIMARY KEY DEFAULT gen_random_uuid()` | `TEXT PRIMARY KEY` (UUID generated in JS via `crypto.randomUUID()`) |
| `TIMESTAMP DEFAULT NOW()` | `TEXT DEFAULT (datetime('now'))` |
| `BOOLEAN` | `INTEGER` (0/1) |
| `INTEGER`, `VARCHAR`, `TEXT`, `DATE`, `DECIMAL` | Same (SQLite is flexible) |
| `INET` | Removed (was for audit log) |

### SSN Encryption

`ssn_encrypted` remains encrypted at rest using AES-256. Encryption key derived from a machine-specific secret stored in the system keychain via Electron's `safeStorage` API.

---

## 5. Pages & Navigation

### Pages Kept (8)

| Route | Page | Purpose |
|-------|------|---------|
| `/` | Landing | Welcome + "Get Started" button |
| `/onboarding` | Onboarding | Process overview, documents checklist |
| `/dashboard` | Dashboard | Progress tracker, step navigation |
| `/chat` | Chat | AI-guided data collection |
| `/review` | Review | Edit collected information |
| `/download` | Download | Generate PDF package |
| `/status` | StatusTracking | Post-submission tracking |
| `/settings` | Settings | API key, storage path, about |

### Pages Removed (7)

- Login, Register, ResetPassword, AuthCallback — no auth
- VerifyVeteran — no ID.me verification
- Payment — no payments
- Privacy, Terms — no legal pages needed for local app

### Navigation

- No route guards — all pages accessible
- Persistent sidebar or top nav (no login/logout controls)
- Settings accessible from nav
- Dashboard guides user through steps in order but doesn't block navigation

### First Launch Flow

1. App opens to Landing page
2. User clicks "Get Started"
3. App detects no API key → redirects to Settings
4. User enters Anthropic API key
5. Redirected to Onboarding → normal flow begins

---

## 6. Claude API Integration

### Chat Service

- Reads API key from `settings` table
- Loads system prompt with bundled CRSC reference content:
  - `crsc_va.txt` — loaded directly as text
  - `CRSC_REFERENCE.pdf` — pre-extracted to text at build time using `pdf-parse` and cached as `resources/crsc_reference_text.txt`. This avoids runtime PDF parsing on every chat session.
- Calls Anthropic SDK directly with streaming
- Model: `claude-sonnet-4-20250514` (configurable in settings)

### Document Extraction (OCR)

- User uploads PDF/image via chat or document upload
- Main process reads file from local storage
- Sends to Claude Vision API as base64 image
- Returns extracted text to renderer

### Error Handling

- No API key → prompt user to enter one in Settings
- Invalid API key → clear error message, link to Settings
- Rate limit / network error → retry with backoff, show status to user

---

## 7. PDF Generation & Package Assembly

### DD Form 2860

1. Load bundled blank `dd2860-template.pdf`
2. Use `pdf-lib` to fill AcroForm fields by field name
3. Flatten form (makes it non-editable)
4. Save to local storage

**Important:** The official DD 2860 PDF must be AcroForm-based (not XFA) for pdf-lib to fill it. The first implementation task must be to download the official template, inspect it with `pdf-lib`'s `getForm().getFields()`, and document all field names. If the form is XFA-based, a fallback is to generate the form from scratch using pdf-lib to match the official layout. The field name mapping will be documented in `electron/services/pdfGenerator.ts` as a constant.

The existing `generate-pdf` edge function field-mapping logic converts directly — replace PostgreSQL data fetch with SQLite read.

### Cover Letter

Claude generates a personalized cover letter based on veteran's data. Rendered to PDF via pdf-lib.

### Package Assembly

```
CRSC_Package_[LastName]_[Date]/
├── DD_Form_2860.pdf
├── Cover_Letter.pdf
├── Submission_Instructions.pdf
└── Supporting_Documents/
    ├── DD214.pdf
    ├── Retirement_Orders.pdf
    ├── VA_Rating_Decision.pdf
    └── ...
```

1. Pull all data from SQLite
2. Generate DD 2860 from template
3. Generate cover letter and submission instructions
4. Copy uploaded supporting documents
5. Assemble into folder
6. Open folder in Finder via `shell.openPath()`
7. Optional: export as ZIP

---

## 8. App Packaging & Distribution

### Electron Builder Config

- **Target:** `.dmg` for Mac
- **Architecture:** Universal binary (Intel + Apple Silicon)
- **App name:** CRSC Filing Assistant
- **App ID:** `com.crsc-assistant.app`

### Native Module Rebuilding

`better-sqlite3` is a native Node module that must be rebuilt for Electron's Node version and both architectures:

- Use `@electron/rebuild` as a `postinstall` script: `"postinstall": "electron-rebuild"`
- In `electron-builder.yml`, set `mac.target` to `dmg` with `arch: ["universal"]`
- `electron-builder` handles rebuilding native modules for both Intel and Apple Silicon during the packaging step

### Code Signing & Notarization

The initial release will be **unsigned and unnotarized**. On first launch, macOS Gatekeeper will block the app — the user must right-click → "Open" to bypass. Code signing and Apple notarization are a follow-up task for wider distribution.

### Bundled Resources

- React frontend (Vite build output)
- Electron main process (compiled TS)
- `dd2860-template.pdf`, `crsc_va.txt`, `CRSC_REFERENCE.pdf`
- `better-sqlite3` native module (rebuilt for Electron's Node version)
- App icon (`.icns`)

### NOT Bundled

- No API keys
- No user data
- No `.env` files

### Data Location

- Database: `~/Library/Application Support/CRSC Assistant/crsc.db`
- Uploaded documents: `~/Library/Application Support/CRSC Assistant/documents/`
- Generated packages: `~/Library/Application Support/CRSC Assistant/packages/`
- User can change the root path in Settings

### Dev Workflow

- `npm run dev` — Electron + Vite with hot reload
- `npm run build` — builds distributable `.dmg`

---

## 9. What Gets Removed

### Files to Delete

- `src/pages/Login.tsx`, `Register.tsx`, `ResetPassword.tsx`, `AuthCallback.tsx`
- `src/pages/VerifyVeteran.tsx`, `Payment.tsx`, `Privacy.tsx`, `Terms.tsx`
- `src/contexts/AuthContext.tsx`, `DevModeContext.tsx`
- `src/hooks/useAuth.ts`, `usePayment.ts`, `useSessionTimeout.ts`
- `src/components/MfaSetup.tsx`, `SessionTimeoutWarning.tsx`
- `src/lib/supabase.ts`, `src/lib/api.ts`
- `supabase/` (entire directory — edge functions, config, migrations move to Electron)

### Dependencies to Remove

- `@supabase/supabase-js`
- `@stripe/react-stripe-js`, `@stripe/stripe-js`

### Dependencies to Add

- `electron`, `electron-builder`
- `better-sqlite3`, `@types/better-sqlite3`
- `@anthropic-ai/sdk` (moved from edge function to main dependency)
- `electron-vite` (dev tooling — Vite-native Electron integration with HMR)
- `@electron/rebuild` (native module rebuilding)
- `pdf-parse` (build-time PDF text extraction for reference docs)

---

## 10. Summary of Conversion Work

| Area | Effort | Notes |
|------|--------|-------|
| Electron shell setup | Medium | New `electron/` directory, main.ts, preload.ts |
| IPC handlers (5 modules) | Medium | Mostly port edge function logic, swap DB calls |
| SQLite schema + migration | Low | Direct conversion from PostgreSQL, drop user_id |
| Hooks rewrite (3 hooks) | Low | Replace fetch() with IPC calls, update `hooks/index.ts` barrel |
| Remove auth/payment code | Low | Delete files, simplify App.tsx routing |
| Settings page | Low | New simple page for API key + storage path |
| PDF generation port | Medium | Move from Deno to Node.js, same pdf-lib logic |
| App packaging | Low | electron-builder config + icon |
| Testing | Medium | Verify full flow works end-to-end locally |
