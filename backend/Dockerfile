FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
COPY nest-cli.json tsconfig.json tsconfig.build.json ./
COPY prisma ./prisma
COPY scripts ./scripts
COPY src ./src
RUN npm run prisma:generate && npm run build

FROM build AS prod-deps
RUN npm prune --omit=dev

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./package.json
EXPOSE 5000
CMD ["node", "dist/src/main.js"]
