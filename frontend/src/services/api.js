import axios from 'axios';

// Configuración base de la API
const API_URL = import.meta.env.VITE_API_URL || 'http://10.15.0.221:5050/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para agregar token a las peticiones
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para manejar errores de autenticación
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ==================== AUTENTICACIÓN ====================
export const authService = {
  login: (credentials) => api.post('/auth/login', credentials),
  registro: (data) => api.post('/auth/registro', data),
  perfil: () => api.get('/auth/perfil')
};

// ==================== ACTIVOS ====================
export const activosService = {
  getAll: (params) => api.get('/activos', { params }),
  getById: (id) => api.get(`/activos/${id}`),
  getByCodigo: (codigo) => api.get(`/activos/codigo/${codigo}`),
  getPublico: (codigo) => api.get(`/activos/publico/${codigo}`),
  
  create: (data, foto = null) => {
    const formData = new FormData();
    formData.append('TipoActivoId', data.tipoActivoId);
    formData.append('AlmacenId', data.almacenId);
    formData.append('Marca', data.marca);
    formData.append('Modelo', data.modelo);
    
    if (data.estadoId) formData.append('EstadoId', data.estadoId);
    if (data.serialFabricante) formData.append('SerialFabricante', data.serialFabricante);
    if (data.descripcion) formData.append('Descripcion', data.descripcion);
    if (data.observaciones) formData.append('Observaciones', data.observaciones);
    
    if (foto) formData.append('Foto', foto);
    
    return api.post('/activos', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  
  update: (id, data, foto = null) => {
    const formData = new FormData();
    if (data.tipoActivoId) formData.append('TipoActivoId', data.tipoActivoId);
    if (data.estadoId) formData.append('EstadoId', data.estadoId);
    if (data.marca) formData.append('Marca', data.marca);
    if (data.modelo) formData.append('Modelo', data.modelo);
    if (data.serialFabricante !== undefined) formData.append('SerialFabricante', data.serialFabricante || '');
    if (data.descripcion !== undefined) formData.append('Descripcion', data.descripcion || '');
    if (data.observaciones !== undefined) formData.append('Observaciones', data.observaciones || '');
    
    if (foto) formData.append('Foto', foto);
    
    return api.put(`/activos/editar/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  
  darBaja: (id, motivo) => api.post(`/activos/dar-baja/${id}`, { motivo }),
  reactivar: (id) => api.post(`/activos/${id}/reactivar`),
  delete: (id) => api.delete(`/activos/${id}`),
  getMarcas: () => api.get('/activos/marcas'),
  generarEtiquetas: (data) => api.post('/activos/etiquetas', data),
};

// ==================== MANTENIMIENTOS ====================
export const mantenimientosService = {
  getCatalogos: () => api.get('/mantenimientos/catalogos'),
  getActivos: () => api.get('/mantenimientos/activos'),
  getActivoEstado: (id) => api.get(`/mantenimientos/activos/${id}`),
  buscarActivo: (query) => api.get(`/mantenimientos/activos/buscar?q=${query}`),
  registrar: (data) => api.post('/mantenimientos/registrar', data),
  getHistorial: (id) => api.get(`/mantenimientos/historial/${id}`),
  getByFecha: (params) => api.get('/mantenimientos/por-fecha', { params }),
  getDatosEtiqueta: (id) => api.get(`/mantenimientos/etiqueta/${id}`),
  getDashboard: () => api.get('/mantenimientos/dashboard')
};

// ==================== CATÁLOGOS ====================
export const catalogosService = {
  getAlmacenes: () => api.get('/catalogos/almacenes'),
  getAlmacen: (id) => api.get(`/catalogos/almacenes/${id}`),
  createAlmacen: (data) => api.post('/catalogos/almacenes', data),
  updateAlmacen: (id, data) => api.put(`/catalogos/almacenes/${id}`, data),
  deleteAlmacen: (id) => api.delete(`/catalogos/almacenes/${id}`),
  
  getTipos: () => api.get('/catalogos/tipos'),
  getTipo: (id) => api.get(`/catalogos/tipos/${id}`),
  createTipo: (data) => api.post('/catalogos/tipos', data),
  updateTipo: (id, data) => api.put(`/catalogos/tipos/${id}`, data),
  deleteTipo: (id) => api.delete(`/catalogos/tipos/${id}`),
  
  getEstados: () => api.get('/catalogos/estados')
};

// ==================== USUARIOS ====================
export const usuariosService = {
  getAll: () => api.get('/usuarios'),
  getById: (id) => api.get(`/usuarios/${id}`),
  create: (data) => api.post('/usuarios', data),
  update: (id, data) => api.put(`/usuarios/${id}`, data),
  delete: (id) => api.delete(`/usuarios/${id}`),
  cambiarPassword: (id, data) => api.post(`/usuarios/${id}/cambiar-password`, data)
};

// ==================== TRASLADOS ====================
export const trasladosService = {
  getAll: (params) => api.get('/traslados', { params }),
  getById: (id) => api.get(`/traslados/${id}`),
  create: (data) => api.post('/traslados', data),
  generarComprobante: (id) => api.get(`/traslados/${id}/comprobante`)
};

// ==================== REPORTES ====================
export const reportesService = {
  getDashboard: () => api.get('/reportes/dashboard'),
  getInventarioGeneral: (params) => api.get('/reportes/inventario', { params }),
  getActivosPorAlmacen: () => api.get('/reportes/por-almacen'),
  getActivosPorTipo: () => api.get('/reportes/por-tipo'),
  getMovimientos: (params) => api.get('/reportes/movimientos', { params }),
  getTrasladosPendientes: (params) => api.get('/reportes/traslados', { params }),
  exportarActivosExcel: (filtro) => api.post('/reportes/exportar/activos/excel', filtro, { responseType: 'blob' }),
  exportarActivosPdf: (filtro) => api.post('/reportes/exportar/activos/pdf', filtro, { responseType: 'blob' }),
  exportarTrasladosExcel: (params) => api.get('/reportes/exportar/traslados/excel', { params, responseType: 'blob' })
};

// ==================== IMPORTACIÓN ====================
export const importacionService = {
  descargarPlantillaExcel: () => api.get('/importacion/plantilla/excel', { responseType: 'blob' }),
  descargarPlantillaCSV: () => api.get('/importacion/plantilla/csv', { responseType: 'blob' }),
  importarExcel: (almacenId, formData) => api.post(`/importacion/excel/${almacenId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  importarCSV: (almacenId, formData) => api.post(`/importacion/csv/${almacenId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
};

// ==================== CONCILIACIÓN / INVENTARIO ====================
export const conciliacionService = {
  conciliarAlmacen: (data) => api.post('/conciliacion/almacen', data),
  verificarCodigo: (data) => api.post('/conciliacion/verificar', data),
  marcarInventariados: (codigos) => api.post('/conciliacion/marcar-inventariados', codigos)
};

export default api;