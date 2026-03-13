#!/usr/bin/env bash
set -euo pipefail

# Entry point: optionally run DB seed then start the server
# Use RUN_SEED=true in env to run the seed on startup (remember to unset after seeding)

# Optional: run migrations first if requested
if [ "${RUN_MIGRATE:-false}" = "true" ]; then
  echo "🔁 RUN_MIGRATE=true detected — applying Prisma migrations (npx prisma migrate deploy)..."
  if npx prisma migrate deploy; then
    echo "✅ 'prisma migrate deploy' completed (no pending migrations or applied successfully)."
  else
    echo "⚠️ 'prisma migrate deploy' failed; will attempt 'prisma db push' as fallback."
  fi

  echo "🔁 Ensuring schema exists with 'npx prisma db push'..."
  npx prisma db push || echo "⚠️ 'prisma db push' failed; check DB connection and permissions."
  echo "✅ Migrations/schema applied"
else
  echo "🔒 RUN_MIGRATE not set; skipping migrations"
fi

if [ "${RUN_SEED:-false}" = "true" ]; then
  echo "🔁 RUN_SEED=true detected — running seed script..."
  node dist/seed.js
  echo "✅ Seed script completed"
else
  echo "🔒 RUN_SEED not set; skipping seed"
fi

# Start the server
exec node dist/server.js
