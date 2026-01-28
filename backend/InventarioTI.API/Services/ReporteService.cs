using Microsoft.EntityFrameworkCore;
using InventarioTI.API.Data;
using InventarioTI.API.DTOs;

namespace InventarioTI.API.Services;

public interface IReporteService
{
    Task<DashboardStats> ObtenerDashboardStats();
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
        var totalActivos = await _context.Activos.CountAsync();
        var activosDisponibles = await _context.Activos.CountAsync(a => a.EstadoId == 1);
        var activosAsignados = await _context.Activos.CountAsync(a => a.EstadoId == 2);
        var activosMantenimiento = await _context.Activos.CountAsync(a => a.EstadoId == 3 || a.EstadoId == 4);
        var activosBaja = await _context.Activos.CountAsync(a => a.EstadoId == 5);

        var totalTraslados = await _context.Traslados.CountAsync();
        var inicioMes = new DateTime(DateTime.Now.Year, DateTime.Now.Month, 1);
        var trasladosEsteMes = await _context.Traslados.CountAsync(t => t.FechaTraslado >= inicioMes);

        var activosPorSede = await _context.Almacenes
            .Where(a => a.Activo)
            .Select(a => new ActivosPorSedeDto(
                a.Nombre,
                a.Codigo,
                a.Activos.Count
            ))
            .OrderByDescending(x => x.Cantidad)
            .Take(15)
            .ToListAsync();

        var activosPorTipo = await _context.TiposActivo
            .Where(t => t.Activo)
            .Select(t => new ActivosPorTipoDto(
                t.Nombre,
                t.Referencia,
                t.Activos.Count
            ))
            .Where(x => x.Cantidad > 0)
            .OrderByDescending(x => x.Cantidad)
            .Take(15)
            .ToListAsync();

        var activosPorEstado = await _context.EstadosActivo
            .Select(e => new ActivosPorEstadoDto(
                e.Nombre,
                e.Color,
                e.Activos.Count
            ))
            .OrderBy(x => x.Estado)
            .ToListAsync();

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

        // Generar CSV simple (sin dependencias externas)
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
        // Para PDF necesitaríamos una librería como iTextSharp o QuestPDF
        // Por ahora retornamos un HTML que se puede imprimir como PDF
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
        html.AppendLine("<!DOCTYPE html><html><head><meta charset='UTF-8'><title>Reporte de Activos ICG</title>");
        html.AppendLine("<style>body{font-family:Arial,sans-serif;font-size:12px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#1a365d;color:white}.header{text-align:center;margin-bottom:20px}</style></head><body>");
        html.AppendLine("<div class='header'><h1>INVENTARIO DE ACTIVOS TI</h1><h3>ICG - Informe General</h3><p>Fecha: " + DateTime.Now.ToString("dd/MM/yyyy HH:mm") + "</p></div>");
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
