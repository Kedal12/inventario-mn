import { useState, useEffect, useRef } from 'react';
import { activosService, catalogosService } from '../services/api';
import * as XLSX from 'xlsx';
import {
  Scan,
  Download,
  Trash2,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Package,
  MapPin,
  Clock,
  RotateCcw
} from 'lucide-react';

export default function EscaneoExcel() {
  const [almacenes, setAlmacenes] = useState([]);
  const [almacenId, setAlmacenId] = useState('');
  const [almacenNombre, setAlmacenNombre] = useState('');
  
  // Lista de activos escaneados
  const [activos, setActivos] = useState([]);
  const [codigoActual, setCodigoActual] = useState('');
  const [ultimoResultado, setUltimoResultado] = useState(null);
  const [modoActivo, setModoActivo] = useState(false);
  
  const inputRef = useRef(null);

  useEffect(() => {
    loadAlmacenes();
  }, []);

  useEffect(() => {
    if (modoActivo && inputRef.current) {
      inputRef.current.focus();
    }
  }, [modoActivo, activos]);

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
    setModoActivo(true);
    setActivos([]);
    setUltimoResultado(null);
  };

  // Función para extraer el código del texto escaneado
  const extraerCodigo = (texto) => {
    const textoLimpio = texto.trim();
    
    // Si es una URL, extraer el código del final
    // Ejemplo: http://10.15.0.221:3000/activo/MN-057-00001 → MN-057-00001
    if (textoLimpio.includes('/activo/')) {
      const partes = textoLimpio.split('/activo/');
      if (partes.length > 1) {
        return partes[1].toUpperCase().trim();
      }
    }
    
    // Si contiene http, intentar extraer el código MN-XXX-XXXXX
    if (textoLimpio.toLowerCase().includes('http')) {
      const match = textoLimpio.match(/MN-\d{3}-\d{5}/i);
      if (match) {
        return match[0].toUpperCase();
      }
    }
    
    // Si ya es un código directo (MN-XXX-XXXXX o ICG-XXX-XXXXX)
    return textoLimpio.toUpperCase().replace('ICG-', 'MN-');
  };

  const handleScan = async (e) => {
    if (e.key === 'Enter' && codigoActual.trim()) {
      // Extraer el código del texto escaneado
      const codigo = extraerCodigo(codigoActual);
      setCodigoActual('');

      // Validar formato básico
      if (!codigo.match(/^MN-\d{3}-\d{5}$/)) {
        setUltimoResultado({
          tipo: 'error',
          codigo: codigo,
          mensaje: '❌ Formato inválido'
        });
        return;
      }

      // Verificar si ya está escaneado
      if (activos.some(a => a.codigo === codigo)) {
        setUltimoResultado({
          tipo: 'duplicado',
          codigo,
          mensaje: '⚠️ Ya escaneado'
        });
        return;
      }

      // Buscar información del activo en el servidor
      try {
        const res = await activosService.getPublico(codigo);
        const data = res.data;

        const nuevoActivo = {
          codigo: codigo,
          marca: data.marca,
          modelo: data.modelo,
          tipo: data.tipoActivo,
          almacenRegistrado: data.almacen,
          estado: data.estado,
          fechaEscaneo: new Date().toLocaleString('es-CO'),
          encontrado: true,
          ubicacionCorrecta: data.almacen === almacenNombre
        };

        setActivos([nuevoActivo, ...activos]);
        setUltimoResultado({
          tipo: nuevoActivo.ubicacionCorrecta ? 'ok' : 'ubicacion',
          codigo,
          mensaje: nuevoActivo.ubicacionCorrecta 
            ? `✅ ${data.marca} ${data.modelo}` 
            : `⚠️ Registrado en: ${data.almacen}`,
          activo: nuevoActivo
        });
      } catch (err) {
        // Activo no encontrado en el sistema
        const nuevoActivo = {
          codigo: codigo,
          marca: 'NO ENCONTRADO',
          modelo: '-',
          tipo: '-',
          almacenRegistrado: '-',
          estado: '-',
          fechaEscaneo: new Date().toLocaleString('es-CO'),
          encontrado: false,
          ubicacionCorrecta: false
        };

        setActivos([nuevoActivo, ...activos]);
        setUltimoResultado({
          tipo: 'error',
          codigo,
          mensaje: '❌ No existe en el sistema'
        });
      }
    }
  };

  const eliminarActivo = (codigo) => {
    setActivos(activos.filter(a => a.codigo !== codigo));
  };

  const limpiarTodo = () => {
    if (confirm('¿Eliminar todos los activos escaneados?')) {
      setActivos([]);
      setUltimoResultado(null);
    }
  };

  const descargarExcel = () => {
    if (activos.length === 0) {
      alert('No hay activos para exportar');
      return;
    }

    // Preparar datos para Excel
    const datosExcel = activos.map(a => ({
      'Código': a.codigo,
      'Marca': a.marca,
      'Modelo': a.modelo,
      'Tipo': a.tipo,
      'Almacén Registrado': a.almacenRegistrado,
      'Estado': a.estado,
      'Fecha Escaneo': a.fechaEscaneo,
      'Encontrado': a.encontrado ? 'SÍ' : 'NO',
      'Ubicación Correcta': a.ubicacionCorrecta ? 'SÍ' : 'NO'
    }));

    // Crear hoja de trabajo
    const ws = XLSX.utils.json_to_sheet(datosExcel);

    // Ajustar anchos de columna
    ws['!cols'] = [
      { wch: 18 },  // Código
      { wch: 15 },  // Marca
      { wch: 20 },  // Modelo
      { wch: 25 },  // Tipo
      { wch: 20 },  // Almacén Registrado
      { wch: 12 },  // Estado
      { wch: 18 },  // Fecha Escaneo
      { wch: 12 },  // Encontrado
      { wch: 18 }   // Ubicación Correcta
    ];

    // Crear libro de trabajo
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventario');

    // Agregar hoja de resumen
    const resumen = [
      { 'Concepto': 'Almacén Inventariado', 'Valor': almacenNombre },
      { 'Concepto': 'Fecha de Inventario', 'Valor': new Date().toLocaleDateString('es-CO') },
      { 'Concepto': 'Total Escaneados', 'Valor': stats.total },
      { 'Concepto': 'Encontrados OK', 'Valor': stats.ubicacionCorrecta },
      { 'Concepto': 'Ubicación Incorrecta', 'Valor': stats.ubicacionIncorrecta },
      { 'Concepto': 'No Encontrados', 'Valor': stats.noEncontrados },
    ];
    const wsResumen = XLSX.utils.json_to_sheet(resumen);
    wsResumen['!cols'] = [{ wch: 25 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

    // Generar archivo y descargar
    const fecha = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Inventario_${almacenNombre.replace(/\s+/g, '_')}_${fecha}.xlsx`);
  };

  const getEstadisticas = () => {
    const total = activos.length;
    const encontrados = activos.filter(a => a.encontrado).length;
    const noEncontrados = activos.filter(a => !a.encontrado).length;
    const ubicacionCorrecta = activos.filter(a => a.encontrado && a.ubicacionCorrecta).length;
    const ubicacionIncorrecta = activos.filter(a => a.encontrado && !a.ubicacionCorrecta).length;

    return { total, encontrados, noEncontrados, ubicacionCorrecta, ubicacionIncorrecta };
  };

  const stats = getEstadisticas();

  const getResultadoStyle = (tipo) => {
    switch (tipo) {
      case 'ok': return 'bg-green-100 border-green-400 text-green-800';
      case 'ubicacion': return 'bg-yellow-100 border-yellow-400 text-yellow-800';
      case 'error': return 'bg-red-100 border-red-400 text-red-800';
      case 'duplicado': return 'bg-blue-100 border-blue-400 text-blue-800';
      default: return 'bg-gray-100 border-gray-400 text-gray-800';
    }
  };

  const getRowStyle = (activo) => {
    if (!activo.encontrado) return 'bg-red-50';
    if (!activo.ubicacionCorrecta) return 'bg-yellow-50';
    return '';
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileSpreadsheet className="w-7 h-7 text-mn-600" />
          Escaneo a Excel
        </h1>
        <p className="text-gray-500">Escanea activos y descarga el inventario en Excel</p>
      </div>

      {/* Selección inicial */}
      {!modoActivo && (
        <div className="card">
          <div className="card-body space-y-4">
            <div>
              <label className="label">Seleccione el almacén donde está haciendo inventario</label>
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

            <div className="mt-4 p-4 bg-blue-50 rounded-lg text-sm text-blue-800">
              <p className="font-medium mb-2">¿Cómo funciona?</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Selecciona el almacén donde estás</li>
                <li>Escanea los códigos QR de los activos</li>
                <li>El sistema verifica cada uno en tiempo real</li>
                <li>Al terminar, descarga el Excel con el resultado</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Modo escaneo activo */}
      {modoActivo && (
        <>
          {/* Header con estadísticas */}
          <div className="card border-2 border-mn-500">
            <div className="card-header bg-mn-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-mn-700 flex items-center gap-2">
                    <Scan className="w-5 h-5" />
                    Escaneando en: {almacenNombre}
                  </h3>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3" />
                    {new Date().toLocaleDateString('es-CO')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-4xl font-bold text-mn-600">{stats.total}</p>
                  <p className="text-xs text-gray-500">escaneados</p>
                </div>
              </div>
            </div>

            <div className="card-body space-y-4">
              {/* Input de escaneo */}
              <div>
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={codigoActual}
                    onChange={(e) => setCodigoActual(e.target.value.toUpperCase())}
                    onKeyDown={handleScan}
                    className="input text-xl font-mono text-center py-4 flex-1"
                    placeholder="📷 Escanea o escribe..."
                    autoFocus
                    autoComplete="off"
                  />
                  <button
                    onClick={() => {
                      if (codigoActual.trim()) {
                        handleScan({ key: 'Enter' });
                      }
                    }}
                    disabled={!codigoActual.trim()}
                    className="btn btn-primary px-6 text-2xl font-bold"
                  >
                    +
                  </button>
                </div>
                <p className="text-xs text-gray-500 text-center mt-2">
                  Escribe el código y presiona <strong>+</strong> o <strong>Enter ↵</strong>
                </p>
              </div>

              {/* Último resultado */}
              {ultimoResultado && (
                <div className={`p-3 rounded-lg border-2 ${getResultadoStyle(ultimoResultado.tipo)}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-lg">{ultimoResultado.codigo}</span>
                    <span className="font-medium">{ultimoResultado.mensaje}</span>
                  </div>
                </div>
              )}

              {/* Estadísticas rápidas */}
              <div className="grid grid-cols-4 gap-2 text-center text-sm">
                <div className="p-2 bg-green-100 rounded">
                  <p className="font-bold text-green-700">{stats.ubicacionCorrecta}</p>
                  <p className="text-xs text-green-600">OK</p>
                </div>
                <div className="p-2 bg-yellow-100 rounded">
                  <p className="font-bold text-yellow-700">{stats.ubicacionIncorrecta}</p>
                  <p className="text-xs text-yellow-600">Otro almacén</p>
                </div>
                <div className="p-2 bg-red-100 rounded">
                  <p className="font-bold text-red-700">{stats.noEncontrados}</p>
                  <p className="text-xs text-red-600">No existe</p>
                </div>
                <div className="p-2 bg-blue-100 rounded">
                  <p className="font-bold text-blue-700">{stats.total}</p>
                  <p className="text-xs text-blue-600">Total</p>
                </div>
              </div>
            </div>
          </div>

          {/* Lista de activos escaneados */}
          {activos.length > 0 && (
            <div className="card">
              <div className="card-header flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Activos escaneados ({activos.length})
                </h3>
                <button
                  onClick={limpiarTodo}
                  className="text-sm text-red-600 hover:underline flex items-center gap-1"
                >
                  <Trash2 className="w-4 h-4" />
                  Limpiar todo
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-3">Código</th>
                      <th className="text-left p-3">Marca/Modelo</th>
                      <th className="text-left p-3">Tipo</th>
                      <th className="text-left p-3">Almacén Reg.</th>
                      <th className="text-left p-3">Estado</th>
                      <th className="text-center p-3">Resultado</th>
                      <th className="p-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {activos.map((activo, idx) => (
                      <tr key={idx} className={`border-t ${getRowStyle(activo)}`}>
                        <td className="p-3 font-mono font-medium">{activo.codigo}</td>
                        <td className="p-3">{activo.marca} {activo.modelo}</td>
                        <td className="p-3 text-gray-600">{activo.tipo}</td>
                        <td className="p-3">{activo.almacenRegistrado}</td>
                        <td className="p-3">{activo.estado}</td>
                        <td className="p-3 text-center">
                          {!activo.encontrado ? (
                            <span className="inline-flex items-center gap-1 text-red-600">
                              <XCircle className="w-4 h-4" /> No existe
                            </span>
                          ) : activo.ubicacionCorrecta ? (
                            <span className="inline-flex items-center gap-1 text-green-600">
                              <CheckCircle className="w-4 h-4" /> OK
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-yellow-600">
                              <AlertTriangle className="w-4 h-4" /> Otro almacén
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => eliminarActivo(activo.codigo)}
                            className="text-gray-400 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex gap-4">
            <button
              onClick={descargarExcel}
              disabled={activos.length === 0}
              className="btn btn-primary flex-1"
            >
              <Download className="w-5 h-5 mr-2" />
              Descargar Excel ({activos.length} activos)
            </button>
            <button
              onClick={() => {
                if (activos.length === 0 || confirm('¿Salir sin descargar? Se perderán los datos.')) {
                  setModoActivo(false);
                  setActivos([]);
                  setAlmacenId('');
                }
              }}
              className="btn btn-secondary"
            >
              <RotateCcw className="w-5 h-5 mr-2" />
              Nuevo
            </button>
          </div>
        </>
      )}
    </div>
  );
}
