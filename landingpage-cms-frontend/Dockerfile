FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

ARG VITE_BACKEND_URL=
ARG VITE_DASHBOARD_URL=
ENV VITE_BACKEND_URL=${VITE_BACKEND_URL}
ENV VITE_DASHBOARD_URL=${VITE_DASHBOARD_URL}

COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runtime

COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
