using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using InventarioTI.API.DTOs;
using InventarioTI.API.Services;

namespace InventarioTI.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Administrador")]
public class TrasladosController : ControllerBase
{
    private readonly ITrasladoService _trasladoService;
    private readonly IZplService _zplService;

    public TrasladosController(ITrasladoService trasladoService, IZplService zplService)
    {
        _trasladoService = trasladoService;
        _zplService = zplService;
    }

    [HttpGet]
    public async Task<ActionResult<ResultadoPaginado<TrasladoDto>>> GetTraslados(
        [FromQuery] int pagina = 1,
        [FromQuery] int elementosPorPagina = 20,
        [FromQuery] int? almacenId = null,
        [FromQuery] DateTime? desde = null,
        [FromQuery] DateTime? hasta = null)
    {
        var result = await _trasladoService.ObtenerTraslados(pagina, elementosPorPagina, almacenId, desde, hasta);
        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<TrasladoDto>> GetTraslado(int id)
    {
        var traslado = await _trasladoService.ObtenerTrasladoPorId(id);
        
        if (traslado == null)
            return NotFound(new { message = "Traslado no encontrado" });

        return Ok(traslado);
    }

    [HttpGet("numero/{numero}")]
    public async Task<ActionResult<TrasladoDto>> GetTrasladoPorNumero(string numero)
    {
        var traslado = await _trasladoService.ObtenerTrasladoPorNumero(numero);
        
        if (traslado == null)
            return NotFound(new { message = "Traslado no encontrado" });

        return Ok(traslado);
    }

    [HttpGet("activo/{activoId}")]
    public async Task<ActionResult<List<TrasladoDto>>> GetTrasladosPorActivo(int activoId)
    {
        var traslados = await _trasladoService.ObtenerTrasladosPorActivo(activoId);
        return Ok(traslados);
    }

    [HttpPost]
    public async Task<ActionResult<TrasladoDto>> CrearTraslado([FromBody] CrearTrasladoRequest request)
    {
        try
        {
            var usuarioId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            var nombreUsuario = User.FindFirst("NombreCompleto")?.Value ?? "Sistema";

            var traslado = await _trasladoService.CrearTraslado(request, usuarioId, nombreUsuario);
            return CreatedAtAction(nameof(GetTraslado), new { id = traslado.Id }, traslado);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("{id}/comprobante")]
    public async Task<ActionResult<string>> GenerarComprobante(int id)
    {
        try
        {
            var zpl = await _zplService.GenerarComprobanteTraslado(id);
            return Ok(new { zpl });
        }
        catch (ArgumentException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }
}
