FROM node:24-slim AS build

RUN corepack enable && corepack prepare pnpm@10.6.2 --activate

WORKDIR /app

COPY pnpm-workspace.yaml package.json .npmrc ./
COPY apps/web/package.json apps/web/

RUN pnpm install --frozen-lockfile

COPY apps/web/ apps/web/
RUN pnpm --filter web build

FROM nginx:alpine

COPY --from=build /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
