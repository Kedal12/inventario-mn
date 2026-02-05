// ============================================================================
// InventarioTI - Módulo de Mantenimientos
// DTOs adaptados a la BD real (InventarioTI_ICG)
// Agregar en: Application/DTOs/MantenimientoDTOs.cs
// ============================================================================
namespace InventarioTI.API.DTOs;
// ─── REQUESTS ──────────────────────────────────────────

public class CrearMantenimientoRequest
{
    public int ActivoId { get; set; }
    public int TipoMantenimientoId { get; set; }
    public int? TecnicoId { get; set; }
    public string RealizadoPor { get; set; }
    public string Descripcion { get; set; }
    public string? Hallazgos { get; set; }
    public string? RepuestosCambiados { get; set; }
    public decimal? Costo { get; set; }
    public DateTime? FechaProximoMtto { get; set; }
    public string? Observaciones { get; set; }
}

public class CrearTecnicoRequest
{
    public string Nombre { get; set; }
    public string? Cargo { get; set; }
    public string? Telefono { get; set; }
    public string? Email { get; set; }
}

// ─── RESPONSES ─────────────────────────────────────────

/// <summary>Mapea directamente de VW_HistorialMantenimientos</summary>
public class MantenimientoResponse
{
    public int MantenimientoId { get; set; }
    public int ActivoId { get; set; }
    public string CodigoInterno { get; set; }
    public string SerialFabricante { get; set; }
    public string Marca { get; set; }
    public string Modelo { get; set; }
    public string TipoActivo { get; set; }
    public string Almacen { get; set; }
    public string CodigoAlmacen { get; set; }
    public string TipoMantenimiento { get; set; }
    public string TipoMttoColor { get; set; }
    public string RealizadoPor { get; set; }
    public string Descripcion { get; set; }
    public string? Hallazgos { get; set; }
    public string? RepuestosCambiados { get; set; }
    public decimal? Costo { get; set; }
    public DateTime FechaMantenimiento { get; set; }
    public DateTime? FechaProximoMtto { get; set; }
    public string? Observaciones { get; set; }
    public bool EtiquetaImpresa { get; set; }
}

public class CrearMantenimientoResponse
{
    public bool Exito { get; set; }
    public string Mensaje { get; set; }
    public int MantenimientoId { get; set; }
    public MantenimientoResponse Mantenimiento { get; set; }
    public DatosEtiquetaMtto Etiqueta { get; set; }
}

/// <summary>Mapea directamente de VW_ActivosEstadoMantenimiento</summary>
public class ActivoEstadoMttoResponse
{
    public int ActivoId { get; set; }
    public string CodigoInterno { get; set; }
    public string SerialFabricante { get; set; }
    public string Marca { get; set; }
    public string Modelo { get; set; }
    public string Descripcion { get; set; }
    public string TipoActivo { get; set; }
    public string TipoReferencia { get; set; }
    public string Almacen { get; set; }
    public string CodigoAlmacen { get; set; }
    public string Estado { get; set; }
    public string EstadoColor { get; set; }
    public DateTime? FechaUltimoMantenimiento { get; set; }
    public int TotalMantenimientos { get; set; }
    public DateTime? FechaProximoMantenimiento { get; set; }
    public string Observaciones { get; set; }
    public int DiasDesdeUltimoMtto { get; set; }
    public string AlertaMantenimiento { get; set; }  // AL_DIA, PROXIMO, VENCIDO, NUNCA
}

// ─── DATOS PARA ETIQUETA ZEBRA ─────────────────────────

public class DatosEtiquetaMtto
{
    public string CodigoInterno { get; set; }
    public string SerialFabricante { get; set; }
    public string Marca { get; set; }
    public string Modelo { get; set; }
    public string TipoActivo { get; set; }
    public string Almacen { get; set; }
    public string TipoMantenimiento { get; set; }
    public string RealizadoPor { get; set; }
    public string Descripcion { get; set; }
    public DateTime FechaMantenimiento { get; set; }
    public DateTime? FechaProximoMtto { get; set; }
    public int NumeroMantenimiento { get; set; }
}

// ─── CATÁLOGOS ─────────────────────────────────────────

public class TipoMantenimientoResponse
{
    public int Id { get; set; }
    public string Nombre { get; set; }
    public string? Descripcion { get; set; }
    public string Color { get; set; }
}

public class TecnicoResponse
{
    public int Id { get; set; }
    public string Nombre { get; set; }
    public string? Cargo { get; set; }
    public string? Telefono { get; set; }
}

public class AlmacenResponse
{
    public int Id { get; set; }
    public string Nombre { get; set; }
    public string Codigo { get; set; }
}

// ─── DASHBOARD ─────────────────────────────────────────

public class DashboardMantenimientoResponse
{
    public int TotalActivos { get; set; }
    public int ActivosAlDia { get; set; }
    public int ActivosProximos { get; set; }
    public int ActivosVencidos { get; set; }
    public int ActivosNunca { get; set; }
    public int MantenimientosMes { get; set; }
    public int MantenimientosAnio { get; set; }
    public List<ActivoEstadoMttoResponse> ActivosPendientes { get; set; }
}