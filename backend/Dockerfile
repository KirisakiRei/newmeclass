FROM node:20-alpine AS base
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run prisma:generate && npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/dist ./dist
COPY --from=base /app/prisma ./prisma
COPY --from=base /app/package.json ./package.json
COPY --from=base /app/.env.example ./.env.example
EXPOSE 5000
CMD ["node", "dist/main.js"]
