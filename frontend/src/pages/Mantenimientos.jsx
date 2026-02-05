import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search, Wrench, ClipboardList, BarChart3, Printer,
  AlertTriangle, CheckCircle, Clock, XCircle, ChevronRight, Tag, X, DollarSign
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import api from '../services/api';
import QRCode from 'qrcode';

// ─── API del módulo ─────────────────────────────────────
const mttoApi = {
  catalogos:    ()           => api.get('/mantenimientos/catalogos'),
  activos:      (params)     => api.get('/mantenimientos/activos', { params }),
  activo:       (id)         => api.get(`/mantenimientos/activos/${id}`),
  // Búsqueda corregida para incluir Almacén
  buscar:       (q, almId)   => api.get('/mantenimientos/activos/buscar', { 
    params: { q: q.trim(), almacenId: almId || undefined } 
  }),
  registrar:    (data)       => api.post('/mantenimientos/registrar', data),
  historial:    (activoId)   => api.get(`/mantenimientos/historial/${activoId}`),
  porFecha:     (params)     => api.get('/mantenimientos/por-fecha', { params }),
  etiqueta:     (id)         => api.get(`/mantenimientos/etiqueta/${id}`),
  dashboard:    ()           => api.get('/mantenimientos/dashboard'),
};

// ─── Badge de alerta ────────────────────────────────────
function AlertBadge({ alerta }) {
  const cfg = {
    AL_DIA:  { label: 'Al día',   bg: '#d1fae5', color: '#065f46', Icon: CheckCircle },
    PROXIMO: { label: 'Próximo',  bg: '#fef3c7', color: '#92400e', Icon: Clock },
    VENCIDO: { label: 'Vencido',  bg: '#fee2e2', color: '#991b1b', Icon: AlertTriangle },
    NUNCA:   { label: 'Sin mtto', bg: '#f3f4f6', color: '#374151', Icon: XCircle },
  };
  const c = cfg[alerta] || cfg.NUNCA;
  return (
    <span style={{ background: c.bg, color: c.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <c.Icon size={12} /> {c.label}
    </span>
  );
}

export default function Mantenimientos() {
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState('dashboard');
  const [catalogos, setCatalogos] = useState({ tiposMantenimiento: [], tecnicos: [], almacenes: [] });
  const [alerta, setAlerta] = useState({ show: false, tipo: '', msg: '' });

  // Estados de Dashboard y Búsqueda
  const [dashboard, setDashboard] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [almacenBusqueda, setAlmacenBusqueda] = useState('');
  const [resultados, setResultados] = useState([]);
  const [activoSel, setActivoSel] = useState(null);
  const [loading, setLoading] = useState(false);

  // Formulario de registro
  const [form, setForm] = useState({
    tipoMantenimientoId: '', realizadoPor: '', descripcion: '',
    hallazgos: '', repuestosCambiados: '', costo: '', fechaProximoMtto: '', observaciones: ''
  });

  // Equipos y Historial
  const [activos, setActivos] = useState([]);
  const [filtroAlmacen, setFiltroAlmacen] = useState('');
  const [filtroAlerta, setFiltroAlerta] = useState('');
  const [historial, setHistorial] = useState([]);
  const [histInicio, setHistInicio] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]; });
  const [histFin, setHistFin] = useState(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    cargarCatalogos();
    cargarDashboard();
    const aid = searchParams.get('activoId');
    if (aid) { setTab('nuevo'); cargarActivoParaMtto(parseInt(aid)); }
  }, []);

  const cargarCatalogos = async () => {
    try {
      const res = await mttoApi.catalogos();
      setCatalogos(res.data);
    } catch (e) { console.error('Error catálogos:', e); }
  };

  const cargarDashboard = async () => {
    try { setDashboard((await mttoApi.dashboard()).data); } catch (e) { console.error(e); }
  };

  const cargarActivoParaMtto = async (id) => {
    try { setActivoSel((await mttoApi.activo(id)).data); } catch (e) { mostrar('error', 'Activo no encontrado'); }
  };

  // Lógica de búsqueda corregida
  const handleBuscar = async () => {
    if (!busqueda.trim() && !almacenBusqueda) return;
    setLoading(true);
    try { 
      const res = await mttoApi.buscar(busqueda, almacenBusqueda);
      setResultados(res.data); 
      if(res.data.length === 0) mostrar('info', 'No se encontraron equipos en este almacén');
    } catch (e) { 
        mostrar('error', 'Error en la búsqueda'); 
    } finally { setLoading(false); }
  };

  // ═══ SISTEMA DE IMPRESIÓN UNIFICADO (105x25mm) ═══
  const imprimirEtiquetaPro = async (et) => {
    const miIP = "10.15.0.221"; // IP de tu servidor según api.js
    const codigoVisual = et.codigoInterno.replace('ICG-', 'MN-');
    const urlQR = `http://${miIP}:3000/activo/${codigoVisual}`;

    try {
      const qrDataUrl = await QRCode.toDataURL(urlQR, { width: 120, margin: 0, errorCorrectionLevel: 'M' });
      const fecha = new Date(et.fechaMantenimiento).toLocaleDateString('es-CO');
      const prox = et.fechaProximoMtto ? new Date(et.fechaProximoMtto).toLocaleDateString('es-CO') : 'N/A';

      const w = window.open('', '_blank');
      w.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Etiqueta Mtto - ${codigoVisual}</title>
            <style>
              @page { size: 105mm 25mm; margin: 0 !important; }
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { font-family: Arial, sans-serif; }
              .fila { width: 105mm; height: 25mm; display: flex; align-items: center; }
              .etiqueta { width: 33mm; height: 25mm; display: flex; align-items: center; padding: 2mm; overflow: hidden; margin-left: 2mm; }
              .etiqueta:first-child { margin-left: 1mm; }
              .contenido { display: flex; align-items: center; }
              .qr { width: 14mm; height: 14mm; flex-shrink: 0; }
              .info { margin-left: 1.5mm; flex: 1; overflow: hidden; }
              .titulo { font-size: 5pt; font-weight: bold; color: #1e3a5f; }
              .codigo { font-size: 8pt; font-weight: bold; margin: 0.2mm 0; }
              .detalle { font-size: 5pt; line-height: 1.2; }
              .tipo-mtto { font-weight: bold; margin-top: 0.5mm; border-top: 0.1mm solid #ccc; padding-top: 0.2mm; }
            </style>
          </head>
          <body>
            <div class="fila">
              <div class="etiqueta">
                <div class="contenido">
                  <img src="${qrDataUrl}" class="qr" />
                  <div class="info">
                  <div class="titulo">MTTO #${et.numeroMantenimiento ?? et.NumeroMantenimiento ?? et.totalMantenimientos ?? et.TotalMantenimientos ?? '1'}</div>                    <div class="codigo">${codigoVisual}</div>
                    <div class="detalle">Fec: ${fecha}</div>
                    <div class="detalle">Prox: ${prox}</div>
                    <div class="detalle tipo-mtto">${et.tipoMantenimiento.toUpperCase()}</div>
                  </div>
                </div>
              </div>
            </div>
            <script>
              window.onload = function() { setTimeout(() => { window.print(); window.close(); }, 500); };
            </script>
          </body>
        </html>
      `);
      w.document.close();
    } catch (err) {
      console.error('Error al generar etiqueta:', err);
      mostrar('error', 'Error al generar la etiqueta');
    }
  };

  const handleSubmit = async (imprimir = false) => {
    if (!activoSel) return mostrar('error', 'Selecciona un activo');
    if (!form.tipoMantenimientoId || !form.realizadoPor || !form.descripcion)
      return mostrar('error', 'Completa los campos obligatorios (*)');

    try {
      const payload = {
        activoId: activoSel.activoId,
        tipoMantenimientoId: parseInt(form.tipoMantenimientoId),
        realizadoPor: form.realizadoPor,
        descripcion: form.descripcion,
        hallazgos: form.hallazgos || null,
        repuestosCambiados: form.repuestosCambiados || null,
        costo: form.costo ? parseFloat(form.costo) : null,
        fechaProximoMtto: form.fechaProximoMtto || null,
        observaciones: form.observaciones || null
      };

      const res = await mttoApi.registrar(payload);
      if (res.data.exito) {
        mostrar('success', res.data.mensaje);
        if (imprimir && res.data.etiqueta) {
           imprimirEtiquetaPro(res.data.etiqueta);
        }
        setActivoSel(null); setResultados([]); setBusqueda('');
        setForm({ tipoMantenimientoId: '', realizadoPor: '', descripcion: '', hallazgos: '', repuestosCambiados: '', costo: '', fechaProximoMtto: '', observaciones: '' });
        cargarDashboard();
      } else { mostrar('error', res.data.mensaje); }
    } catch (e) { mostrar('error', 'Error al registrar'); }
  };

  const cargarActivos = useCallback(async () => {
    try {
      const p = { almacenId: filtroAlmacen || undefined, alerta: filtroAlerta || undefined };
      setActivos((await mttoApi.activos(p)).data);
    } catch (e) { console.error(e); }
  }, [filtroAlmacen, filtroAlerta]);

  useEffect(() => { if (tab === 'equipos') cargarActivos(); }, [tab, cargarActivos]);

  const cargarHistorial = async () => {
    try {
      const p = { inicio: histInicio, fin: histFin, almacenId: filtroAlmacen || undefined };
      setHistorial((await mttoApi.porFecha(p)).data);
    } catch (e) { console.error(e); }
  };

  // ═══ HELPERS ═══
  const mostrar = (tipo, msg) => { setAlerta({ show: true, tipo, msg }); setTimeout(() => setAlerta({ show: false, tipo: '', msg: '' }), 5000); };
  const fmtFecha = (d) => d ? new Date(d).toLocaleDateString('es-CO') : '-';
  const fmtDinero = (v) => v ? '$' + new Intl.NumberFormat('es-CO').format(v) : '-';
  const f = (id, val) => setForm({ ...form, [id]: val });

  // Estilos
  const sPanel = { background: 'white', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.1)', overflow: 'hidden', marginBottom: 20 };
  const sHeader = { padding: '15px 20px', borderBottom: '1px solid #eee', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 10 };
  const sInput = { padding: '10px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14, width: '100%', outline: 'none' };

  return (
    <div className="animate-fadeIn" style={{ padding: 20 }}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
          <Wrench className="text-blue-600" size={32} /> Gestión de Mantenimientos
        </h1>
      </div>

      {alerta.show && (
        <div className={`p-4 rounded-lg mb-4 flex items-center gap-3 border ${alerta.tipo === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
          {alerta.tipo === 'success' ? <CheckCircle size={20}/> : <AlertTriangle size={20}/>}
          {alerta.msg}
        </div>
      )}

      {/* Navegación por Pestañas */}
      <div className="flex gap-2 p-1 bg-gray-100 rounded-xl mb-6">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
          { id: 'nuevo', label: 'Nuevo Registro', icon: Wrench },
          { id: 'equipos', label: 'Estado Equipos', icon: Tag },
          { id: 'historial', label: 'Historial', icon: ClipboardList }
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-semibold transition-all ${tab === t.id ? 'bg-blue-700 text-white shadow-md' : 'text-gray-500 hover:bg-gray-200'}`}>
            <t.icon size={18} /> {t.label}
          </button>
        ))}
      </div>

      {/* CONTENIDO: DASHBOARD */}
      {tab === 'dashboard' && dashboard && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: 'Total Activos', val: dashboard.totalActivos, color: 'text-blue-700', bg: 'bg-blue-50' },
              { label: 'Vencidos', val: dashboard.activosVencidos, color: 'text-red-600', bg: 'bg-red-50' },
              { label: 'Próximos', val: dashboard.activosProximos, color: 'text-orange-500', bg: 'bg-orange-50' },
              { label: 'Al Día', val: dashboard.activosAlDia, color: 'text-green-600', bg: 'bg-green-50' },
              { label: 'Sin Mtto', val: dashboard.activosNunca, color: 'text-gray-500', bg: 'bg-gray-100' }
            ].map((card, i) => (
              <div key={i} className={`p-5 rounded-2xl shadow-sm border border-white ${card.bg}`}>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">{card.label}</p>
                <p className={`text-3xl font-black ${card.color}`}>{card.val}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div style={sPanel}>
                <h3 style={sHeader}><AlertTriangle className="text-red-500" size={20}/> Críticos / Pendientes</h3>
                <div className="overflow-x-auto max-h-[400px]">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                            <tr>
                                <th className="p-3 text-left">Activo</th>
                                <th className="p-3 text-left">Almacén</th>
                                <th className="p-3 text-left">Estado</th>
                                <th className="p-3 text-left"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {dashboard.activosPendientes?.map(a => (
                                <tr key={a.activoId} className="border-t hover:bg-gray-50">
                                    <td className="p-3"><strong>{a.marca}</strong><br/><span className="text-xs text-gray-400 font-mono">{a.codigoInterno}</span></td>
                                    <td className="p-3 text-gray-500">{a.almacen}</td>
                                    <td className="p-3"><AlertBadge alerta={a.alertaMantenimiento}/></td>
                                    <td className="p-3"><button onClick={() => { setActivoSel(a); setTab('nuevo'); }} className="text-blue-600 hover:underline">Atender</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Gráfico de Costos por Almacén */}
            <div style={sPanel}>
                <h3 style={sHeader}><DollarSign className="text-green-600" size={20}/> Costos Mtto por Almacén</h3>
                <div className="h-[350px] p-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={catalogos.almacenes}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="nombre" fontSize={10} interval={0} />
                            <YAxis fontSize={12} />
                            <Tooltip />
                            <Bar dataKey="id" name="Gasto $" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTENIDO: NUEVO REGISTRO */}
      {tab === 'nuevo' && (
        <div className="max-w-4xl mx-auto">
          <div style={sPanel} className="p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><Search size={20}/> Paso 1: Selección del Equipo</h3>
            <div className="flex gap-3 mb-4">
              <input value={busqueda} onChange={e => setBusqueda(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleBuscar()}
                placeholder="Buscar por código, serial, marca o modelo..." className="flex-1 px-4 py-3 rounded-xl border-2 border-blue-100 focus:border-blue-500 outline-none transition-all" />
              <button onClick={handleBuscar} disabled={loading} className="px-6 bg-blue-700 text-white rounded-xl font-bold hover:bg-blue-800 transition-colors flex items-center gap-2">
                {loading ? '...' : <><Search size={18}/> Buscar</>}
              </button>
            </div>
            
            <select value={almacenBusqueda} onChange={e => setAlmacenBusqueda(e.target.value)} className="w-full p-3 bg-gray-50 rounded-lg border border-gray-200 text-gray-600 mb-4 outline-none">
              <option value="">-- Filtrar por ubicación (Almacén) --</option>
              {catalogos.almacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
            </select>

            {resultados.length > 0 && !activoSel && (
              <div className="border rounded-xl overflow-hidden shadow-inner max-h-60 overflow-y-auto">
                {resultados.map(a => (
                  <div key={a.activoId} onClick={() => { setActivoSel(a); setResultados([]); }}
                    className="p-4 border-b last:border-0 cursor-pointer hover:bg-blue-50 flex justify-between items-center transition-colors">
                    <div>
                      <p className="font-bold text-gray-800">{a.marca} {a.modelo}</p>
                      <p className="text-xs text-gray-500 font-mono">{a.codigoInterno} | {a.almacen}</p>
                    </div>
                    <AlertBadge alerta={a.alertaMantenimiento} />
                  </div>
                ))}
              </div>
            )}

            {activoSel && (
              <div className="bg-blue-50 p-5 rounded-2xl border-2 border-blue-200 flex justify-between items-start animate-fadeIn">
                <div className="flex gap-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg"><Tag/></div>
                    <div>
                        <h4 className="font-black text-blue-900 text-lg leading-tight">{activoSel.marca} {activoSel.modelo}</h4>
                        <p className="text-blue-700 font-mono text-sm">{activoSel.codigoInterno} • {activoSel.almacen}</p>
                        <div className="mt-2"><AlertBadge alerta={activoSel.alertaMantenimiento}/></div>
                    </div>
                </div>
                <button onClick={() => setActivoSel(null)} className="p-2 text-blue-300 hover:text-blue-600 transition-colors"><X/></button>
              </div>
            )}
          </div>

          {activoSel && (
            <div style={sPanel} className="p-6 animate-slideUp">
              <h3 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2"><ClipboardList size={20}/> Paso 2: Detalles Técnicos</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase">Tipo de Mantenimiento *</label>
                  <select value={form.tipoMantenimientoId} onChange={e => f('tipoMantenimientoId', e.target.value)} style={sInput}>
                    <option value="">Seleccione...</option>
                    {catalogos.tiposMantenimiento.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase">Técnico Responsable *</label>
                  <select value={form.realizadoPor} onChange={e => f('realizadoPor', e.target.value)} style={sInput}>
                    <option value="">Seleccione...</option>
                    {catalogos.tecnicos.map(t => <option key={t.id} value={t.nombre}>{t.nombre} ({t.cargo})</option>)}
                  </select>
                </div>
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase">Descripción del Trabajo *</label>
                  <textarea value={form.descripcion} onChange={e => f('descripcion', e.target.value)} placeholder="¿Qué se realizó en el equipo?" className="w-full p-3 border-2 border-gray-100 rounded-lg outline-none focus:border-blue-300 h-24 text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase">Fecha Próximo Mtto</label>
                  <input type="date" value={form.fechaProximoMtto} onChange={e => f('fechaProximoMtto', e.target.value)} style={sInput} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase">Costo Incurrido ($)</label>
                  <input type="number" value={form.costo} onChange={e => f('costo', e.target.value)} placeholder="0.00" style={sInput} />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mt-8">
                <button onClick={() => handleSubmit(false)} className="flex-1 py-4 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 shadow-lg shadow-green-100 transition-all flex items-center justify-center gap-2">
                  <CheckCircle size={20}/> REGISTRAR MTTO
                </button>
                <button onClick={() => handleSubmit(true)} className="flex-1 py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all flex items-center justify-center gap-2">
                  <Printer size={20}/> GUARDAR E IMPRIMIR
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CONTENIDO: ESTADO EQUIPOS */}
      {tab === 'equipos' && (
        <div style={sPanel}>
          <div className="p-4 bg-gray-50 flex flex-wrap gap-3">
            <select value={filtroAlmacen} onChange={e => setFiltroAlmacen(e.target.value)} className="p-2 border rounded-lg text-sm outline-none">
              <option value="">Todos los almacenes</option>
              {catalogos.almacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
            </select>
            <select value={filtroAlerta} onChange={e => setFiltroAlerta(e.target.value)} className="p-2 border rounded-lg text-sm outline-none">
              <option value="">Todas las alertas</option>
              <option value="VENCIDO">Vencidos</option>
              <option value="PROXIMO">Próximos</option>
              <option value="AL_DIA">Al día</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="bg-white border-b-2">
                        {['Equipo', 'Almacén', 'Estado', 'Último Mtto', 'Próximo', ''].map(h => <th key={h} className="p-4 text-left font-bold text-gray-400 uppercase text-[10px]">{h}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {activos.map(a => (
                        <tr key={a.activoId} className="border-b hover:bg-gray-50">
                            <td className="p-4"><strong>{a.marca} {a.modelo}</strong><br/><code className="text-xs text-blue-600">{a.codigoInterno}</code></td>
                            <td className="p-4 text-gray-500">{a.almacen}</td>
                            <td className="p-4"><AlertBadge alerta={a.alertaMantenimiento}/></td>
                            <td className="p-4 text-gray-500">{fmtFecha(a.fechaUltimoMantenimiento)}</td>
                            <td className="p-4 font-bold">{fmtFecha(a.fechaProximoMantenimiento)}</td>
                            <td className="p-4">
                                <button onClick={() => { setActivoSel(a); setTab('nuevo'); }} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all"><Wrench size={16}/></button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONTENIDO: HISTORIAL */}
      {tab === 'historial' && (
        <div style={sPanel}>
          <div className="p-5 border-b flex flex-wrap gap-4 items-end">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400">DESDE</label>
                <input type="date" value={histInicio} onChange={e => setHistInicio(e.target.value)} className="p-2 border rounded-lg text-sm block" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400">HASTA</label>
                <input type="date" value={histFin} onChange={e => setHistFin(e.target.value)} className="p-2 border rounded-lg text-sm block" />
              </div>
              <button onClick={cargarHistorial} className="px-6 py-2 bg-blue-700 text-white rounded-lg font-bold hover:bg-blue-800 transition-all">FILTRAR</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Fecha', 'Activo', 'Técnico', 'Mantenimiento', 'Costo', ''].map(h => <th key={h} className="p-4 text-left font-bold text-gray-400 uppercase text-[10px]">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {historial.map(m => (
                  <tr key={m.mantenimientoId} className="border-b hover:bg-gray-50">
                    <td className="p-4 text-gray-500">{fmtFecha(m.fechaMantenimiento)}</td>
                    <td className="p-4"><strong>{m.marca}</strong><br/><span className="text-xs text-gray-400">{m.codigoInterno}</span></td>
                    <td className="p-4 text-gray-600">{m.realizadoPor}</td>
                    <td className="p-4"><span style={{ color: m.tipoMttoColor, fontWeight: 'bold' }}>{m.tipoMantenimiento}</span></td>
                    <td className="p-4 font-bold text-green-700">{fmtDinero(m.costo)}</td>
                    <td className="p-4 text-center">
                        <button onClick={() => imprimirEtiquetaPro(m)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Reimprimir Etiqueta"><Printer size={18}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}