FROM node:18

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ARG VITE_API_BASE=http://10.186.131.41:8000/api/v1
ENV VITE_API_BASE=$VITE_API_BASE

RUN npm run build

RUN npm install -g serve

CMD ["serve", "-s", "dist", "-l", "8080"]