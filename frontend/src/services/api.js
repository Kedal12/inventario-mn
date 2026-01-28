import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para agregar token
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

// Interceptor para manejar errores
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

// ==================== AUTH ====================
export const authService = {
  login: (data) => api.post('/auth/login', data),
  cambiarPassword: (data) => api.post('/auth/cambiar-password', data),
  getMe: () => api.get('/auth/me')
};

// ==================== ACTIVOS ====================
export const activosService = {
  getAll: (params) => api.get('/activos', { params }),
  getById: (id) => api.get(`/activos/${id}`),
  getByCodigo: (codigo) => api.get(`/activos/codigo/${codigo}`),
  getPublico: (codigo) => api.get(`/activos/publico/${codigo}`),
  
  // CORRECCIÓN: Soporte para fotos usando FormData
  create: (formData) => api.post('/activos', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  
  // CORRECCIÓN: Soporte para fotos en actualización
update: (id, formData) => api.put(`/activos/editar/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  darBaja: (id, request) => api.post(`/activos/dar-baja/${id}`, request),
  
  reactivar: (id) => api.post(`/activos/${id}/reactivar`),
  getMarcas: () => api.get('/activos/marcas'),
  generarEtiqueta: (codigo) => api.post('/activos/etiqueta', JSON.stringify(codigo)),
  generarEtiquetas: (codigos) => api.post('/activos/etiquetas', { codigosActivo: codigos })
};

// ==================== TRASLADOS ====================
export const trasladosService = {
  getAll: (params) => api.get('/traslados', { params }),
  getById: (id) => api.get(`/traslados/${id}`),
  getByActivo: (activoId) => api.get(`/traslados/activo/${activoId}`),
  create: (data) => api.post('/traslados', data),
  getComprobante: (id) => api.get(`/traslados/${id}/comprobante`)
};

// ==================== CATALOGOS ====================
export const catalogosService = {
  // Almacenes
  getAlmacenes: (soloActivos = true) => api.get('/catalogos/almacenes', { params: { soloActivos } }),
  getAlmacen: (id) => api.get(`/catalogos/almacenes/${id}`),
  createAlmacen: (data) => api.post('/catalogos/almacenes', data),
  updateAlmacen: (id, data) => api.put(`/catalogos/almacenes/${id}`, data),
  
  // Tipos
  getTipos: (soloActivos = true) => api.get('/catalogos/tipos', { params: { soloActivos } }),
  getTipo: (id) => api.get(`/catalogos/tipos/${id}`),
  createTipo: (data) => api.post('/catalogos/tipos', data),
  updateTipo: (id, data) => api.put(`/catalogos/tipos/${id}`, data),
  
  // Estados
  getEstados: () => api.get('/catalogos/estados'),
  getEstado: (id) => api.get(`/catalogos/estados/${id}`),
  createEstado: (data) => api.post('/catalogos/estados', data),
  updateEstado: (id, data) => api.put(`/catalogos/estados/${id}`, data)
};

// ==================== USUARIOS ====================
export const usuariosService = {
  getAll: () => api.get('/usuarios'),
  getById: (id) => api.get(`/usuarios/${id}`),
  create: (data) => api.post('/usuarios', data),
  update: (id, data) => api.put(`/usuarios/${id}`, data),
  resetPassword: (id, password) => api.post(`/usuarios/${id}/reset-password`, JSON.stringify(password)),
  delete: (id) => api.delete(`/usuarios/${id}`)
};

// ==================== REPORTES ====================
export const reportesService = {
  getDashboard: () => api.get('/reportes/dashboard'),
  exportarActivosExcel: (filtro) => api.post('/reportes/exportar/activos/excel', filtro, { responseType: 'blob' }),
  exportarActivosPdf: (filtro) => api.post('/reportes/exportar/activos/pdf', filtro, { responseType: 'blob' }),
  exportarTrasladosExcel: (params) => api.get('/reportes/exportar/traslados/excel', { params, responseType: 'blob' })
};

export default api;