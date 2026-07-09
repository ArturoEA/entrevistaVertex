# Fase 1: Build de la aplicación
FROM node:24-alpine AS build

WORKDIR /app

# Copiar archivos de dependencias y aprovechar caché
COPY package*.json ./
RUN npm install

# Copiar el código y construir la versión de producción (dist)
COPY . .

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# Fase 2: Servidor estático (Nginx Alpine)
FROM nginx:alpine

# Copiar los archivos construidos desde la Fase 1 al directorio de Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Reemplazar la configuración por defecto de Nginx por la nuestra (Soporte SPA)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exponer el puerto 80
EXPOSE 80

# Iniciar Nginx
CMD ["nginx", "-g", "daemon off;"]
