# Multi-stage Dockerfile for TempWatch Insights backend with Verilator

# Stage 1: build with Verilator installed
FROM node:22-bullseye AS builder

# Install build dependencies and Verilator
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential verilator make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace
COPY . .

# Install backend deps and build
WORKDIR /workspace/backend
RUN npm ci
RUN npm run build

# Build Verilator binary (uses run_verilator.sh)
RUN npm run verilator:build

# Stage 2: runtime image
FROM node:22-bullseye-slim AS runtime
WORKDIR /app

# Copy built backend (including obj_dir) from builder
COPY --from=builder /workspace/backend /app/backend

# Copy seed CSVs (repo root) into runtime image so seed script can access them at /app
COPY --from=builder /workspace/temp_exogenous_dataset(2000-2024).csv /app/
COPY --from=builder /workspace/temperature_forecast_2025_2035.csv /app/

# Copy compiled Verilator obj_dir (contains Vcomparator) into runtime image
COPY --from=builder /workspace/obj_dir /app/obj_dir

WORKDIR /app/backend
ENV NODE_ENV=production
RUN npm ci --only=production

# Ensure Prisma client is generated in the runtime image (creates .prisma/client)
RUN npx prisma generate

EXPOSE 5000
# Entrypoint will optionally run seeds when RUN_SEED=true, then start the server
ENTRYPOINT ["/usr/bin/env","bash","/app/backend/entrypoint.sh"]
