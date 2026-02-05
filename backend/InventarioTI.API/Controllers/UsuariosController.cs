using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using InventarioTI.API.Data;
using InventarioTI.API.DTOs;
using InventarioTI.API.Models;

namespace InventarioTI.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Administrador")]
public class UsuariosController : ControllerBase
{
    private readonly InventarioDbContext _context;

    public UsuariosController(InventarioDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<List<UsuarioDto>>> GetUsuarios()
    {
        var usuarios = await _context.Usuarios
            .Include(u => u.AlmacenesAsignados)
            .OrderBy(u => u.NombreCompleto)
            .Select(u => new UsuarioDto(
                u.Id,
                u.NombreUsuario,
                u.NombreCompleto,
                u.Rol,
                u.Activo,
                u.FechaCreacion,
                u.UltimoAcceso,
                u.AlmacenesAsignados.Select(a => a.AlmacenId).ToList()
            ))
            .ToListAsync();

        return Ok(usuarios);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<UsuarioDto>> GetUsuario(int id)
    {
        var usuario = await _context.Usuarios
            .Include(u => u.AlmacenesAsignados)
            .Where(u => u.Id == id)
            .Select(u => new UsuarioDto(
                u.Id,
                u.NombreUsuario,
                u.NombreCompleto,
                u.Rol,
                u.Activo,
                u.FechaCreacion,
                u.UltimoAcceso,
                u.AlmacenesAsignados.Select(a => a.AlmacenId).ToList()
            ))
            .FirstOrDefaultAsync();

        if (usuario == null)
            return NotFound(new { message = "Usuario no encontrado" });

        return Ok(usuario);
    }

    [HttpPost]
    public async Task<ActionResult<UsuarioDto>> CrearUsuario([FromBody] CrearUsuarioRequest request)
    {
        if (await _context.Usuarios.AnyAsync(u => u.NombreUsuario == request.NombreUsuario))
            return BadRequest(new { message = "Ya existe un usuario con ese nombre de usuario" });

        var usuario = new Usuario
        {
            NombreUsuario = request.NombreUsuario,
            NombreCompleto = request.NombreCompleto,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Rol = request.Rol
        };

        _context.Usuarios.Add(usuario);
        await _context.SaveChangesAsync();

        // Asignar almacenes si es consultor
        if (request.Rol == "Consultor" && request.AlmacenesAsignados?.Any() == true)
        {
            foreach (var almacenId in request.AlmacenesAsignados)
            {
                _context.UsuarioAlmacenes.Add(new UsuarioAlmacen
                {
                    UsuarioId = usuario.Id,
                    AlmacenId = almacenId
                });
            }
            await _context.SaveChangesAsync();
        }

        return CreatedAtAction(nameof(GetUsuario), new { id = usuario.Id },
            new UsuarioDto(
                usuario.Id,
                usuario.NombreUsuario,
                usuario.NombreCompleto,
                usuario.Rol,
                usuario.Activo,
                usuario.FechaCreacion,
                usuario.UltimoAcceso,
                request.AlmacenesAsignados
            ));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<UsuarioDto>> ActualizarUsuario(int id, [FromBody] ActualizarUsuarioRequest request)
    {
        var usuario = await _context.Usuarios
            .Include(u => u.AlmacenesAsignados)
            .FirstOrDefaultAsync(u => u.Id == id);

        if (usuario == null)
            return NotFound(new { message = "Usuario no encontrado" });

        if (request.NombreCompleto != null)
            usuario.NombreCompleto = request.NombreCompleto;

        if (request.Rol != null)
            usuario.Rol = request.Rol;

        if (request.Activo.HasValue)
            usuario.Activo = request.Activo.Value;

        // Actualizar almacenes asignados
        if (request.AlmacenesAsignados != null)
        {
            // Eliminar asignaciones anteriores
            _context.UsuarioAlmacenes.RemoveRange(usuario.AlmacenesAsignados);
            
            // Agregar nuevas asignaciones
            if (usuario.Rol == "Consultor")
            {
                foreach (var almacenId in request.AlmacenesAsignados)
                {
                    _context.UsuarioAlmacenes.Add(new UsuarioAlmacen
                    {
                        UsuarioId = usuario.Id,
                        AlmacenId = almacenId
                    });
                }
            }
        }

        await _context.SaveChangesAsync();

        return Ok(new UsuarioDto(
            usuario.Id,
            usuario.NombreUsuario,
            usuario.NombreCompleto,
            usuario.Rol,
            usuario.Activo,
            usuario.FechaCreacion,
            usuario.UltimoAcceso,
            request.AlmacenesAsignados ?? usuario.AlmacenesAsignados.Select(a => a.AlmacenId).ToList()
        ));
    }

    [HttpPost("{id}/reset-password")]
    public async Task<IActionResult> ResetPassword(int id, [FromBody] string nuevaPassword)
    {
        var usuario = await _context.Usuarios.FindAsync(id);
        if (usuario == null)
            return NotFound(new { message = "Usuario no encontrado" });

        usuario.PasswordHash = BCrypt.Net.BCrypt.HashPassword(nuevaPassword);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Contraseña actualizada correctamente" });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> EliminarUsuario(int id)
    {
        var usuario = await _context.Usuarios
            .Include(u => u.AlmacenesAsignados)
            .FirstOrDefaultAsync(u => u.Id == id);

        if (usuario == null)
            return NotFound(new { message = "Usuario no encontrado" });

        if (usuario.NombreUsuario == "admin")
            return BadRequest(new { message = "No se puede eliminar el usuario administrador" });

        _context.UsuarioAlmacenes.RemoveRange(usuario.AlmacenesAsignados);
        _context.Usuarios.Remove(usuario);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Usuario eliminado correctamente" });
    }
}
