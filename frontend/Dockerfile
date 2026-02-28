FROM node:24-slim AS build

WORKDIR /app

# Copy root workspace files first for dependency resolution
COPY package.json package-lock.json ./
COPY frontend/package.json frontend/

RUN npm ci --workspace=frontend

COPY frontend/ frontend/
RUN npm run build --workspace=frontend

FROM nginx:alpine

COPY --from=build /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
