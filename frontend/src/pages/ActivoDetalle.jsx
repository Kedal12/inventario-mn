// ActivoDetalle.jsx
import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { activosService } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { QRCodeSVG } from 'qrcode.react';
import {
  ArrowLeft, Edit, Printer, Trash2, RefreshCw, ArrowRightLeft,
  Clock, MapPin, Tag, Info
} from 'lucide-react';

export default function ActivoDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [activo, setActivo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadActivo(); }, [id]);

  const loadActivo = async () => {
    try {
      const response = await activosService.getById(id);
      setActivo(response.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-icg-600"></div></div>;
  if (!activo) return <div className="text-center py-12"><p>Activo no encontrado</p></div>;

  const qrUrl = `${window.location.origin}/activo/${activo.codigoInterno}`;

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{activo.codigoInterno}</h1>
          <p className="text-gray-500">{activo.marca} {activo.modelo}</p>
        </div>
        {isAdmin() && (
          <div className="flex gap-2">
            <Link to={`/traslados/nuevo?activoId=${activo.id}`} className="btn btn-secondary">
              <ArrowRightLeft className="w-4 h-4 mr-2" />Trasladar
            </Link>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <div className="card-header"><h3 className="font-semibold">Información General</h3></div>
            <div className="card-body grid grid-cols-2 gap-4">
              <div><span className="text-gray-500 text-sm">Código</span><p className="font-mono font-bold text-icg-600">{activo.codigoInterno}</p></div>
              <div><span className="text-gray-500 text-sm">Serial</span><p>{activo.serialFabricante || '-'}</p></div>
              <div><span className="text-gray-500 text-sm">Marca</span><p className="font-medium">{activo.marca}</p></div>
              <div><span className="text-gray-500 text-sm">Modelo</span><p>{activo.modelo}</p></div>
              <div><span className="text-gray-500 text-sm">Tipo</span><p>{activo.tipoActivo?.nombre}</p></div>
              <div><span className="text-gray-500 text-sm">Referencia</span><p>{activo.tipoActivo?.referencia}</p></div>
              <div><span className="text-gray-500 text-sm">Almacén</span><p className="font-medium">{activo.almacen?.nombre}</p></div>
              <div><span className="text-gray-500 text-sm">Estado</span><span className="badge" style={{backgroundColor: activo.estado?.color + '20', color: activo.estado?.color}}>{activo.estado?.nombre}</span></div>
              <div><span className="text-gray-500 text-sm">Fecha Ingreso</span><p>{new Date(activo.fechaIngreso).toLocaleDateString('es-CO')}</p></div>
              <div><span className="text-gray-500 text-sm">Último Inventario</span><p>{activo.fechaUltimoInventario ? new Date(activo.fechaUltimoInventario).toLocaleDateString('es-CO') : '-'}</p></div>
              {activo.descripcion && <div className="col-span-2"><span className="text-gray-500 text-sm">Descripción</span><p>{activo.descripcion}</p></div>}
              {activo.observaciones && <div className="col-span-2"><span className="text-gray-500 text-sm">Observaciones</span><p>{activo.observaciones}</p></div>}
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h3 className="font-semibold">Historial de Cambios</h3></div>
            <div className="max-h-96 overflow-y-auto">
              {activo.historial?.length > 0 ? (
                <div className="divide-y">
                  {activo.historial.map((h, i) => (
                    <div key={i} className="p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className={`badge ${h.tipoCambio === 'Creacion' ? 'badge-success' : h.tipoCambio === 'Traslado' ? 'badge-info' : 'badge-neutral'}`}>{h.tipoCambio}</span>
                          <span className="ml-2 text-gray-600">{h.campo}</span>
                        </div>
                        <span className="text-sm text-gray-500">{new Date(h.fechaCambio).toLocaleString('es-CO')}</span>
                      </div>
                      {h.valorAnterior && <p className="text-sm mt-1"><span className="text-gray-500">Anterior:</span> {h.valorAnterior}</p>}
                      {h.valorNuevo && <p className="text-sm"><span className="text-gray-500">Nuevo:</span> {h.valorNuevo}</p>}
                      {h.descripcion && <p className="text-sm text-gray-500 mt-1">{h.descripcion}</p>}
                      <p className="text-xs text-gray-400 mt-1">Por: {h.nombreUsuario}</p>
                    </div>
                  ))}
                </div>
              ) : <p className="p-4 text-center text-gray-500">Sin historial</p>}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <div className="card-body text-center">
              <QRCodeSVG value={qrUrl} size={200} className="mx-auto" />
              <p className="mt-4 text-sm text-gray-500">Escanea para ver info del activo</p>
              <p className="text-xs font-mono text-gray-400 mt-2 break-all">{qrUrl}</p>
            </div>
          </div>

          {activo.traslados?.length > 0 && (
            <div className="card">
              <div className="card-header"><h3 className="font-semibold">Traslados Recientes</h3></div>
              <div className="divide-y max-h-64 overflow-y-auto">
                {activo.traslados.slice(0, 5).map((t, i) => (
                  <div key={i} className="p-3">
                    <p className="font-mono text-sm text-icg-600">{t.numeroTraslado}</p>
                    <p className="text-sm">{t.almacenOrigenNombre} → {t.almacenDestinoNombre}</p>
                    <p className="text-xs text-gray-500">{new Date(t.fechaTraslado).toLocaleDateString('es-CO')}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
