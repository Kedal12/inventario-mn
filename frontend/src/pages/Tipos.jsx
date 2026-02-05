import { useState, useEffect } from 'react';
import { catalogosService } from '../services/api';
import { Tags, Plus, Edit, Save, X, Search } from 'lucide-react';

export default function Tipos() {
  const [tipos, setTipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [editando, setEditando] = useState(null);
  const [nuevo, setNuevo] = useState(false);
  const [form, setForm] = useState({ nombre: '', referencia: '', descripcion: '' });

  useEffect(() => { loadTipos(); }, []);

  const loadTipos = async () => {
    try {
      const res = await catalogosService.getTipos(false);
      setTipos(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    try {
      if (editando) {
        await catalogosService.updateTipo(editando, form);
      } else {
        await catalogosService.createTipo(form);
      }
      loadTipos();
      cancelar();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  const cancelar = () => {
    setEditando(null);
    setNuevo(false);
    setForm({ nombre: '', referencia: '', descripcion: '' });
  };

  const editar = (t) => {
    setEditando(t.id);
    setForm({ nombre: t.nombre, referencia: t.referencia, descripcion: t.descripcion || '' });
  };

  const tiposFiltrados = tipos.filter(t => 
    t.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    t.referencia.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tipos de Activo</h1>
        <button onClick={() => setNuevo(true)} className="btn btn-primary"><Plus className="w-5 h-5 mr-2" />Nuevo</button>
      </div>

      {(nuevo || editando) && (
        <div className="card p-4">
          <h3 className="font-semibold mb-4">{editando ? 'Editar' : 'Nuevo'} Tipo</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input placeholder="Referencia * (ej: REF.121)" value={form.referencia} onChange={(e) => setForm({...form, referencia: e.target.value})} className="input" />
            <input placeholder="Nombre *" value={form.nombre} onChange={(e) => setForm({...form, nombre: e.target.value})} className="input" />
            <input placeholder="Descripción" value={form.descripcion} onChange={(e) => setForm({...form, descripcion: e.target.value})} className="input" />
            <div className="flex gap-2">
              <button onClick={handleSave} className="btn btn-primary"><Save className="w-4 h-4 mr-2" />Guardar</button>
              <button onClick={cancelar} className="btn btn-secondary"><X className="w-4 h-4 mr-2" />Cancelar</button>
            </div>
          </div>
        </div>
      )}

      <div className="card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input type="text" placeholder="Buscar tipo..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="input pl-10" />
        </div>
      </div>

      <div className="card">
        {loading ? <div className="p-8 text-center">Cargando...</div> : (
          <div className="overflow-x-auto max-h-[600px]">
            <table className="data-table">
              <thead className="sticky top-0 bg-gray-50"><tr><th>Ref.</th><th>Nombre</th><th>Activos</th><th></th></tr></thead>
              <tbody>
                {tiposFiltrados.map(t => (
                  <tr key={t.id}>
                    <td className="font-mono text-icg-600">{t.referencia}</td>
                    <td>{t.nombre}</td>
                    <td>{t.totalActivos}</td>
                    <td><button onClick={() => editar(t)} className="p-2 hover:bg-gray-100 rounded"><Edit className="w-4 h-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
