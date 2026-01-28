using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using InventarioTI.API.DTOs;
using InventarioTI.API.Services;

namespace InventarioTI.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ActivosController : ControllerBase
{
    private readonly IActivoService _activoService;
    private readonly IZplService _zplService;

    public ActivosController(IActivoService activoService, IZplService zplService)
    {
        _activoService = activoService;
        _zplService = zplService;
    }

    [Authorize]
    [HttpGet]
    public async Task<ActionResult<ResultadoPaginado<ActivoDto>>> GetActivos([FromQuery] FiltroActivos filtro)
    {
        var usuarioId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
        var rol = User.FindFirst(ClaimTypes.Role)?.Value;
        var almacenesStr = User.FindFirst("AlmacenesAsignados")?.Value;

        List<int>? almacenesPermitidos = null;
        if (!string.IsNullOrEmpty(almacenesStr))
        {
            almacenesPermitidos = almacenesStr.Split(',').Select(int.Parse).ToList();
        }

        var result = await _activoService.ObtenerActivos(filtro, usuarioId, rol, almacenesPermitidos);
        return Ok(result);
    }

    [Authorize]
    [HttpGet("{id:int}")]
    public async Task<ActionResult<ActivoDetalleDto>> GetActivo(int id)
    {
        var activo = await _activoService.ObtenerActivoPorId(id);
        if (activo == null) return NotFound(new { message = "Activo no encontrado" });
        return Ok(activo);
    }

    [Authorize]
    [HttpGet("codigo/{codigo}")]
    public async Task<ActionResult<ActivoDetalleDto>> GetActivoPorCodigo(string codigo)
    {
        var activo = await _activoService.ObtenerActivoPorCodigo(codigo);
        if (activo == null) return NotFound(new { message = "Activo no encontrado" });
        return Ok(activo);
    }

    [HttpGet("publico/{codigo}")]
    public async Task<ActionResult<ActivoPublicoDto>> GetActivoPublico(string codigo)
    {
        var activo = await _activoService.ObtenerActivoPublico(codigo);
        if (activo == null) return NotFound(new { message = "Activo no encontrado" });
        return Ok(activo);
    }

    [Authorize(Roles = "Administrador")]
    [HttpPost]
    public async Task<ActionResult<ActivoDto>> CrearActivo([FromForm] CrearActivoRequest request)
    {
        try
        {
            var usuarioId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            var nombreUsuario = User.FindFirst("NombreCompleto")?.Value ?? "Sistema";

            var activo = await _activoService.CrearActivo(request, usuarioId, nombreUsuario);
            return CreatedAtAction(nameof(GetActivo), new { id = activo.Id }, activo);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // ÚNICO MÉTODO DE ACTUALIZACIÓN: Soporta fotos desde el Formulario
    [Authorize(Roles = "Administrador")]
    [HttpPut("editar/{id}")]
    public async Task<ActionResult<ActivoDto>> ActualizarActivo(int id, [FromForm] ActualizarActivoRequest request)
    {
        var usuarioId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
        var nombreUsuario = User.FindFirst("NombreCompleto")?.Value ?? "Sistema";

        var activo = await _activoService.ActualizarActivo(id, request, usuarioId, nombreUsuario);

        if (activo == null)
            return NotFound(new { message = "Activo no encontrado" });

        return Ok(activo);
    }

    [Authorize(Roles = "Administrador")]
    [HttpPost("dar-baja/{id}")]
    public async Task<IActionResult> DarBajaActivo(int id, [FromBody] DarBajaActivoRequest request)
    {
        var usuarioId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
        var nombreUsuario = User.FindFirst("NombreCompleto")?.Value ?? "Sistema";

        var result = await _activoService.DarBajaActivo(id, request, usuarioId, nombreUsuario);

        if (!result)
            return NotFound(new { message = "Activo no encontrado" });

        return Ok(new { message = "Activo dado de baja correctamente" });
    }

    [Authorize(Roles = "Administrador")]
    [HttpPost("{id}/reactivar")]
    public async Task<IActionResult> ReactivarActivo(int id)
    {
        var usuarioId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
        var nombreUsuario = User.FindFirst("NombreCompleto")?.Value ?? "Sistema";

        var result = await _activoService.ReactivarActivo(id, usuarioId, nombreUsuario);
        if (!result) return NotFound(new { message = "Activo no encontrado" });
        return Ok(new { message = "Activo reactivado correctamente" });
    }

    [Authorize]
    [HttpGet("marcas")]
    public async Task<ActionResult<List<string>>> GetMarcas()
    {
        var marcas = await _activoService.ObtenerMarcas();
        return Ok(marcas);
    }

    [Authorize(Roles = "Administrador")]
    [HttpPost("etiqueta")]
    public async Task<ActionResult<string>> GenerarEtiqueta([FromBody] string codigoActivo)
    {
        try
        {
            var baseUrl = $"{Request.Scheme}://{Request.Host}";
            var zpl = await _zplService.GenerarEtiquetaIndividual(codigoActivo, baseUrl);
            return Ok(new { zpl });
        }
        catch (ArgumentException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [Authorize(Roles = "Administrador")]
    [HttpPost("etiquetas")]
    public async Task<ActionResult<List<EtiquetaZplResponse>>> GenerarEtiquetas([FromBody] EtiquetaZplRequest request)
    {
        var baseUrl = $"{Request.Scheme}://{Request.Host}";
        var etiquetas = await _zplService.GenerarEtiquetasZpl(request.CodigosActivo, baseUrl);
        return Ok(etiquetas);
    }
}