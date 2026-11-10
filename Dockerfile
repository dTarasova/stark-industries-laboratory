FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json vite.config.ts index.html ./
COPY src ./src
COPY prototype ./prototype
RUN npm run build
COPY server.mjs server.test.mjs element.test.mjs clean-slate.test.mjs ./
RUN npm test

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV PORT=3000
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node server.mjs ./
RUN mkdir -p /app/data && chown node:node /app/data
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000/api/mission').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "server.mjs"]
