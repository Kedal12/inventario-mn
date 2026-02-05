namespace InventarioTI.API.DTOs;

// ==================== AUTENTICACIÓN ====================
public record LoginRequest(string NombreUsuario, string Password);
public record LoginResponse(string Token, UsuarioDto Usuario, DateTime Expiration);
public record CambiarPasswordRequest(string PasswordActual, string PasswordNuevo);

// ==================== USUARIOS ====================
public record UsuarioDto(
    int Id,
    string NombreUsuario,
    string NombreCompleto,
    string Rol,
    bool Activo,
    DateTime FechaCreacion,
    DateTime? UltimoAcceso,
    List<int>? AlmacenesAsignados
);

public record CrearUsuarioRequest(
    string NombreUsuario,
    string NombreCompleto,
    string Password,
    string Rol,
    List<int>? AlmacenesAsignados
);

public record ActualizarUsuarioRequest(
    string? NombreCompleto,
    string? Rol,
    bool? Activo,
    List<int>? AlmacenesAsignados
);

// ==================== ALMACENES ====================
public record AlmacenDto(
    int Id,
    string Nombre,
    string Codigo,
    string? Direccion,
    string? Telefono,
    string? Responsable,
    bool Activo,
    int TotalActivos
);

public record CrearAlmacenRequest(
    string Nombre,
    string Codigo,
    string? Direccion,
    string? Telefono,
    string? Responsable
);

public record ActualizarAlmacenRequest(
    string? Nombre,
    string? Codigo,
    string? Direccion,
    string? Telefono,
    string? Responsable,
    bool? Activo
);

// ==================== TIPOS DE ACTIVO ====================
public record TipoActivoDto(
    int Id,
    string Nombre,
    string Referencia,
    string? Descripcion,
    bool Activo,
    int TotalActivos
);

public record CrearTipoActivoRequest(
    string Nombre,
    string Referencia,
    string? Descripcion
);

// ==================== ESTADOS ====================
public record EstadoActivoDto(
    int Id,
    string Nombre,
    string Color,
    string? Descripcion,
    int Orden,
    int TotalActivos
);

public record CrearEstadoRequest(
    string Nombre,
    string Color,
    string? Descripcion,
    int Orden
);

// ==================== ACTIVOS ====================
public record ActivoDto(
    int Id,
    string CodigoInterno,
    string? SerialFabricante,
    string Marca,
    string Modelo,
    string? Descripcion,
    int TipoActivoId,
    string TipoActivoNombre,
    string TipoActivoReferencia,
    int AlmacenId,
    string AlmacenNombre,
    string AlmacenCodigo,
    int EstadoId,
    string EstadoNombre,
    string EstadoColor,
    DateTime FechaIngreso,
    DateTime? FechaUltimoInventario,
    DateTime? FechaBaja,
    string? MotivoBaja,
    string? Observaciones,
    string QrUrl
);

public record ActivoDetalleDto(
    int Id,
    string CodigoInterno,
    string? SerialFabricante,
    string Marca,
    string Modelo,
    string? Descripcion,
    TipoActivoDto TipoActivo,
    AlmacenDto Almacen,
    EstadoActivoDto Estado,
    DateTime FechaIngreso,
    DateTime? FechaUltimoInventario,
    DateTime? FechaBaja,
    string? MotivoBaja,
    string? Observaciones,
    string QrUrl,
    List<HistorialActivoDto> Historial,
    List<TrasladoDto> Traslados
);

// Vista pública para QR (sin autenticar)
public record ActivoPublicoDto(
    string CodigoInterno,
    string Marca,
    string Modelo,
    string? Descripcion,
    string TipoActivo,
    string Almacen,
    string Estado,
    string EstadoColor,
    DateTime FechaIngreso,
    DateTime? FechaUltimoInventario,
    string? FotoUrl
);

public record CrearActivoRequest(
    string? SerialFabricante,
    string Marca,
    string Modelo,
    string? Descripcion,
    int TipoActivoId,
    int AlmacenId,
    int? EstadoId,
    string? Observaciones,
    IFormFile? Foto
);

public record ActualizarActivoRequest(
    string? SerialFabricante,
    string? Marca,
    string? Modelo,
    string? Descripcion,
    int? TipoActivoId,
    int? EstadoId,
    string? Observaciones,
    IFormFile? Foto
);

public record DarBajaActivoRequest(
    string Motivo
);

// ==================== TRASLADOS ====================
public record TrasladoDto(
    int Id,
    string NumeroTraslado,
    int ActivoId,
    string ActivoCodigo,
    string ActivoDescripcion,
    int AlmacenOrigenId,
    string AlmacenOrigenNombre,
    int AlmacenDestinoId,
    string AlmacenDestinoNombre,
    string Motivo,
    DateTime FechaTraslado,
    string NombreUsuario,
    string? Observaciones
);

public record CrearTrasladoRequest(
    int ActivoId,
    int AlmacenDestinoId,
    string Motivo,
    string? Observaciones
);

// ==================== HISTORIAL ====================
public record HistorialActivoDto(
    int Id,
    string TipoCambio,
    string Campo,
    string? ValorAnterior,
    string? ValorNuevo,
    string? Descripcion,
    string? NombreUsuario,
    DateTime FechaCambio
);

// ==================== REPORTES / ESTADÍSTICAS ====================
public record DashboardStats(
    int TotalActivos,
    int ActivosDisponibles,
    int ActivosAsignados,
    int ActivosMantenimiento,
    int ActivosBaja,
    int TotalTraslados,
    int TrasladosEsteMes,
    List<ActivosPorSedeDto> ActivosPorSede,
    List<ActivosPorTipoDto> ActivosPorTipo,
    List<ActivosPorEstadoDto> ActivosPorEstado,
    List<TrasladoRecienteDto> UltimosTraslados
);

public record ActivosPorSedeDto(string Sede, string Codigo, int Cantidad);
public record ActivosPorTipoDto(string Tipo, string Referencia, int Cantidad);
public record ActivosPorEstadoDto(string Estado, string Color, int Cantidad);
public record TrasladoRecienteDto(
    string NumeroTraslado,
    string Activo,
    string Origen,
    string Destino,
    DateTime Fecha
);

// ==================== PAGINACIÓN Y FILTROS ====================
public record FiltroActivos(
    string? Busqueda,
    int? AlmacenId,
    int? TipoActivoId,
    int? EstadoId,
    string? Marca,
    DateTime? FechaDesde,
    DateTime? FechaHasta,
    int Pagina = 1,
    int ElementosPorPagina = 20,
    string OrdenarPor = "FechaIngreso",
    bool Descendente = true
);

public record ResultadoPaginado<T>(
    List<T> Items,
    int TotalItems,
    int PaginaActual,
    int TotalPaginas,
    int ElementosPorPagina
);

// ==================== IMPRESIÓN ZPL ====================
public record EtiquetaZplRequest(
    List<string> CodigosActivo
);

public record EtiquetaZplResponse(
    string CodigoActivo,
    string ZplCode
);

// ==================== EXPORTACIÓN ====================
public record ExportarRequest(
    string Formato, // excel, pdf
    int? AlmacenId,
    int? TipoActivoId,
    int? EstadoId,
    string? Marca,
    DateTime? FechaDesde,
    DateTime? FechaHasta
);