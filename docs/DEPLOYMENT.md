# Deployment Guide

Instructions for deploying TempWatch Insights to production.

## Frontend Deployment (Vercel)

The frontend is a static React + Vite app, ideal for Vercel's serverless platform.

### Steps

1. **Push to GitHub**
   ```bash
   git push origin main
   ```

2. **Create Vercel Account** (free tier OK for hobby projects)
   - Visit https://vercel.com/
   - Sign in with GitHub

3. **Create New Project**
   - Click "New Project"
   - Select your GitHub repo
   - Set **Project Root** to `frontend/` (if monorepo structure)
   - Leave other settings as defaults:
     - Build Command: `npm run build`
     - Output Directory: `dist`
     - Install Command: `npm install`

4. **Set Environment Variables**
   - In Vercel project settings → "Environment Variables"
   - Add: `VITE_API_BASE_URL=https://your-backend-url.com` (your production backend URL)

5. **Deploy**
   - Click "Deploy"
   - Wait for build to complete
   - Access your site at `your-project.vercel.app`

### Auto-Deployment
Once linked, any push to `main` (or your default branch) triggers a new deployment.

---

## Backend Deployment

The backend requires a server with Node.js, npm, and PostgreSQL. Options:

### Option A: Railway.app (Recommended)

Free tier includes 5 GB storage & $5/month credits.

1. **Create Account**
   - Visit https://railway.app/
   - Sign in with GitHub

2. **Deploy Express Service**
   - Click "New Project"
   - Select "GitHub Repo"
   - Choose your repo
   - Railway auto-detects it's a Node.js project
   - Set **Root Directory** to `backend/`

3. **Add PostgreSQL Service**
   - In Railway project dashboard, click "Add Service"
   - Select "PostgreSQL"
   - Railway creates a database and sets `DATABASE_URL` environment variable

4. **Set Environment Variables**
   - In Railway project, go to Variables
   - Add: `ENABLE_LOGS=false`
   - `DATABASE_URL` is auto-set by PostgreSQL service

5. **Seed Database**
   - Open Railway terminal for your Express service
   - Run:
     ```bash
     npm install
     npm run ts-node src/seed.ts
     ```

6. **Deploy**
   - Railway auto-deploys on push to main
   - Your backend runs at `https://your-app.railway.app/` (Railway generates the URL)

### Option B: Render.com

Free tier with 15-min spindown on inactivity.

1. **Create Account**
   - Visit https://render.com/
   - Sign in with GitHub

2. **Deploy Web Service**
   - Click "New +" → "Web Service"
   - Connect GitHub repo
   - Set **Root Directory** to `backend/`
   - Environment: Node.js
   - Build Command: `npm install`
   - Start Command: `npm run dev`
   - Instance: Free tier

3. **Add PostgreSQL Database**
   - Click "New +" → "PostgreSQL"
   - Render provides `DATABASE_URL` (set as env var automatically)

4. **Set Env Vars**
   - In Web Service settings, add `ENABLE_LOGS=false`

5. **Deploy**
   - Click "Create Web Service"
   - Render auto-deploys on push
   - Access at `https://your-service.onrender.com/`

#### Using Docker (recommended for Verilator)
To ensure Verilator is available during build, use the included `Dockerfile` (recommended):

- The repository includes a `Dockerfile` which installs Verilator and builds `obj_dir/Vcomparator` during the image build.
- In Render, set the service to use the Dockerfile or choose Docker as the deployment type so the image build runs in a full container environment.
- The Dockerfile builds the backend and the Verilator binary so the runtime image contains the compiled `obj_dir/Vcomparator`.
- Ensure `run_verilator.sh` is CI-friendly (no `sudo` lines) — the project already includes a CI-friendly script.

Once the image builds successfully, deploy the service.

#### Seeding the database without shell access
If your Render Web Service does not include shell access (free instances), you can run the seed on startup using the `RUN_SEED` environment variable.

1. In Render service settings → **Environment**, add:
   - `RUN_MIGRATE` = `true` (run DB migrations on startup)
   - `RUN_SEED` = `true` (seed DB on startup)
   - `DATABASE_URL` = (your internal Render Postgres URL)
2. Deploy / redeploy the service. The container's entrypoint will apply migrations then run `dist/seed.js` on startup and log completion messages when finished.
3. After seeding/migrating, **unset** `RUN_MIGRATE` and `RUN_SEED` (or set them to `false`) and redeploy to avoid re-running these steps on every restart.

Notes:
- `RUN_MIGRATE=true` runs `npx prisma migrate deploy`. If that fails (no migrations present), it attempts `npx prisma db push` as a fallback.
- For production migrations it's recommended to create and review migration files locally and push them to the repo; `prisma migrate deploy` will then apply them in order on deploy.

Notes:
- The entrypoint runs `node dist/seed.js` (the seed is compiled during the build), so this works without `tsx` or dev deps in production.
- Alternatively, upgrade to a Starter instance to get shell/one-off job access and run `npm run seed` interactively.

Once the seed finishes, verify endpoints as described above (health, compare, climate APIs).

### Option C: Self-Hosted (DigitalOcean, Linode, AWS)

For more control:

1. **Provision Server**
   - Ubuntu 20.04+ with 1GB RAM minimum
   - Install Node.js, npm, PostgreSQL

2. **Clone Repo & Install**
   ```bash
   git clone <your-repo>
   cd finalyr/backend
   npm install
   npm run build
   ```

3. **Create .env**
   ```
   DATABASE_URL=postgresql://user:password@localhost:5432/climate_db
   PORT=5000
   ENABLE_LOGS=false
   NODE_ENV=production
   ```

4. **Seed Database**
   ```bash
   npm run ts-node src/seed.ts
   ```

5. **Run with PM2 (Process Manager)**
   ```bash
   npm install -g pm2
   pm2 start "npm run dev" --name tempwatch
   pm2 startup
   pm2 save
   ```

6. **Reverse Proxy with Nginx**
   ```nginx
   server {
       listen 80;
       server_name your-backend.com;

       location / {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
       }
   }
   ```

7. **SSL (Let's Encrypt)**
   ```bash
   sudo apt install certbot nginx
   sudo certbot certonly --nginx -d your-backend.com
   ```

---

## Connect Frontend & Backend

Once both are deployed:

1. **Update Frontend Env Var**
   - Vercel project settings → Environment Variables
   - Set `VITE_API_BASE_URL=https://your-backend.com` (production URL)
   - Redeploy Vercel

2. **Enable CORS (if needed)**
   - Backend `src/server.ts` already has `cors()` enabled globally
   - If targeting specific domains, update:
     ```typescript
     app.use(cors({
       origin: 'https://your-frontend.vercel.app'
     }));
     ```

3. **Test**
   - Open frontend in browser
   - Go to Historical Analysis tab
   - Should fetch data from your production backend

---

## Database Backups

### PostgreSQL Dump (Railway/Render)

**Via Railway/Render CLI:**
```bash
# Railway
railway run pg_dump $DATABASE_URL > backup.sql

# Render
psql $DATABASE_URL -c "pg_dump" > backup.sql
```

**Manual Backup (local):**
```bash
pg_dump postgresql://user:password@host:5432/climate_db > backup.sql
```

**Restore:**
```bash
psql postgresql://user:password@host:5432/climate_db < backup.sql
```

---

## Monitoring & Logs

### Vercel
- Dashboard → Deployments tab shows build/runtime logs
- Errors appear in "Functions" tab

### Railway
- Service logs visible in dashboard
- Click service → Logs tab

### Render
- Dashboard → Logs tab shows real-time output

---

## Troubleshooting

### Frontend not connecting to backend
- Check `VITE_API_BASE_URL` in Vercel env vars
- Verify backend URL is publicly accessible
- Check backend CORS settings
- Open browser console (F12) for network errors

### Backend fails to start
- Check `DATABASE_URL` is correct
- Verify PostgreSQL service is running
- Check logs for errors
- Ensure seed data loaded: query `SELECT COUNT(*) FROM "ClimateData";`

### Database out of space
- Railway: Upgrade to paid plan for more storage
- Render: Upgrade database tier
- Self-hosted: Expand disk or clean old comparison logs

### Slow performance
- Frontend: Use Vercel Analytics to identify bottlenecks
- Backend: Check database query performance
- Cache comparison logs after X days if table grows large

---

## Cost Estimate (as of Dec 2025)

| Service | Free Tier | Notes |
|---------|-----------|-------|
| **Vercel (Frontend)** | Free | Unlimited deployments, auto-SSL |
| **Railway (Backend + DB)** | $5/month | 5 GB storage included |
| **Render (Backend + DB)** | Free | Slow spindown, limits on DB size |
| **DigitalOcean** | $5/month | 1GB RAM droplet + managed DB |
| **Domain (Optional)** | $10–15/year | e.g., `.com` from GoDaddy |

---

## Next Steps

1. Deploy frontend to Vercel
2. Deploy backend to Railway or Render
3. Seed production database
4. Update frontend with production backend URL
5. Test end-to-end
6. Monitor logs for issues
7. Set up automated backups

---

For questions, refer to:
- [SETUP.md](SETUP.md) — Local development
- [API.md](API.md) — Endpoint reference
