import { useState, useEffect, useRef } from 'react';
import { conciliacionService, catalogosService } from '../services/api';
import {
  ClipboardList, Scan, Send, Trash2, CheckCircle, XCircle,
  AlertTriangle, MapPin, RotateCcw, Download
} from 'lucide-react';

export default function Inventario() {
  const [almacenes, setAlmacenes] = useState([]);
  const [almacenId, setAlmacenId] = useState('');
  const [almacenNombre, setAlmacenNombre] = useState('');

  // Modo escaneo
  const [modoEscaneo, setModoEscaneo] = useState(false);
  const [codigosEscaneados, setCodigosEscaneados] = useState([]);
  const [codigoActual, setCodigoActual] = useState('');
  const [ultimoResultado, setUltimoResultado] = useState(null);
  const inputRef = useRef(null);

  // Resultado de conciliación
  const [resultado, setResultado] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAlmacenes();
  }, []);

  useEffect(() => {
    if (modoEscaneo && inputRef.current) {
      inputRef.current.focus();
    }
  }, [modoEscaneo, codigosEscaneados]);

  const loadAlmacenes = async () => {
    try {
      const res = await catalogosService.getAlmacenes();
      setAlmacenes(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const iniciarEscaneo = () => {
    if (!almacenId) {
      alert('Seleccione un almacén primero');
      return;
    }
    const almacen = almacenes.find(a => a.id === parseInt(almacenId));
    setAlmacenNombre(almacen?.nombre || '');
    setModoEscaneo(true);
    setCodigosEscaneados([]);
    setResultado(null);
    setUltimoResultado(null);
  };

  const handleScanInput = async (e) => {
    if (e.key === 'Enter' && codigoActual.trim()) {
      const codigo = codigoActual.trim().toUpperCase();

      // Verificar si ya fue escaneado
      if (codigosEscaneados.includes(codigo)) {
        setUltimoResultado({
          resultado: 'Duplicado',
          mensaje: '⚠️ Ya escaneado',
          codigo
        });
        setCodigoActual('');
        return;
      }

      // Verificar en tiempo real (opcional)
      try {
        const res = await conciliacionService.verificarCodigo({
          almacenId: parseInt(almacenId),
          codigo
        });
        setUltimoResultado({
          resultado: res.data.resultado,
          mensaje: res.data.mensaje,
          codigo,
          marca: res.data.marca,
          modelo: res.data.modelo
        });
      } catch (err) {
        setUltimoResultado({
          resultado: 'Error',
          mensaje: '❌ Error al verificar',
          codigo
        });
      }

      // Agregar a la lista
      setCodigosEscaneados([codigo, ...codigosEscaneados]);
      setCodigoActual('');
    }
  };

  const eliminarCodigo = (codigo) => {
    setCodigosEscaneados(codigosEscaneados.filter(c => c !== codigo));
  };

  const limpiarTodo = () => {
    setCodigosEscaneados([]);
    setUltimoResultado(null);
  };

  const finalizarYConciliar = async () => {
    if (codigosEscaneados.length === 0) {
      alert('No hay códigos escaneados');
      return;
    }

    setLoading(true);
    try {
      const res = await conciliacionService.conciliarAlmacen({
        almacenId: parseInt(almacenId),
        codigosEscaneados
      });
      setResultado(res.data);
      setModoEscaneo(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Error al conciliar');
    } finally {
      setLoading(false);
    }
  };

  const getResultadoColor = (resultado) => {
    switch (resultado) {
      case 'OK': return 'bg-green-100 text-green-700 border-green-300';
      case 'NoExiste': return 'bg-red-100 text-red-700 border-red-300';
      case 'UbicacionIncorrecta': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'Duplicado': return 'bg-blue-100 text-blue-700 border-blue-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardList className="w-7 h-7 text-mn-600" />
          Inventario / Conciliación
        </h1>
        <p className="text-gray-500">Escanea los activos para verificar el inventario físico</p>
      </div>

      {!modoEscaneo && !resultado && (
        <div className="card">
          <div className="card-body space-y-4">
            <div>
              <label className="label">Seleccione el almacén a inventariar</label>
              <select
                value={almacenId}
                onChange={(e) => setAlmacenId(e.target.value)}
                className="select max-w-md"
              >
                <option value="">Seleccione...</option>
                {almacenes.map(a => (
                  <option key={a.id} value={a.id}>{a.nombre}</option>
                ))}
              </select>
            </div>

            <button
              onClick={iniciarEscaneo}
              disabled={!almacenId}
              className="btn btn-primary"
            >
              <Scan className="w-5 h-5 mr-2" />
              Iniciar Escaneo
            </button>
          </div>
        </div>
      )}

      {/* Modo Escaneo Activo */}
      {modoEscaneo && (
        <div className="card border-2 border-mn-500">
          <div className="card-header bg-mn-50 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-mn-700 flex items-center gap-2">
                <Scan className="w-5 h-5" />
                Modo Escaneo Activo
              </h3>
              <p className="text-sm text-gray-600 flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {almacenNombre}
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-mn-600">{codigosEscaneados.length}</p>
              <p className="text-xs text-gray-500">escaneados</p>
            </div>
          </div>

          <div className="card-body space-y-4">
            {/* Input de escaneo */}
            <div>
              <label className="label">Escanear código (Enter para agregar)</label>
              <input
                ref={inputRef}
                type="text"
                value={codigoActual}
                onChange={(e) => setCodigoActual(e.target.value.toUpperCase())}
                onKeyDown={handleScanInput}
                className="input text-lg font-mono text-center"
                placeholder="Escanea o escribe el código..."
                autoFocus
                autoComplete="off"
              />
            </div>

            {/* Último resultado */}
            {ultimoResultado && (
              <div className={`p-3 rounded-lg border ${getResultadoColor(ultimoResultado.resultado)}`}>
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold">{ultimoResultado.codigo}</span>
                  <span>{ultimoResultado.mensaje}</span>
                </div>
                {ultimoResultado.marca && (
                  <p className="text-sm mt-1">{ultimoResultado.marca} {ultimoResultado.modelo}</p>
                )}
              </div>
            )}

            {/* Lista de códigos escaneados */}
            {codigosEscaneados.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Códigos escaneados</span>
                  <button onClick={limpiarTodo} className="text-sm text-red-600 hover:underline flex items-center gap-1">
                    <Trash2 className="w-4 h-4" />
                    Limpiar todo
                  </button>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 max-h-48 overflow-y-auto">
                  <div className="flex flex-wrap gap-2">
                    {codigosEscaneados.map((codigo, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-white border rounded font-mono text-sm"
                      >
                        {codigo}
                        <button
                          onClick={() => eliminarCodigo(codigo)}
                          className="text-gray-400 hover:text-red-600"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Botones de acción */}
            <div className="flex gap-3 pt-4 border-t">
              <button
                onClick={finalizarYConciliar}
                disabled={codigosEscaneados.length === 0 || loading}
                className="btn btn-primary flex-1"
              >
                <Send className="w-5 h-5 mr-2" />
                {loading ? 'Procesando...' : 'Finalizar y Conciliar'}
              </button>
              <button
                onClick={() => { setModoEscaneo(false); setCodigosEscaneados([]); }}
                className="btn btn-secondary"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resultado de Conciliación */}
      {resultado && (
        <div className="space-y-4">
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold">Resultado de Conciliación - {resultado.almacenNombre}</h3>
              <p className="text-sm text-gray-500">
                {new Date(resultado.fechaConciliacion).toLocaleString('es-CO')}
              </p>
            </div>
            <div className="card-body">
              {/* Resumen */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div className="text-center p-3 bg-gray-100 rounded-lg">
                  <p className="text-2xl font-bold">{resultado.totalEsperado}</p>
                  <p className="text-xs text-gray-500">Esperados</p>
                </div>
                <div className="text-center p-3 bg-blue-100 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{resultado.totalEscaneados}</p>
                  <p className="text-xs">Escaneados</p>
                </div>
                <div className="text-center p-3 bg-green-100 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{resultado.totalEncontrados}</p>
                  <p className="text-xs">Encontrados</p>
                </div>
                <div className="text-center p-3 bg-red-100 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">{resultado.totalFaltantes}</p>
                  <p className="text-xs">Faltantes</p>
                </div>
                <div className="text-center p-3 bg-yellow-100 rounded-lg">
                  <p className="text-2xl font-bold text-yellow-600">{resultado.totalUbicacionIncorrecta}</p>
                  <p className="text-xs">Ubic. Incorrecta</p>
                </div>
              </div>

              {/* Porcentaje */}
              <div className="text-center mb-6">
                <p className="text-4xl font-bold text-mn-600">{resultado.porcentajeConciliado}%</p>
                <p className="text-gray-500">Porcentaje conciliado</p>
                <div className="w-full h-3 bg-gray-200 rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full bg-mn-500 rounded-full transition-all"
                    style={{ width: `${resultado.porcentajeConciliado}%` }}
                  />
                </div>
              </div>

              {/* Detalles */}
              <div className="space-y-4">
                {resultado.faltantes?.length > 0 && (
                  <div>
                    <h4 className="font-medium text-red-700 mb-2 flex items-center gap-2">
                      <XCircle className="w-4 h-4" />
                      Faltantes ({resultado.faltantes.length})
                    </h4>
                    <div className="bg-red-50 rounded-lg p-3 max-h-48 overflow-y-auto text-sm">
                      {resultado.faltantes.map((f, i) => (
                        <div key={i} className="flex justify-between py-1 border-b border-red-100 last:border-0">
                          <span className="font-mono">{f.codigoInterno}</span>
                          <span>{f.marca} {f.modelo}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {resultado.ubicacionIncorrecta?.length > 0 && (
                  <div>
                    <h4 className="font-medium text-yellow-700 mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Ubicación Incorrecta ({resultado.ubicacionIncorrecta.length})
                    </h4>
                    <div className="bg-yellow-50 rounded-lg p-3 max-h-48 overflow-y-auto text-sm">
                      {resultado.ubicacionIncorrecta.map((u, i) => (
                        <div key={i} className="py-1 border-b border-yellow-100 last:border-0">
                          <span className="font-mono">{u.codigoInterno}</span>
                          <span className="text-gray-600 ml-2">
                            Registrado en: <strong>{u.almacenRegistrado}</strong>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {resultado.sobrantes?.length > 0 && (
                  <div>
                    <h4 className="font-medium text-purple-700 mb-2">
                      Códigos no registrados ({resultado.sobrantes.length})
                    </h4>
                    <div className="bg-purple-50 rounded-lg p-3 max-h-32 overflow-y-auto text-sm">
                      {resultado.sobrantes.map((s, i) => (
                        <span key={i} className="inline-block mr-2 mb-1 font-mono">
                          {s.codigoEscaneado}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={() => { setResultado(null); setAlmacenId(''); }}
            className="btn btn-secondary"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Nuevo Inventario
          </button>
        </div>
      )}
    </div>
  );
}
