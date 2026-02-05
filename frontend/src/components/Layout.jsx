import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  LayoutDashboard,
  Package,
  ArrowRightLeft,
  Upload,
  ClipboardList,
  FileSpreadsheet,
  Building2,
  Tags,
  Users,
  FileBarChart,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Wrench
} from 'lucide-react';

export default function Layout() {
  const { usuario, logout, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detectar tamaño de pantalla
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setSidebarOpen(false);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Cerrar sidebar al cambiar de ruta en móvil
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [location.pathname, isMobile]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard', adminOnly: false },
    { to: '/activos', icon: Package, label: 'Activos', adminOnly: false },
    { to: '/mantenimientos', icon: Wrench, label: 'Mantenimientos', adminOnly: true },
    { to: '/traslados', icon: ArrowRightLeft, label: 'Traslados', adminOnly: true },
    { to: '/importacion', icon: Upload, label: 'Importación', adminOnly: true },
    { to: '/inventario', icon: ClipboardList, label: 'Inventario', adminOnly: true },
    { to: '/escaneo-excel', icon: FileSpreadsheet, label: 'Escaneo a Excel', adminOnly: true },
    { to: '/almacenes', icon: Building2, label: 'Almacenes', adminOnly: true },
    { to: '/tipos', icon: Tags, label: 'Tipos de Activo', adminOnly: true },
    { to: '/usuarios', icon: Users, label: 'Usuarios', adminOnly: true },
    { to: '/reportes', icon: FileBarChart, label: 'Reportes', adminOnly: false },
  ];

  const filteredMenu = menuItems.filter(item => !item.adminOnly || isAdmin());

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Botón hamburguesa móvil */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-3 left-3 z-50 p-2 bg-mn-600 text-white rounded-lg shadow-lg md:hidden"
        aria-label="Toggle menu"
      >
        {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Overlay móvil */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 bottom-0 w-64 z-40
          bg-gradient-to-b from-blue-700 to-blue-900 text-white
          transform transition-transform duration-300 ease-in-out
          overflow-y-auto
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0
        `}
      >
        {/* Logo */}
        <div className="p-4 border-b border-white/10">
          <h1 className="text-xl font-bold text-white">Inventario TI</h1>
          <p className="text-xs text-blue-200">La Media Naranja</p>
        </div>

        {/* Navegación */}
        <nav className="py-4 flex-1">
          {filteredMenu.map((item) => {
            const isActive = location.pathname === item.to || 
              (item.to !== '/' && location.pathname.startsWith(item.to));
            
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`
                  flex items-center gap-3 px-4 py-3 mx-2 rounded-lg
                  transition-all duration-200
                  ${isActive 
                    ? 'bg-white/20 text-white font-medium' 
                    : 'text-blue-100 hover:bg-white/10 hover:text-white'
                  }
                `}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Usuario y logout */}
        <div className="p-4 border-t border-white/10 mt-auto">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-lg font-bold text-white">
              {usuario?.nombreCompleto?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{usuario?.nombreCompleto}</p>
              <p className="text-xs text-blue-200">{usuario?.rol}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors text-sm text-white"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* Contenido principal */}
      <main className="md:ml-64 min-h-screen">
        <div className="p-4 md:p-6 pt-16 md:pt-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
