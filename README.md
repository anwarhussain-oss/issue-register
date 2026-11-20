# Issue Register

Next.js (App Router) + Tailwind CSS + Prisma/PostgreSQL (Neon) issue tracker, protected by a site-wide password.

## Setup

```bash
cp .env.example .env    # then fill in DATABASE_URL, DIRECT_URL and SITE_PASSWORD
npm install
npx prisma generate     # needed if npm blocked the postinstall script
npm run setup           # pushes the schema to Postgres and seeds sample issues
npm run dev             # http://localhost:3000
```

| Variable        | Purpose                                                                 |
| --------------- | ----------------------------------------------------------------------- |
| `DATABASE_URL`  | Pooled Postgres connection used by the app                              |
| `DIRECT_URL`    | Direct (non-pooler) connection used by `prisma db push`                 |
| `SITE_PASSWORD` | Password for the login screen. Changing it signs everyone out.          |

## Features

- Create, edit, delete, search and filter issues
- **Export CSV** downloads the currently filtered issues
- Password login with a signed, HTTP-only session cookie (7 days)

## API

All routes require a valid session cookie (unauthenticated requests get `401`).

| Method | Route              | Purpose        |
| ------ | ------------------ | -------------- |
| GET    | /api/issues        | List issues    |
| POST   | /api/issues        | Create issue   |
| GET    | /api/issues/:id    | Get one issue  |
| PUT    | /api/issues/:id    | Update issue   |
| DELETE | /api/issues/:id    | Delete issue   |
| POST   | /api/auth/login    | Sign in (form) |
| POST   | /api/auth/logout   | Sign out       |
