import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import imageCompression from 'browser-image-compression';

export default function Catalog() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  
  // Lista y filtros
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState([]);
  
  // Form state
  const [showModal, setShowModal] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({ id: null, name: '', description: '', price: '', category: '', image: null });

  const API_URL = import.meta.env.VITE_API_URL;

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_URL}/products/categories`);
      if (res.ok) {
        const data = await res.json();
        setCategories([...new Set(data)]);
      }
    } catch (err) {}
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page,
        limit: 8,
        ...(search && { search }),
        ...(category && { category })
      });
      const res = await fetch(`${API_URL}/products?${query}`);
      if (!res.ok) throw new Error('Error al cargar productos');
      const data = await res.json();
      setProducts(data.data || []);
      setTotalPages(data.meta?.totalPages || 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Debounce YAGNI para la búsqueda sin librerías extra
  useEffect(() => {
    const delay = setTimeout(() => {
      fetchProducts();
    }, 200);
    return () => clearTimeout(delay);
  }, [page, search, category]);

  // Si cambia la búsqueda, regresar a página 1
  useEffect(() => {
    setPage(1);
  }, [search, category]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleOpenModal = (product = null) => {
    if (product) {
      setFormData({ id: product.id, name: product.name, description: product.description, price: product.price, category: product.category, image: null });
    } else {
      setFormData({ id: null, name: '', description: '', price: '', category: '', image: null });
    }
    setFormError('');
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Seguro que deseas eliminar este producto?')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`${API_URL}/products/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Error al eliminar');
      setSuccessMsg('Producto eliminado exitosamente');
      fetchProducts();
    } catch (err) {
      alert(err.message);
    } finally {
      setDeletingId(null);
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');

    try {
      let url = `${API_URL}/products`;
      let method = formData.id ? 'PUT' : 'POST';
      let headers = { Authorization: `Bearer ${token}` };

      const form = new FormData();
      form.append('name', formData.name);
      form.append('description', formData.description);
      form.append('price', formData.price);
      form.append('category', formData.category);

      if (formData.image) {
        const options = {
          maxSizeMB: 0.2,
          maxWidthOrHeight: 1280,
          useWebWorker: true,
          fileType: 'image/webp',
        };
        const compressedFile = await imageCompression(formData.image, options);
        const originalName = compressedFile.name || formData.image.name;
        const webpName = originalName.replace(/\.[^/.]+$/, "") + ".webp";
        
        form.append('image', compressedFile, webpName);
      } else if (!formData.id) {
        throw new Error('La imagen es requerida para nuevos productos');
      }

      const res = await fetch(url + (formData.id ? `/${formData.id}` : ''), {
        method,
        headers,
        body: form
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al guardar producto');
      }

      setSuccessMsg(formData.id ? 'Producto editado exitosamente' : 'Producto creado exitosamente');
      setShowModal(false);
      fetchProducts();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
          <h1 className="text-3xl font-bold text-gray-800">Catálogo de Productos</h1>
          <button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded shadow transition">
            Salir
          </button>
        </div>

        {/* Acciones y Filtros */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <button onClick={() => handleOpenModal()} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow font-medium transition w-full md:w-auto whitespace-nowrap">
            + Nuevo Producto
          </button>
          
          <div className="flex w-full md:w-auto gap-2">
            <input 
              type="text" 
              placeholder="Buscar por nombre..." 
              className="border border-gray-300 rounded p-2 flex-grow outline-none focus:ring-2 focus:ring-blue-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select 
              className="border border-gray-300 rounded p-2 w-40 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">Todas</option>
              {categories.map((c, i) => (
                <option key={i} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {error && <div className="bg-red-100 border border-red-200 text-red-700 p-4 rounded mb-6">{error}</div>}
        
        {loading ? (
          <p className="text-center text-gray-500 py-10">Cargando productos...</p>
        ) : (
          <>
            {products.length === 0 ? (
              <p className="text-center text-gray-500 py-10">No se encontraron productos.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.map(p => (
                  <div key={p.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden flex flex-col">
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} className="w-full h-48 object-cover bg-gray-100" />
                    ) : (
                      <div className="w-full h-48 bg-gray-200 flex items-center justify-center text-gray-400">Sin Imagen</div>
                    )}
                    <div className="p-4 flex-grow flex flex-col">
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="font-bold text-lg leading-tight text-gray-900">{p.name}</h3>
                        <span className="bg-blue-100 text-blue-800 text-[10px] uppercase font-bold px-2 py-1 rounded whitespace-nowrap">{p.category}</span>
                      </div>
                      <p className="text-gray-600 text-sm mt-2 line-clamp-2 flex-grow">{p.description}</p>
                      <p className="text-green-600 font-bold mt-4 text-xl">${p.price}</p>
                    </div>
                    <div className="p-3 bg-gray-50 border-t flex justify-end gap-3">
                      <button onClick={() => handleOpenModal(p)} className="text-blue-600 hover:text-blue-800 text-sm font-medium transition disabled:opacity-50" disabled={deletingId === p.id}>Editar</button>
                      <button onClick={() => handleDelete(p.id)} disabled={deletingId === p.id} className="text-red-600 hover:text-red-800 text-sm font-medium transition flex items-center gap-1 disabled:opacity-50">
                        {deletingId === p.id ? (
                          <svg className="animate-spin h-4 w-4 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        ) : 'Eliminar'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Paginación visible siempre */}
            <div className="flex justify-center items-center mt-8 gap-4 pb-8">
              <button 
                disabled={page <= 1} 
                onClick={() => setPage(p => p - 1)}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white transition"
              >
                Anterior
              </button>
              <span className="text-gray-600 font-medium">Página {page} de {Math.max(1, totalPages)}</span>
              <button 
                disabled={page >= Math.max(1, totalPages)} 
                onClick={() => setPage(p => p + 1)}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white transition"
              >
                Siguiente
              </button>
            </div>
          </>
        )}

        {/* Modal Minimalista (YAGNI) */}
        {showModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-xl font-bold mb-4 text-gray-800">{formData.id ? 'Editar' : 'Crear'} Producto</h2>
                
                {formError && <div className="bg-red-50 border border-red-200 text-red-600 p-3 text-sm rounded-lg mb-4">{formError}</div>}
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                    <input required type="text" className="block w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                    <textarea className="block w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none" rows="3" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}></textarea>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Precio</label>
                      <input required type="number" step="0.01" min="0" className="block w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                      <input className="block w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Imagen {formData.id && <span className="font-normal text-gray-500">(Opcional: Seleccionar una nueva la reemplazará)</span>}
                    </label>
                    <input required={!formData.id} type="file" accept="image/jpeg, image/png, image/webp" className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" onChange={e => setFormData({...formData, image: e.target.files[0]})} />
                    <p className="text-xs text-gray-500 mt-2">La imagen se comprimirá automáticamente a ~200KB antes de subir.</p>
                  </div>
                  <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                    <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 transition font-medium">Cancelar</button>
                    <button type="submit" disabled={formLoading} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-70 transition font-medium min-w-[100px] flex justify-center">
                      {formLoading ? (
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      ) : 'Guardar'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Toast Notification Flotante */}
        {successMsg && (
          <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:min-w-[300px] bg-gray-900 text-white p-4 rounded-lg shadow-xl flex justify-between items-center z-[60] transition-all transform translate-y-0 opacity-100">
            <div className="flex items-center gap-3">
              <div className="bg-green-500 rounded-full p-1">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
              </div>
              <span className="font-medium text-sm">{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg('')} className="text-gray-400 hover:text-white ml-4 font-bold text-lg">&times;</button>
          </div>
        )}
      </div>
    </div>
  );
}
