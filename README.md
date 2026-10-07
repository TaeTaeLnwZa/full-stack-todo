# Daymark — full-stack to-do list

A responsive, private to-do app built with Next.js, TypeScript, and SQLite. Users register with a username and password, then add, complete, and delete only their own tasks.

## The three layers

1. **Front end:** `src/app/page.tsx` displays the account form and task list. It calls JSON API routes when the user signs in or changes a task.
2. **API:** `src/app/api` contains route handlers. They validate input, check the session cookie, and pass the authenticated user ID to the task functions.
3. **Database:** `db/schema.sql` defines `users`, `sessions`, and `tasks`. `src/lib/auth.ts` hashes passwords and manages sessions. `src/lib/tasks.ts` queries SQLite through `@libsql/client`.

For example, when a user clicks **Complete**, the browser sends `PATCH /api/tasks/{id}` with `{ "completed": true }`. The route reads the HTTP-only cookie, finds its session in SQLite, and calls `setTaskCompleted` with that user's ID. The SQL update includes both the task ID and user ID. The updated task returns as JSON and the browser redraws the list.

## Run locally

Use Node.js 20.9 or newer and pnpm 11.

```bash
pnpm install
pnpm db:init
pnpm dev
```

Open <http://localhost:3000>. Without environment variables, the app uses `todo.sqlite` in the project folder. The database file is ignored by Git.

Run checks with `pnpm test`, `pnpm lint`, and `pnpm build`.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/auth/register` | Create account and session |
| POST | `/api/auth/login` | Sign in |
| POST | `/api/auth/logout` | End session |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/tasks` | List own tasks |
| POST | `/api/tasks` | Add own task |
| PATCH | `/api/tasks/{id}` | Set own task's `completed` boolean |
| DELETE | `/api/tasks/{id}` | Delete own task |

Username rules: 3–24 letters, numbers, or underscores; matching is case-insensitive. Passwords must be 8–128 characters. Task titles are trimmed and must be 1–200 characters.

## Deploy to Vercel

Vercel functions do not provide a persistent writable SQLite file. Use a hosted SQLite-compatible Turso database for the deployed app. Connect the [Turso Cloud Vercel integration](https://vercel.com/marketplace/tursocloud) to the project. It supplies `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` as private environment variables. From a linked Vercel project, run `vercel env run -e production -- pnpm db:init` once to create the tables, then deploy the GitHub repository to Vercel.

Keep `.env` and `.env.local` out of Git. `.env.example` lists variable names only. Production refuses to start without a hosted database URL. No API keys, passwords, or test user data belong in the repository.

## Security notes

Passwords are salted and hashed with Node.js `scrypt`, never stored as plain text. Session cookies are HTTP-only, SameSite=Lax, and Secure over production HTTPS; the database stores only a SHA-256 hash of each random session token. Task updates and deletes require both task ID and owner ID. Cross-origin JSON mutations are rejected. This is a small assignment app; a larger public service would also add abuse controls such as login rate limiting and account recovery.
