FROM node:20-alpine
RUN apk add --update tini

# Tini is now available at /sbin/tini
ENTRYPOINT ["/sbin/tini", "--"]

# Copy application files
COPY package.json ./
COPY server ./server/

RUN npm install --only=prod

EXPOSE 3000

# Run your program under Tini
CMD [ "node", "server/app.js" ]