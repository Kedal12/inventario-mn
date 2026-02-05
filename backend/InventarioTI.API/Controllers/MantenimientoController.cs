// ============================================================================
// InventarioTI - Módulo de Mantenimientos
// MantenimientoController.cs - Adaptado a BD real
// Agregar en: API/Controllers/MantenimientoController.cs
// ============================================================================

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using InventarioTI.API.DTOs;
using InventarioTI.API.Services;

namespace InventarioTI.API.Controllers;

[ApiController]
[Route("api/mantenimientos")]
[Authorize]
[Produces("application/json")]
public class MantenimientoController : ControllerBase
{
    private readonly IMantenimientoService _service;

    public MantenimientoController(IMantenimientoService service)
    {
        _service = service;
    }

    // ═══════════════════════════════════════════════════════
    // CATÁLOGOS
    // ═══════════════════════════════════════════════════════

    /// <summary>Obtener todos los catálogos del módulo</summary>
    [HttpGet("catalogos")]
    public async Task<IActionResult> ObtenerCatalogos()
    {
        var tipos = await _service.ObtenerTiposMantenimiento();
        var tecnicos = await _service.ObtenerTecnicos();
        var almacenes = await _service.ObtenerAlmacenes();
        return Ok(new { tiposMantenimiento = tipos, tecnicos, almacenes });
    }

    /// <summary>Obtener tipos de mantenimiento</summary>
    [HttpGet("tipos")]
    public async Task<IActionResult> ObtenerTipos()
        => Ok(await _service.ObtenerTiposMantenimiento());

    /// <summary>Obtener técnicos</summary>
    [HttpGet("tecnicos")]
    public async Task<IActionResult> ObtenerTecnicos()
        => Ok(await _service.ObtenerTecnicos());

    /// <summary>Crear técnico</summary>
    [HttpPost("tecnicos")]
    public async Task<IActionResult> CrearTecnico([FromBody] CrearTecnicoRequest request)
        => Ok(await _service.CrearTecnico(request));

    // ═══════════════════════════════════════════════════════
    // ACTIVOS - ESTADO DE MANTENIMIENTO
    // ═══════════════════════════════════════════════════════

    /// <summary>Listar activos con su estado de mantenimiento</summary>
    [HttpGet("activos")]
    public async Task<IActionResult> ListarActivos(
        [FromQuery] int? almacenId,
        [FromQuery] string? alerta)
        => Ok(await _service.ObtenerActivos(almacenId, alerta));

    /// <summary>Obtener estado de mantenimiento de un activo</summary>
    [HttpGet("activos/{activoId}")]
    public async Task<IActionResult> ObtenerActivo(int activoId)
    {
        var result = await _service.ObtenerActivo(activoId);
        return result == null
            ? NotFound(new { mensaje = "Activo no encontrado" })
            : Ok(result);
    }

    /// <summary>Buscar activo por código, serial, marca o modelo</summary>
    [HttpGet("activos/buscar")]
    public async Task<IActionResult> BuscarActivo([FromQuery] string q)
    {
        if (string.IsNullOrWhiteSpace(q))
            return BadRequest(new { mensaje = "Ingrese un término de búsqueda" });
        return Ok(await _service.BuscarActivo(q));
    }

    // ═══════════════════════════════════════════════════════
    // MANTENIMIENTOS
    // ═══════════════════════════════════════════════════════

    /// <summary>Registrar un nuevo mantenimiento</summary>
    [HttpPost("registrar")]
    public async Task<IActionResult> Registrar([FromBody] CrearMantenimientoRequest request)
    {
        int? userId = null;
        var claim = User.FindFirst("userId")?.Value ?? User.FindFirst("sub")?.Value;
        if (int.TryParse(claim, out var uid)) userId = uid;

        var result = await _service.RegistrarMantenimiento(request, userId);
        return result.Exito ? Ok(result) : BadRequest(result);
    }

    /// <summary>Historial de mantenimientos de un activo</summary>
    [HttpGet("historial/{activoId}")]
    public async Task<IActionResult> ObtenerHistorial(int activoId)
        => Ok(await _service.ObtenerHistorial(activoId));

    /// <summary>Mantenimientos por rango de fecha</summary>
    [HttpGet("por-fecha")]
    public async Task<IActionResult> ObtenerPorFecha(
        [FromQuery] DateTime inicio,
        [FromQuery] DateTime fin,
        [FromQuery] int? almacenId)
        => Ok(await _service.ObtenerPorFecha(inicio, fin, almacenId));

    // ═══════════════════════════════════════════════════════
    // ETIQUETA ZEBRA
    // ═══════════════════════════════════════════════════════

    /// <summary>Obtener datos para imprimir etiqueta de mantenimiento</summary>
    [HttpGet("etiqueta/{mantenimientoId}")]
    public async Task<IActionResult> ObtenerEtiqueta(int mantenimientoId)
    {
        var datos = await _service.ObtenerDatosEtiqueta(mantenimientoId);
        return datos == null
            ? NotFound(new { mensaje = "Mantenimiento no encontrado" })
            : Ok(datos);
    }

    // ═══════════════════════════════════════════════════════
    // DASHBOARD
    // ═══════════════════════════════════════════════════════

    /// <summary>Dashboard con estadísticas de mantenimientos</summary>
    [HttpGet("dashboard")]
    public async Task<IActionResult> ObtenerDashboard()
        => Ok(await _service.ObtenerDashboard());
}