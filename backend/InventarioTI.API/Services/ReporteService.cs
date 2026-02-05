using Microsoft.EntityFrameworkCore;
using InventarioTI.API.Data;
using InventarioTI.API.DTOs;

namespace InventarioTI.API.Services;

public interface IReporteService
{
    Task<DashboardStats> ObtenerDashboardStats();
    Task<List<ActivoReporteDto>> ObtenerInventarioGeneral(FiltroReporte? filtro);
    Task<List<ResumenPorAlmacenDto>> ObtenerActivosPorAlmacen();
    Task<List<ResumenPorTipoDto>> ObtenerActivosPorTipo();
    Task<List<MovimientoDto>> ObtenerMovimientos(FiltroReporte? filtro);
    Task<List<TrasladoReporteDto>> ObtenerTraslados(FiltroReporte? filtro);
    Task<byte[]> ExportarActivosExcel(ExportarRequest filtro);
    Task<byte[]> ExportarActivosPdf(ExportarRequest filtro);
    Task<byte[]> ExportarTrasladosExcel(int? almacenId, DateTime? desde, DateTime? hasta);
}

public class ReporteService : IReporteService
{
    private readonly InventarioDbContext _context;

    public ReporteService(InventarioDbContext context)
    {
        _context = context;
    }

    public async Task<DashboardStats> ObtenerDashboardStats()
    {
        try
        {
            var totalActivos = await _context.Activos.CountAsync();
            var activosDisponibles = await _context.Activos.CountAsync(a => a.EstadoId == 1);
            var activosAsignados = await _context.Activos.CountAsync(a => a.EstadoId == 2);
            var activosMantenimiento = await _context.Activos.CountAsync(a => a.EstadoId == 3 || a.EstadoId == 4);
            var activosBaja = await _context.Activos.CountAsync(a => a.EstadoId == 5);

            var totalTraslados = await _context.Traslados.CountAsync();
            var inicioMes = new DateTime(DateTime.Now.Year, DateTime.Now.Month, 1);
            var trasladosEsteMes = await _context.Traslados.CountAsync(t => t.FechaTraslado >= inicioMes);

            // 1. Activos por sede (Evaluado en cliente para evitar error de traducción)
            var todosLosActivosParaSede = await _context.Activos
                .Include(a => a.Almacen)
                .Where(a => a.EstadoId != 5)
                .ToListAsync(); // Traemos a memoria

            var activosPorSede = todosLosActivosParaSede
                .GroupBy(a => new { a.Almacen.Nombre, a.Almacen.Codigo })
                .Select(g => new ActivosPorSedeDto(
                    g.Key.Nombre ?? "Sin Nombre",
                    g.Key.Codigo ?? "S/C",
                    g.Count()
                ))
                .OrderByDescending(x => x.Cantidad)
                .Take(15)
                .ToList();

            // 2. Activos por tipo (Evaluado en cliente)
            var todosLosActivosParaTipo = await _context.Activos
                .Include(a => a.TipoActivo)
                .Where(a => a.EstadoId != 5)
                .ToListAsync(); // Traemos a memoria

            var activosPorTipo = todosLosActivosParaTipo
                .GroupBy(a => new { a.TipoActivo.Nombre, a.TipoActivo.Referencia })
                .Select(g => new ActivosPorTipoDto(
                    g.Key.Nombre ?? "Sin Tipo",
                    g.Key.Referencia ?? "S/R",
                    g.Count()
                ))
                .OrderByDescending(x => x.Cantidad)
                .Take(15)
                .ToList();

            // Activos por estado - CORREGIDO
            var activosPorEstado = await _context.Activos
                .Include(a => a.Estado)
                .GroupBy(a => new { a.Estado.Nombre, a.Estado.Color })
                .Select(g => new ActivosPorEstadoDto(
                    g.Key.Nombre,
                    g.Key.Color,
                    g.Count()
                ))
                .ToListAsync();

            // Últimos traslados
            var ultimosTraslados = await _context.Traslados
                .Include(t => t.Activo)
                .Include(t => t.AlmacenOrigen)
                .Include(t => t.AlmacenDestino)
                .OrderByDescending(t => t.FechaTraslado)
                .Take(10)
                .Select(t => new TrasladoRecienteDto(
                    t.NumeroTraslado,
                    $"{t.Activo.CodigoInterno} - {t.Activo.Marca} {t.Activo.Modelo}",
                    t.AlmacenOrigen.Nombre,
                    t.AlmacenDestino.Nombre,
                    t.FechaTraslado
                ))
                .ToListAsync();

            return new DashboardStats(
                totalActivos,
                activosDisponibles,
                activosAsignados,
                activosMantenimiento,
                activosBaja,
                totalTraslados,
                trasladosEsteMes,
                activosPorSede,
                activosPorTipo,
                activosPorEstado,
                ultimosTraslados
            );
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error en ObtenerDashboardStats: {ex.Message}");
            throw;
        }
    }

    // ==================== NUEVOS MÉTODOS PARA REPORTES ====================

    public async Task<List<ActivoReporteDto>> ObtenerInventarioGeneral(FiltroReporte? filtro)
    {
        var query = _context.Activos
            .Include(a => a.TipoActivo)
            .Include(a => a.Almacen)
            .Include(a => a.Estado)
            .AsQueryable();

        if (filtro?.AlmacenId.HasValue == true)
            query = query.Where(a => a.AlmacenId == filtro.AlmacenId);

        if (filtro?.TipoActivoId.HasValue == true)
            query = query.Where(a => a.TipoActivoId == filtro.TipoActivoId);

        if (filtro?.FechaDesde.HasValue == true)
            query = query.Where(a => a.FechaIngreso >= filtro.FechaDesde);

        if (filtro?.FechaHasta.HasValue == true)
            query = query.Where(a => a.FechaIngreso <= filtro.FechaHasta);

        return await query
            .OrderBy(a => a.Almacen.Nombre)
            .ThenBy(a => a.CodigoInterno)
            .Select(a => new ActivoReporteDto(
                a.CodigoInterno,
                a.TipoActivo.Nombre,
                a.Marca,
                a.Modelo,
                a.SerialFabricante,
                a.Almacen.Nombre,
                a.Estado.Nombre,
                a.FechaIngreso,
                a.FechaUltimoInventario,
                a.Descripcion
            ))
            .ToListAsync();
    }

    public async Task<List<ResumenPorAlmacenDto>> ObtenerActivosPorAlmacen()
    {
        var almacenes = await _context.Almacenes.ToListAsync();
        var resultado = new List<ResumenPorAlmacenDto>();

        foreach (var almacen in almacenes)
        {
            var activos = await _context.Activos
                .Where(a => a.AlmacenId == almacen.Id)
                .ToListAsync();

            resultado.Add(new ResumenPorAlmacenDto(
                almacen.Nombre,
                almacen.Codigo,
                activos.Count,
                activos.Count(a => a.EstadoId == 1),
                activos.Count(a => a.EstadoId == 2),
                activos.Count(a => a.EstadoId == 3 || a.EstadoId == 4),
                activos.Count(a => a.EstadoId == 5)
            ));
        }

        return resultado.OrderByDescending(x => x.TotalActivos).ToList();
    }

    public async Task<List<ResumenPorTipoDto>> ObtenerActivosPorTipo()
    {
        var tipos = await _context.TiposActivo.ToListAsync();
        var resultado = new List<ResumenPorTipoDto>();

        foreach (var tipo in tipos)
        {
            var activos = await _context.Activos
                .Where(a => a.TipoActivoId == tipo.Id)
                .ToListAsync();

            if (activos.Count > 0)
            {
                resultado.Add(new ResumenPorTipoDto(
                    tipo.Nombre,
                    tipo.Referencia,
                    activos.Count,
                    activos.Count(a => a.EstadoId == 1),
                    activos.Count(a => a.EstadoId == 2),
                    activos.Count(a => a.EstadoId == 3 || a.EstadoId == 4)
                ));
            }
        }

        return resultado.OrderByDescending(x => x.Total).ToList();
    }

    public async Task<List<MovimientoDto>> ObtenerMovimientos(FiltroReporte? filtro)
    {
        var query = _context.HistorialActivos
            .Include(h => h.Activo)
            .AsQueryable();

        if (filtro?.FechaDesde.HasValue == true)
            query = query.Where(h => h.FechaCambio >= filtro.FechaDesde);

        if (filtro?.FechaHasta.HasValue == true)
            query = query.Where(h => h.FechaCambio <= filtro.FechaHasta);

        return await query
            .OrderByDescending(h => h.FechaCambio)
            .Take(500)
            .Select(h => new MovimientoDto(
                h.FechaCambio,
                h.Activo.CodigoInterno,
                h.TipoCambio,
                h.Descripcion ?? $"{h.Campo}: {h.ValorAnterior ?? "-"} → {h.ValorNuevo ?? "-"}",
                h.NombreUsuario
            ))
            .ToListAsync();
    }

    public async Task<List<TrasladoReporteDto>> ObtenerTraslados(FiltroReporte? filtro)
    {
        var query = _context.Traslados
            .Include(t => t.Activo)
            .Include(t => t.AlmacenOrigen)
            .Include(t => t.AlmacenDestino)
            .AsQueryable();

        if (filtro?.AlmacenId.HasValue == true)
            query = query.Where(t => t.AlmacenOrigenId == filtro.AlmacenId || t.AlmacenDestinoId == filtro.AlmacenId);

        if (filtro?.FechaDesde.HasValue == true)
            query = query.Where(t => t.FechaTraslado >= filtro.FechaDesde);

        if (filtro?.FechaHasta.HasValue == true)
            query = query.Where(t => t.FechaTraslado <= filtro.FechaHasta);

        return await query
            .OrderByDescending(t => t.FechaTraslado)
            .Select(t => new TrasladoReporteDto(
                t.NumeroTraslado,
                t.Activo.CodigoInterno,
                t.Activo.Marca,
                t.Activo.Modelo,
                t.AlmacenOrigen.Nombre,
                t.AlmacenDestino.Nombre,
                t.FechaTraslado,
                t.Motivo,
                t.NombreUsuario
            ))
            .ToListAsync();
    }

    // ==================== MÉTODOS DE EXPORTACIÓN EXISTENTES ====================

    public async Task<byte[]> ExportarActivosExcel(ExportarRequest filtro)
    {
        var query = _context.Activos
            .Include(a => a.TipoActivo)
            .Include(a => a.Almacen)
            .Include(a => a.Estado)
            .AsQueryable();

        if (filtro.AlmacenId.HasValue)
            query = query.Where(a => a.AlmacenId == filtro.AlmacenId);

        if (filtro.TipoActivoId.HasValue)
            query = query.Where(a => a.TipoActivoId == filtro.TipoActivoId);

        if (filtro.EstadoId.HasValue)
            query = query.Where(a => a.EstadoId == filtro.EstadoId);

        if (!string.IsNullOrWhiteSpace(filtro.Marca))
            query = query.Where(a => a.Marca.ToLower() == filtro.Marca.ToLower());

        if (filtro.FechaDesde.HasValue)
            query = query.Where(a => a.FechaIngreso >= filtro.FechaDesde.Value);

        if (filtro.FechaHasta.HasValue)
            query = query.Where(a => a.FechaIngreso <= filtro.FechaHasta.Value);

        var activos = await query.OrderBy(a => a.CodigoInterno).ToListAsync();

        var csv = new System.Text.StringBuilder();
        csv.AppendLine("Código,Serial,Marca,Modelo,Tipo,Referencia,Almacén,Estado,Fecha Ingreso,Observaciones");

        foreach (var activo in activos)
        {
            csv.AppendLine($"\"{activo.CodigoInterno}\",\"{activo.SerialFabricante}\",\"{activo.Marca}\",\"{activo.Modelo}\",\"{activo.TipoActivo.Nombre}\",\"{activo.TipoActivo.Referencia}\",\"{activo.Almacen.Nombre}\",\"{activo.Estado.Nombre}\",\"{activo.FechaIngreso:yyyy-MM-dd}\",\"{activo.Observaciones}\"");
        }

        return System.Text.Encoding.UTF8.GetBytes(csv.ToString());
    }

    public async Task<byte[]> ExportarActivosPdf(ExportarRequest filtro)
    {
        var query = _context.Activos
            .Include(a => a.TipoActivo)
            .Include(a => a.Almacen)
            .Include(a => a.Estado)
            .AsQueryable();

        if (filtro.AlmacenId.HasValue)
            query = query.Where(a => a.AlmacenId == filtro.AlmacenId);

        if (filtro.TipoActivoId.HasValue)
            query = query.Where(a => a.TipoActivoId == filtro.TipoActivoId);

        if (filtro.EstadoId.HasValue)
            query = query.Where(a => a.EstadoId == filtro.EstadoId);

        var activos = await query.OrderBy(a => a.CodigoInterno).ToListAsync();

        var html = new System.Text.StringBuilder();
        html.AppendLine("<!DOCTYPE html><html><head><meta charset='UTF-8'><title>Reporte de Activos MN</title>");
        html.AppendLine("<style>body{font-family:Arial,sans-serif;font-size:12px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#1a365d;color:white}.header{text-align:center;margin-bottom:20px}</style></head><body>");
        html.AppendLine("<div class='header'><h1>INVENTARIO DE ACTIVOS TI</h1><h3>La Media Naranja - Informe General</h3><p>Fecha: " + DateTime.Now.ToString("dd/MM/yyyy HH:mm") + "</p></div>");
        html.AppendLine("<table><tr><th>Código</th><th>Marca</th><th>Modelo</th><th>Tipo</th><th>Almacén</th><th>Estado</th><th>Fecha Ingreso</th></tr>");

        foreach (var activo in activos)
        {
            html.AppendLine($"<tr><td>{activo.CodigoInterno}</td><td>{activo.Marca}</td><td>{activo.Modelo}</td><td>{activo.TipoActivo.Nombre}</td><td>{activo.Almacen.Nombre}</td><td>{activo.Estado.Nombre}</td><td>{activo.FechaIngreso:dd/MM/yyyy}</td></tr>");
        }

        html.AppendLine("</table>");
        html.AppendLine($"<p style='margin-top:20px'><strong>Total de activos:</strong> {activos.Count}</p>");
        html.AppendLine("</body></html>");

        return System.Text.Encoding.UTF8.GetBytes(html.ToString());
    }

    public async Task<byte[]> ExportarTrasladosExcel(int? almacenId, DateTime? desde, DateTime? hasta)
    {
        var query = _context.Traslados
            .Include(t => t.Activo)
            .Include(t => t.AlmacenOrigen)
            .Include(t => t.AlmacenDestino)
            .AsQueryable();

        if (almacenId.HasValue)
            query = query.Where(t => t.AlmacenOrigenId == almacenId || t.AlmacenDestinoId == almacenId);

        if (desde.HasValue)
            query = query.Where(t => t.FechaTraslado >= desde.Value);

        if (hasta.HasValue)
            query = query.Where(t => t.FechaTraslado <= hasta.Value);

        var traslados = await query.OrderByDescending(t => t.FechaTraslado).ToListAsync();

        var csv = new System.Text.StringBuilder();
        csv.AppendLine("Número,Activo,Código Activo,Origen,Destino,Motivo,Fecha,Usuario");

        foreach (var t in traslados)
        {
            csv.AppendLine($"\"{t.NumeroTraslado}\",\"{t.Activo.Marca} {t.Activo.Modelo}\",\"{t.Activo.CodigoInterno}\",\"{t.AlmacenOrigen.Nombre}\",\"{t.AlmacenDestino.Nombre}\",\"{t.Motivo}\",\"{t.FechaTraslado:yyyy-MM-dd HH:mm}\",\"{t.NombreUsuario}\"");
        }

        return System.Text.Encoding.UTF8.GetBytes(csv.ToString());
    }
}

// ==================== DTOs ADICIONALES PARA REPORTES ====================

public record FiltroReporte(
    int? AlmacenId = null,
    int? TipoActivoId = null,
    DateTime? FechaDesde = null,
    DateTime? FechaHasta = null
);

public record ActivoReporteDto(
    string CodigoInterno,
    string TipoActivo,
    string Marca,
    string Modelo,
    string? SerialFabricante,
    string Almacen,
    string Estado,
    DateTime FechaIngreso,
    DateTime? FechaUltimoInventario,
    string? Descripcion
);

public record ResumenPorAlmacenDto(
    string Almacen,
    string CodigoAlmacen,
    int TotalActivos,
    int Disponibles,
    int Asignados,
    int EnMantenimiento,
    int DadosDeBaja
);

public record ResumenPorTipoDto(
    string TipoActivo,
    string Referencia,
    int Total,
    int Disponibles,
    int Asignados,
    int EnMantenimiento
);

public record MovimientoDto(
    DateTime Fecha,
    string CodigoActivo,
    string TipoMovimiento,
    string Detalle,
    string Usuario
);

public record TrasladoReporteDto(
    string NumeroTraslado,
    string CodigoActivo,
    string Marca,
    string Modelo,
    string AlmacenOrigen,
    string AlmacenDestino,
    DateTime FechaTraslado,
    string Motivo,
    string Usuario
);