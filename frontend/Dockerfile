FROM node:18-slim

WORKDIR /app

# Dependencies
COPY package*.json ./
RUN npm install

# Source
COPY . .

# Build vaqtida API URL (docker-compose dan keladi)
ARG VITE_API_BASE=http://localhost:8000/api/v1
ARG VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
ENV VITE_API_BASE=$VITE_API_BASE
ENV VITE_STRIPE_PUBLISHABLE_KEY=$VITE_STRIPE_PUBLISHABLE_KEY

# Production build
RUN npm run build

# Serve uchun
RUN npm install -g serve

EXPOSE 8080

CMD ["serve", "-s", "dist", "-l", "8080"]
