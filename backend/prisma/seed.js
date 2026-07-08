const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando el script de seeding...');

  // 1. Crear usuario de prueba
  const hashedPassword = await bcrypt.hash('Xyz1234@', 10);
  
  const user = await prisma.user.upsert({
    where: { email: 'test@xyz.com' },
    update: {},
    create: {
      email: 'test@xyz.com',
      password: hashedPassword,
    },
  });
  
  console.log('Usuario de prueba garantizado:', user.email);

  // 2. Crear 15 productos de ejemplo (3 categorías)
  const products = [
    { name: 'Laptop Pro 15', description: 'Potente laptop para desarrollo', price: 1299.99, category: 'Electrónica', imageUrl: 'https://picsum.photos/seed/laptop/600/400' },
    { name: 'Smartphone X', description: 'Última generación con cámara 4K', price: 899.99, category: 'Electrónica', imageUrl: 'https://picsum.photos/seed/phone/600/400' },
    { name: 'Audífonos Noise Cancelling', description: 'Inalámbricos con batería de 30h', price: 249.99, category: 'Electrónica', imageUrl: 'https://picsum.photos/seed/audio/600/400' },
    { name: 'Monitor 4K 27"', description: 'Colores precisos para diseño', price: 399.99, category: 'Electrónica', imageUrl: 'https://picsum.photos/seed/monitor/600/400' },
    { name: 'Teclado Mecánico', description: 'Switches táctiles silenciosos', price: 119.99, category: 'Electrónica', imageUrl: 'https://picsum.photos/seed/keyboard/600/400' },
    
    { name: 'Silla Ergonómica', description: 'Soporte lumbar ajustable', price: 199.99, category: 'Oficina', imageUrl: 'https://picsum.photos/seed/chair/600/400' },
    { name: 'Escritorio Elevable', description: 'Motor dual, memoria de altura', price: 450.00, category: 'Oficina', imageUrl: 'https://picsum.photos/seed/desk/600/400' },
    { name: 'Lámpara LED', description: 'Luz regulable con cargador inalámbrico', price: 45.99, category: 'Oficina', imageUrl: 'https://picsum.photos/seed/lamp/600/400' },
    { name: 'Organizador de Cables', description: 'Kit completo de gestión', price: 15.50, category: 'Oficina', imageUrl: 'https://picsum.photos/seed/cables/600/400' },
    { name: 'Pizarra Magnética', description: 'Incluye marcadores y borrador', price: 35.00, category: 'Oficina', imageUrl: 'https://picsum.photos/seed/board/600/400' },
    
    { name: 'Mochila Antirrobo', description: 'Impermeable con puerto USB', price: 59.99, category: 'Accesorios', imageUrl: 'https://picsum.photos/seed/bag/600/400' },
    { name: 'Botella Térmica', description: 'Mantiene frío 24h y calor 12h', price: 24.99, category: 'Accesorios', imageUrl: 'https://picsum.photos/seed/bottle/600/400' },
    { name: 'Libreta Moleskine', description: 'Tapa dura, hojas punteadas', price: 19.99, category: 'Accesorios', imageUrl: 'https://picsum.photos/seed/notebook/600/400' },
    { name: 'Soporte para Laptop', description: 'Aluminio ventilado portátil', price: 29.99, category: 'Accesorios', imageUrl: 'https://picsum.photos/seed/stand/600/400' },
    { name: 'Gafas de Descanso', description: 'Filtro de luz azul', price: 39.99, category: 'Accesorios', imageUrl: 'https://picsum.photos/seed/glasses/600/400' },
  ];

  // Limpiar catálogo actual para evitar acumulaciones masivas al correr el seed múltiples veces (opcional, pero útil)
  await prisma.product.deleteMany();
  console.log('Catálogo anterior limpiado.');

  // 3. Insertar masivamente
  const result = await prisma.product.createMany({
    data: products,
    skipDuplicates: true,
  });

  console.log(`Se insertaron ${result.count} productos de prueba exitosamente.`);
  console.log('Seeding completado con éxito.');
}

main()
  .catch((e) => {
    console.error('Error durante el seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
