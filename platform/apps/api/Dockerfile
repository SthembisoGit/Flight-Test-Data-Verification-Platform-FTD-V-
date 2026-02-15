FROM node:20-bookworm-slim AS builder
WORKDIR /app
COPY platform ./platform
WORKDIR /app/platform
RUN npm install
RUN npm run prisma:generate
RUN npm run build -w @astvdp/contracts
RUN npm run build -w @astvdp/api

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/platform /app/platform
WORKDIR /app/platform
CMD ["sh", "-c", "npm run prisma:deploy && npm run start -w @astvdp/api"]
