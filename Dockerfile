FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
RUN npm run build
HEALTHCHECK CMD curl --fail http://localhost:3000/status || exit 1
CMD ["node", "dist/index.js"]
