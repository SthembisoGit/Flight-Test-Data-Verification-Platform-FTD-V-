FROM debian:bookworm-slim AS engine-builder
RUN apt-get update \
  && apt-get install -y --no-install-recommends cmake g++ make pkg-config libsqlite3-dev \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /src
COPY CMakeLists.txt ./
COPY include ./include
COPY src ./src
COPY docs ./docs
COPY database ./database
RUN cmake -S . -B build/linux-release -DCMAKE_BUILD_TYPE=Release \
  && cmake --build build/linux-release -j

FROM node:20-bookworm-slim AS builder
WORKDIR /app
COPY platform ./platform
WORKDIR /app/platform
RUN npm install
RUN npm run prisma:generate
RUN npm run build -w @astvdp/contracts
RUN npm run build -w @astvdp/worker

FROM node:20-bookworm-slim AS runner
RUN apt-get update \
  && apt-get install -y --no-install-recommends libsqlite3-0 \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/platform /app/platform
COPY --from=engine-builder /src/build/linux-release/astvdp /usr/local/bin/astvdp
WORKDIR /app/platform
CMD ["sh", "-c", "npm run prisma:deploy && npm run start -w @astvdp/worker"]
