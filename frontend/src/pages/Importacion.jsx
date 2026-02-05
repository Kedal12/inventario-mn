import { useState, useRef } from 'react';
import { importacionService, catalogosService } from '../services/api';
import { Upload, Download, FileSpreadsheet, FileText, CheckCircle, XCircle, AlertTriangle, Loader, Eye } from 'lucide-react';
import { useEffect } from 'react';

export default function Importacion() {
  const [archivo, setArchivo] = useState(null);
  const [almacenId, setAlmacenId] = useState('');
  const [almacenes, setAlmacenes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadAlmacenes();
  }, []);

  const loadAlmacenes = async () => {
    try {
      const res = await catalogosService.getAlmacenes();
      setAlmacenes(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const descargarPlantilla = async (formato) => {
    try {
      const response = formato === 'csv'
        ? await importacionService.descargarPlantillaCSV()
        : await importacionService.descargarPlantillaExcel();
      
      const filename = formato === 'csv' ? 'plantilla_activos.csv' : 'plantilla_activos.xlsx';
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Error al descargar plantilla');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setArchivo(file);
      setResultado(null);
    }
  };

  const importar = async () => {
    if (!archivo || !almacenId) {
      alert('Seleccione un almacén y un archivo');
      return;
    }

    setLoading(true);
    setResultado(null);

    try {
      const formData = new FormData();
      formData.append('archivo', archivo);

      const isExcel = archivo.name.endsWith('.xlsx');
      const res = isExcel
        ? await importacionService.importarExcel(almacenId, formData)
        : await importacionService.importarCSV(almacenId, formData);

      setResultado(res.data);
    } catch (err) {
      setResultado({
        exitosos: 0,
        errores: 1,
        detalleErrores: [{ fila: 0, campo: 'General', error: err.response?.data?.message || 'Error de importación' }],
        codigosCreados: []
      });
    } finally {
      setLoading(false);
    }
  };

  const limpiar = () => {
    setArchivo(null);
    setResultado(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Importación Masiva</h1>
        <p className="text-gray-500">Carga múltiples activos desde un archivo Excel o CSV</p>
      </div>

      {/* Paso 1: Descargar plantilla */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-mn-600 text-white text-sm flex items-center justify-center">1</span>
            Descargar Plantilla
          </h3>
        </div>
        <div className="card-body">
          <p className="text-gray-600 mb-4">
            Descarga la plantilla con el formato correcto. El Excel incluye la lista de tipos de activo disponibles.
          </p>
          <div className="flex gap-4">
            <button onClick={() => descargarPlantilla('excel')} className="btn btn-secondary">
              <FileSpreadsheet className="w-5 h-5 mr-2 text-green-600" />
              Excel (.xlsx)
            </button>
            <button onClick={() => descargarPlantilla('csv')} className="btn btn-secondary">
              <FileText className="w-5 h-5 mr-2" />
              CSV
            </button>
          </div>
        </div>
      </div>

      {/* Paso 2: Seleccionar almacén */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-mn-600 text-white text-sm flex items-center justify-center">2</span>
            Seleccionar Almacén/Sede
          </h3>
        </div>
        <div className="card-body">
          <p className="text-gray-600 mb-4">
            Todos los activos importados se asignarán a este almacén.
          </p>
          <select
            value={almacenId}
            onChange={(e) => setAlmacenId(e.target.value)}
            className="select max-w-md"
          >
            <option value="">Seleccione un almacén...</option>
            {almacenes.map(a => (
              <option key={a.id} value={a.id}>{a.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Paso 3: Subir archivo */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-mn-600 text-white text-sm flex items-center justify-center">3</span>
            Subir Archivo
          </h3>
        </div>
        <div className="card-body">
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-mn-500 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              {archivo ? (
                <span className="font-medium text-mn-600">{archivo.name}</span>
              ) : (
                'Haz clic o arrastra un archivo .xlsx o .csv'
              )}
            </p>
            {archivo && (
              <p className="text-sm text-gray-500 mt-2">
                Tamaño: {(archivo.size / 1024).toFixed(2)} KB
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Paso 4: Importar */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-mn-600 text-white text-sm flex items-center justify-center">4</span>
            Importar
          </h3>
        </div>
        <div className="card-body">
          <div className="flex gap-4">
            <button
              onClick={importar}
              disabled={!archivo || !almacenId || loading}
              className="btn btn-primary"
            >
              {loading ? (
                <><Loader className="w-5 h-5 mr-2 animate-spin" />Procesando...</>
              ) : (
                <><Upload className="w-5 h-5 mr-2" />Iniciar Importación</>
              )}
            </button>
            <button onClick={limpiar} className="btn btn-secondary">
              Limpiar
            </button>
          </div>

          {/* Resultado */}
          {resultado && (
            <div className="mt-6 space-y-4">
              <h4 className="font-medium">Resultado de la importación</h4>

              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg text-center">
                  <p className="text-3xl font-bold text-blue-600">{resultado.totalFilas || 0}</p>
                  <p className="text-sm text-gray-600">Total</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg text-center">
                  <p className="text-3xl font-bold text-green-600">{resultado.exitosos}</p>
                  <p className="text-sm text-gray-600">Exitosos</p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg text-center">
                  <p className="text-3xl font-bold text-red-600">{resultado.errores}</p>
                  <p className="text-sm text-gray-600">Errores</p>
                </div>
              </div>

              {resultado.codigosCreados?.length > 0 && (
                <div>
                  <h5 className="font-medium text-green-700 mb-2 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Activos creados ({resultado.codigosCreados.length})
                  </h5>
                  <div className="bg-green-50 rounded-lg p-3 max-h-40 overflow-y-auto flex flex-wrap gap-2">
                    {resultado.codigosCreados.map((c, i) => (
                      <span key={i} className="px-2 py-1 bg-green-100 text-green-700 rounded font-mono text-sm">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {resultado.detalleErrores?.length > 0 && (
                <div>
                  <h5 className="font-medium text-red-700 mb-2 flex items-center gap-2">
                    <XCircle className="w-4 h-4" />
                    Errores ({resultado.detalleErrores.length})
                  </h5>
                  <div className="bg-red-50 rounded-lg p-3 max-h-60 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left border-b border-red-200">
                          <th className="py-1">Fila</th>
                          <th>Campo</th>
                          <th>Valor</th>
                          <th>Error</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resultado.detalleErrores.map((err, i) => (
                          <tr key={i} className="border-b border-red-100">
                            <td className="py-1 font-mono">{err.fila}</td>
                            <td>{err.campo}</td>
                            <td className="font-mono text-gray-600">{err.valor || '-'}</td>
                            <td className="text-red-600">{err.error}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tips */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <h4 className="font-medium text-orange-800 mb-2 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Consejos para la importación
        </h4>
        <ul className="text-sm text-orange-700 space-y-1 list-disc list-inside">
          <li>Use los códigos de tipo de activo: REF.1, REF.2, etc. o el ID numérico</li>
          <li>Los campos <strong>Marca</strong> y <strong>Modelo</strong> son obligatorios</li>
          <li>El código del activo (MN-XXX-XXXXX) se genera automáticamente</li>
          <li>Todos los activos quedarán con estado "Disponible"</li>
          <li>Después de importar, imprima las etiquetas desde la lista de activos</li>
        </ul>
      </div>
    </div>
  );
}
