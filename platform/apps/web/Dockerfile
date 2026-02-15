FROM node:20-bookworm-slim AS builder
WORKDIR /app
COPY platform ./platform
WORKDIR /app/platform
RUN npm install
RUN npm run build -w @astvdp/web

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/platform /app/platform
WORKDIR /app/platform/apps/web
EXPOSE 3000
CMD ["npm", "run", "start"]
