using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using InventarioTI.API.Data;
using InventarioTI.API.DTOs;
using InventarioTI.API.Models;

namespace InventarioTI.API.Services;

public interface IAuthService
{
    Task<LoginResponse?> Login(LoginRequest request);
    Task<bool> CambiarPassword(int usuarioId, CambiarPasswordRequest request);
    string GenerarToken(Usuario usuario);
}

public class AuthService : IAuthService
{
    private readonly InventarioDbContext _context;
    private readonly IConfiguration _configuration;

    public AuthService(InventarioDbContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
    }

    public async Task<LoginResponse?> Login(LoginRequest request)
    {
        var usuario = await _context.Usuarios
            .Include(u => u.AlmacenesAsignados)
            .FirstOrDefaultAsync(u => u.NombreUsuario == request.NombreUsuario && u.Activo);

        if (usuario == null)
            return null;

        if (!BCrypt.Net.BCrypt.Verify(request.Password, usuario.PasswordHash))
            return null;

        // Actualizar último acceso
        usuario.UltimoAcceso = DateTime.Now;
        await _context.SaveChangesAsync();

        var token = GenerarToken(usuario);
        var expiration = DateTime.Now.AddHours(12);

        var usuarioDto = new UsuarioDto(
            usuario.Id,
            usuario.NombreUsuario,
            usuario.NombreCompleto,
            usuario.Rol,
            usuario.Activo,
            usuario.FechaCreacion,
            usuario.UltimoAcceso,
            usuario.AlmacenesAsignados.Select(a => a.AlmacenId).ToList()
        );

        return new LoginResponse(token, usuarioDto, expiration);
    }

    public async Task<bool> CambiarPassword(int usuarioId, CambiarPasswordRequest request)
    {
        var usuario = await _context.Usuarios.FindAsync(usuarioId);
        if (usuario == null)
            return false;

        if (!BCrypt.Net.BCrypt.Verify(request.PasswordActual, usuario.PasswordHash))
            return false;

        usuario.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.PasswordNuevo);
        await _context.SaveChangesAsync();

        return true;
    }

    public string GenerarToken(Usuario usuario)
    {
        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(_configuration["Jwt:Key"] ?? "ICG-InventarioTI-SecretKey-2025-SuperSegura!@#$%")
        );
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, usuario.Id.ToString()),
            new(ClaimTypes.Name, usuario.NombreUsuario),
            new("NombreCompleto", usuario.NombreCompleto),
            new(ClaimTypes.Role, usuario.Rol)
        };

        // Agregar almacenes asignados si es consultor
        if (usuario.Rol == "Consultor" && usuario.AlmacenesAsignados.Any())
        {
            claims.Add(new Claim("AlmacenesAsignados", 
                string.Join(",", usuario.AlmacenesAsignados.Select(a => a.AlmacenId))));
        }

        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"] ?? "InventarioTI.API",
            audience: _configuration["Jwt:Audience"] ?? "InventarioTI.Client",
            claims: claims,
            expires: DateTime.Now.AddHours(12),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
