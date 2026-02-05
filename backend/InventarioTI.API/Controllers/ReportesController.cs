using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using InventarioTI.API.DTOs;
using InventarioTI.API.Services;

namespace InventarioTI.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ReportesController : ControllerBase
{
    private readonly IReporteService _reporteService;

    public ReportesController(IReporteService reporteService)
    {
        _reporteService = reporteService;
    }

    /// <summary>
    /// Obtiene estadísticas para el dashboard
    /// </summary>
    [HttpGet("dashboard")]
    public async Task<ActionResult<DashboardStats>> GetDashboard()
    {
        try
        {
            var stats = await _reporteService.ObtenerDashboardStats();
            return Ok(stats);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error en GetDashboard: {ex.Message}");
            Console.WriteLine($"StackTrace: {ex.StackTrace}");
            return StatusCode(500, new { message = "Error al obtener dashboard", error = ex.Message });
        }
    }

    /// <summary>
    /// Obtiene el inventario general de activos
    /// </summary>
    [HttpGet("inventario")]
    public async Task<IActionResult> GetInventarioGeneral(
        [FromQuery] int? almacenId,
        [FromQuery] int? tipoActivoId,
        [FromQuery] DateTime? fechaDesde,
        [FromQuery] DateTime? fechaHasta)
    {
        try
        {
            var filtro = new FiltroReporte(almacenId, tipoActivoId, fechaDesde, fechaHasta);
            var datos = await _reporteService.ObtenerInventarioGeneral(filtro);
            return Ok(datos);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error al obtener inventario", error = ex.Message });
        }
    }

    /// <summary>
    /// Obtiene resumen de activos agrupados por almacén
    /// </summary>
    [HttpGet("por-almacen")]
    public async Task<IActionResult> GetActivosPorAlmacen()
    {
        try
        {
            var datos = await _reporteService.ObtenerActivosPorAlmacen();
            return Ok(datos);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error al obtener reporte por almacén", error = ex.Message });
        }
    }

    /// <summary>
    /// Obtiene resumen de activos agrupados por tipo
    /// </summary>
    [HttpGet("por-tipo")]
    public async Task<IActionResult> GetActivosPorTipo()
    {
        try
        {
            var datos = await _reporteService.ObtenerActivosPorTipo();
            return Ok(datos);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error al obtener reporte por tipo", error = ex.Message });
        }
    }

    /// <summary>
    /// Obtiene historial de movimientos
    /// </summary>
    [HttpGet("movimientos")]
    public async Task<IActionResult> GetMovimientos(
        [FromQuery] DateTime? fechaDesde,
        [FromQuery] DateTime? fechaHasta)
    {
        try
        {
            var filtro = new FiltroReporte(null, null, fechaDesde, fechaHasta);
            var datos = await _reporteService.ObtenerMovimientos(filtro);
            return Ok(datos);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error al obtener movimientos", error = ex.Message });
        }
    }

    /// <summary>
    /// Obtiene lista de traslados
    /// </summary>
    [HttpGet("traslados")]
    public async Task<IActionResult> GetTraslados(
        [FromQuery] int? almacenId,
        [FromQuery] DateTime? fechaDesde,
        [FromQuery] DateTime? fechaHasta)
    {
        try
        {
            var filtro = new FiltroReporte(almacenId, null, fechaDesde, fechaHasta);
            var datos = await _reporteService.ObtenerTraslados(filtro);
            return Ok(datos);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error al obtener traslados", error = ex.Message });
        }
    }

    // ==================== ENDPOINTS DE EXPORTACIÓN EXISTENTES ====================

    [HttpPost("exportar/activos/excel")]
    public async Task<IActionResult> ExportarActivosExcel([FromBody] ExportarRequest request)
    {
        try
        {
            var bytes = await _reporteService.ExportarActivosExcel(request);
            return File(bytes, "text/csv", $"activos_mn_{DateTime.Now:yyyyMMdd_HHmmss}.csv");
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error al exportar", error = ex.Message });
        }
    }

    [HttpPost("exportar/activos/pdf")]
    public async Task<IActionResult> ExportarActivosPdf([FromBody] ExportarRequest request)
    {
        try
        {
            var bytes = await _reporteService.ExportarActivosPdf(request);
            return File(bytes, "text/html", $"activos_mn_{DateTime.Now:yyyyMMdd_HHmmss}.html");
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error al exportar", error = ex.Message });
        }
    }

    [HttpGet("exportar/traslados/excel")]
    public async Task<IActionResult> ExportarTrasladosExcel(
        [FromQuery] int? almacenId = null,
        [FromQuery] DateTime? desde = null,
        [FromQuery] DateTime? hasta = null)
    {
        try
        {
            var bytes = await _reporteService.ExportarTrasladosExcel(almacenId, desde, hasta);
            return File(bytes, "text/csv", $"traslados_mn_{DateTime.Now:yyyyMMdd_HHmmss}.csv");
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error al exportar", error = ex.Message });
        }
    }
}
