FROM node:24-alpine

# Establecer el directorio de trabajo dentro del contenedor
WORKDIR /usr/src/app

# Copiar archivos de dependencias primero para aprovechar la caché de Docker
COPY package*.json ./

# Instalar dependencias (incluyendo las necesarias para Prisma)
RUN npm install

# Copiar la carpeta prisma explícitamente antes del código para generar el cliente
COPY prisma ./prisma/

# Generar el cliente de Prisma adaptado a Alpine Linux
RUN npx prisma generate

# Copiar el resto del código fuente del backend
COPY . .

# Exponer el puerto en el que corre Express
EXPOSE 3000

# Comando para iniciar la aplicación
CMD ["npm", "start"]
