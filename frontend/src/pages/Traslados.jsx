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

  const handlePrintComprobante = (traslado) => {
    const fechaTraslado = new Date(traslado.fechaTraslado);
    const fechaFormateada = fechaTraslado.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const horaFormateada = fechaTraslado.toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Comprobante de Traslado - ${traslado.numeroTraslado}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          @page {
            size: letter;
            margin: 1cm;
          }
          
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            font-size: 12px;
            color: #333;
            background: white;
            padding: 20px;
          }
          
          .container {
            max-width: 800px;
            margin: 0 auto;
            border: 2px solid #1a365d;
            padding: 0;
          }
          
          /* Encabezado */
          .header {
            background: linear-gradient(135deg, #1a365d 0%, #2c5282 100%);
            color: white;
            padding: 20px 30px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          
          .header-left h1 {
            font-size: 22px;
            font-weight: 700;
            margin-bottom: 4px;
          }
          
          .header-left p {
            font-size: 11px;
            opacity: 0.9;
          }
          
          .header-right {
            text-align: right;
          }
          
          .header-right .doc-type {
            font-size: 14px;
            font-weight: 600;
            background: rgba(255,255,255,0.2);
            padding: 6px 12px;
            border-radius: 4px;
            margin-bottom: 8px;
          }
          
          .header-right .doc-number {
            font-size: 18px;
            font-weight: 700;
            letter-spacing: 1px;
          }
          
          /* Información del traslado */
          .info-bar {
            background: #f7fafc;
            padding: 12px 30px;
            display: flex;
            justify-content: space-between;
            border-bottom: 1px solid #e2e8f0;
          }
          
          .info-item {
            display: flex;
            align-items: center;
            gap: 8px;
          }
          
          .info-item .label {
            color: #718096;
            font-size: 11px;
          }
          
          .info-item .value {
            font-weight: 600;
            color: #2d3748;
          }
          
          /* Contenido principal */
          .content {
            padding: 25px 30px;
          }
          
          .section-title {
            font-size: 13px;
            font-weight: 700;
            color: #1a365d;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 2px solid #e2e8f0;
          }
          
          /* Grid de ubicaciones */
          .locations-grid {
            display: grid;
            grid-template-columns: 1fr auto 1fr;
            gap: 20px;
            align-items: center;
            margin-bottom: 30px;
          }
          
          .location-box {
            background: #f7fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
          }
          
          .location-box.origen {
            border-left: 4px solid #e53e3e;
          }
          
          .location-box.destino {
            border-left: 4px solid #38a169;
          }
          
          .location-box .type {
            font-size: 10px;
            text-transform: uppercase;
            color: #718096;
            letter-spacing: 1px;
            margin-bottom: 8px;
          }
          
          .location-box .name {
            font-size: 16px;
            font-weight: 700;
            color: #2d3748;
          }
          
          .arrow {
            font-size: 30px;
            color: #1a365d;
          }
          
          /* Datos del activo */
          .asset-card {
            background: #fffff0;
            border: 1px solid #d69e2e;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 25px;
          }
          
          .asset-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 15px;
          }
          
          .asset-code {
            font-family: 'Consolas', monospace;
            font-size: 20px;
            font-weight: 700;
            color: #744210;
            background: #fefcbf;
            padding: 6px 12px;
            border-radius: 4px;
          }
          
          .asset-details {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }
          
          .asset-detail {
            display: flex;
            flex-direction: column;
          }
          
          .asset-detail .label {
            font-size: 10px;
            color: #718096;
            text-transform: uppercase;
            margin-bottom: 2px;
          }
          
          .asset-detail .value {
            font-weight: 600;
            color: #2d3748;
          }
          
          /* Motivo */
          .motivo-section {
            margin-bottom: 25px;
          }
          
          .motivo-box {
            background: #fff;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 15px;
            min-height: 60px;
          }
          
          .motivo-text {
            color: #4a5568;
            line-height: 1.6;
          }
          
          /* Observaciones */
          .observaciones-section {
            margin-bottom: 30px;
          }
          
          .observaciones-box {
            background: #fff;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 15px;
            min-height: 50px;
          }
          
          /* Firmas */
          .signatures {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 30px;
            margin-top: 40px;
            padding-top: 20px;
          }
          
          .signature-box {
            text-align: center;
          }
          
          .signature-line {
            border-top: 1px solid #2d3748;
            margin-bottom: 8px;
            padding-top: 60px;
          }
          
          .signature-label {
            font-size: 11px;
            font-weight: 600;
            color: #2d3748;
            margin-bottom: 2px;
          }
          
          .signature-sublabel {
            font-size: 10px;
            color: #718096;
          }
          
          /* Footer */
          .footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            color: #a0aec0;
          }
          
          /* Print styles */
          @media print {
            body {
              padding: 0;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            
            .container {
              border: 2px solid #1a365d !important;
            }
            
            .header {
              background: #1a365d !important;
              -webkit-print-color-adjust: exact !important;
            }
            
            .no-print {
              display: none !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- Encabezado -->
          <div class="header">
            <div class="header-left">
              <h1>LA MEDIA NARANJA</h1>
              <p>Sistema de Inventario TI</p>
            </div>
            <div class="header-right">
              <div class="doc-type">COMPROBANTE DE TRASLADO</div>
              <div class="doc-number">${traslado.numeroTraslado}</div>
            </div>
          </div>
          
          <!-- Barra de información -->
          <div class="info-bar">
            <div class="info-item">
              <span class="label">Fecha:</span>
              <span class="value">${fechaFormateada}</span>
            </div>
            <div class="info-item">
              <span class="label">Hora:</span>
              <span class="value">${horaFormateada}</span>
            </div>
            <div class="info-item">
              <span class="label">Registrado por:</span>
              <span class="value">${traslado.nombreUsuario}</span>
            </div>
          </div>
          
          <!-- Contenido -->
          <div class="content">
            <!-- Ubicaciones -->
            <div class="section-title">Movimiento</div>
            <div class="locations-grid">
              <div class="location-box origen">
                <div class="type">📤 Origen</div>
                <div class="name">${traslado.almacenOrigenNombre}</div>
              </div>
              <div class="arrow">➜</div>
              <div class="location-box destino">
                <div class="type">📥 Destino</div>
                <div class="name">${traslado.almacenDestinoNombre}</div>
              </div>
            </div>
            
            <!-- Activo -->
            <div class="section-title">Activo Trasladado</div>
            <div class="asset-card">
              <div class="asset-header">
                <div class="asset-code">${traslado.activoCodigo}</div>
              </div>
              <div class="asset-details">
                <div class="asset-detail">
                  <span class="label">Descripción</span>
                  <span class="value">${traslado.activoDescripcion || 'N/A'}</span>
                </div>
              </div>
            </div>
            
            <!-- Motivo -->
            <div class="motivo-section">
              <div class="section-title">Motivo del Traslado</div>
              <div class="motivo-box">
                <p class="motivo-text">${traslado.motivo}</p>
              </div>
            </div>
            
            <!-- Observaciones -->
            <div class="observaciones-section">
              <div class="section-title">Observaciones</div>
              <div class="observaciones-box">
                <p class="motivo-text">${traslado.observaciones || 'Sin observaciones'}</p>
              </div>
            </div>
            
            <!-- Firmas -->
            <div class="signatures">
              <div class="signature-box">
                <div class="signature-line"></div>
                <div class="signature-label">Entrega</div>
                <div class="signature-sublabel">Responsable Origen</div>
              </div>
              <div class="signature-box">
                <div class="signature-line"></div>
                <div class="signature-label">Recibe</div>
                <div class="signature-sublabel">Responsable Destino</div>
              </div>
              <div class="signature-box">
                <div class="signature-line"></div>
                <div class="signature-label">Autoriza</div>
                <div class="signature-sublabel">Sistemas / TI</div>
              </div>
            </div>
            
            <!-- Footer -->
            <div class="footer">
              <span>Documento generado el ${new Date().toLocaleString('es-CO')}</span>
              <span>Inventario TI - La Media Naranja</span>
            </div>
          </div>
        </div>
        
        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
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
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-mn-600"></div></div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Número</th>
                    <th>Activo</th>
                    <th>Origen</th>
                    <th>Destino</th>
                    <th>Motivo</th>
                    <th>Fecha</th>
                    <th>Usuario</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {traslados.map(t => (
                    <tr key={t.id}>
                      <td className="font-mono text-mn-600">{t.numeroTraslado}</td>
                      <td>
                        <Link to={`/activos/${t.activoId}`} className="hover:text-mn-600">{t.activoCodigo}</Link>
                        <div className="text-xs text-gray-500">{t.activoDescripcion}</div>
                      </td>
                      <td>{t.almacenOrigenNombre}</td>
                      <td>{t.almacenDestinoNombre}</td>
                      <td className="max-w-xs truncate">{t.motivo}</td>
                      <td>{new Date(t.fechaTraslado).toLocaleString('es-CO')}</td>
                      <td>{t.nombreUsuario}</td>
                      <td>
                        <button 
                          onClick={() => handlePrintComprobante(t)} 
                          className="p-2 hover:bg-gray-100 rounded text-mn-600" 
                          title="Imprimir comprobante"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </td>
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
