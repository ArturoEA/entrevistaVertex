# Vertex Developers - Prueba Técnica (Catálogo de Productos)

Plataforma de gestión de inventario (CRUD) desarrollada como solución a la prueba técnica de Vertex Developers. Construida con un enfoque estricto en rendimiento, seguridad y experiencia de usuario.

## Despliegue en Producción

- Frontend (Vercel): https://entrevista-vertex.vercel.app/
- Repositorio (GitHub): https://github.com/ArturoEA/entrevistaVertex

---

## Estrategia de Manejo de Imágenes

El núcleo arquitectónico de este proyecto es la optimización en la gestión de archivos multimedia. Se diseñó un flujo de trabajo que minimiza la carga en el servidor, reduce drásticamente los costos de ancho de banda y almacenamiento, y acelera los tiempos de respuesta del cliente.

### 1. El Cliente: Optimización Edge (React)
Para ahorrar ancho de banda y liberar CPU del backend, la compresión pesada se delegó al navegador del usuario antes de la transmisión de red:
- Herramienta: Se utiliza `browser-image-compression` para interceptar la imagen.
- Compresión Agresiva y Resolución: La imagen se redimensiona dinámicamente a un máximo de 1280px por lado y se reduce a un peso límite de 200KB. Un archivo original de 3MB se comprime típicamente a aproximadamente 100KB (reducción superior al 90%) antes de viajar por la red.
- Formato Eficiente: El archivo se convierte forzosamente a WebP (`image/webp`), un formato de nueva generación significativamente más ligero que un JPEG equivalente manteniendo la misma fidelidad visual.

### 2. El Servidor: Entorno Stateless y Seguro (Express)
El servidor Node.js opera sin tocar el disco duro físico, garantizando escalabilidad inmediata en plataformas cloud:
- Tránsito en Memoria: El middleware `multer` (configurado como `memoryStorage`) mantiene el archivo WebP recién llegado temporalmente en la memoria RAM del servidor como un Buffer.
- Seguridad y Validación: Multer aplica validaciones estrictas: rechazo automático de archivos con tipos MIME distintos a imagen y un tope máximo de seguridad de 500KB. Esto protege al sistema de clientes maliciosos que intenten saltarse las validaciones del frontend.

### 3. La Nube: Almacenamiento Inteligente (Supabase Storage)
- Subida Directa: El SDK de Supabase recibe el Buffer directamente desde la RAM de Node.js y lo aloja en el bucket público `catalogo` con un nombre único autogenerado para evitar colisiones.
- Prevención de Orphaned Files: Durante la actualización de un producto (PUT), si se provee una nueva imagen, el servidor localiza y emite un comando `.remove()` hacia la nube para destruir la imagen antigua. Esto previene costos de almacenamiento inflados por archivos binarios huérfanos.

### 4. Base de Datos y Consumo Optimizado (Prisma + React)
- Persistencia: Solo se almacena la URL pública resultante en la base de datos PostgreSQL mediante Prisma, manteniendo la base de datos ligera.
- Renderizado Diferido: En la interfaz, los listados de productos aplican el atributo `<img loading="lazy" />`, difiriendo la descarga de la imagen hasta que el usuario hace scroll hacia ella, mejorando el First Contentful Paint (FCP).

---

## Criterios Opcionales Alcanzados

El proyecto aborda todos los puntos opcionales de la evaluación técnica:

- Pruebas Automatizadas (Tests): Suite de integración construida con Jest y Supertest evaluando el CRUD aislado. Se implementaron Mocks para Prisma (Base de datos en memoria), Supabase (Storage sin red) y Auth.
- Dockerización: El entorno está contenerizado. El frontend usa un Multi-stage build (Node Alpine para compilación + Nginx para servir estáticos con soporte SPA routing). El backend corre en Node Alpine. Todo está orquestado mediante `docker-compose`.
- Despliegue en la Nube (Deployment): Configuración lista para Vercel (Frontend con archivo `vercel.json` para reescritura SPA) y Render (Backend).
- Integración Continua (CI): Pipeline configurado en GitHub Actions (`.github/workflows/ci.yml`) para ejecutar las pruebas del backend automáticamente en cada push o Pull Request hacia la rama main.
- Experiencia de Usuario (UX): Implementación de Skeleton Loaders (efecto shimmer horizontal), deshabilitación de botones durante peticiones asíncronas para prevenir double-submits, y Empty States dinámicos dependiendo de si el catálogo está vacío o si la búsqueda no arrojó resultados.

---

## Tecnologías Utilizadas

- Frontend: React (Vite), Tailwind CSS (v4).
- Backend: Node.js, Express, Multer, bcryptjs, JWT.
- Base de Datos y ORM: PostgreSQL (hosteado en Supabase), Prisma ORM (con índices optimizados en campos de búsqueda).
- Almacenamiento de Archivos: Supabase Storage.
- DevOps y Testing: Docker, Docker Compose, GitHub Actions, Jest, Supertest.

---

## Instrucciones para Levantar en Local

### 1. Clonar el Repositorio
```bash
git clone https://github.com/ArturoEA/entrevistaVertex
cd entrevistaVertex
```

### 2. Configuración del Backend
```bash
cd backend
npm install
```
Asegúrate de configurar las variables de entorno duplicando el archivo `.env.example` hacia un nuevo archivo `.env` y rellenando los valores necesarios.

Sincronizar el esquema y poblar la base de datos inicial:
```bash
npx prisma db push
npx prisma db seed
```

Levantar el servidor:
```bash
npm run dev
```

### 3. Configuración del Frontend
En una nueva terminal:
```bash
cd frontend
npm install
```
Asegúrate de duplicar el archivo `.env.example` hacia un nuevo archivo `.env.local`.

Iniciar el servidor de desarrollo del cliente:
```bash
npm run dev
```

### 4. Levantamiento Alternativo con Docker
Si prefieres levantar todo el entorno unificado mediante contenedores, desde la raíz del proyecto ejecuta:
```bash
docker-compose up -d --build
```

---

## Variables de Entorno (.env.example)

La configuración requiere los siguientes archivos `.env`:

### Backend (backend/.env)
```env
# Puerto del servidor local
PORT=3000

# Conexiones Prisma a PostgreSQL
DATABASE_URL="postgresql://[USER]:[PASSWORD]@[HOST]:[PORT]/[DATABASE]"
DIRECT_URL="postgresql://[USER]:[PASSWORD]@[HOST]:[PORT]/[DATABASE]"

# Seguridad
JWT_SECRET="tu_secreto_super_seguro_jwt"

# Credenciales Supabase Storage
SUPABASE_URL="https://tu-proyecto.supabase.co"
SUPABASE_KEY="tu_anon_key_o_service_role_key"
```

### Frontend (frontend/.env.local)
```env
# URL base de la API
VITE_API_URL="http://localhost:3000/api"
```
