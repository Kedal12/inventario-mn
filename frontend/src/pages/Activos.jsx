import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom'; // Añadido useNavigate
import { activosService, catalogosService } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import {
  Search,
  Filter,
  Download,
  Plus,
  Eye,
  Edit,
  Printer,
  ChevronLeft,
  ChevronRight,
  X,
  ArrowDownCircle // Añadido para la acción de Baja
} from 'lucide-react';
import QRCode from 'qrcode';

export default function Activos() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate(); // Para redirigir a edición
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [activos, setActivos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ pagina: 1, totalPaginas: 1, totalItems: 0 });
  
  // Filtros
  const [busqueda, setBusqueda] = useState(searchParams.get('busqueda') || '');
  const [almacenId, setAlmacenId] = useState(searchParams.get('almacenId') || '');
  const [tipoId, setTipoId] = useState(searchParams.get('tipoId') || '');
  const [estadoId, setEstadoId] = useState(searchParams.get('estadoId') || '');
  const [showFilters, setShowFilters] = useState(false);
  
  // Catálogos
  const [almacenes, setAlmacenes] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [estados, setEstados] = useState([]);

  useEffect(() => {
    loadCatalogos();
  }, []);

  useEffect(() => {
    loadActivos();
  }, [searchParams]);

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
    } catch (error) {
      console.error('Error cargando catálogos:', error);
    }
  };

  const loadActivos = async () => {
    setLoading(true);
    try {
      const params = {
        pagina: searchParams.get('pagina') || 1,
        elementosPorPagina: 20,
        busqueda: searchParams.get('busqueda') || undefined,
        almacenId: searchParams.get('almacenId') || undefined,
        tipoActivoId: searchParams.get('tipoId') || undefined,
        estadoId: searchParams.get('estadoId') || undefined
      };
      
      const response = await activosService.getAll(params);
      setActivos(response.data.items);
      setPagination({
        pagina: response.data.paginaActual,
        totalPaginas: response.data.totalPaginas,
        totalItems: response.data.totalItems
      });
    } catch (error) {
      console.error('Error cargando activos:', error);
    } finally {
      setLoading(false);
    }
  };

  // --- NUEVAS FUNCIONES PARA CRUD ---

  const handleEdit = (activo) => {
    // Redirigimos a la página de edición (que puede ser la misma de NuevoActivo con un ID)
    navigate(`/activos/editar/${activo.id}`);
  };

  const handleBaja = async (id) => {
    const motivo = window.prompt("Ingrese el motivo de la baja del activo:");
    if (motivo) {
      try {
        await activosService.darBaja(id, { motivo });
        alert("Activo dado de baja correctamente");
        loadActivos(); // Recargamos la lista
      } catch (error) {
        alert("Error al dar de baja el activo");
        console.error(error);
      }
    }
  };

  // --- FIN NUEVAS FUNCIONES ---

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (busqueda) params.set('busqueda', busqueda);
    else params.delete('busqueda');
    if (almacenId) params.set('almacenId', almacenId);
    else params.delete('almacenId');
    if (tipoId) params.set('tipoId', tipoId);
    else params.delete('tipoId');
    if (estadoId) params.set('estadoId', estadoId);
    else params.delete('estadoId');
    params.set('pagina', '1');
    setSearchParams(params);
  };

  const clearFilters = () => {
    setBusqueda('');
    setAlmacenId('');
    setTipoId('');
    setEstadoId('');
    setSearchParams({});
  };

  const goToPage = (page) => {
    const params = new URLSearchParams(searchParams);
    params.set('pagina', page.toString());
    setSearchParams(params);
  };

  const getEstadoBadgeClass = (estadoId) => {
    switch (estadoId) {
      case 1: return 'badge-success';
      case 2: return 'badge-info';
      case 3: case 4: return 'badge-warning';
      case 5: return 'badge-neutral';
      default: return 'badge-neutral';
    }
  };

  const handlePrint = async (activo) => {
    try {
      const miIP = "10.15.0.221"; 
      const puertoFrontend = "3000"; 
      const codigoBusqueda = activo.codigoInterno; 
      const urlVisual = `http://${miIP}:${puertoFrontend}/activo/${codigoBusqueda}`;

      const qrDataUrl = await QRCode.toDataURL(urlVisual, { 
        width: 250, 
        margin: 1,
        errorCorrectionLevel: 'H' 
      });

      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <html>
          <head>
            <title>Imprimir Etiqueta - ${codigoBusqueda}</title>
            <style>
              @page { size: 98.5mm 25mm; margin: 0; }
              body { margin: 0; padding: 0; font-family: 'Arial', sans-serif; display: flex; align-items: center; height: 25mm; width: 98.5mm; background-color: white; }
              .container { display: flex; width: 100%; padding: 0 8mm; align-items: center; box-sizing: border-box; }
              .qr-image { width: 21mm; height: 21mm; object-fit: contain; }
              .info { margin-left: 5mm; flex-grow: 1; display: flex; flex-direction: column; justify-content: center; }
              .header { font-size: 8pt; font-weight: bold; color: #555; margin-bottom: 1px; }
              .main-code { font-size: 15pt; font-weight: 900; margin: 0; line-height: 1; color: black; }
              .descripcion { font-size: 8.5pt; color: #000; font-weight: 500; line-height: 1.1; margin-top: 3px; max-width: 55mm; overflow: hidden; }
              .sede { font-size: 7.5pt; color: #666; margin-top: 2px; text-transform: uppercase; }
            </style>
          </head>
          <body>
            <div class="container">
              <img src="${qrDataUrl}" class="qr-image" alt="QR" />
              <div class="info">
                <div class="header">ACTIVO FIJO TI MN</div>
                <div class="main-code">${codigoBusqueda.replace('ICG-', 'MN-')}</div>
                <div class="descripcion">${activo.marca} ${activo.modelo}</div>
                <div class="sede">${activo.almacenNombre}</div>
              </div>
            </div>
            <script>
              window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 400); };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (err) {
      console.error('Error en handlePrint:', err);
      alert('No se pudo generar la etiqueta de impresión.');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activos</h1>
          <p className="text-gray-500 mt-1">
            {pagination.totalItems} activos registrados
          </p>
        </div>
        {isAdmin() && (
          <Link to="/activos/nuevo" className="btn btn-primary">
            <Plus className="w-5 h-5 mr-2" />
            Nuevo Activo
          </Link>
        )}
      </div>

      {/* Barra de búsqueda y filtros */}
      <div className="card">
        <div className="p-4">
          <form onSubmit={handleSearch} className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por código, marca, modelo, serial..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="input pl-10"
              />
            </div>
            
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`btn ${showFilters ? 'btn-primary' : 'btn-secondary'}`}
            >
              <Filter className="w-5 h-5 mr-2" />
              Filtros
            </button>
            
            <button type="submit" className="btn btn-primary">
              Buscar
            </button>
          </form>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="label">Almacén/Sede</label>
                <select
                  value={almacenId}
                  onChange={(e) => setAlmacenId(e.target.value)}
                  className="select"
                >
                  <option value="">Todos</option>
                  {almacenes.map((a) => (
                    <option key={a.id} value={a.id}>{a.nombre}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="label">Tipo de Activo</label>
                <select
                  value={tipoId}
                  onChange={(e) => setTipoId(e.target.value)}
                  className="select"
                >
                  <option value="">Todos</option>
                  {tipos.map((t) => (
                    <option key={t.id} value={t.id}>{t.nombre}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="label">Estado</label>
                <select
                  value={estadoId}
                  onChange={(e) => setEstadoId(e.target.value)}
                  className="select"
                >
                  <option value="">Todos</option>
                  {estados.map((e) => (
                    <option key={e.id} value={e.id}>{e.nombre}</option>
                  ))}
                </select>
              </div>
              
              <div className="md:col-span-3 flex justify-end">
                <button
                  type="button"
                  onClick={clearFilters}
                  className="btn btn-secondary btn-sm"
                >
                  <X className="w-4 h-4 mr-1" />
                  Limpiar filtros
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabla de activos */}
      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-icg-600"></div>
          </div>
        ) : activos.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No se encontraron activos</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Tipo</th>
                    <th>Marca / Modelo</th>
                    <th>Almacén</th>
                    <th>Estado</th>
                    <th>Fecha Ingreso</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {activos.map((activo) => (
                    <tr key={activo.id}>
                      <td className="font-mono font-medium text-icg-600">
                        {activo.codigoInterno}
                      </td>
                      <td>
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {activo.tipoActivoReferencia}
                        </span>
                        <span className="ml-2 text-gray-600">{activo.tipoActivoNombre}</span>
                      </td>
                      <td>
                        <div className="font-medium">{activo.marca}</div>
                        <div className="text-gray-500 text-sm">{activo.modelo}</div>
                      </td>
                      <td>{activo.almacenNombre}</td>
                      <td>
                        <span 
                          className={`badge ${getEstadoBadgeClass(activo.estadoId)}`}
                          style={{ backgroundColor: activo.estadoColor + '20', color: activo.estadoColor }}
                        >
                          {activo.estadoNombre}
                        </span>
                      </td>
                      <td>{new Date(activo.fechaIngreso).toLocaleDateString('es-CO')}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/activos/${activo.id}`}
                            className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 hover:text-icg-600"
                            title="Ver detalle"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          {isAdmin() && (
                            <>
                              <button
                                onClick={() => handleEdit(activo)}
                                className="p-2 hover:bg-gray-100 rounded-lg text-blue-600"
                                title="Editar activo"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              
                              <button
                                onClick={() => handlePrint(activo)}
                                className="p-2 hover:bg-gray-100 rounded-lg text-orange-600"
                                title="Imprimir etiqueta"
                              >
                                <Printer className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => handleBaja(activo.id)}
                                className="p-2 hover:bg-gray-100 rounded-lg text-red-600"
                                title="Dar de baja"
                              >
                                <ArrowDownCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {pagination.totalPaginas > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
                <p className="text-sm text-gray-500">
                  Mostrando {((pagination.pagina - 1) * 20) + 1} - {Math.min(pagination.pagina * 20, pagination.totalItems)} de {pagination.totalItems}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => goToPage(pagination.pagina - 1)}
                    disabled={pagination.pagina === 1}
                    className="btn btn-secondary btn-sm"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-3 py-1 text-sm">
                    {pagination.pagina} / {pagination.totalPaginas}
                  </span>
                  <button
                    onClick={() => goToPage(pagination.pagina + 1)}
                    disabled={pagination.pagina === pagination.totalPaginas}
                    className="btn btn-secondary btn-sm"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}