using Microsoft.EntityFrameworkCore;
using InventarioTI.API.Data;
using InventarioTI.API.DTOs;
using InventarioTI.API.Models;

namespace InventarioTI.API.Services;

public interface IHistorialService
{
    Task RegistrarCambio(int activoId, string tipoCambio, string campo, string? valorAnterior, string? valorNuevo, string? descripcion, int? usuarioId, string? nombreUsuario, string? ipAddress = null);
    Task<List<HistorialActivoDto>> ObtenerHistorialPorActivo(int activoId, int cantidad = 50);
}

public class HistorialService : IHistorialService
{
    private readonly InventarioDbContext _context;

    public HistorialService(InventarioDbContext context)
    {
        _context = context;
    }

    public async Task RegistrarCambio(
        int activoId, 
        string tipoCambio, 
        string campo, 
        string? valorAnterior, 
        string? valorNuevo, 
        string? descripcion, 
        int? usuarioId, 
        string? nombreUsuario,
        string? ipAddress = null)
    {
        var historial = new HistorialActivo
        {
            ActivoId = activoId,
            TipoCambio = tipoCambio,
            Campo = campo,
            ValorAnterior = valorAnterior,
            ValorNuevo = valorNuevo,
            Descripcion = descripcion,
            UsuarioId = usuarioId,
            NombreUsuario = nombreUsuario,
            FechaCambio = DateTime.Now,
            IpAddress = ipAddress
        };

        _context.HistorialActivos.Add(historial);
        await _context.SaveChangesAsync();
    }

    public async Task<List<HistorialActivoDto>> ObtenerHistorialPorActivo(int activoId, int cantidad = 50)
    {
        var historial = await _context.HistorialActivos
            .Where(h => h.ActivoId == activoId)
            .OrderByDescending(h => h.FechaCambio)
            .Take(cantidad)
            .Select(h => new HistorialActivoDto(
                h.Id,
                h.TipoCambio,
                h.Campo,
                h.ValorAnterior,
                h.ValorNuevo,
                h.Descripcion,
                h.NombreUsuario,
                h.FechaCambio
            ))
            .ToListAsync();

        return historial;
    }
}
