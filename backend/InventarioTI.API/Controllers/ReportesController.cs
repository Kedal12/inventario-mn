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

    [HttpGet("dashboard")]
    public async Task<ActionResult<DashboardStats>> GetDashboard()
    {
        var stats = await _reporteService.ObtenerDashboardStats();
        return Ok(stats);
    }

    [HttpPost("exportar/activos/excel")]
    public async Task<IActionResult> ExportarActivosExcel([FromBody] ExportarRequest request)
    {
        var bytes = await _reporteService.ExportarActivosExcel(request);
        return File(bytes, "text/csv", $"activos_icg_{DateTime.Now:yyyyMMdd_HHmmss}.csv");
    }

    [HttpPost("exportar/activos/pdf")]
    public async Task<IActionResult> ExportarActivosPdf([FromBody] ExportarRequest request)
    {
        var bytes = await _reporteService.ExportarActivosPdf(request);
        return File(bytes, "text/html", $"activos_icg_{DateTime.Now:yyyyMMdd_HHmmss}.html");
    }

    [HttpGet("exportar/traslados/excel")]
    public async Task<IActionResult> ExportarTrasladosExcel(
        [FromQuery] int? almacenId = null,
        [FromQuery] DateTime? desde = null,
        [FromQuery] DateTime? hasta = null)
    {
        var bytes = await _reporteService.ExportarTrasladosExcel(almacenId, desde, hasta);
        return File(bytes, "text/csv", $"traslados_icg_{DateTime.Now:yyyyMMdd_HHmmss}.csv");
    }
}
