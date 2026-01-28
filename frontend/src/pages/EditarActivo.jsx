import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { activosService, catalogosService } from '../services/api';
import { Save, X, Upload, Loader2 } from 'lucide-react';

export default function EditarActivo() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [fotoArchivo, setFotoArchivo] = useState(null);
  const [preview, setPreview] = useState(null);

  // Listas para los selectores
  const [tipos, setTipos] = useState([]);
  const [almacenes, setAlmacenes] = useState([]);

  const [formData, setFormData] = useState({
    marca: '',
    modelo: '',
    serialFabricante: '', // Nombre ajustado a tu DTO de C#
    descripcion: '',
    tipoActivoId: '',
    almacenId: '',
    observaciones: ''
  });

  useEffect(() => {
    loadInitialData();
  }, [id]);

  const loadInitialData = async () => {
    try {
      // Cargamos catálogos y datos del activo en paralelo
      const [tiposRes, almRes, activoRes] = await Promise.all([
        catalogosService.getTipos(),
        catalogosService.getAlmacenes(),
        activosService.getById(id)
      ]);

      setTipos(tiposRes.data);
      setAlmacenes(almRes.data);

      const activo = activoRes.data;
      setFormData({
        marca: activo.marca || '',
        modelo: activo.modelo || '',
        serialFabricante: activo.serialFabricante || '',
        descripcion: activo.descripcion || '',
        tipoActivoId: activo.tipoActivoId || '',
        almacenId: activo.almacenId || '',
        observaciones: activo.observaciones || ''
      });

      if (activo.fotoUrl) {
        setPreview(`http://10.15.0.221:5050${activo.fotoUrl}`);
      }
    } catch (error) {
      console.error("Error al cargar datos:", error);
      alert("No se pudo cargar la información del activo");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData();
    
    // Agregamos los campos al FormData
    Object.keys(formData).forEach(key => {
      if (formData[key] !== null && formData[key] !== undefined) {
        data.append(key, formData[key]);
      }
    });

    if (fotoArchivo) {
      data.append('foto', fotoArchivo);
    }

    try {
      setLoading(true);
      await activosService.update(id, data);
      alert("¡Activo actualizado con éxito!");
      navigate('/activos');
    } catch (error) {
      console.error(error);
      alert("Error al actualizar el activo. Revisa la consola.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
        <p className="mt-2 text-gray-500">Cargando información...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-2xl shadow-lg border border-gray-100">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-gray-800">Editar Activo TI</h2>
        <button onClick={() => navigate('/activos')} className="text-gray-400 hover:text-gray-600">
          <X className="w-6 h-6" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Foto del Equipo */}
        <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer relative">
          {preview ? (
            <div className="relative group">
              <img src={preview} className="w-48 h-48 object-cover rounded-xl shadow-md" alt="Preview" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                <p className="text-white text-xs font-bold">Cambiar Imagen</p>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <Upload className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Haz clic para subir foto del equipo</p>
            </div>
          )}
          <input 
            type="file" 
            accept="image/*" 
            onChange={(e) => {
              const file = e.target.files[0];
              if (file) {
                setFotoArchivo(file);
                setPreview(URL.createObjectURL(file));
              }
            }}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Marca</label>
            <input className="input w-full" value={formData.marca} onChange={e => setFormData({...formData, marca: e.target.value})} required />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Modelo</label>
            <input className="input w-full" value={formData.modelo} onChange={e => setFormData({...formData, modelo: e.target.value})} required />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Serial Fabricante</label>
            <input className="input w-full" value={formData.serialFabricante} onChange={e => setFormData({...formData, serialFabricante: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Sede / Almacén</label>
            <select 
              className="select w-full" 
              value={formData.almacenId} 
              onChange={e => setFormData({...formData, almacenId: e.target.value})}
              required
            >
              <option value="">Seleccionar Sede</option>
              {almacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Tipo de Activo</label>
          <select 
            className="select w-full" 
            value={formData.tipoActivoId} 
            onChange={e => setFormData({...formData, tipoActivoId: e.target.value})}
            required
          >
            <option value="">Seleccionar Tipo</option>
            {tipos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Descripción</label>
          <textarea 
            className="input w-full h-24" 
            value={formData.descripcion} 
            onChange={e => setFormData({...formData, descripcion: e.target.value})} 
          />
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t">
          <button type="button" onClick={() => navigate('/activos')} className="btn btn-secondary">
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary flex items-center">
            <Save className="w-4 h-4 mr-2" />
            Guardar Cambios
          </button>
        </div>
      </form>
    </div>
  );
}