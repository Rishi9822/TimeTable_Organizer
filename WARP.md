# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Repository layout

- `client/` – React + Vite frontend.
  - Routing and app shell: `src/main.jsx`, `src/App.jsx`.
  - Pages: `src/pages/` (landing, auth, dashboards, setup, timetable builder, activity log, etc.).
  - Global state/logic:
    - `src/contexts/AuthContext.jsx` – restores session via `/auth/me`, manages `user`, `role`, `institutionId`, setup/email verification flags, and exposes `signIn`/`signUp`/`signOut`/`hasRole`.
    - `src/contexts/InstitutionContext.jsx` – wraps institution configuration (working days, periods, breaks), persists via `useInstitutionSettings`/`useUpsertInstitutionSettings` hooks and `/institutions` + `/institution-settings` APIs, and computes generated periods.
    - `src/contexts/TimetableContext.jsx` – client-side cache for timetables keyed by `classId`, responsible for loading/saving/publishing timetables via `/timetables` APIs and aggregating period data for conflict checks.
    - `src/contexts/DemoContext.jsx` – demo-mode specific state (used on `/demo`).
  - Data access and domain helpers:
    - `src/lib/api.js` – axios instance pointing at `http://localhost:5000/api` with `Authorization: Bearer <token>` header from `localStorage`, and 401 handling that clears the token (redirect behavior is handled in UI/`ProtectedRoute`).
    - `src/lib/conflict-detection.js` – pure client-side conflict detection over a flattened timetable entry list (teacher double-booking, excessive subject repetition per day, slot status helpers).
    - `src/lib/timetable-types.js` – canonical day names and default period grid (including breaks) used by the timetable UI.
    - Other helpers in `src/lib/` and `src/hooks/` encapsulate reusable domain and UI logic.
  - UI components:
    - `src/components/ui/` – shadcn-style primitive components (buttons, dialogs, tables, tabs, tooltips, toaster/sonner, etc.).
    - `src/components/timetable/` – timetable builder pieces (draggable subjects, droppable slots, timetable grid, class selector).
    - `src/components/auth/ProtectedRoute.jsx` – enforces authentication and optional role checks around routed pages.

- `server/` – Node/Express REST API backed by MongoDB and Stripe.
  - Entry & configuration:
    - `src/server.js` – loads env via `dotenv`, connects MongoDB via `src/config/db.js` (expects `MONGO_URI`), then starts the Express app on `PORT` (default `5000`).
    - `src/app.js` – Express app factory: CORS (`origin: "http://localhost:5173"`, `credentials: true`), Stripe webhook wiring, JSON body parsing, route mounting, and `/api/health`.
  - Auth & access control:
    - `src/middleware/authMiddleware.js` – JWT auth (`Authorization: Bearer <token>`), loads `req.user` from `User` using `JWT_SECRET`.
    - `src/middleware/roleMiddleware.js` – role-based guards (`requireRole`), institution membership checks (`requireInstitution`, `requireSameInstitution`). Admins are effectively superusers.
  - Domain modules:
    - `src/models/` – Mongoose schemas for `User`, `Institution`, `Class`, `Teacher`, `Subject`, `Timetable`, `Assignment`, `AuditLog`, etc. `Timetable` stores a `Map` of day → array of `{ period, subjectId, teacherId }` entries, with indices enforcing one draft per class/academic year.
    - `src/controllers/` – route handlers implementing business logic. Of note:
      - `timetable.controller.js` – CRUD + publish + conflict detection for timetables, including academic year handling and institution scoping, and emitting audit logs.
    - `src/routes/` – thin route definitions mounting controllers under `/api/*` with auth/role middleware. Example: `timetable.routes.js` exposes `/api/timetables` (list, per-class operations, publish, conflict detection).
  - Cross-cutting utilities:
    - `src/utils/auditLogger.js` – non-blocking audit logging; controllers call `logAuditFromRequest` after successful operations. Logging failures never throw.
    - `src/utils/tokenUtils.js` / `emailService.js` – encapsulate token generation and email workflows (password reset, verification, invites).
    - `src/utils/planLimits.js` – central definition of per-plan limits (`trial`, `standard`, `flex`) for classes, teachers, schedulers, exports, and institution-type switching, with helpers (`isActionAllowed`, `hasReachedClassLimit`, etc.).
    - `src/utils/stripeService.js` – Stripe singleton initialization and orchestration of checkout sessions and subscription lifecycle (success, payment failure, subscription deletion). Requires `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID_STANDARD`, `STRIPE_PRICE_ID_FLEX`, optional `FRONTEND_URL`.
  - Stripe integration:
    - `src/app.js` registers a raw-body `/api/stripe/webhook` handler **before** `express.json()` and dispatches to `stripeService` helpers based on event types (`checkout.session.completed`, `invoice.payment_failed`, `customer.subscription.deleted`, `customer.subscription.updated`).
    - Additional Stripe routes live under `/api/stripe` via `stripe.routes.js` (for creating checkout sessions, etc.).

## Running and building

All commands are run from the repository root unless otherwise noted.

### Install dependencies

- Frontend:
  - `cd client`
  - `npm install`
- Backend:
  - `cd server`
  - `npm install`

### Development servers

- Start the API server (Express + MongoDB):
  - `cd server`
  - `npm run dev`
  - Exposes HTTP API on `http://localhost:5000` (see routes under `/api/*`). `MONGO_URI` and `JWT_SECRET` must be set; Stripe features additionally require `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`.

- Start the React dev server:
  - `cd client`
  - `npm run dev`
  - Vite typically serves on `http://localhost:5173`. The frontend assumes the API is reachable at `http://localhost:5000/api` and that CORS is configured for `http://localhost:5173`.

Run both `server` and `client` dev servers simultaneously for a functional app.

### Frontend commands (client)

- Build production bundle:
  - `cd client`
  - `npm run build`

- Preview production build locally (after `npm run build`):
  - `cd client`
  - `npm run preview`

- Lint React codebase using ESLint configuration in `client/eslint.config.js`:
  - `cd client`
  - `npm run lint`

### Backend commands (server)

- Start API in watch mode (nodemon):
  - `cd server`
  - `npm run dev`

- Start API in production mode (no file watching):
  - `cd server`
  - `npm start`

## Testing

- At the time of writing there are **no test scripts** defined in `client/package.json` or `server/package.json`, and no obvious test runner configuration in the repo.
- Before expecting commands such as “run all tests” or “run a single test”, a test framework (for example Jest, Vitest, or similar) should be added and wired into `package.json` scripts; once that exists, document the exact commands here.

## Timetable domain overview

- The timetable domain is institution-scoped and academic-year specific:
  - Backend `Timetable` documents are keyed by `institutionId`, `classId`, `academicYear`, and `isPublished`, with indices ensuring a single draft per class/year and at most one published timetable per class/year.
  - Backend endpoints in `timetable.controller.js` always enforce `req.user.institutionId` via auth and role middleware, and return an "empty" timetable structure when none exists yet.
- Frontend timetable state is maintained by `TimetableContext` as a `Map<classId, timetable>`, with helpers to:
  - `loadTimetable(classId)` / `saveTimetable(classId, periods, weekStructure)` – talk to `/api/timetables/:classId`.
  - `publishTimetable(classId)` – calls `/api/timetables/:classId/publish` and sets `isPublished` client-side.
  - `loadAllTimetables()` / `getAllPeriods()` / `isTeacherAvailable()` / `getTeacherConflict()` – support interactive conflict detection and visual feedback in the timetable builder.
- Additional client-side conflict rules (teacher overlap and excessive subject repetition) are implemented in `src/lib/conflict-detection.js`, operating over a normalized list of "slot" records. This complements the server-side conflict checks exposed via `/api/timetables/:classId/conflicts`.

## Auth, institutions, and plans

- Authentication uses JWTs stored in `localStorage` on the frontend and validated on the backend via `authMiddleware`. `AuthContext` calls `/auth/me` to restore the session on page load and exposes current `role` and `institutionId`.
- Most admin/scheduler operations are protected by `ProtectedRoute` in the client and by `requireRole(["admin", "scheduler"])` on the server.
- Institution configuration flows:
  - `InstitutionContext` orchestrates initial setup (institution creation when needed via `/institutions`, then saving settings via `/institution-settings`) and exposes helpers to generate periods based on configured working days, start time, and breaks.
- Subscription and plan enforcement:
  - Stripe checkout and webhooks drive plan changes on the `Institution` model via `stripeService` helpers.
  - Controllers and middleware should consult `planLimits.js` (`getPlanLimits`, `hasReachedClassLimit`, etc.) when adding new capabilities or limits; plan-aware behavior should be centralized there to keep plan logic consistent.