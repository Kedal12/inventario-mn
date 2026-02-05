using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using InventarioTI.API.DTOs;
using InventarioTI.API.Services;

namespace InventarioTI.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("login")]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest request)
    {
        var result = await _authService.Login(request);
        
        if (result == null)
            return Unauthorized(new { message = "Usuario o contraseña incorrectos" });

        return Ok(result);
    }

    [Authorize]
    [HttpPost("cambiar-password")]
    public async Task<IActionResult> CambiarPassword([FromBody] CambiarPasswordRequest request)
    {
        var usuarioId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
        
        var result = await _authService.CambiarPassword(usuarioId, request);
        
        if (!result)
            return BadRequest(new { message = "Contraseña actual incorrecta" });

        return Ok(new { message = "Contraseña actualizada correctamente" });
    }

    [Authorize]
    [HttpGet("me")]
    public IActionResult GetCurrentUser()
    {
        var usuarioId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var nombreUsuario = User.FindFirst(ClaimTypes.Name)?.Value;
        var nombreCompleto = User.FindFirst("NombreCompleto")?.Value;
        var rol = User.FindFirst(ClaimTypes.Role)?.Value;
        var almacenes = User.FindFirst("AlmacenesAsignados")?.Value;

        return Ok(new
        {
            Id = usuarioId,
            NombreUsuario = nombreUsuario,
            NombreCompleto = nombreCompleto,
            Rol = rol,
            AlmacenesAsignados = string.IsNullOrEmpty(almacenes) 
                ? new List<int>() 
                : almacenes.Split(',').Select(int.Parse).ToList()
        });
    }
}
