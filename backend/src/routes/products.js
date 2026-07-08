const express = require('express');
const multer = require('multer');
const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@supabase/supabase-js');
const { authenticateToken } = require('../middleware/authMiddleware');

const router = express.Router();
const prisma = new PrismaClient();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const BUCKET_NAME = 'catalogo';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 }, // 500 KB limit
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Solo se permiten imágenes'), false);
    }
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimes.includes(file.mimetype)) {
      return cb(new Error('Formato no soportado. Usa JPEG, PNG o WebP'), false);
    }
    cb(null, true);
  }
});

const multerUpload = (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
};

// CREATE
router.post('/', authenticateToken, multerUpload, async (req, res) => {
  try {
    const { name, description, price, category } = req.body;
    if (!name || !price || !req.file) {
      return res.status(400).json({ error: 'Faltan campos obligatorios o la imagen' });
    }

    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}-${req.file.originalname}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
      });

    if (uploadError) throw new Error(`Supabase upload failed: ${uploadError.message}`);

    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);

    const product = await prisma.product.create({
      data: {
        name,
        description: description || '',
        price: parseFloat(price),
        category: category || 'General',
        imageUrl: publicUrlData.publicUrl,
      },
    });

    res.status(201).json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
});

// READ (Categorías únicas)
router.get('/categories', async (req, res) => {
  try {
    const categories = await prisma.product.findMany({
      select: { category: true },
      distinct: ['category'],
    });
    // YAGNI: devolvemos un array plano de strings
    res.json(categories.map(c => c.category).filter(Boolean));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener categorías' });
  }
});

// READ (Lista paginada)
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, search, category } = req.query;
    
    const where = {};
    if (search) where.name = { contains: search, mode: 'insensitive' };
    if (category) where.category = { equals: category, mode: 'insensitive' };

    const products = await prisma.product.findMany({
      where,
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
    });

    const total = await prisma.product.count({ where });

    res.json({
      data: products,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

// UPDATE
router.put('/:id', authenticateToken, multerUpload, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, category } = req.body;
    
    // Buscar producto actual
    const existingProduct = await prisma.product.findUnique({ where: { id: Number(id) } });
    if (!existingProduct) return res.status(404).json({ error: 'Producto no encontrado' });

    let imageUrl = existingProduct.imageUrl;

    // Si viene imagen nueva, subirla y reemplazar
    if (req.file) {
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}-${req.file.originalname}`;
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(fileName, req.file.buffer, { contentType: req.file.mimetype });

      if (uploadError) throw new Error(`Error subiendo nueva imagen: ${uploadError.message}`);

      const { data: publicUrlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName);
      imageUrl = publicUrlData.publicUrl;

      // Eliminar imagen anterior de Supabase
      if (existingProduct.imageUrl) {
        const urlParts = existingProduct.imageUrl.split('/');
        const oldFileName = urlParts[urlParts.length - 1];
        await supabase.storage.from(BUCKET_NAME).remove([oldFileName]).catch(() => {}); // YAGNI: fire and forget
      }
    }

    const product = await prisma.product.update({
      where: { id: Number(id) },
      data: {
        ...(name && { name }),
        ...(description && { description }),
        ...(price && { price: parseFloat(price) }),
        ...(category && { category }),
        imageUrl,
      },
    });

    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar producto' });
  }
});

// DELETE
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({ where: { id: Number(id) } });
    if (!product) return res.status(404).json({ error: 'Producto no encontrado' });

    // Optional YAGNI: Borrar en supabase (comentado si no lo pide estrictamente, pero es buena práctica)
    const urlParts = product.imageUrl.split('/');
    const fileName = urlParts[urlParts.length - 1];
    await supabase.storage.from(BUCKET_NAME).remove([fileName]);

    await prisma.product.delete({ where: { id: Number(id) } });
    res.json({ message: 'Producto eliminado correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar producto' });
  }
});

module.exports = router;
