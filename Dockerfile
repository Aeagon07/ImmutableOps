# ---------- Build Stage ----------
FROM node:18-alpine AS builder

WORKDIR /app

COPY canteen-app/package*.json ./

# IMPORTANT: install devDependencies (needed for Vite)
RUN npm ci --no-audit --no-fund

# Copy env
COPY canteen-app/.env .env

# Copy code
COPY canteen-app/ .

# Build with controlled memory
RUN export $(cat .env | xargs) && NODE_OPTIONS="--max-old-space-size=384" npm run build


# ---------- Production Stage ----------
FROM node:18-alpine

WORKDIR /app

RUN npm install -g serve

COPY --from=builder /app/dist ./dist

EXPOSE 5173

CMD ["npx", "serve", "-s", "dist", "-l", "5173"]