import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Activos from './pages/Activos';
import ActivoDetalle from './pages/ActivoDetalle';
import ActivoPublico from './pages/ActivoPublico';
import NuevoActivo from './pages/NuevoActivo';
import Traslados from './pages/Traslados';
import NuevoTraslado from './pages/NuevoTraslado';
import Almacenes from './pages/Almacenes';
import Tipos from './pages/Tipos';
import Usuarios from './pages/Usuarios';
import Reportes from './pages/Reportes';
import EditarActivo from './pages/EditarActivo';

function PrivateRoute({ children, adminOnly = false }) {
  const { isAuthenticated, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-icg-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (adminOnly && !isAdmin()) {
    return <Navigate to="/" />;
  }

  return children;
}

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Rutas públicas */}
        <Route path="/login" element={<Login />} />
        <Route path="/activo/:codigo" element={<ActivoPublico />} />

        {/* Rutas protegidas */}
        <Route path="/" element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="activos" element={<Activos />} />
          <Route path="activos/nuevo" element={
            <PrivateRoute adminOnly>
              <NuevoActivo />
            </PrivateRoute>
          } />
          <Route path="activos/:id" element={<ActivoDetalle />} />
          <Route path="traslados" element={
            <PrivateRoute adminOnly>
              <Traslados />
            </PrivateRoute>
          } />
          <Route path="traslados/nuevo" element={
            <PrivateRoute adminOnly>
              <NuevoTraslado />
            </PrivateRoute>
          } />
          <Route path="almacenes" element={
            <PrivateRoute adminOnly>
              <Almacenes />
            </PrivateRoute>
          } />
          <Route path="tipos" element={
            <PrivateRoute adminOnly>
              <Tipos />
            </PrivateRoute>
          } />
          <Route path="usuarios" element={
            <PrivateRoute adminOnly>
              <Usuarios />
            </PrivateRoute>

          } />
          <Route path="activos/editar/:id" element={
          <PrivateRoute adminOnly>
          <EditarActivo />
          </PrivateRoute>
          } />
          <Route path="reportes" element={<Reportes />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;
