using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using InventarioTI.API.DTOs;
using InventarioTI.API.Services;

namespace InventarioTI.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Administrador")]
public class ConciliacionController : ControllerBase
{
    private readonly IConciliacionService _conciliacionService;

    public ConciliacionController(IConciliacionService conciliacionService)
    {
        _conciliacionService = conciliacionService;
    }

    /// <summary>
    /// Realiza la conciliación de inventario para un almacén.
    /// Recibe la lista de códigos escaneados y compara contra la base de datos.
    /// </summary>
    [HttpPost("almacen")]
    public async Task<ActionResult<ConciliacionResultadoDto>> ConciliarAlmacen([FromBody] ConciliacionRequest request)
    {
        if (request.CodigosEscaneados == null || !request.CodigosEscaneados.Any())
            return BadRequest(new { message = "Debe proporcionar al menos un código escaneado" });

        try
        {
            var resultado = await _conciliacionService.ConciliarAlmacen(
                request.AlmacenId,
                request.CodigosEscaneados
            );
            return Ok(resultado);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Verifica un código individual en tiempo real (para escaneo rápido desde celular)
    /// </summary>
    [HttpPost("verificar")]
    public async Task<ActionResult<EscaneoRapidoResultadoDto>> VerificarCodigo([FromBody] EscaneoRapidoRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Codigo))
            return BadRequest(new { message = "Código requerido" });

        var resultado = await _conciliacionService.VerificarCodigo(request.AlmacenId, request.Codigo.Trim());
        return Ok(resultado);
    }

    /// <summary>
    /// Marca múltiples activos como inventariados (actualiza FechaUltimoInventario)
    /// </summary>
    [HttpPost("marcar-inventariados")]
    public async Task<ActionResult<object>> MarcarInventariados([FromBody] List<string> codigos)
    {
        if (codigos == null || !codigos.Any())
            return BadRequest(new { message = "Debe proporcionar al menos un código" });

        var actualizados = await _conciliacionService.MarcarInventarioRealizado(codigos);
        return Ok(new { actualizados, mensaje = $"{actualizados} activos marcados como inventariados" });
    }
}
