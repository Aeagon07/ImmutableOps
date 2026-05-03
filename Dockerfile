# ---------- Build Stage ----------
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY canteen-app/package*.json ./

# Install dependencies
RUN npm ci --no-audit --no-fund

# Copy env file
COPY canteen-app/.env .env

# Copy remaining code
COPY canteen-app/ .

# 👉 IMPORTANT FIX HERE
RUN export $(cat .env | xargs) && npm run build


# ---------- Production Stage ----------
FROM node:18-alpine

WORKDIR /app

RUN npm install -g serve

COPY --from=builder /app/dist ./dist

EXPOSE 5173

CMD ["npx", "serve", "-s", "dist", "-l", "5173"]