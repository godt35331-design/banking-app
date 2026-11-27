# Kestrel Bank — investor demo

A full-stack digital banking website built to demonstrate how the product works. The website and API run on this laptop and the data is stored in MongoDB Atlas (so an internet connection is needed). **Everything is simulated**: no real money moves, card numbers are generated in the `4242 42` test range, and no external bank or card network is contacted.

"Kestrel Bank" is a placeholder name until the client supplies the final branding.

## Stack

| Layer | Technology |
| --- | --- |
| Web app | React 19, TypeScript, Vite, Tailwind CSS 4, TanStack Query, React Router |
| API | NestJS 11 (Node.js, TypeScript), Socket.IO for live updates |
| Database | MongoDB Atlas with Prisma ORM |
| Security | Argon2 password and PIN hashing, JWT in HTTP-only cookies, AES-256-GCM card encryption |
| Money | Integer minor units, double-entry ledger |

```
apps/
  api/        NestJS API + Prisma schema, migrations and seed
  web/        React web app (customer app, admin dashboard, landing page)
packages/
  shared/     Types, constants and default settings used by both
```

## One-time setup

1. **Create a free MongoDB Atlas cluster** at https://www.mongodb.com/cloud/atlas/register.
   - Pick the free M0 tier.
   - Under **Database Access**, create a database user and password.
   - Under **Network Access**, add your current IP address.
   - Under your cluster, select **Connect → Drivers** and copy the connection string.
2. **Create the environment file:** copy `apps/api/.env.example` to `apps/api/.env`, then:
   - paste the connection string into `DATABASE_URL`, with your password filled in and `kestrel_demo` after `.net/`;
   - set `JWT_SECRET` and `CARD_ENCRYPTION_KEY` by running this twice and pasting each result:
     `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
3. **Install packages:** `npm install`
4. **Create the collections and indexes:** `npm run db:push`
5. **Load sample data:** `npm run db:seed`

## Run the demo

```
npm run dev
```

Open http://localhost:5173 in the browser. The API runs at http://localhost:4000/api. Both listen on `127.0.0.1` only, so the website is never reachable from the network.

| Account | Email | Password | PIN |
| --- | --- | --- | --- |
| Admin | admin@demo.test | admin1234 | 1234 |

## Useful commands

| Command | What it does |
| --- | --- |
| `npm run db:reset` | Wipe the database and load the seed again |
| `npm run db:studio` | Browse the database collections in a web UI |
| `npm run build` | Production build of all packages |
