import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { activosService, catalogosService } from '../services/api';
import { ArrowLeft, Save, Loader } from 'lucide-react';

export default function NuevoActivo() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [almacenes, setAlmacenes] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [estados, setEstados] = useState([]);
  
  const [formData, setFormData] = useState({
    tipoActivoId: '',
    almacenId: '',
    estadoId: '1',
    marca: '',
    modelo: '',
    serialFabricante: '',
    descripcion: '',
    observaciones: ''
  });
  const [error, setError] = useState('');

  useEffect(() => {
    loadCatalogos();
  }, []);

  const loadCatalogos = async () => {
    try {
      const [almRes, tipoRes, estRes] = await Promise.all([
        catalogosService.getAlmacenes(),
        catalogosService.getTipos(),
        catalogosService.getEstados()
      ]);
      setAlmacenes(almRes.data);
      setTipos(tipoRes.data);
      setEstados(estRes.data);
    } catch (err) {
      console.error('Error cargando catálogos:', err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = {
        ...formData,
        tipoActivoId: parseInt(formData.tipoActivoId),
        almacenId: parseInt(formData.almacenId),
        estadoId: parseInt(formData.estadoId)
      };
      
      const response = await activosService.create(data);
      navigate(`/activos/${response.data.id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al crear activo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold">Nuevo Activo</h1>
      </div>

      <form onSubmit={handleSubmit} className="card">
        <div className="card-body space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Tipo de Activo *</label>
              <select name="tipoActivoId" value={formData.tipoActivoId} onChange={handleChange} className="select" required>
                <option value="">Seleccionar...</option>
                {tipos.map(t => (<option key={t.id} value={t.id}>{t.referencia} - {t.nombre}</option>))}
              </select>
            </div>

            <div>
              <label className="label">Almacén/Sede *</label>
              <select name="almacenId" value={formData.almacenId} onChange={handleChange} className="select" required>
                <option value="">Seleccionar...</option>
                {almacenes.map(a => (<option key={a.id} value={a.id}>{a.nombre}</option>))}
              </select>
            </div>

            <div>
              <label className="label">Marca *</label>
              <input type="text" name="marca" value={formData.marca} onChange={handleChange} className="input" placeholder="Ej: HP, Dell..." required />
            </div>

            <div>
              <label className="label">Modelo *</label>
              <input type="text" name="modelo" value={formData.modelo} onChange={handleChange} className="input" placeholder="Ej: OptiPlex 7090" required />
            </div>

            <div>
              <label className="label">Serial del Fabricante</label>
              <input type="text" name="serialFabricante" value={formData.serialFabricante} onChange={handleChange} className="input" placeholder="Número de serie" />
            </div>

            <div>
              <label className="label">Estado Inicial</label>
              <select name="estadoId" value={formData.estadoId} onChange={handleChange} className="select">
                {estados.map(e => (<option key={e.id} value={e.id}>{e.nombre}</option>))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="label">Descripción</label>
              <input type="text" name="descripcion" value={formData.descripcion} onChange={handleChange} className="input" placeholder="Descripción breve" />
            </div>

            <div className="md:col-span-2">
              <label className="label">Observaciones</label>
              <textarea name="observaciones" value={formData.observaciones} onChange={handleChange} className="input" rows="3" placeholder="Notas adicionales..." />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary">Cancelar</button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? <><Loader className="w-4 h-4 mr-2 animate-spin" />Guardando...</> : <><Save className="w-4 h-4 mr-2" />Guardar</>}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
