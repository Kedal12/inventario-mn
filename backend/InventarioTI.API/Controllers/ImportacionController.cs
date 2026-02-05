using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using InventarioTI.API.DTOs;
using InventarioTI.API.Services;

namespace InventarioTI.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Administrador")]
public class ImportacionController : ControllerBase
{
    private readonly IImportacionService _importacionService;

    public ImportacionController(IImportacionService importacionService)
    {
        _importacionService = importacionService;
    }

    /// <summary>
    /// Descarga la plantilla Excel para importación masiva
    /// </summary>
    [HttpGet("plantilla/excel")]
    public IActionResult DescargarPlantillaExcel([FromQuery] int? almacenId = null)
    {
        var bytes = _importacionService.GenerarPlantillaExcel(almacenId);
        return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "plantilla_importacion_activos.xlsx");
    }

    /// <summary>
    /// Descarga la plantilla CSV para importación masiva
    /// </summary>
    [HttpGet("plantilla/csv")]
    public IActionResult DescargarPlantillaCSV()
    {
        var bytes = _importacionService.GenerarPlantillaCSV();
        return File(bytes, "text/csv", "plantilla_importacion_activos.csv");
    }

    /// <summary>
    /// Importa activos desde un archivo Excel (.xlsx)
    /// </summary>
    [HttpPost("excel/{almacenId}")]
    [RequestSizeLimit(10_000_000)] // 10MB máximo
    public async Task<ActionResult<ImportacionResultadoDto>> ImportarExcel(
        int almacenId,
        IFormFile archivo)
    {
        if (archivo == null || archivo.Length == 0)
            return BadRequest(new { message = "No se proporcionó archivo" });

        if (!archivo.FileName.EndsWith(".xlsx", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { message = "El archivo debe ser .xlsx (Excel)" });

        var usuarioId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
        var nombreUsuario = User.FindFirst("NombreCompleto")?.Value ?? "Sistema";

        using var stream = archivo.OpenReadStream();
        var resultado = await _importacionService.ImportarDesdeExcel(stream, almacenId, usuarioId, nombreUsuario);

        return Ok(resultado);
    }

    /// <summary>
    /// Importa activos desde un archivo CSV
    /// </summary>
    [HttpPost("csv/{almacenId}")]
    [RequestSizeLimit(10_000_000)]
    public async Task<ActionResult<ImportacionResultadoDto>> ImportarCSV(
        int almacenId,
        IFormFile archivo)
    {
        if (archivo == null || archivo.Length == 0)
            return BadRequest(new { message = "No se proporcionó archivo" });

        if (!archivo.FileName.EndsWith(".csv", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { message = "El archivo debe ser .csv" });

        var usuarioId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
        var nombreUsuario = User.FindFirst("NombreCompleto")?.Value ?? "Sistema";

        using var reader = new StreamReader(archivo.OpenReadStream());
        var contenido = await reader.ReadToEndAsync();

        var resultado = await _importacionService.ImportarDesdeCSV(contenido, almacenId, usuarioId, nombreUsuario);

        return Ok(resultado);
    }
}
