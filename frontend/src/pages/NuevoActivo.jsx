import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { activosService, catalogosService } from '../services/api';
import { ArrowLeft, Save, Loader, Upload, X, Search, ChevronDown } from 'lucide-react';

// Componente SearchableSelect reutilizable
function SearchableSelect({ options, value, onChange, placeholder, displayKey, valueKey, searchKeys }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtrar opciones
  const filteredOptions = options.filter(opt => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return searchKeys.some(key => 
      opt[key]?.toString().toLowerCase().includes(searchLower)
    );
  });

  // Obtener el texto a mostrar del item seleccionado
  const selectedOption = options.find(opt => opt[valueKey]?.toString() === value?.toString());
  const displayText = selectedOption ? displayKey(selectedOption) : '';

  const handleSelect = (opt) => {
    onChange(opt[valueKey].toString());
    setSearch('');
    setIsOpen(false);
  };

  const handleInputChange = (e) => {
    setSearch(e.target.value);
    if (!isOpen) setIsOpen(true);
  };

  const handleFocus = () => {
    setIsOpen(true);
    setSearch('');
  };

  return (
    <div ref={containerRef} className="relative">
      <div 
        className={`input flex items-center cursor-pointer ${isOpen ? 'ring-2 ring-mn-500 border-mn-500' : ''}`}
        onClick={() => { setIsOpen(true); inputRef.current?.focus(); }}
      >
        <Search className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          className="flex-1 outline-none bg-transparent"
          placeholder={isOpen || !value ? placeholder : ''}
          value={isOpen ? search : displayText}
          onChange={handleInputChange}
          onFocus={handleFocus}
        />
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>
      
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filteredOptions.length === 0 ? (
            <div className="px-4 py-3 text-gray-500 text-sm">No se encontraron resultados</div>
          ) : (
            filteredOptions.map(opt => (
              <div
                key={opt[valueKey]}
                className={`px-4 py-2 cursor-pointer hover:bg-mn-50 transition-colors
                  ${opt[valueKey]?.toString() === value?.toString() ? 'bg-mn-100 text-mn-700 font-medium' : ''}`}
                onClick={() => handleSelect(opt)}
              >
                {displayKey(opt)}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function NuevoActivo() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
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
  
  // Estado para la foto (una sola)
  const [foto, setFoto] = useState(null);
  const [preview, setPreview] = useState(null);
  
  const [error, setError] = useState('');

  useEffect(() => {
    loadCatalogos();
  }, []);

  // Limpiar URL de preview al desmontar
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

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

  // Manejar selección de foto
  const handleFotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validar tipo
    if (!file.type.startsWith('image/')) {
      alert('El archivo debe ser una imagen');
      return;
    }
    
    // Validar tamaño (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen no debe exceder 5MB');
      return;
    }

    // Limpiar preview anterior
    if (preview) URL.revokeObjectURL(preview);
    
    // Crear nuevo preview
    setFoto(file);
    setPreview(URL.createObjectURL(file));
    
    // Limpiar input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Eliminar foto
  const removeFoto = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFoto(null);
    setPreview(null);
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
      
      // Pasar la foto al servicio
      const response = await activosService.create(data, foto);
      navigate(`/activos/${response.data.id}`);
    } catch (err) {
      console.error('Error completo:', err);
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
              <SearchableSelect
                options={tipos}
                value={formData.tipoActivoId}
                onChange={(val) => setFormData(prev => ({ ...prev, tipoActivoId: val }))}
                placeholder="Buscar tipo de activo..."
                valueKey="id"
                displayKey={(t) => `${t.referencia} - ${t.nombre}`}
                searchKeys={['referencia', 'nombre']}
              />
            </div>

            <div>
              <label className="label">Almacén/Sede *</label>
              <SearchableSelect
                options={almacenes}
                value={formData.almacenId}
                onChange={(val) => setFormData(prev => ({ ...prev, almacenId: val }))}
                placeholder="Buscar almacén..."
                valueKey="id"
                displayKey={(a) => a.nombre}
                searchKeys={['nombre', 'codigo']}
              />
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

            {/* Sección de Foto */}
            <div className="md:col-span-2">
              <label className="label">Foto del Activo</label>
              <p className="text-sm text-gray-500 mb-2">Máximo 5MB, formatos: JPG, PNG, GIF</p>
              
              {!preview ? (
                /* Área de subida */
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed rounded-lg p-6 text-center transition-colors
                    border-gray-300 hover:border-mn-500 cursor-pointer hover:bg-gray-50"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFotoChange}
                    className="hidden"
                  />
                  <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-600">
                    Clic para seleccionar una imagen
                  </p>
                </div>
              ) : (
                /* Preview de la foto */
                <div className="relative inline-block">
                  <img
                    src={preview}
                    alt="Preview"
                    className="max-w-xs h-40 object-cover rounded-lg border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={removeFoto}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 
                      shadow-md hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
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
