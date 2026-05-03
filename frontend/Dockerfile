FROM node:18-slim

WORKDIR /app

# Dependencies
COPY package*.json ./
RUN npm install

# Source
COPY . .

# Build vaqtida API URL (docker-compose args dan keladi)
ARG VITE_API_URL=http://localhost:8000/api/v1
ENV VITE_API_URL=$VITE_API_URL

# Production build
RUN npm run build

# Serve uchun
RUN npm install -g serve

EXPOSE 8080

CMD ["serve", "-s", "dist", "-l", "8080"]
