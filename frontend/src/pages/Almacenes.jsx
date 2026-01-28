// Almacenes.jsx
import { useState, useEffect } from 'react';
import { catalogosService } from '../services/api';
import { Building2, Plus, Edit, Save, X } from 'lucide-react';

export default function Almacenes() {
  const [almacenes, setAlmacenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(null);
  const [nuevo, setNuevo] = useState(false);
  const [form, setForm] = useState({ nombre: '', codigo: '', direccion: '', telefono: '', responsable: '' });

  useEffect(() => { loadAlmacenes(); }, []);

  const loadAlmacenes = async () => {
    try {
      const res = await catalogosService.getAlmacenes(false);
      setAlmacenes(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    try {
      if (editando) {
        await catalogosService.updateAlmacen(editando, form);
      } else {
        await catalogosService.createAlmacen(form);
      }
      loadAlmacenes();
      cancelar();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  const cancelar = () => {
    setEditando(null);
    setNuevo(false);
    setForm({ nombre: '', codigo: '', direccion: '', telefono: '', responsable: '' });
  };

  const editar = (a) => {
    setEditando(a.id);
    setForm({ nombre: a.nombre, codigo: a.codigo, direccion: a.direccion || '', telefono: a.telefono || '', responsable: a.responsable || '' });
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Almacenes / Sedes</h1>
        <button onClick={() => setNuevo(true)} className="btn btn-primary"><Plus className="w-5 h-5 mr-2" />Nuevo</button>
      </div>

      {(nuevo || editando) && (
        <div className="card p-4">
          <h3 className="font-semibold mb-4">{editando ? 'Editar' : 'Nuevo'} Almacén</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input placeholder="Nombre *" value={form.nombre} onChange={(e) => setForm({...form, nombre: e.target.value})} className="input" />
            <input placeholder="Código *" value={form.codigo} onChange={(e) => setForm({...form, codigo: e.target.value})} className="input" />
            <input placeholder="Responsable" value={form.responsable} onChange={(e) => setForm({...form, responsable: e.target.value})} className="input" />
            <input placeholder="Dirección" value={form.direccion} onChange={(e) => setForm({...form, direccion: e.target.value})} className="input" />
            <input placeholder="Teléfono" value={form.telefono} onChange={(e) => setForm({...form, telefono: e.target.value})} className="input" />
            <div className="flex gap-2">
              <button onClick={handleSave} className="btn btn-primary"><Save className="w-4 h-4 mr-2" />Guardar</button>
              <button onClick={cancelar} className="btn btn-secondary"><X className="w-4 h-4 mr-2" />Cancelar</button>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        {loading ? <div className="p-8 text-center">Cargando...</div> : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Código</th><th>Nombre</th><th>Responsable</th><th>Activos</th><th>Estado</th><th></th></tr></thead>
              <tbody>
                {almacenes.map(a => (
                  <tr key={a.id}>
                    <td className="font-mono">{a.codigo}</td>
                    <td className="font-medium">{a.nombre}</td>
                    <td>{a.responsable || '-'}</td>
                    <td>{a.totalActivos}</td>
                    <td><span className={`badge ${a.activo ? 'badge-success' : 'badge-neutral'}`}>{a.activo ? 'Activo' : 'Inactivo'}</span></td>
                    <td><button onClick={() => editar(a)} className="p-2 hover:bg-gray-100 rounded"><Edit className="w-4 h-4" /></button></td>
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
