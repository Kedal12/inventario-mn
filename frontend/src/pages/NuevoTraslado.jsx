import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { trasladosService, activosService, catalogosService } from '../services/api';
import { ArrowLeft, Save, Loader, Search, Package, MapPin, ChevronDown, X, ArrowRight } from 'lucide-react';

export default function NuevoTraslado() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [loadingActivos, setLoadingActivos] = useState(false);
  const [almacenes, setAlmacenes] = useState([]);
  
  // Almacén origen y activos
  const [almacenOrigenId, setAlmacenOrigenId] = useState('');
  const [activosDelAlmacen, setActivosDelAlmacen] = useState([]);
  const [busquedaActivo, setBusquedaActivo] = useState('');
  const [activoSeleccionado, setActivoSeleccionado] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  
  const [formData, setFormData] = useState({
    almacenDestinoId: '',
    motivo: '',
    observaciones: ''
  });
  const [error, setError] = useState('');

  useEffect(() => {
    loadAlmacenes();
    
    // Si viene con activoId en la URL, cargar ese activo
    const activoId = searchParams.get('activoId');
    if (activoId) {
      loadActivoInicial(activoId);
    }
  }, []);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cargar activos cuando cambia el almacén origen
  useEffect(() => {
    if (almacenOrigenId) {
      loadActivosDelAlmacen(almacenOrigenId);
    } else {
      setActivosDelAlmacen([]);
      setActivoSeleccionado(null);
    }
  }, [almacenOrigenId]);

  const loadAlmacenes = async () => {
    try {
      const res = await catalogosService.getAlmacenes();
      setAlmacenes(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadActivoInicial = async (id) => {
    try {
      const res = await activosService.getById(id);
      const activo = res.data;
      setActivoSeleccionado(activo);
      setAlmacenOrigenId(activo.almacen?.id?.toString() || activo.almacenId?.toString());
    } catch (err) {
      setError('Activo no encontrado');
    }
  };

  const loadActivosDelAlmacen = async (almacenId) => {
    setLoadingActivos(true);
    try {
      // Traer activos del almacén seleccionado (solo disponibles, no dados de baja)
      const res = await activosService.getAll({ 
        almacenId: almacenId, 
        elementosPorPagina: 100 
      });
      // Filtrar activos que no estén dados de baja (estadoId !== 5)
      const activosDisponibles = res.data.items.filter(a => a.estadoId !== 5);
      setActivosDelAlmacen(activosDisponibles);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingActivos(false);
    }
  };

  // Filtrar activos por búsqueda
  const activosFiltrados = activosDelAlmacen.filter(a => {
    if (!busquedaActivo) return true;
    const busqueda = busquedaActivo.toLowerCase();
    return (
      a.codigoInterno?.toLowerCase().includes(busqueda) ||
      a.marca?.toLowerCase().includes(busqueda) ||
      a.modelo?.toLowerCase().includes(busqueda) ||
      a.serialFabricante?.toLowerCase().includes(busqueda) ||
      a.tipoActivoNombre?.toLowerCase().includes(busqueda)
    );
  });

  const seleccionarActivo = (activo) => {
    setActivoSeleccionado(activo);
    setBusquedaActivo('');
    setShowDropdown(false);
  };

  const limpiarActivo = () => {
    setActivoSeleccionado(null);
    setBusquedaActivo('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!activoSeleccionado) {
      setError('Debe seleccionar un activo');
      return;
    }
    if (!formData.almacenDestinoId) {
      setError('Debe seleccionar el almacén destino');
      return;
    }
    if (!formData.motivo.trim()) {
      setError('Debe ingresar el motivo del traslado');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const data = {
        activoId: activoSeleccionado.id,
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

  const almacenOrigen = almacenes.find(a => a.id.toString() === almacenOrigenId);

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold">Nuevo Traslado</h1>
      </div>

      <form onSubmit={handleSubmit} className="card">
        <div className="card-body space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Paso 1: Seleccionar Almacén Origen */}
          <div>
            <label className="label flex items-center gap-2">
              <MapPin className="w-4 h-4 text-red-500" />
              Almacén Origen *
            </label>
            <select 
              value={almacenOrigenId} 
              onChange={(e) => {
                setAlmacenOrigenId(e.target.value);
                setActivoSeleccionado(null);
                setBusquedaActivo('');
              }} 
              className="select"
              disabled={!!activoSeleccionado}
            >
              <option value="">Seleccionar almacén de origen...</option>
              {almacenes.map(a => (
                <option key={a.id} value={a.id}>
                  {a.nombre} ({a.totalActivos || 0} activos)
                </option>
              ))}
            </select>
          </div>

          {/* Paso 2: Seleccionar Activo del Almacén */}
          {almacenOrigenId && !activoSeleccionado && (
            <div ref={dropdownRef}>
              <label className="label flex items-center gap-2">
                <Package className="w-4 h-4 text-mn-600" />
                Seleccionar Activo *
              </label>
              
              {loadingActivos ? (
                <div className="flex items-center justify-center py-8 border rounded-lg bg-gray-50">
                  <Loader className="w-6 h-6 animate-spin text-mn-600 mr-2" />
                  <span className="text-gray-600">Cargando activos...</span>
                </div>
              ) : activosDelAlmacen.length === 0 ? (
                <div className="text-center py-8 border rounded-lg bg-gray-50">
                  <Package className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">No hay activos disponibles en este almacén</p>
                </div>
              ) : (
                <div className="relative">
                  {/* Campo de búsqueda */}
                  <div 
                    className={`input flex items-center cursor-pointer ${showDropdown ? 'ring-2 ring-mn-500 border-mn-500' : ''}`}
                    onClick={() => setShowDropdown(true)}
                  >
                    <Search className="w-4 h-4 text-gray-400 mr-2" />
                    <input
                      type="text"
                      className="flex-1 outline-none bg-transparent"
                      placeholder={`Buscar entre ${activosDelAlmacen.length} activos...`}
                      value={busquedaActivo}
                      onChange={(e) => {
                        setBusquedaActivo(e.target.value);
                        setShowDropdown(true);
                      }}
                      onFocus={() => setShowDropdown(true)}
                    />
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                  </div>

                  {/* Dropdown de activos */}
                  {showDropdown && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-72 overflow-y-auto">
                      {activosFiltrados.length === 0 ? (
                        <div className="px-4 py-3 text-gray-500 text-sm text-center">
                          No se encontraron activos
                        </div>
                      ) : (
                        activosFiltrados.map(activo => (
                          <div
                            key={activo.id}
                            className="px-4 py-3 cursor-pointer hover:bg-mn-50 transition-colors border-b border-gray-100 last:border-b-0"
                            onClick={() => seleccionarActivo(activo)}
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <span className="font-mono font-bold text-mn-600">
                                  {activo.codigoInterno}
                                </span>
                                <span className="ml-2 text-xs bg-gray-100 px-2 py-0.5 rounded">
                                  {activo.tipoActivoReferencia}
                                </span>
                              </div>
                              <span 
                                className="text-xs px-2 py-0.5 rounded"
                                style={{ 
                                  backgroundColor: activo.estadoColor + '20', 
                                  color: activo.estadoColor 
                                }}
                              >
                                {activo.estadoNombre}
                              </span>
                            </div>
                            <p className="text-sm font-medium text-gray-800 mt-1">
                              {activo.marca} {activo.modelo}
                            </p>
                            {activo.serialFabricante && (
                              <p className="text-xs text-gray-500">
                                Serial: {activo.serialFabricante}
                              </p>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Activo Seleccionado */}
          {activoSeleccionado && (
            <div className="p-4 bg-mn-50 border border-mn-200 rounded-lg">
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-mn-100 rounded-lg">
                    <Package className="w-6 h-6 text-mn-600" />
                  </div>
                  <div>
                    <p className="font-mono font-bold text-mn-700">{activoSeleccionado.codigoInterno}</p>
                    <p className="font-medium text-gray-800">
                      {activoSeleccionado.marca} {activoSeleccionado.modelo}
                    </p>
                    <p className="text-sm text-gray-600">
                      {activoSeleccionado.tipoActivoNombre || activoSeleccionado.tipoActivo?.nombre}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-sm">
                      <MapPin className="w-3 h-3 text-red-500" />
                      <span className="text-gray-600">
                        Ubicación actual: <strong>{almacenOrigen?.nombre || activoSeleccionado.almacenNombre}</strong>
                      </span>
                    </div>
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={() => {
                    limpiarActivo();
                    setAlmacenOrigenId('');
                  }}
                  className="p-1 hover:bg-mn-100 rounded text-mn-600"
                  title="Cambiar activo"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Flecha indicadora */}
          {activoSeleccionado && (
            <div className="flex justify-center">
              <div className="flex items-center gap-2 text-gray-400">
                <div className="h-px w-12 bg-gray-300"></div>
                <ArrowRight className="w-5 h-5" />
                <div className="h-px w-12 bg-gray-300"></div>
              </div>
            </div>
          )}

          {/* Almacén Destino */}
          <div>
            <label className="label flex items-center gap-2">
              <MapPin className="w-4 h-4 text-green-500" />
              Almacén Destino *
            </label>
            <select 
              value={formData.almacenDestinoId} 
              onChange={(e) => setFormData(p => ({...p, almacenDestinoId: e.target.value}))} 
              className="select" 
              required
              disabled={!activoSeleccionado}
            >
              <option value="">Seleccionar almacén de destino...</option>
              {almacenes
                .filter(a => a.id.toString() !== almacenOrigenId)
                .map(a => (
                  <option key={a.id} value={a.id}>{a.nombre}</option>
                ))
              }
            </select>
            {!activoSeleccionado && (
              <p className="text-xs text-gray-500 mt-1">Primero seleccione un activo</p>
            )}
          </div>

          {/* Motivo */}
          <div>
            <label className="label">Motivo del Traslado *</label>
            <textarea 
              value={formData.motivo} 
              onChange={(e) => setFormData(p => ({...p, motivo: e.target.value}))} 
              className="input" 
              rows="3" 
              placeholder="Describa el motivo del traslado..."
              required 
            />
          </div>

          {/* Observaciones */}
          <div>
            <label className="label">Observaciones</label>
            <textarea 
              value={formData.observaciones} 
              onChange={(e) => setFormData(p => ({...p, observaciones: e.target.value}))} 
              className="input" 
              rows="2" 
              placeholder="Observaciones adicionales..." 
            />
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary">
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={loading || !activoSeleccionado} 
              className="btn btn-primary"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Realizar Traslado
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
