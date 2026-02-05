import { useState, useEffect } from 'react';
import { usuariosService, catalogosService } from '../services/api';
import { Users, Plus, Edit, Trash2, Key, Save, X } from 'lucide-react';

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [almacenes, setAlmacenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(null);
  const [nuevo, setNuevo] = useState(false);
  const [form, setForm] = useState({ nombreUsuario: '', nombreCompleto: '', password: '', rol: 'Consultor', almacenesAsignados: [] });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [usersRes, almRes] = await Promise.all([usuariosService.getAll(), catalogosService.getAlmacenes()]);
      setUsuarios(usersRes.data);
      setAlmacenes(almRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    try {
      if (editando) {
        await usuariosService.update(editando, { nombreCompleto: form.nombreCompleto, rol: form.rol, almacenesAsignados: form.almacenesAsignados });
      } else {
        await usuariosService.create(form);
      }
      loadData();
      cancelar();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este usuario?')) return;
    try {
      await usuariosService.delete(id);
      loadData();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  const handleResetPassword = async (id) => {
    const newPass = prompt('Nueva contraseña:');
    if (!newPass) return;
    try {
      await usuariosService.resetPassword(id, newPass);
      alert('Contraseña actualizada');
    } catch (err) { alert('Error'); }
  };

  const cancelar = () => {
    setEditando(null);
    setNuevo(false);
    setForm({ nombreUsuario: '', nombreCompleto: '', password: '', rol: 'Consultor', almacenesAsignados: [] });
  };

  const editar = (u) => {
    setEditando(u.id);
    setForm({ nombreUsuario: u.nombreUsuario, nombreCompleto: u.nombreCompleto, password: '', rol: u.rol, almacenesAsignados: u.almacenesAsignados || [] });
  };

  const toggleAlmacen = (id) => {
    setForm(f => ({
      ...f,
      almacenesAsignados: f.almacenesAsignados.includes(id) 
        ? f.almacenesAsignados.filter(a => a !== id)
        : [...f.almacenesAsignados, id]
    }));
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Usuarios</h1>
        <button onClick={() => setNuevo(true)} className="btn btn-primary"><Plus className="w-5 h-5 mr-2" />Nuevo</button>
      </div>

      {(nuevo || editando) && (
        <div className="card p-4">
          <h3 className="font-semibold mb-4">{editando ? 'Editar' : 'Nuevo'} Usuario</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input placeholder="Nombre de usuario *" value={form.nombreUsuario} onChange={(e) => setForm({...form, nombreUsuario: e.target.value})} className="input" disabled={!!editando} />
            <input placeholder="Nombre completo *" value={form.nombreCompleto} onChange={(e) => setForm({...form, nombreCompleto: e.target.value})} className="input" />
            {!editando && <input type="password" placeholder="Contraseña *" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} className="input" />}
            <select value={form.rol} onChange={(e) => setForm({...form, rol: e.target.value})} className="select">
              <option value="Administrador">Administrador</option>
              <option value="Consultor">Consultor</option>
            </select>
            {form.rol === 'Consultor' && (
              <div className="md:col-span-2">
                <label className="label">Almacenes asignados (click para seleccionar)</label>
                <div className="flex flex-wrap gap-2 p-3 border rounded-lg max-h-32 overflow-y-auto">
                  {almacenes.map(a => (
                    <button key={a.id} type="button" onClick={() => toggleAlmacen(a.id)} 
                      className={`px-3 py-1 rounded-full text-sm ${form.almacenesAsignados.includes(a.id) ? 'bg-icg-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
                      {a.nombre}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2 md:col-span-2">
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
              <thead><tr><th>Usuario</th><th>Nombre</th><th>Rol</th><th>Último acceso</th><th>Estado</th><th></th></tr></thead>
              <tbody>
                {usuarios.map(u => (
                  <tr key={u.id}>
                    <td className="font-mono">{u.nombreUsuario}</td>
                    <td className="font-medium">{u.nombreCompleto}</td>
                    <td><span className={`badge ${u.rol === 'Administrador' ? 'badge-info' : 'badge-neutral'}`}>{u.rol}</span></td>
                    <td>{u.ultimoAcceso ? new Date(u.ultimoAcceso).toLocaleString('es-CO') : 'Nunca'}</td>
                    <td><span className={`badge ${u.activo ? 'badge-success' : 'badge-danger'}`}>{u.activo ? 'Activo' : 'Inactivo'}</span></td>
                    <td>
                      <div className="flex gap-1">
                        <button onClick={() => editar(u)} className="p-2 hover:bg-gray-100 rounded" title="Editar"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => handleResetPassword(u.id)} className="p-2 hover:bg-gray-100 rounded" title="Resetear contraseña"><Key className="w-4 h-4" /></button>
                        {u.nombreUsuario !== 'admin' && <button onClick={() => handleDelete(u.id)} className="p-2 hover:bg-red-100 rounded text-red-600" title="Eliminar"><Trash2 className="w-4 h-4" /></button>}
                      </div>
                    </td>
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
