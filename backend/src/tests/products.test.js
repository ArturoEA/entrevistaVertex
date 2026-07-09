const request = require('supertest');

// ==========================================
// 1. MOCK DE AUTENTICACIÓN (SALTAR EL JWT)
// ==========================================
jest.mock('../middleware/authMiddleware', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { id: 1, email: 'test@xyz.com' }; // Simulamos que el usuario está logueado
    next();
  }
}));

// ==========================================
// 2. MOCK DE PRISMA (BASE DE DATOS EN MEMORIA)
// ==========================================
const mockPrisma = {
  product: {
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  $queryRaw: jest.fn(),
};
jest.mock('@prisma/client', () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => mockPrisma)
  };
});

// ==========================================
// 3. MOCK DE SUPABASE (NUBE FALSA)
// ==========================================
const mockSupabase = {
  storage: {
    from: jest.fn().mockReturnThis(), // Permite encadenamiento: .from().upload()
    upload: jest.fn().mockResolvedValue({ data: {}, error: null }),
    getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'http://fake-supabase.com/image.jpg' } }),
    remove: jest.fn().mockResolvedValue({ data: {}, error: null }),
  }
};
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabase)
}));

// Importamos la aplicación DESPUÉS de definir los mocks
const app = require('../index');

describe('CRUD Aislado de /api/products', () => {
  // Limpiamos los contadores de los mocks antes de cada test para que no se contaminen
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================
  // TEST: READ (GET)
  // ==========================================
  describe('GET /api/products', () => {
    it('debe devolver un status 200 y listar los productos mockeados', async () => {
      mockPrisma.product.findMany.mockResolvedValue([{ id: 1, name: 'Producto Mock' }]);
      mockPrisma.product.count.mockResolvedValue(1);

      const response = await request(app).get('/api/products');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data[0].name).toBe('Producto Mock');
      
      // Verificamos que Prisma fue llamado correctamente
      expect(mockPrisma.product.findMany).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================
  // TEST: CREATE (POST)
  // ==========================================
  describe('POST /api/products', () => {
    it('debe crear un producto pasando el auth y mockeando la subida de imagen', async () => {
      mockPrisma.product.create.mockResolvedValue({
        id: 2,
        name: 'Nuevo Laptop',
        price: 1500,
        imageUrl: 'http://fake-supabase.com/image.jpg'
      });

      const response = await request(app)
        .post('/api/products')
        .field('name', 'Nuevo Laptop')
        .field('price', '1500')
        .field('category', 'Electrónica')
        .attach('image', Buffer.from('fake image content'), {
          filename: 'test.jpg',
          contentType: 'image/jpeg'
        }); // Attach simula un form-data multipart y pasa el multer fileFilter

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('Nuevo Laptop');
      expect(response.body.imageUrl).toBe('http://fake-supabase.com/image.jpg');
      
      // Verificamos que ambos mocks (Nube y BD) se usaron
      expect(mockSupabase.storage.upload).toHaveBeenCalled();
      expect(mockPrisma.product.create).toHaveBeenCalled();
    });
  });

  // ==========================================
  // TEST: UPDATE (PUT)
  // ==========================================
  describe('PUT /api/products/:id', () => {
    it('debe actualizar el producto sin pedir imagen nueva', async () => {
      // 1. Simula que el producto existe en la base de datos
      mockPrisma.product.findUnique.mockResolvedValue({ id: 1, imageUrl: 'http://old.jpg' });
      // 2. Simula el guardado de los nuevos datos
      mockPrisma.product.update.mockResolvedValue({ id: 1, name: 'Laptop Actualizado' });

      // Enviamos un JSON simple simulando una edición solo de texto
      const response = await request(app)
        .put('/api/products/1')
        .send({ name: 'Laptop Actualizado' });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Laptop Actualizado');
      
      expect(mockPrisma.product.findUnique).toHaveBeenCalled();
      expect(mockPrisma.product.update).toHaveBeenCalled();
      // No debería llamarse la subida de supabase porque no enviamos archivo
      expect(mockSupabase.storage.upload).not.toHaveBeenCalled();
    });
  });

  // ==========================================
  // TEST: DELETE (DELETE)
  // ==========================================
  describe('DELETE /api/products/:id', () => {
    it('debe borrar el producto de la BD y la imagen de Supabase', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({ id: 1, imageUrl: 'http://old.jpg/imagen_test.jpg' });
      mockPrisma.product.delete.mockResolvedValue({ id: 1 });

      const response = await request(app).delete('/api/products/1');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Producto eliminado correctamente');
      
      // Verifica que fuimos a borrar en supabase y en prisma
      expect(mockSupabase.storage.remove).toHaveBeenCalledWith(['imagen_test.jpg']);
      expect(mockPrisma.product.delete).toHaveBeenCalled();
    });
  });
});
