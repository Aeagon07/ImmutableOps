# ---------- Build Stage ----------
FROM node:18-alpine AS builder

WORKDIR /app

# 👇 Copy only package files (cache optimization)
COPY canteen-app/package*.json ./

# 👇 Faster install (better than npm install)
RUN npm ci

# 👇 Copy env BEFORE build (important for Vite)
COPY canteen-app/.env .env

# 👇 Copy remaining code
COPY canteen-app/ .

# 👇 Build project
RUN npm run build


# ---------- Production Stage ----------
FROM node:18-alpine

WORKDIR /app

# 👇 Lightweight static server
RUN npm install -g serve

# 👇 Copy only build output (smaller image)
COPY --from=builder /app/dist ./dist

# 👇 Expose correct port
EXPOSE 5173

# 👇 Run app
CMD ["npx", "serve", "-s", "dist", "-l", "5173"]