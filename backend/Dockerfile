FROM oven/bun:1.1.0 AS builder
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile
COPY . .
CMD ["bun", "src/index.ts"]
EXPOSE 3000
