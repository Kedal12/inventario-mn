import { useState, useEffect } from 'react';
import { reportesService, catalogosService } from '../services/api';
import * as XLSX from 'xlsx';
import {
  FileBarChart,
  Download,
  Filter,
  Package,
  Building2,
  TrendingUp,
  Calendar,
  Loader,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';

export default function Reportes() {
  const [tipoReporte, setTipoReporte] = useState('inventario');
  const [almacenId, setAlmacenId] = useState('');
  const [tipoActivoId, setTipoActivoId] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [loading, setLoading] = useState(false);

  const [almacenes, setAlmacenes] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [previewData, setPreviewData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadCatalogos();
  }, []);

  const loadCatalogos = async () => {
    try {
      const [almRes, tipoRes] = await Promise.all([
        catalogosService.getAlmacenes(),
        catalogosService.getTipos()
      ]);
      setAlmacenes(almRes.data);
      setTipos(tipoRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const generarReporte = async (descargar = false) => {
    setLoading(true);
    setPreviewData(null);
    setError(null);

    try {
      const params = {
        almacenId: almacenId || undefined,
        tipoActivoId: tipoActivoId || undefined,
        fechaDesde: fechaDesde || undefined,
        fechaHasta: fechaHasta || undefined
      };

      let response;
      let datos = [];
      let nombreArchivo = '';
      let nombreHoja = '';

      switch (tipoReporte) {
        case 'inventario':
          response = await reportesService.getInventarioGeneral(params);
          datos = response.data.map(item => ({
            'Código': item.codigoInterno,
            'Tipo': item.tipoActivo,
            'Marca': item.marca,
            'Modelo': item.modelo,
            'Serial': item.serialFabricante || '',
            'Almacén': item.almacen,
            'Estado': item.estado,
            'Fecha Ingreso': item.fechaIngreso ? new Date(item.fechaIngreso).toLocaleDateString('es-CO') : '',
            'Último Inventario': item.fechaUltimoInventario ? new Date(item.fechaUltimoInventario).toLocaleDateString('es-CO') : '',
            'Descripción': item.descripcion || ''
          }));
          nombreArchivo = 'Inventario_General';
          nombreHoja = 'Inventario';
          break;

        case 'porAlmacen':
          response = await reportesService.getActivosPorAlmacen();
          datos = response.data.map(item => ({
            'Almacén': item.almacen,
            'Código': item.codigoAlmacen,
            'Total Activos': item.totalActivos,
            'Disponibles': item.disponibles,
            'Asignados': item.asignados,
            'En Mantenimiento': item.enMantenimiento,
            'Dados de Baja': item.dadosDeBaja
          }));
          nombreArchivo = 'Activos_Por_Almacen';
          nombreHoja = 'Por Almacén';
          break;

        case 'porTipo':
          response = await reportesService.getActivosPorTipo();
          datos = response.data.map(item => ({
            'Tipo de Activo': item.tipoActivo,
            'Referencia': item.referencia,
            'Total': item.total,
            'Disponibles': item.disponibles,
            'Asignados': item.asignados,
            'En Mantenimiento': item.enMantenimiento
          }));
          nombreArchivo = 'Activos_Por_Tipo';
          nombreHoja = 'Por Tipo';
          break;

        case 'movimientos':
          response = await reportesService.getMovimientos(params);
          datos = response.data.map(item => ({
            'Fecha': new Date(item.fecha).toLocaleString('es-CO'),
            'Código Activo': item.codigoActivo,
            'Tipo Movimiento': item.tipoMovimiento,
            'Detalle': item.detalle,
            'Usuario': item.usuario
          }));
          nombreArchivo = 'Movimientos';
          nombreHoja = 'Movimientos';
          break;

        case 'traslados':
          response = await reportesService.getTrasladosPendientes(params);
          datos = response.data.map(item => ({
            'Número': item.numeroTraslado,
            'Código Activo': item.codigoActivo,
            'Marca': item.marca,
            'Modelo': item.modelo,
            'Origen': item.almacenOrigen,
            'Destino': item.almacenDestino,
            'Fecha': new Date(item.fechaTraslado).toLocaleDateString('es-CO'),
            'Motivo': item.motivo,
            'Usuario': item.usuario
          }));
          nombreArchivo = 'Traslados';
          nombreHoja = 'Traslados';
          break;

        default:
          return;
      }

      if (descargar && datos.length > 0) {
        descargarExcel(datos, nombreArchivo, nombreHoja);
      } else {
        setPreviewData({ datos, nombreArchivo, nombreHoja });
      }

    } catch (err) {
      console.error(err);
      setError('Error al generar el reporte. Verifique la conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const descargarExcel = (datos, nombreArchivo, nombreHoja) => {
    if (!datos || datos.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    // Crear hoja de trabajo
    const ws = XLSX.utils.json_to_sheet(datos);

    // Ajustar anchos de columna automáticamente
    const colWidths = Object.keys(datos[0]).map(key => ({
      wch: Math.max(
        key.length,
        ...datos.map(row => String(row[key] || '').length)
      ) + 2
    }));
    ws['!cols'] = colWidths;

    // Crear libro
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, nombreHoja);

    // Agregar hoja de información
    const infoData = [
      { 'Campo': 'Reporte', 'Valor': nombreArchivo },
      { 'Campo': 'Fecha Generación', 'Valor': new Date().toLocaleString('es-CO') },
      { 'Campo': 'Total Registros', 'Valor': datos.length },
      { 'Campo': 'Filtro Almacén', 'Valor': almacenId ? almacenes.find(a => a.id == almacenId)?.nombre : 'Todos' },
      { 'Campo': 'Filtro Tipo', 'Valor': tipoActivoId ? tipos.find(t => t.id == tipoActivoId)?.nombre : 'Todos' },
    ];
    const wsInfo = XLSX.utils.json_to_sheet(infoData);
    wsInfo['!cols'] = [{ wch: 20 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, wsInfo, 'Información');

    // Descargar
    const fecha = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `${nombreArchivo}_${fecha}.xlsx`);
  };

  const tiposReporte = [
    { id: 'inventario', nombre: 'Inventario General', icon: Package, descripcion: 'Lista completa de todos los activos' },
    { id: 'porAlmacen', nombre: 'Activos por Almacén', icon: Building2, descripcion: 'Resumen de activos agrupados por sede' },
    { id: 'porTipo', nombre: 'Activos por Tipo', icon: TrendingUp, descripcion: 'Cantidad de activos por categoría' },
    { id: 'movimientos', nombre: 'Historial de Movimientos', icon: Calendar, descripcion: 'Registro de cambios y traslados' },
    { id: 'traslados', nombre: 'Traslados', icon: FileBarChart, descripcion: 'Lista de traslados realizados' }
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileBarChart className="w-7 h-7 text-mn-600" />
          Reportes
        </h1>
        <p className="text-gray-500">Genera y descarga reportes en Excel</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel de selección */}
        <div className="lg:col-span-1 space-y-4">
          {/* Tipo de reporte */}
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold">Tipo de Reporte</h3>
            </div>
            <div className="card-body space-y-2">
              {tiposReporte.map(tipo => (
                <button
                  key={tipo.id}
                  onClick={() => { setTipoReporte(tipo.id); setPreviewData(null); setError(null); }}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    tipoReporte === tipo.id
                      ? 'border-mn-500 bg-mn-50 text-mn-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <tipo.icon className={`w-5 h-5 ${tipoReporte === tipo.id ? 'text-mn-600' : 'text-gray-400'}`} />
                    <div>
                      <p className="font-medium">{tipo.nombre}</p>
                      <p className="text-xs text-gray-500">{tipo.descripcion}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Filtros */}
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Filtros
              </h3>
            </div>
            <div className="card-body space-y-4">
              {(tipoReporte === 'inventario' || tipoReporte === 'traslados') && (
                <div>
                  <label className="label">Almacén</label>
                  <select
                    value={almacenId}
                    onChange={(e) => setAlmacenId(e.target.value)}
                    className="select"
                  >
                    <option value="">Todos</option>
                    {almacenes.map(a => (
                      <option key={a.id} value={a.id}>{a.nombre}</option>
                    ))}
                  </select>
                </div>
              )}

              {tipoReporte === 'inventario' && (
                <div>
                  <label className="label">Tipo de Activo</label>
                  <select
                    value={tipoActivoId}
                    onChange={(e) => setTipoActivoId(e.target.value)}
                    className="select"
                  >
                    <option value="">Todos</option>
                    {tipos.map(t => (
                      <option key={t.id} value={t.id}>{t.nombre}</option>
                    ))}
                  </select>
                </div>
              )}

              {(tipoReporte === 'movimientos' || tipoReporte === 'traslados' || tipoReporte === 'inventario') && (
                <>
                  <div>
                    <label className="label">Fecha Desde</label>
                    <input
                      type="date"
                      value={fechaDesde}
                      onChange={(e) => setFechaDesde(e.target.value)}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">Fecha Hasta</label>
                    <input
                      type="date"
                      value={fechaHasta}
                      onChange={(e) => setFechaHasta(e.target.value)}
                      className="input"
                    />
                  </div>
                </>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => generarReporte(false)}
                  disabled={loading}
                  className="btn btn-secondary flex-1"
                >
                  {loading ? <Loader className="w-4 h-4 animate-spin" /> : 'Vista Previa'}
                </button>
                <button
                  onClick={() => generarReporte(true)}
                  disabled={loading}
                  className="btn btn-primary flex-1"
                >
                  <FileSpreadsheet className="w-4 h-4 mr-1" />
                  Excel
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Vista previa */}
        <div className="lg:col-span-2">
          <div className="card h-full">
            <div className="card-header flex items-center justify-between">
              <h3 className="font-semibold">Vista Previa</h3>
              {previewData && previewData.datos.length > 0 && (
                <button
                  onClick={() => descargarExcel(previewData.datos, previewData.nombreArchivo, previewData.nombreHoja)}
                  className="btn btn-primary btn-sm"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Descargar Excel
                </button>
              )}
            </div>
            <div className="card-body">
              {error && (
                <div className="text-center py-12">
                  <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-400" />
                  <p className="text-red-600">{error}</p>
                </div>
              )}

              {!previewData && !loading && !error && (
                <div className="text-center py-12 text-gray-500">
                  <FileBarChart className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p>Selecciona un tipo de reporte y presiona "Vista Previa"</p>
                </div>
              )}

              {loading && (
                <div className="text-center py-12">
                  <Loader className="w-8 h-8 mx-auto mb-4 animate-spin text-mn-600" />
                  <p className="text-gray-500">Generando reporte...</p>
                </div>
              )}

              {previewData && previewData.datos.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Package className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p>No se encontraron datos con los filtros seleccionados</p>
                </div>
              )}

              {previewData && previewData.datos.length > 0 && (
                <div className="overflow-x-auto">
                  <p className="text-sm text-gray-500 mb-3">
                    Mostrando {Math.min(20, previewData.datos.length)} de {previewData.datos.length} registros
                  </p>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        {Object.keys(previewData.datos[0]).map(col => (
                          <th key={col} className="text-left p-2 font-medium text-gray-700 whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.datos.slice(0, 20).map((row, idx) => (
                        <tr key={idx} className="border-t hover:bg-gray-50">
                          {Object.values(row).map((val, i) => (
                            <td key={i} className="p-2 whitespace-nowrap">
                              {val}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {previewData.datos.length > 20 && (
                    <p className="text-sm text-gray-500 mt-3 text-center">
                      ... y {previewData.datos.length - 20} registros más. Descarga el Excel para ver todo.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
