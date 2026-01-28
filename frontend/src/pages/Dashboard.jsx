import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { reportesService } from '../services/api';
import {
  Package,
  CheckCircle,
  UserCheck,
  Wrench,
  XCircle,
  ArrowRightLeft,
  TrendingUp,
  Building2
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
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await reportesService.getDashboard();
      setStats(response.data);
    } catch (error) {
      console.error('Error cargando dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-icg-600"></div>
      </div>
    );
  }

  const statsCards = [
    { label: 'Total Activos', value: stats?.totalActivos || 0, icon: Package, color: 'bg-blue-500' },
    { label: 'Disponibles', value: stats?.activosDisponibles || 0, icon: CheckCircle, color: 'bg-green-500' },
    { label: 'Asignados', value: stats?.activosAsignados || 0, icon: UserCheck, color: 'bg-indigo-500' },
    { label: 'En Mantenimiento', value: stats?.activosMantenimiento || 0, icon: Wrench, color: 'bg-yellow-500' },
    { label: 'Dados de Baja', value: stats?.activosBaja || 0, icon: XCircle, color: 'bg-gray-500' },
    { label: 'Traslados (Mes)', value: stats?.trasladosEsteMes || 0, icon: ArrowRightLeft, color: 'bg-purple-500' }
  ];

  const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#6B7280'];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Resumen del inventario de activos TI</p>
        </div>
        <Link to="/activos/nuevo" className="btn btn-primary">
          + Nuevo Activo
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statsCards.map((stat, index) => (
          <div key={index} className="stat-card">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="stat-value">{stat.value}</p>
                <p className="stat-label">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activos por Sede */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-icg-600" />
              Activos por Sede (Top 10)
            </h3>
          </div>
          <div className="card-body">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stats?.activosPorSede?.slice(0, 10) || []}
                  layout="vertical"
                  margin={{ left: 20, right: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" />
                  <YAxis dataKey="sede" type="category" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="cantidad" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Activos por Estado */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-icg-600" />
              Distribución por Estado
            </h3>
          </div>
          <div className="card-body">
            <div className="h-80 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats?.activosPorEstado || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="cantidad"
                    nameKey="estado"
                    label={({ estado, cantidad }) => `${estado}: ${cantidad}`}
                  >
                    {stats?.activosPorEstado?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Últimos Traslados */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-icg-600" />
            Últimos Traslados
          </h3>
          <Link to="/traslados" className="text-icg-600 hover:text-icg-700 text-sm font-medium">
            Ver todos →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Número</th>
                <th>Activo</th>
                <th>Origen</th>
                <th>Destino</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {stats?.ultimosTraslados?.length > 0 ? (
                stats.ultimosTraslados.map((traslado, index) => (
                  <tr key={index}>
                    <td className="font-mono text-icg-600">{traslado.numeroTraslado}</td>
                    <td>{traslado.activo}</td>
                    <td>{traslado.origen}</td>
                    <td>{traslado.destino}</td>
                    <td>{new Date(traslado.fecha).toLocaleDateString('es-CO')}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center text-gray-500 py-8">
                    No hay traslados recientes
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Tipos de Activo */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900">Top 10 Tipos de Activo</h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {stats?.activosPorTipo?.slice(0, 10).map((tipo, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-icg-600">{tipo.cantidad}</p>
                <p className="text-sm text-gray-600 truncate" title={tipo.tipo}>{tipo.tipo}</p>
                <p className="text-xs text-gray-400">{tipo.referencia}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
