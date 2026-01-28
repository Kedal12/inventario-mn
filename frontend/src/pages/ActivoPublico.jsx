import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { activosService } from '../services/api';
import { Monitor, MapPin, Calendar, Tag, CheckCircle, AlertCircle } from 'lucide-react';

export default function ActivoPublico() {
  const { codigo } = useParams();
  const [activo, setActivo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Base URL para las imágenes (la IP de tu servidor backend)
  const BASE_URL_API = "http://10.15.0.221:5050";

  useEffect(() => {
    loadActivo();
  }, [codigo]);

  const loadActivo = async () => {
    try {
      const response = await activosService.getPublico(codigo);
      setActivo(response.data);
    } catch (err) {
      setError('Activo no encontrado');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (error || !activo) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-sm w-full">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800">No encontrado</h2>
          <p className="text-gray-500 mt-2">El código {codigo} no existe en el inventario.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center">
      {/* Banner Superior Corporativo */}
      <div className="bg-orange-600 w-full p-6 text-white text-center shadow-md">
        <h1 className="text-lg font-black tracking-tighter">ALMACENES LA MEDIA NARANJA</h1>
        <p className="text-xs opacity-80 uppercase font-bold">Departamento de Tecnología</p>
      </div>

      <div className="max-w-md w-full p-4 -mt-4">
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
          
          {/* SECCIÓN DE LA FOTO */}
          <div className="relative h-64 bg-gray-200">
            {activo.fotoUrl ? (
              <img 
                src={`${BASE_URL_API}${activo.fotoUrl}`} 
                alt={activo.modelo}
                className="w-full h-full object-cover"
                onError={(e) => { e.target.src = 'https://via.placeholder.com/400x300?text=Sin+Imagen'; }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Monitor className="w-16 h-16 mb-2" />
                <span className="text-sm">Sin imagen registrada</span>
              </div>
            )}
            
            {/* Badge de Estado sobre la foto */}
            <div className="absolute bottom-4 right-4">
              <span 
                className="px-4 py-1.5 rounded-full text-xs font-bold shadow-lg border-2 border-white text-white"
                style={{ backgroundColor: activo.estadoColor }}
              >
                {activo.estado.toUpperCase()}
              </span>
            </div>
          </div>

          {/* CUERPO DE INFORMACIÓN */}
          <div className="p-6">
            <div className="text-center mb-6">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Código Interno</span>
              <h2 className="text-3xl font-black text-gray-900 leading-none mt-1">{activo.codigoInterno}</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-4 p-3 bg-gray-50 rounded-xl">
                <div className="bg-orange-100 p-2 rounded-lg"><Tag className="w-5 h-5 text-orange-600" /></div>
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">Equipo</p>
                  <p className="font-bold text-gray-800 text-lg">{activo.marca} {activo.modelo}</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-3 bg-gray-50 rounded-xl">
                <div className="bg-blue-100 p-2 rounded-lg"><MapPin className="w-5 h-5 text-blue-600" /></div>
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">Ubicación Actual</p>
                  <p className="font-bold text-gray-800 text-lg">{activo.almacen}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-3 h-3 text-gray-400" />
                    <span className="text-[10px] text-gray-400 font-bold uppercase">Ingreso</span>
                  </div>
                  <p className="font-bold text-gray-700">{new Date(activo.fechaIngreso).toLocaleDateString()}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="w-3 h-3 text-gray-400" />
                    <span className="text-[10px] text-gray-400 font-bold uppercase">Tipo</span>
                  </div>
                  <p className="font-bold text-gray-700 truncate">{activo.tipoActivo}</p>
                </div>
              </div>

              {activo.descripcion && (
                <div className="mt-4 p-4 bg-orange-50 rounded-xl border border-orange-100">
                  <p className="text-[10px] text-orange-400 font-bold uppercase mb-1">Nota del Administrador</p>
                  <p className="text-sm text-gray-700 italic">"{activo.descripcion}"</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-50 p-4 text-center">
             <p className="text-[10px] text-gray-400 font-bold">Sistema de Inventario TI - MN ©</p>
          </div>
        </div>
      </div>
    </div>
  );
}