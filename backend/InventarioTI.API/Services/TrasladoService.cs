using Microsoft.EntityFrameworkCore;
using InventarioTI.API.Data;
using InventarioTI.API.DTOs;
using InventarioTI.API.Models;

namespace InventarioTI.API.Services;

public interface ITrasladoService
{
    Task<ResultadoPaginado<TrasladoDto>> ObtenerTraslados(int pagina, int elementosPorPagina, int? almacenId = null, DateTime? desde = null, DateTime? hasta = null);
    Task<TrasladoDto?> ObtenerTrasladoPorId(int id);
    Task<TrasladoDto?> ObtenerTrasladoPorNumero(string numero);
    Task<TrasladoDto> CrearTraslado(CrearTrasladoRequest request, int usuarioId, string nombreUsuario);
    Task<List<TrasladoDto>> ObtenerTrasladosPorActivo(int activoId);
}

public class TrasladoService : ITrasladoService
{
    private readonly InventarioDbContext _context;
    private readonly IHistorialService _historialService;

    public TrasladoService(InventarioDbContext context, IHistorialService historialService)
    {
        _context = context;
        _historialService = historialService;
    }

    public async Task<ResultadoPaginado<TrasladoDto>> ObtenerTraslados(
        int pagina, 
        int elementosPorPagina, 
        int? almacenId = null,
        DateTime? desde = null,
        DateTime? hasta = null)
    {
        var query = _context.Traslados
            .Include(t => t.Activo)
            .Include(t => t.AlmacenOrigen)
            .Include(t => t.AlmacenDestino)
            .AsQueryable();

        if (almacenId.HasValue)
        {
            query = query.Where(t => t.AlmacenOrigenId == almacenId || t.AlmacenDestinoId == almacenId);
        }

        if (desde.HasValue)
            query = query.Where(t => t.FechaTraslado >= desde.Value);

        if (hasta.HasValue)
            query = query.Where(t => t.FechaTraslado <= hasta.Value);

        var totalItems = await query.CountAsync();
        var totalPaginas = (int)Math.Ceiling(totalItems / (double)elementosPorPagina);

        var items = await query
            .OrderByDescending(t => t.FechaTraslado)
            .Skip((pagina - 1) * elementosPorPagina)
            .Take(elementosPorPagina)
            .Select(t => new TrasladoDto(
                t.Id,
                t.NumeroTraslado,
                t.ActivoId,
                t.Activo.CodigoInterno,
                $"{t.Activo.Marca} {t.Activo.Modelo}",
                t.AlmacenOrigenId,
                t.AlmacenOrigen.Nombre,
                t.AlmacenDestinoId,
                t.AlmacenDestino.Nombre,
                t.Motivo,
                t.FechaTraslado,
                t.NombreUsuario,
                t.Observaciones
            ))
            .ToListAsync();

        return new ResultadoPaginado<TrasladoDto>(
            items,
            totalItems,
            pagina,
            totalPaginas,
            elementosPorPagina
        );
    }

    public async Task<TrasladoDto?> ObtenerTrasladoPorId(int id)
    {
        var traslado = await _context.Traslados
            .Include(t => t.Activo)
            .Include(t => t.AlmacenOrigen)
            .Include(t => t.AlmacenDestino)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (traslado == null)
            return null;

        return MapToDto(traslado);
    }

    public async Task<TrasladoDto?> ObtenerTrasladoPorNumero(string numero)
    {
        var traslado = await _context.Traslados
            .Include(t => t.Activo)
            .Include(t => t.AlmacenOrigen)
            .Include(t => t.AlmacenDestino)
            .FirstOrDefaultAsync(t => t.NumeroTraslado == numero);

        if (traslado == null)
            return null;

        return MapToDto(traslado);
    }

    public async Task<TrasladoDto> CrearTraslado(CrearTrasladoRequest request, int usuarioId, string nombreUsuario)
    {
        var activo = await _context.Activos
            .Include(a => a.Almacen)
            .FirstOrDefaultAsync(a => a.Id == request.ActivoId);

        if (activo == null)
            throw new ArgumentException("Activo no encontrado");

        if (activo.AlmacenId == request.AlmacenDestinoId)
            throw new ArgumentException("El activo ya se encuentra en el almacén destino");

        var almacenDestino = await _context.Almacenes.FindAsync(request.AlmacenDestinoId);
        if (almacenDestino == null)
            throw new ArgumentException("Almacén destino no encontrado");

        // Generar número de traslado
        var numeroTraslado = await GenerarNumeroTraslado();

        var traslado = new Traslado
        {
            NumeroTraslado = numeroTraslado,
            ActivoId = request.ActivoId,
            AlmacenOrigenId = activo.AlmacenId,
            AlmacenDestinoId = request.AlmacenDestinoId,
            Motivo = request.Motivo,
            FechaTraslado = DateTime.Now,
            UsuarioId = usuarioId,
            NombreUsuario = nombreUsuario,
            Observaciones = request.Observaciones
        };

        _context.Traslados.Add(traslado);

        // Actualizar ubicación del activo
        var almacenOrigenNombre = activo.Almacen.Nombre;
        activo.AlmacenId = request.AlmacenDestinoId;

        // Registrar en historial
        await _historialService.RegistrarCambio(
            activo.Id,
            "Traslado",
            "Almacen",
            almacenOrigenNombre,
            almacenDestino.Nombre,
            $"Traslado {numeroTraslado}: {request.Motivo}",
            usuarioId,
            nombreUsuario
        );

        await _context.SaveChangesAsync();

        // Recargar relaciones
        await _context.Entry(traslado).Reference(t => t.Activo).LoadAsync();
        await _context.Entry(traslado).Reference(t => t.AlmacenOrigen).LoadAsync();
        await _context.Entry(traslado).Reference(t => t.AlmacenDestino).LoadAsync();

        return MapToDto(traslado);
    }

    public async Task<List<TrasladoDto>> ObtenerTrasladosPorActivo(int activoId)
    {
        var traslados = await _context.Traslados
            .Include(t => t.Activo)
            .Include(t => t.AlmacenOrigen)
            .Include(t => t.AlmacenDestino)
            .Where(t => t.ActivoId == activoId)
            .OrderByDescending(t => t.FechaTraslado)
            .ToListAsync();

        return traslados.Select(MapToDto).ToList();
    }

    private async Task<string> GenerarNumeroTraslado()
    {
        var fecha = DateTime.Now.ToString("yyyyMMdd");
        var prefijo = $"TRS-{fecha}-";

        var ultimoTraslado = await _context.Traslados
            .Where(t => t.NumeroTraslado.StartsWith(prefijo))
            .OrderByDescending(t => t.NumeroTraslado)
            .FirstOrDefaultAsync();

        int consecutivo = 1;
        if (ultimoTraslado != null)
        {
            var partes = ultimoTraslado.NumeroTraslado.Split('-');
            if (partes.Length == 3 && int.TryParse(partes[2], out int ultimo))
            {
                consecutivo = ultimo + 1;
            }
        }

        return $"{prefijo}{consecutivo:D4}";
    }

    private static TrasladoDto MapToDto(Traslado traslado)
    {
        return new TrasladoDto(
            traslado.Id,
            traslado.NumeroTraslado,
            traslado.ActivoId,
            traslado.Activo.CodigoInterno,
            $"{traslado.Activo.Marca} {traslado.Activo.Modelo}",
            traslado.AlmacenOrigenId,
            traslado.AlmacenOrigen.Nombre,
            traslado.AlmacenDestinoId,
            traslado.AlmacenDestino.Nombre,
            traslado.Motivo,
            traslado.FechaTraslado,
            traslado.NombreUsuario,
            traslado.Observaciones
        );
    }
}
