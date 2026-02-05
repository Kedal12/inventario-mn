import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { reportesService } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import {
  Package,
  CheckCircle,
  UserCheck,
  Wrench,
  XCircle,
  ArrowRightLeft,
  TrendingUp,
  Building2,
  AlertCircle,
  Plus
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export default function Dashboard() {
  const { isAdmin } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setError(null);
      const response = await reportesService.getDashboard();
      setStats(response.data);
    } catch (err) {
      console.error('Error cargando dashboard:', err);
      setError('No se pudieron cargar las estadísticas');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-mn-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center px-4">
        <AlertCircle className="w-16 h-16 text-red-400 mb-4" />
        <p className="text-gray-600 mb-4">{error}</p>
        <button onClick={loadStats} className="btn btn-primary">
          Reintentar
        </button>
      </div>
    );
  }

  const statsCards = [
    { label: 'Total Activos', value: stats?.totalActivos || 0, icon: Package, color: 'bg-blue-500' },
    { label: 'Disponibles', value: stats?.activosDisponibles || 0, icon: CheckCircle, color: 'bg-green-500' },
    { label: 'Asignados', value: stats?.activosAsignados || 0, icon: UserCheck, color: 'bg-orange-500' },
    { label: 'En Mantenimiento', value: stats?.activosMantenimiento || 0, icon: Wrench, color: 'bg-yellow-500' },
    { label: 'Dados de Baja', value: stats?.activosBaja || 0, icon: XCircle, color: 'bg-gray-500' },
    { label: 'Traslados (Mes)', value: stats?.trasladosEsteMes || 0, icon: ArrowRightLeft, color: 'bg-purple-500' }
  ];

  const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#6B7280'];

  return (
    <div className="space-y-4 md:space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm md:text-base mt-1">Resumen del inventario de activos TI</p>
        </div>
        {isAdmin() && (
          <Link to="/activos/nuevo" className="btn btn-primary w-full sm:w-auto">
            <Plus className="w-5 h-5 mr-2" />
            Nuevo Activo
          </Link>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
        {statsCards.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl p-3 md:p-4 shadow-sm">
            <div className="flex items-center gap-2 md:gap-3">
              <div className={`w-10 h-10 md:w-12 md:h-12 ${stat.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                <stat.icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-lg md:text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs md:text-sm text-gray-500 truncate">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Activos por Sede */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-base md:text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-mn-600" />
              Activos por Sede
            </h3>
          </div>
          <div className="p-4">
            {stats?.activosPorSede?.length > 0 ? (
              <div className="h-64 md:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.activosPorSede} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" fontSize={12} />
                    <YAxis dataKey="sede" type="category" width={80} tick={{ fontSize: 10 }}
                      tickFormatter={(v) => v.length > 12 ? v.substring(0, 12) + '...' : v} />
                    <Tooltip />
                    <Bar dataKey="cantidad" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-400">Sin datos</div>
            )}
          </div>
        </div>

        {/* Distribución por Estado */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-base md:text-lg font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-mn-600" />
              Distribución por Estado
            </h3>
          </div>
          <div className="p-4">
            {stats?.activosPorEstado?.length > 0 ? (
              <div className="h-64 md:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stats.activosPorEstado} cx="50%" cy="50%" innerRadius={40} outerRadius={80}
                      paddingAngle={2} dataKey="cantidad" nameKey="estado"
                      label={({ estado, cantidad }) => `${estado}: ${cantidad}`} labelLine={false}>
                      {stats.activosPorEstado.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-400">Sin datos</div>
            )}
          </div>
        </div>
      </div>

      {/* Últimos Traslados */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-base md:text-lg font-semibold text-gray-900 flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-mn-600" />
            Últimos Traslados
          </h3>
          {isAdmin() && (
            <Link to="/traslados" className="text-mn-600 hover:text-mn-700 text-sm font-medium hidden sm:block">
              Ver todos →
            </Link>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3 text-xs font-semibold text-gray-600">Número</th>
                <th className="text-left p-3 text-xs font-semibold text-gray-600">Activo</th>
                <th className="text-left p-3 text-xs font-semibold text-gray-600 hidden sm:table-cell">Origen</th>
                <th className="text-left p-3 text-xs font-semibold text-gray-600 hidden sm:table-cell">Destino</th>
                <th className="text-left p-3 text-xs font-semibold text-gray-600">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {stats?.ultimosTraslados?.length > 0 ? (
                stats.ultimosTraslados.map((t, i) => (
                  <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="p-3 font-mono text-mn-600 text-xs">{t.numeroTraslado}</td>
                    <td className="p-3 text-xs truncate max-w-[120px]">{t.activo}</td>
                    <td className="p-3 text-xs hidden sm:table-cell">{t.origen}</td>
                    <td className="p-3 text-xs hidden sm:table-cell">{t.destino}</td>
                    <td className="p-3 text-xs">{new Date(t.fecha).toLocaleDateString('es-CO')}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="5" className="text-center text-gray-500 py-8">No hay traslados recientes</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Tipos */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-base md:text-lg font-semibold text-gray-900">Top 10 Tipos de Activo</h3>
        </div>
        <div className="p-4">
          {stats?.activosPorTipo?.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {stats.activosPorTipo.slice(0, 10).map((tipo, i) => (
                <div key={i} className="p-3 bg-gray-50 rounded-lg text-center">
                  <p className="text-xl font-bold text-mn-600">{tipo.cantidad}</p>
                  <p className="text-xs text-gray-600 truncate">{tipo.tipo}</p>
                  <p className="text-xs text-gray-400">{tipo.referencia}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-400 py-8">Sin datos</div>
          )}
        </div>
      </div>
    </div>
  );
}
