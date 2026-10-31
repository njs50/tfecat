FROM node:22-alpine
RUN apk add --update tini

# Tini is now available at /sbin/tini
ENTRYPOINT ["/sbin/tini", "--"]

# Copy application files
COPY package.json package-lock.json ./
COPY server ./server/

RUN npm ci --omit=dev

EXPOSE 3000

# Run your program under Tini
CMD [ "node", "server/app.js" ]