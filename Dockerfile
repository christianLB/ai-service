FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
RUN npm prune --production
HEALTHCHECK CMD curl --fail http://localhost:3000/status || exit 1
CMD ["node", "dist/index.js"]
