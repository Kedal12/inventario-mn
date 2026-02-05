import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { activosService, catalogosService } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import {
  Search,
  Filter,
  Plus,
  Eye,
  Edit,
  Printer,
  ChevronLeft,
  ChevronRight,
  X,
  ArrowDownCircle,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import QRCode from 'qrcode';

export default function Activos() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
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

  // Modal de impresión
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [activoToPrint, setActivoToPrint] = useState(null);
  const [cantidadEtiquetas, setCantidadEtiquetas] = useState(1);

  // Modal de eliminación
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [activoToDelete, setActivoToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

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

  const handleEdit = (activo) => {
    navigate(`/activos/editar/${activo.id}`);
  };

  const handleBaja = async (id) => {
    const motivo = window.prompt("Ingrese el motivo de la baja del activo:");
    if (motivo) {
      try {
        await activosService.darBaja(id, motivo);
        alert("Activo dado de baja correctamente");
        loadActivos();
      } catch (error) {
        alert("Error al dar de baja el activo");
        console.error(error);
      }
    }
  };

  // Abrir modal de eliminación
  const openDeleteModal = (activo) => {
    setActivoToDelete(activo);
    setShowDeleteModal(true);
  };

  // Confirmar eliminación
  const handleDelete = async () => {
    if (!activoToDelete) return;
    
    setDeleteLoading(true);
    try {
      await activosService.delete(activoToDelete.id);
      setShowDeleteModal(false);
      setActivoToDelete(null);
      loadActivos();
    } catch (error) {
      console.error('Error al eliminar:', error);
      alert(error.response?.data?.message || 'Error al eliminar el activo');
    } finally {
      setDeleteLoading(false);
    }
  };

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

  // Abrir modal de impresión
  const openPrintModal = (activo) => {
    setActivoToPrint(activo);
    setCantidadEtiquetas(1);
    setShowPrintModal(true);
  };

  // Imprimir etiquetas
  const handlePrint = async () => {
    if (!activoToPrint || cantidadEtiquetas < 1) return;

    const miIP = "10.15.0.221";
    const puertoFrontend = "3000";
    const codigoVisual = activoToPrint.codigoInterno.replace('ICG-', 'MN-');
    const urlQR = `http://${miIP}:${puertoFrontend}/activo/${codigoVisual}`;

    try {
      // Generar QR
      const qrDataUrl = await QRCode.toDataURL(urlQR, {
        width: 120,
        margin: 0,
        errorCorrectionLevel: 'M'
      });

      // Calcular filas necesarias
      const etiquetasPorFila = 3;
      const totalFilas = Math.ceil(cantidadEtiquetas / etiquetasPorFila);

      // Construir las filas de etiquetas
      let filasHTML = '';
      let etiquetasRestantes = cantidadEtiquetas;

      for (let fila = 0; fila < totalFilas; fila++) {
        const etiquetasEnEstaFila = Math.min(etiquetasRestantes, etiquetasPorFila);
        etiquetasRestantes -= etiquetasEnEstaFila;

        filasHTML += '<div class="fila">';
        
        for (let col = 0; col < etiquetasPorFila; col++) {
          if (col < etiquetasEnEstaFila) {
            // Etiqueta con contenido
            filasHTML += `
              <div class="etiqueta">
                <div class="contenido">
                  <img src="${qrDataUrl}" class="qr" />
                  <div class="info">
                    <div class="titulo">ACTIVO FIJO TI MN</div>
                    <div class="codigo">${codigoVisual}</div>
                    <div class="detalle">${activoToPrint.marca} ${activoToPrint.modelo}</div>
                    <div class="almacen">${activoToPrint.almacenNombre || ''}</div>
                  </div>
                </div>
              </div>
            `;
          } else {
            // Etiqueta vacía (se desperdicia)
            filasHTML += '<div class="etiqueta vacia"></div>';
          }
        }
        
        filasHTML += '</div>';
      }

      // Abrir ventana de impresión
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Etiquetas - ${codigoVisual}</title>
            <style>
              @page {
                size: 105mm 25mm;
                margin: 0 !important;
                padding: 0 !important;
              }
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                font-family: Arial, sans-serif;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .fila {
                width: 105mm;
                height: 25mm;
                display: flex;
                justify-content: flex-start;
                page-break-inside: avoid;
              }
              .etiqueta {
                width: 33mm;
                height: 25mm;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 2mm;
                overflow: hidden;
                flex-shrink: 0;
                margin-left: 2mm;
              }
              .etiqueta:first-child {
                margin-left: 1mm;
              }
              .etiqueta.vacia {
                background: transparent;
              }
              .contenido {
                display: flex;
                align-items: center;
              }
              .qr {
                width: 14mm;
                height: 14mm;
                flex-shrink: 0;
              }
              .info {
                margin-left: 1mm;
                flex: 1;
                overflow: hidden;
              }
              .titulo {
                font-size: 5pt;
                font-weight: bold;
                color: #000;
              }
              .codigo {
                font-size: 8pt;
                font-weight: bold;
                color: #000;
                margin: 0.3mm 0;
              }
              .detalle {
                font-size: 5pt;
                color: #000;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              }
              .almacen {
                font-size: 5pt;
                color: #333;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              }
              
              @media print {
                html, body {
                  width: 105mm;
                  margin: 0 !important;
                  padding: 0 !important;
                }
              }
              
              /* Vista previa en pantalla */
              @media screen {
                body {
                  background: #f0f0f0;
                  padding: 20px;
                }
                .fila {
                  background: #ffeb3b;
                  border: 1px solid #ccc;
                  margin-bottom: 5px;
                }
                .etiqueta {
                  border: 1px dashed #999;
                }
              }
            </style>
          </head>
          <body>
            ${filasHTML}
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                }, 400);
              };
              window.onafterprint = function() {
                window.close();
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
      setShowPrintModal(false);
    } catch (err) {
      console.error('Error al generar etiquetas:', err);
      alert('Error al generar las etiquetas');
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
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-mn-600"></div>
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
                      <td className="font-mono font-medium text-mn-600">
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
                        <div className="flex items-center gap-1">
                          <Link
                            to={`/activos/${activo.id}`}
                            className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 hover:text-mn-600"
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
                                onClick={() => openPrintModal(activo)}
                                className="p-2 hover:bg-gray-100 rounded-lg text-orange-600"
                                title="Imprimir etiquetas"
                              >
                                <Printer className="w-4 h-4" />
                              </button>

                              {activo.estadoId !== 5 && (
                                <button
                                  onClick={() => handleBaja(activo.id)}
                                  className="p-2 hover:bg-gray-100 rounded-lg text-amber-600"
                                  title="Dar de baja"
                                >
                                  <ArrowDownCircle className="w-4 h-4" />
                                </button>
                              )}

                              <button
                                onClick={() => openDeleteModal(activo)}
                                className="p-2 hover:bg-red-50 rounded-lg text-red-600"
                                title="Eliminar activo"
                              >
                                <Trash2 className="w-4 h-4" />
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

      {/* Modal de impresión */}
      {showPrintModal && activoToPrint && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 m-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Imprimir Etiquetas</h3>
              <button 
                onClick={() => setShowPrintModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Info del activo */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="font-mono font-bold text-mn-600">
                  {activoToPrint.codigoInterno.replace('ICG-', 'MN-')}
                </p>
                <p className="text-gray-600">
                  {activoToPrint.marca} {activoToPrint.modelo}
                </p>
                <p className="text-sm text-gray-500">
                  {activoToPrint.almacenNombre}
                </p>
              </div>

              {/* Cantidad */}
              <div>
                <label className="label">Cantidad de etiquetas</label>
                <input
                  type="number"
                  min="1"
                  max="99"
                  value={cantidadEtiquetas}
                  onChange={(e) => setCantidadEtiquetas(Math.max(1, parseInt(e.target.value) || 1))}
                  className="input text-center text-xl font-bold"
                />
              </div>

              {/* Info de filas */}
              <div className="text-sm text-gray-500 text-center">
                <p>
                  {cantidadEtiquetas} etiqueta{cantidadEtiquetas > 1 ? 's' : ''} = {Math.ceil(cantidadEtiquetas / 3)} fila{Math.ceil(cantidadEtiquetas / 3) > 1 ? 's' : ''}
                </p>
                {cantidadEtiquetas % 3 !== 0 && (
                  <p className="text-orange-500">
                    ({3 - (cantidadEtiquetas % 3)} etiqueta{3 - (cantidadEtiquetas % 3) > 1 ? 's' : ''} vacía{3 - (cantidadEtiquetas % 3) > 1 ? 's' : ''} en última fila)
                  </p>
                )}
              </div>

              {/* Botones rápidos */}
              <div className="flex gap-2 justify-center">
                {[1, 3, 6, 9, 12].map(n => (
                  <button
                    key={n}
                    onClick={() => setCantidadEtiquetas(n)}
                    className={`px-3 py-1 rounded-lg border text-sm font-medium transition-colors
                      ${cantidadEtiquetas === n 
                        ? 'bg-mn-600 text-white border-mn-600' 
                        : 'bg-white text-gray-700 border-gray-300 hover:border-mn-400'
                      }`}
                  >
                    {n}
                  </button>
                ))}
              </div>

              {/* Botones de acción */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="btn btn-secondary flex-1"
                >
                  Cancelar
                </button>
                <button
                  onClick={handlePrint}
                  className="btn btn-primary flex-1"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Imprimir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      {showDeleteModal && activoToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 m-4">
            {/* Icono de advertencia */}
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </div>

            {/* Título */}
            <h3 className="text-xl font-bold text-center text-gray-900 mb-2">
              ¿Eliminar este activo?
            </h3>
            
            {/* Mensaje */}
            <p className="text-center text-gray-500 mb-4">
              Esta acción no se puede deshacer. El activo será eliminado permanentemente del sistema.
            </p>

            {/* Info del activo a eliminar */}
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <p className="font-mono font-bold text-red-700">
                    {activoToDelete.codigoInterno}
                  </p>
                  <p className="text-gray-700 font-medium">
                    {activoToDelete.marca} {activoToDelete.modelo}
                  </p>
                  <p className="text-sm text-gray-500">
                    {activoToDelete.tipoActivoNombre} • {activoToDelete.almacenNombre}
                  </p>
                </div>
              </div>
            </div>

            {/* Botones */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setActivoToDelete(null);
                }}
                disabled={deleteLoading}
                className="btn btn-secondary flex-1"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="btn bg-red-600 hover:bg-red-700 text-white flex-1 flex items-center justify-center"
              >
                {deleteLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Eliminando...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Sí, eliminar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
