FROM node:22.15.0-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json drizzle.config.ts ./
COPY src ./src
COPY spec ./spec
COPY performance ./performance
COPY drizzle ./drizzle

RUN npm run build


FROM node:22.15.0-bookworm-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist/src ./dist/src

USER node

EXPOSE 3000

CMD ["node", "dist/src/server.js"]