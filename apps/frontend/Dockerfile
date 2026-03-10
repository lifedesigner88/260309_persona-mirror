FROM node:24.11.0-alpine

WORKDIR /workspace

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/frontend/package.json ./apps/frontend/package.json

RUN pnpm install --filter frontend... --frozen-lockfile=false

COPY apps/frontend ./apps/frontend

WORKDIR /workspace/apps/frontend

EXPOSE 3000

CMD ["pnpm", "dev", "--host", "0.0.0.0", "--port", "3000"]
