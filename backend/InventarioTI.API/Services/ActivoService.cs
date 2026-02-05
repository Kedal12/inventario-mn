using Microsoft.EntityFrameworkCore;
using InventarioTI.API.Data;
using InventarioTI.API.DTOs;
using InventarioTI.API.Models;

namespace InventarioTI.API.Services;

public interface IActivoService
{
    Task<ResultadoPaginado<ActivoDto>> ObtenerActivos(FiltroActivos filtro, int? usuarioId = null, string? rol = null, List<int>? almacenesPermitidos = null);
    Task<ActivoDetalleDto?> ObtenerActivoPorId(int id);
    Task<ActivoDetalleDto?> ObtenerActivoPorCodigo(string codigo);
    Task<ActivoPublicoDto?> ObtenerActivoPublico(string codigo);
    Task<ActivoDto> CrearActivo(CrearActivoRequest request, int usuarioId, string nombreUsuario);
    Task<ActivoDto?> ActualizarActivo(int id, ActualizarActivoRequest request, int usuarioId, string nombreUsuario);
    Task<bool> DarBajaActivo(int id, DarBajaActivoRequest request, int usuarioId, string nombreUsuario);
    Task<bool> ReactivarActivo(int id, int usuarioId, string nombreUsuario);
    Task<bool> EliminarActivo(int id);
    Task<List<string>> ObtenerMarcas();
    Task<string> GenerarCodigoInterno(int tipoActivoId);
}

public class ActivoService : IActivoService
{
    private readonly InventarioDbContext _context;
    private readonly IHistorialService _historialService;

    public ActivoService(InventarioDbContext context, IHistorialService historialService)
    {
        _context = context;
        _historialService = historialService;
    }

    public async Task<ResultadoPaginado<ActivoDto>> ObtenerActivos(
        FiltroActivos filtro,
        int? usuarioId = null,
        string? rol = null,
        List<int>? almacenesPermitidos = null)
    {
        var query = _context.Activos
            .Include(a => a.TipoActivo)
            .Include(a => a.Almacen)
            .Include(a => a.Estado)
            .AsQueryable();

        // Filtrar por almacenes permitidos si es consultor
        if (rol == "Consultor" && almacenesPermitidos?.Any() == true)
        {
            query = query.Where(a => almacenesPermitidos.Contains(a.AlmacenId));
        }

        // Aplicar filtros
        if (!string.IsNullOrWhiteSpace(filtro.Busqueda))
        {
            var busqueda = filtro.Busqueda.ToLower();
            query = query.Where(a =>
                a.CodigoInterno.ToLower().Contains(busqueda) ||
                (a.SerialFabricante != null && a.SerialFabricante.ToLower().Contains(busqueda)) ||
                a.Marca.ToLower().Contains(busqueda) ||
                a.Modelo.ToLower().Contains(busqueda) ||
                (a.Descripcion != null && a.Descripcion.ToLower().Contains(busqueda)) ||
                a.TipoActivo.Nombre.ToLower().Contains(busqueda) ||
                a.Almacen.Nombre.ToLower().Contains(busqueda)
            );
        }

        if (filtro.AlmacenId.HasValue)
            query = query.Where(a => a.AlmacenId == filtro.AlmacenId);

        if (filtro.TipoActivoId.HasValue)
            query = query.Where(a => a.TipoActivoId == filtro.TipoActivoId);

        if (filtro.EstadoId.HasValue)
            query = query.Where(a => a.EstadoId == filtro.EstadoId);

        if (!string.IsNullOrWhiteSpace(filtro.Marca))
            query = query.Where(a => a.Marca.ToLower() == filtro.Marca.ToLower());

        if (filtro.FechaDesde.HasValue)
            query = query.Where(a => a.FechaIngreso >= filtro.FechaDesde.Value);

        if (filtro.FechaHasta.HasValue)
            query = query.Where(a => a.FechaIngreso <= filtro.FechaHasta.Value);

        // Ordenamiento
        query = filtro.OrdenarPor?.ToLower() switch
        {
            "codigointerno" => filtro.Descendente ? query.OrderByDescending(a => a.CodigoInterno) : query.OrderBy(a => a.CodigoInterno),
            "marca" => filtro.Descendente ? query.OrderByDescending(a => a.Marca) : query.OrderBy(a => a.Marca),
            "modelo" => filtro.Descendente ? query.OrderByDescending(a => a.Modelo) : query.OrderBy(a => a.Modelo),
            "almacen" => filtro.Descendente ? query.OrderByDescending(a => a.Almacen.Nombre) : query.OrderBy(a => a.Almacen.Nombre),
            "tipo" => filtro.Descendente ? query.OrderByDescending(a => a.TipoActivo.Nombre) : query.OrderBy(a => a.TipoActivo.Nombre),
            "estado" => filtro.Descendente ? query.OrderByDescending(a => a.Estado.Nombre) : query.OrderBy(a => a.Estado.Nombre),
            _ => filtro.Descendente ? query.OrderByDescending(a => a.FechaIngreso) : query.OrderBy(a => a.FechaIngreso)
        };

        var totalItems = await query.CountAsync();
        var totalPaginas = (int)Math.Ceiling(totalItems / (double)filtro.ElementosPorPagina);

        var items = await query
            .Skip((filtro.Pagina - 1) * filtro.ElementosPorPagina)
            .Take(filtro.ElementosPorPagina)
            .Select(a => new ActivoDto(
                a.Id,
                a.CodigoInterno,
                a.SerialFabricante,
                a.Marca,
                a.Modelo,
                a.Descripcion,
                a.TipoActivoId,
                a.TipoActivo.Nombre,
                a.TipoActivo.Referencia,
                a.AlmacenId,
                a.Almacen.Nombre,
                a.Almacen.Codigo,
                a.EstadoId,
                a.Estado.Nombre,
                a.Estado.Color,
                a.FechaIngreso,
                a.FechaUltimoInventario,
                a.FechaBaja,
                a.MotivoBaja,
                a.Observaciones,
                $"/activo/{a.CodigoInterno}"
            ))
            .ToListAsync();

        return new ResultadoPaginado<ActivoDto>(
            items,
            totalItems,
            filtro.Pagina,
            totalPaginas,
            filtro.ElementosPorPagina
        );
    }

    public async Task<ActivoDetalleDto?> ObtenerActivoPorId(int id)
    {
        var activo = await _context.Activos
            .Include(a => a.TipoActivo)
            .Include(a => a.Almacen)
            .Include(a => a.Estado)
            .Include(a => a.Historial.OrderByDescending(h => h.FechaCambio).Take(50))
            .FirstOrDefaultAsync(a => a.Id == id);

        if (activo == null)
            return null;

        var traslados = await _context.Traslados
            .Include(t => t.AlmacenOrigen)
            .Include(t => t.AlmacenDestino)
            .Where(t => t.ActivoId == id)
            .OrderByDescending(t => t.FechaTraslado)
            .Take(20)
            .ToListAsync();

        return MapToDetalleDto(activo, traslados);
    }

    public async Task<ActivoDetalleDto?> ObtenerActivoPorCodigo(string codigo)
    {
        var activo = await _context.Activos
            .Include(a => a.TipoActivo)
            .Include(a => a.Almacen)
            .Include(a => a.Estado)
            .Include(a => a.Historial.OrderByDescending(h => h.FechaCambio).Take(50))
            .FirstOrDefaultAsync(a => a.CodigoInterno == codigo);

        if (activo == null)
            return null;

        var traslados = await _context.Traslados
            .Include(t => t.AlmacenOrigen)
            .Include(t => t.AlmacenDestino)
            .Where(t => t.ActivoId == activo.Id)
            .OrderByDescending(t => t.FechaTraslado)
            .Take(20)
            .ToListAsync();

        return MapToDetalleDto(activo, traslados);
    }

    public async Task<ActivoPublicoDto?> ObtenerActivoPublico(string codigo)
    {
        // Esto hará que si buscas MN-057-00001 o ICG-057-00001,
        // el sistema busque solo por la parte numérica final en la base de datos.
        var parteNumerica = codigo.Split('-').Last();

        var activo = await _context.Activos
            .Include(a => a.TipoActivo)
            .Include(a => a.Almacen)
            .Include(a => a.Estado)
            .FirstOrDefaultAsync(a => a.CodigoInterno.EndsWith(parteNumerica));

        if (activo == null) return null;

        return new ActivoPublicoDto(
            activo.CodigoInterno.Replace("ICG-", "MN-"), // Mostramos siempre MN al usuario
            activo.Marca,
            activo.Modelo,
            activo.Descripcion,
            activo.TipoActivo.Nombre,
            activo.Almacen.Nombre,
            activo.Estado.Nombre,
            activo.Estado.Color,
            activo.FechaIngreso,
            activo.FechaUltimoInventario,
            activo.FotoUrl
            );
    }

    public async Task<ActivoDto> CrearActivo(CrearActivoRequest request, int usuarioId, string nombreUsuario)
    {
        var codigoInterno = await GenerarCodigoInterno(request.TipoActivoId);

        var activo = new Activo
        {
            CodigoInterno = codigoInterno,
            SerialFabricante = request.SerialFabricante,
            Marca = request.Marca,
            Modelo = request.Modelo,
            Descripcion = request.Descripcion,
            TipoActivoId = request.TipoActivoId,
            AlmacenId = request.AlmacenId,
            EstadoId = request.EstadoId ?? 1,
            FechaIngreso = DateTime.Now,
            FechaUltimoInventario = DateTime.Now,
            Observaciones = request.Observaciones,
            UsuarioRegistroId = usuarioId
        };

        // GUARDAR FOTO SI EXISTE
        if (request.Foto != null)
        {
            string folderPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "activos");
            if (!Directory.Exists(folderPath)) Directory.CreateDirectory(folderPath);

            string fileName = $"{Guid.NewGuid()}{Path.GetExtension(request.Foto.FileName)}";
            string filePath = Path.Combine(folderPath, fileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await request.Foto.CopyToAsync(stream);
            }

            activo.FotoUrl = $"/uploads/activos/{fileName}";
        }

        _context.Activos.Add(activo);
        await _context.SaveChangesAsync();

        // Registrar en historial
        await _historialService.RegistrarCambio(
            activo.Id,
            "Creacion",
            "Activo",
            null,
            codigoInterno,
            "Activo creado en el sistema",
            usuarioId,
            nombreUsuario
        );

        // Recargar con relaciones
        await _context.Entry(activo).Reference(a => a.TipoActivo).LoadAsync();
        await _context.Entry(activo).Reference(a => a.Almacen).LoadAsync();
        await _context.Entry(activo).Reference(a => a.Estado).LoadAsync();

        return MapToDto(activo);
    }

    public async Task<ActivoDto?> ActualizarActivo(int id, ActualizarActivoRequest request, int usuarioId, string nombreUsuario)
    {
        var activo = await _context.Activos
            .Include(a => a.TipoActivo)
            .Include(a => a.Almacen)
            .Include(a => a.Estado)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (activo == null)
            return null;

        // Registrar cambios en historial
        if (request.SerialFabricante != null && request.SerialFabricante != activo.SerialFabricante)
        {
            await _historialService.RegistrarCambio(id, "Edicion", "SerialFabricante",
                activo.SerialFabricante, request.SerialFabricante, null, usuarioId, nombreUsuario);
            activo.SerialFabricante = request.SerialFabricante;
        }

        if (request.Marca != null && request.Marca != activo.Marca)
        {
            await _historialService.RegistrarCambio(id, "Edicion", "Marca",
                activo.Marca, request.Marca, null, usuarioId, nombreUsuario);
            activo.Marca = request.Marca;
        }

        if (request.Modelo != null && request.Modelo != activo.Modelo)
        {
            await _historialService.RegistrarCambio(id, "Edicion", "Modelo",
                activo.Modelo, request.Modelo, null, usuarioId, nombreUsuario);
            activo.Modelo = request.Modelo;
        }

        if (request.Descripcion != null && request.Descripcion != activo.Descripcion)
        {
            await _historialService.RegistrarCambio(id, "Edicion", "Descripcion",
                activo.Descripcion, request.Descripcion, null, usuarioId, nombreUsuario);
            activo.Descripcion = request.Descripcion;
        }

        if (request.TipoActivoId.HasValue && request.TipoActivoId != activo.TipoActivoId)
        {
            var tipoAnterior = activo.TipoActivo.Nombre;
            var tipoNuevo = await _context.TiposActivo.FindAsync(request.TipoActivoId.Value);
            await _historialService.RegistrarCambio(id, "Edicion", "TipoActivo",
                tipoAnterior, tipoNuevo?.Nombre, null, usuarioId, nombreUsuario);
            activo.TipoActivoId = request.TipoActivoId.Value;
        }

        if (request.EstadoId.HasValue && request.EstadoId != activo.EstadoId)
        {
            var estadoAnterior = activo.Estado.Nombre;
            var estadoNuevo = await _context.EstadosActivo.FindAsync(request.EstadoId.Value);
            await _historialService.RegistrarCambio(id, "CambioEstado", "Estado",
                estadoAnterior, estadoNuevo?.Nombre, null, usuarioId, nombreUsuario);
            activo.EstadoId = request.EstadoId.Value;
        }

        if (request.Observaciones != null && request.Observaciones != activo.Observaciones)
        {
            await _historialService.RegistrarCambio(id, "Edicion", "Observaciones",
                activo.Observaciones, request.Observaciones, null, usuarioId, nombreUsuario);
            activo.Observaciones = request.Observaciones;
        }
        // LÓGICA PARA LA FOTO
        if (request.Foto != null)
        {
            // 1. Definir la ruta de la carpeta (wwwroot/uploads/activos)
            string folderPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "activos");
            if (!Directory.Exists(folderPath)) Directory.CreateDirectory(folderPath);

            // 2. Crear un nombre único para el archivo para evitar sobrescritura
            string fileName = $"{Guid.NewGuid()}{Path.GetExtension(request.Foto.FileName)}";
            string filePath = Path.Combine(folderPath, fileName);

            // 3. Guardar el archivo físico en el servidor
            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await request.Foto.CopyToAsync(stream);
            }

            // 4. Guardar la URL RELATIVA en la base de datos
            activo.FotoUrl = $"/uploads/activos/{fileName}";
        }

        await _context.SaveChangesAsync();

        // Recargar relaciones
        await _context.Entry(activo).Reference(a => a.TipoActivo).LoadAsync();
        await _context.Entry(activo).Reference(a => a.Almacen).LoadAsync();
        await _context.Entry(activo).Reference(a => a.Estado).LoadAsync();

        return MapToDto(activo);
    }

    public async Task<bool> DarBajaActivo(int id, DarBajaActivoRequest request, int usuarioId, string nombreUsuario)
    {
        var activo = await _context.Activos
            .Include(a => a.Estado)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (activo == null)
            return false;

        var estadoAnterior = activo.Estado.Nombre;
        activo.EstadoId = 5; // Dado de Baja
        activo.FechaBaja = DateTime.Now;
        activo.MotivoBaja = request.Motivo;

        await _historialService.RegistrarCambio(id, "Baja", "Estado",
            estadoAnterior, "Dado de Baja", $"Motivo: {request.Motivo}", usuarioId, nombreUsuario);

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> ReactivarActivo(int id, int usuarioId, string nombreUsuario)
    {
        var activo = await _context.Activos.FindAsync(id);
        if (activo == null)
            return false;

        activo.EstadoId = 1; // Disponible
        activo.FechaBaja = null;
        activo.MotivoBaja = null;

        await _historialService.RegistrarCambio(id, "Reactivacion", "Estado",
            "Dado de Baja", "Disponible", "Activo reactivado", usuarioId, nombreUsuario);

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<List<string>> ObtenerMarcas()
    {
        return await _context.Activos
            .Select(a => a.Marca)
            .Distinct()
            .OrderBy(m => m)
            .ToListAsync();
    }

    public async Task<string> GenerarCodigoInterno(int tipoActivoId)
    {
        var tipo = await _context.TiposActivo.FindAsync(tipoActivoId);
        if (tipo == null)
            throw new ArgumentException("Tipo de activo no encontrado");

        // NUEVO FORMATO: MN-REF-XXXXX (ej: MN-057-00001)
        var refNum = tipo.Referencia.Replace("REF.", "").PadLeft(3, '0');

        // Obtener el último activo de este tipo para seguir la secuencia
        var ultimoActivo = await _context.Activos
            .Where(a => a.TipoActivoId == tipoActivoId)
            .OrderByDescending(a => a.Id)
            .FirstOrDefaultAsync();

        int consecutivo = 1;
        if (ultimoActivo != null)
        {
            // Extraemos el número final (partes[2]) sin importar si el prefijo era ICG o MN
            var partes = ultimoActivo.CodigoInterno.Split('-');
            if (partes.Length == 3 && int.TryParse(partes[2], out int ultimo))
            {
                consecutivo = ultimo + 1;
            }
            else
            {
                consecutivo = await _context.Activos.CountAsync(a => a.TipoActivoId == tipoActivoId) + 1;
            }
        }

        // Retornamos con el nuevo prefijo MN
        return $"MN-{refNum}-{consecutivo:D5}";
    }

    public async Task<bool> EliminarActivo(int id)
    {
        var activo = await _context.Activos.FindAsync(id);

        if (activo == null)
            return false;

        // Eliminar traslados asociados
        var traslados = await _context.Traslados.Where(t => t.ActivoId == id).ToListAsync();
        if (traslados.Any())
        {
            _context.Traslados.RemoveRange(traslados);
        }

        // Eliminar historial asociado
        var historial = await _context.HistorialActivos.Where(h => h.ActivoId == id).ToListAsync();
        if (historial.Any())
        {
            _context.HistorialActivos.RemoveRange(historial);
        }

        // Eliminar foto física si existe
        if (!string.IsNullOrEmpty(activo.FotoUrl))
        {
            var rutaCompleta = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", activo.FotoUrl.TrimStart('/'));
            if (File.Exists(rutaCompleta))
            {
                File.Delete(rutaCompleta);
            }
        }

        // Eliminar el activo
        _context.Activos.Remove(activo);
        await _context.SaveChangesAsync();

        return true;
    }

    private static ActivoDto MapToDto(Activo activo)
    {
        return new ActivoDto(
            activo.Id,
            activo.CodigoInterno,
            activo.SerialFabricante,
            activo.Marca,
            activo.Modelo,
            activo.Descripcion,
            activo.TipoActivoId,
            activo.TipoActivo.Nombre,
            activo.TipoActivo.Referencia,
            activo.AlmacenId,
            activo.Almacen.Nombre,
            activo.Almacen.Codigo,
            activo.EstadoId,
            activo.Estado.Nombre,
            activo.Estado.Color,
            activo.FechaIngreso,
            activo.FechaUltimoInventario,
            activo.FechaBaja,
            activo.MotivoBaja,
            activo.Observaciones,
            $"/activo/{activo.CodigoInterno}"
        );
    }

    private static ActivoDetalleDto MapToDetalleDto(Activo activo, List<Traslado> traslados)
    {
        return new ActivoDetalleDto(
            activo.Id,
            activo.CodigoInterno,
            activo.SerialFabricante,
            activo.Marca,
            activo.Modelo,
            activo.Descripcion,
            new TipoActivoDto(
                activo.TipoActivo.Id,
                activo.TipoActivo.Nombre,
                activo.TipoActivo.Referencia,
                activo.TipoActivo.Descripcion,
                activo.TipoActivo.Activo,
                0
            ),
            new AlmacenDto(
                activo.Almacen.Id,
                activo.Almacen.Nombre,
                activo.Almacen.Codigo,
                activo.Almacen.Direccion,
                activo.Almacen.Telefono,
                activo.Almacen.Responsable,
                activo.Almacen.Activo,
                0
            ),
            new EstadoActivoDto(
                activo.Estado.Id,
                activo.Estado.Nombre,
                activo.Estado.Color,
                activo.Estado.Descripcion,
                activo.Estado.Orden,
                0
            ),
            activo.FechaIngreso,
            activo.FechaUltimoInventario,
            activo.FechaBaja,
            activo.MotivoBaja,
            activo.Observaciones,
            $"/activo/{activo.CodigoInterno}",
            activo.Historial.Select(h => new HistorialActivoDto(
                h.Id,
                h.TipoCambio,
                h.Campo,
                h.ValorAnterior,
                h.ValorNuevo,
                h.Descripcion,
                h.NombreUsuario,
                h.FechaCambio
            )).ToList(),
            traslados.Select(t => new TrasladoDto(
                t.Id,
                t.NumeroTraslado,
                t.ActivoId,
                activo.CodigoInterno,
                $"{activo.Marca} {activo.Modelo}",
                t.AlmacenOrigenId,
                t.AlmacenOrigen.Nombre,
                t.AlmacenDestinoId,
                t.AlmacenDestino.Nombre,
                t.Motivo,
                t.FechaTraslado,
                t.NombreUsuario,
                t.Observaciones
            )).ToList()
        );
    }
}