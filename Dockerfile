FROM node:22-alpine
WORKDIR /app
COPY package.json ./
COPY index.html ./
COPY src ./src
COPY scripts ./scripts
COPY tests ./tests
EXPOSE 4111
ENV PORT=4111
CMD ["node", "src/server/liveTelemetryServer.mjs"]
