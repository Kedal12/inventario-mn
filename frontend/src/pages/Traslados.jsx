import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { trasladosService, catalogosService } from '../services/api';
import { Plus, Filter, ChevronLeft, ChevronRight, Printer } from 'lucide-react';

export default function Traslados() {
  const [traslados, setTraslados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ pagina: 1, totalPaginas: 1, totalItems: 0 });
  const [almacenes, setAlmacenes] = useState([]);
  const [filtroAlmacen, setFiltroAlmacen] = useState('');

  useEffect(() => { loadAlmacenes(); }, []);
  useEffect(() => { loadTraslados(); }, [pagination.pagina, filtroAlmacen]);

  const loadAlmacenes = async () => {
    try {
      const res = await catalogosService.getAlmacenes();
      setAlmacenes(res.data);
    } catch (err) { console.error(err); }
  };

  const loadTraslados = async () => {
    setLoading(true);
    try {
      const params = { pagina: pagination.pagina, elementosPorPagina: 20 };
      if (filtroAlmacen) params.almacenId = filtroAlmacen;
      const res = await trasladosService.getAll(params);
      setTraslados(res.data.items);
      setPagination(p => ({ ...p, totalPaginas: res.data.totalPaginas, totalItems: res.data.totalItems }));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handlePrintComprobante = async (id) => {
    try {
      const res = await trasladosService.getComprobante(id);
      const win = window.open('', '_blank');
      win.document.write(`<pre>${res.data.zpl}</pre><p>Copie el código ZPL para imprimir</p>`);
    } catch (err) { alert('Error generando comprobante'); }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Traslados</h1>
          <p className="text-gray-500">{pagination.totalItems} traslados registrados</p>
        </div>
        <Link to="/traslados/nuevo" className="btn btn-primary"><Plus className="w-5 h-5 mr-2" />Nuevo Traslado</Link>
      </div>

      <div className="card p-4">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="label">Filtrar por Almacén</label>
            <select value={filtroAlmacen} onChange={(e) => { setFiltroAlmacen(e.target.value); setPagination(p => ({...p, pagina: 1})); }} className="select">
              <option value="">Todos</option>
              {almacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-icg-600"></div></div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr><th>Número</th><th>Activo</th><th>Origen</th><th>Destino</th><th>Motivo</th><th>Fecha</th><th>Usuario</th><th></th></tr>
                </thead>
                <tbody>
                  {traslados.map(t => (
                    <tr key={t.id}>
                      <td className="font-mono text-icg-600">{t.numeroTraslado}</td>
                      <td><Link to={`/activos/${t.activoId}`} className="hover:text-icg-600">{t.activoCodigo}</Link><div className="text-xs text-gray-500">{t.activoDescripcion}</div></td>
                      <td>{t.almacenOrigenNombre}</td>
                      <td>{t.almacenDestinoNombre}</td>
                      <td className="max-w-xs truncate">{t.motivo}</td>
                      <td>{new Date(t.fechaTraslado).toLocaleString('es-CO')}</td>
                      <td>{t.nombreUsuario}</td>
                      <td><button onClick={() => handlePrintComprobante(t.id)} className="p-2 hover:bg-gray-100 rounded" title="Imprimir comprobante"><Printer className="w-4 h-4" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pagination.totalPaginas > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t">
                <span className="text-sm text-gray-500">Página {pagination.pagina} de {pagination.totalPaginas}</span>
                <div className="flex gap-2">
                  <button onClick={() => setPagination(p => ({...p, pagina: p.pagina - 1}))} disabled={pagination.pagina === 1} className="btn btn-secondary btn-sm"><ChevronLeft className="w-4 h-4" /></button>
                  <button onClick={() => setPagination(p => ({...p, pagina: p.pagina + 1}))} disabled={pagination.pagina === pagination.totalPaginas} className="btn btn-secondary btn-sm"><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
