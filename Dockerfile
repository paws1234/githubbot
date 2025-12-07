FROM node:20-alpine

WORKDIR /app

# Install build dependencies for sqlite3
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json* ./

RUN npm install --production

COPY . .

# Create data directory for SQLite database
RUN mkdir -p /data

ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/data/setups.db

EXPOSE 3000

CMD ["node", "src/index.js"]
