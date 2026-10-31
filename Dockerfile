FROM node:26-alpine
RUN apk add --update tini
RUN corepack enable

# Tini is now available at /sbin/tini
ENTRYPOINT ["/sbin/tini", "--"]

# Copy application files
COPY package.json pnpm-lock.yaml ./
COPY server ./server/

RUN pnpm install --frozen-lockfile --prod

EXPOSE 3000

# Run your program under Tini
CMD [ "node", "server/app.js" ]
