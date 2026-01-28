import { useState, useEffect } from 'react';
import { reportesService, catalogosService } from '../services/api';
import { FileBarChart, Download, FileSpreadsheet, FileText, Filter } from 'lucide-react';

export default function Reportes() {
  const [almacenes, setAlmacenes] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [estados, setEstados] = useState([]);
  const [filtro, setFiltro] = useState({ almacenId: '', tipoActivoId: '', estadoId: '', marca: '', formato: 'excel' });
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadCatalogos(); }, []);

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
    } catch (err) { console.error(err); }
  };

  const exportarActivos = async () => {
    setLoading(true);
    try {
      const params = {
        formato: filtro.formato,
        almacenId: filtro.almacenId ? parseInt(filtro.almacenId) : null,
        tipoActivoId: filtro.tipoActivoId ? parseInt(filtro.tipoActivoId) : null,
        estadoId: filtro.estadoId ? parseInt(filtro.estadoId) : null,
        marca: filtro.marca || null
      };

      let response;
      if (filtro.formato === 'excel') {
        response = await reportesService.exportarActivosExcel(params);
      } else {
        response = await reportesService.exportarActivosPdf(params);
      }

      // Descargar archivo
      const blob = new Blob([response.data], { 
        type: filtro.formato === 'excel' ? 'text/csv' : 'text/html' 
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `activos_icg_${new Date().toISOString().split('T')[0]}.${filtro.formato === 'excel' ? 'csv' : 'html'}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Error al exportar');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const exportarTraslados = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filtro.almacenId) params.almacenId = parseInt(filtro.almacenId);

      const response = await reportesService.exportarTrasladosExcel(params);
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `traslados_icg_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Error al exportar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold">Reportes</h1>
        <p className="text-gray-500 mt-1">Exporta informes de inventario y traslados</p>
      </div>

      {/* Reporte de Activos */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileBarChart className="w-5 h-5 text-icg-600" />
            Reporte de Activos
          </h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="label">Almacén/Sede</label>
              <select value={filtro.almacenId} onChange={(e) => setFiltro({...filtro, almacenId: e.target.value})} className="select">
                <option value="">Todos</option>
                {almacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Tipo de Activo</label>
              <select value={filtro.tipoActivoId} onChange={(e) => setFiltro({...filtro, tipoActivoId: e.target.value})} className="select">
                <option value="">Todos</option>
                {tipos.map(t => <option key={t.id} value={t.id}>{t.referencia} - {t.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Estado</label>
              <select value={filtro.estadoId} onChange={(e) => setFiltro({...filtro, estadoId: e.target.value})} className="select">
                <option value="">Todos</option>
                {estados.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Marca</label>
              <input type="text" value={filtro.marca} onChange={(e) => setFiltro({...filtro, marca: e.target.value})} className="input" placeholder="Ej: HP, Dell..." />
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-4 border-r pr-4">
              <label className="text-sm font-medium text-gray-700">Formato:</label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="formato" checked={filtro.formato === 'excel'} onChange={() => setFiltro({...filtro, formato: 'excel'})} className="text-icg-600" />
                <FileSpreadsheet className="w-4 h-4 text-green-600" /> Excel/CSV
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="formato" checked={filtro.formato === 'pdf'} onChange={() => setFiltro({...filtro, formato: 'pdf'})} className="text-icg-600" />
                <FileText className="w-4 h-4 text-red-600" /> HTML/PDF
              </label>
            </div>

            <button onClick={exportarActivos} disabled={loading} className="btn btn-primary">
              <Download className="w-4 h-4 mr-2" />
              {loading ? 'Exportando...' : 'Exportar Activos'}
            </button>
          </div>
        </div>
      </div>

      {/* Reporte de Traslados */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileBarChart className="w-5 h-5 text-purple-600" />
            Reporte de Traslados
          </h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="label">Filtrar por Almacén</label>
              <select value={filtro.almacenId} onChange={(e) => setFiltro({...filtro, almacenId: e.target.value})} className="select">
                <option value="">Todos</option>
                {almacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
            </div>
          </div>

          <button onClick={exportarTraslados} disabled={loading} className="btn btn-primary">
            <Download className="w-4 h-4 mr-2" />
            {loading ? 'Exportando...' : 'Exportar Traslados'}
          </button>
        </div>
      </div>

      {/* Tips */}
      <div className="bg-icg-50 border border-icg-200 rounded-lg p-4">
        <h4 className="font-medium text-icg-800 mb-2">💡 Tips para reportes</h4>
        <ul className="text-sm text-icg-700 space-y-1">
          <li>• Los archivos CSV se pueden abrir en Excel para análisis avanzado</li>
          <li>• El formato HTML se puede imprimir directamente como PDF desde el navegador</li>
          <li>• Usa los filtros para generar reportes específicos por sede o tipo de activo</li>
        </ul>
      </div>
    </div>
  );
}
