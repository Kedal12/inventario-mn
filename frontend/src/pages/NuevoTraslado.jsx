import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { trasladosService, activosService, catalogosService } from '../services/api';
import { ArrowLeft, Save, Loader, Search } from 'lucide-react';

export default function NuevoTraslado() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [almacenes, setAlmacenes] = useState([]);
  const [activo, setActivo] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState([]);
  
  const [formData, setFormData] = useState({
    activoId: searchParams.get('activoId') || '',
    almacenDestinoId: '',
    motivo: '',
    observaciones: ''
  });
  const [error, setError] = useState('');

  useEffect(() => {
    loadAlmacenes();
    if (formData.activoId) loadActivo(formData.activoId);
  }, []);

  const loadAlmacenes = async () => {
    const res = await catalogosService.getAlmacenes();
    setAlmacenes(res.data);
  };

  const loadActivo = async (id) => {
    try {
      const res = await activosService.getById(id);
      setActivo(res.data);
      setFormData(prev => ({ ...prev, activoId: res.data.id }));
    } catch (err) {
      setError('Activo no encontrado');
    }
  };

  const buscarActivos = async () => {
    if (!busqueda.trim()) return;
    try {
      const res = await activosService.getAll({ busqueda, elementosPorPagina: 10 });
      setResultados(res.data.items);
    } catch (err) {
      console.error(err);
    }
  };

  const seleccionarActivo = (a) => {
    setActivo(a);
    setFormData(prev => ({ ...prev, activoId: a.id }));
    setResultados([]);
    setBusqueda('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.activoId || !formData.almacenDestinoId || !formData.motivo) {
      setError('Complete todos los campos requeridos');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const data = {
        activoId: parseInt(formData.activoId),
        almacenDestinoId: parseInt(formData.almacenDestinoId),
        motivo: formData.motivo,
        observaciones: formData.observaciones
      };
      
      await trasladosService.create(data);
      navigate('/traslados');
    } catch (err) {
      setError(err.response?.data?.message || 'Error al crear traslado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-2xl font-bold">Nuevo Traslado</h1>
      </div>

      <form onSubmit={handleSubmit} className="card">
        <div className="card-body space-y-6">
          {error && <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>}

          {/* Búsqueda de activo */}
          {!activo && (
            <div>
              <label className="label">Buscar Activo *</label>
              <div className="flex gap-2">
                <input type="text" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="input" placeholder="Código, marca, modelo..." />
                <button type="button" onClick={buscarActivos} className="btn btn-secondary"><Search className="w-5 h-5" /></button>
              </div>
              {resultados.length > 0 && (
                <div className="mt-2 border rounded-lg divide-y max-h-48 overflow-y-auto">
                  {resultados.map(r => (
                    <button key={r.id} type="button" onClick={() => seleccionarActivo(r)} className="w-full p-3 text-left hover:bg-gray-50">
                      <span className="font-mono text-icg-600">{r.codigoInterno}</span>
                      <span className="ml-2">{r.marca} {r.modelo}</span>
                      <span className="text-gray-500 text-sm ml-2">({r.almacenNombre})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Activo seleccionado */}
          {activo && (
            <div className="p-4 bg-icg-50 border border-icg-200 rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-mono font-bold text-icg-600">{activo.codigoInterno}</p>
                  <p className="font-medium">{activo.marca} {activo.modelo}</p>
                  <p className="text-sm text-gray-600">Ubicación actual: <strong>{activo.almacen?.nombre || activo.almacenNombre}</strong></p>
                </div>
                <button type="button" onClick={() => { setActivo(null); setFormData(p => ({...p, activoId: ''})); }} className="text-sm text-icg-600 hover:underline">Cambiar</button>
              </div>
            </div>
          )}

          <div>
            <label className="label">Almacén Destino *</label>
            <select name="almacenDestinoId" value={formData.almacenDestinoId} onChange={(e) => setFormData(p => ({...p, almacenDestinoId: e.target.value}))} className="select" required>
              <option value="">Seleccionar...</option>
              {almacenes.filter(a => activo ? a.id !== (activo.almacen?.id || activo.almacenId) : true).map(a => (
                <option key={a.id} value={a.id}>{a.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Motivo del Traslado *</label>
            <textarea name="motivo" value={formData.motivo} onChange={(e) => setFormData(p => ({...p, motivo: e.target.value}))} className="input" rows="3" placeholder="Describa el motivo del traslado..." required />
          </div>

          <div>
            <label className="label">Observaciones</label>
            <textarea name="observaciones" value={formData.observaciones} onChange={(e) => setFormData(p => ({...p, observaciones: e.target.value}))} className="input" rows="2" placeholder="Observaciones adicionales..." />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary">Cancelar</button>
            <button type="submit" disabled={loading || !activo} className="btn btn-primary">
              {loading ? <><Loader className="w-4 h-4 mr-2 animate-spin" />Procesando...</> : <><Save className="w-4 h-4 mr-2" />Realizar Traslado</>}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
