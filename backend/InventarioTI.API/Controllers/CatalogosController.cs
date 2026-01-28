using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using InventarioTI.API.Data;
using InventarioTI.API.DTOs;
using InventarioTI.API.Models;

namespace InventarioTI.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CatalogosController : ControllerBase
{
    private readonly InventarioDbContext _context;

    public CatalogosController(InventarioDbContext context)
    {
        _context = context;
    }

    // ==================== ALMACENES ====================
    [HttpGet("almacenes")]
    public async Task<ActionResult<List<AlmacenDto>>> GetAlmacenes([FromQuery] bool soloActivos = true)
    {
        var query = _context.Almacenes.AsQueryable();
        
        if (soloActivos)
            query = query.Where(a => a.Activo);

        var almacenes = await query
            .OrderBy(a => a.Nombre)
            .Select(a => new AlmacenDto(
                a.Id,
                a.Nombre,
                a.Codigo,
                a.Direccion,
                a.Telefono,
                a.Responsable,
                a.Activo,
                a.Activos.Count
            ))
            .ToListAsync();

        return Ok(almacenes);
    }

    [HttpGet("almacenes/{id}")]
    public async Task<ActionResult<AlmacenDto>> GetAlmacen(int id)
    {
        var almacen = await _context.Almacenes
            .Where(a => a.Id == id)
            .Select(a => new AlmacenDto(
                a.Id,
                a.Nombre,
                a.Codigo,
                a.Direccion,
                a.Telefono,
                a.Responsable,
                a.Activo,
                a.Activos.Count
            ))
            .FirstOrDefaultAsync();

        if (almacen == null)
            return NotFound(new { message = "Almacén no encontrado" });

        return Ok(almacen);
    }

    [Authorize(Roles = "Administrador")]
    [HttpPost("almacenes")]
    public async Task<ActionResult<AlmacenDto>> CrearAlmacen([FromBody] CrearAlmacenRequest request)
    {
        if (await _context.Almacenes.AnyAsync(a => a.Codigo == request.Codigo))
            return BadRequest(new { message = "Ya existe un almacén con ese código" });

        var almacen = new Almacen
        {
            Nombre = request.Nombre,
            Codigo = request.Codigo,
            Direccion = request.Direccion,
            Telefono = request.Telefono,
            Responsable = request.Responsable
        };

        _context.Almacenes.Add(almacen);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetAlmacen), new { id = almacen.Id }, 
            new AlmacenDto(almacen.Id, almacen.Nombre, almacen.Codigo, 
                almacen.Direccion, almacen.Telefono, almacen.Responsable, almacen.Activo, 0));
    }

    [Authorize(Roles = "Administrador")]
    [HttpPut("almacenes/{id}")]
    public async Task<ActionResult<AlmacenDto>> ActualizarAlmacen(int id, [FromBody] ActualizarAlmacenRequest request)
    {
        var almacen = await _context.Almacenes.FindAsync(id);
        if (almacen == null)
            return NotFound(new { message = "Almacén no encontrado" });

        if (request.Nombre != null) almacen.Nombre = request.Nombre;
        if (request.Codigo != null)
        {
            if (await _context.Almacenes.AnyAsync(a => a.Codigo == request.Codigo && a.Id != id))
                return BadRequest(new { message = "Ya existe un almacén con ese código" });
            almacen.Codigo = request.Codigo;
        }
        if (request.Direccion != null) almacen.Direccion = request.Direccion;
        if (request.Telefono != null) almacen.Telefono = request.Telefono;
        if (request.Responsable != null) almacen.Responsable = request.Responsable;
        if (request.Activo.HasValue) almacen.Activo = request.Activo.Value;

        await _context.SaveChangesAsync();

        var totalActivos = await _context.Activos.CountAsync(a => a.AlmacenId == id);
        return Ok(new AlmacenDto(almacen.Id, almacen.Nombre, almacen.Codigo, 
            almacen.Direccion, almacen.Telefono, almacen.Responsable, almacen.Activo, totalActivos));
    }

    // ==================== TIPOS DE ACTIVO ====================
    [HttpGet("tipos")]
    public async Task<ActionResult<List<TipoActivoDto>>> GetTiposActivo([FromQuery] bool soloActivos = true)
    {
        var query = _context.TiposActivo.AsQueryable();
        
        if (soloActivos)
            query = query.Where(t => t.Activo);

        var tipos = await query
            .OrderBy(t => t.Referencia)
            .Select(t => new TipoActivoDto(
                t.Id,
                t.Nombre,
                t.Referencia,
                t.Descripcion,
                t.Activo,
                t.Activos.Count
            ))
            .ToListAsync();

        return Ok(tipos);
    }

    [HttpGet("tipos/{id}")]
    public async Task<ActionResult<TipoActivoDto>> GetTipoActivo(int id)
    {
        var tipo = await _context.TiposActivo
            .Where(t => t.Id == id)
            .Select(t => new TipoActivoDto(
                t.Id,
                t.Nombre,
                t.Referencia,
                t.Descripcion,
                t.Activo,
                t.Activos.Count
            ))
            .FirstOrDefaultAsync();

        if (tipo == null)
            return NotFound(new { message = "Tipo de activo no encontrado" });

        return Ok(tipo);
    }

    [Authorize(Roles = "Administrador")]
    [HttpPost("tipos")]
    public async Task<ActionResult<TipoActivoDto>> CrearTipoActivo([FromBody] CrearTipoActivoRequest request)
    {
        if (await _context.TiposActivo.AnyAsync(t => t.Referencia == request.Referencia))
            return BadRequest(new { message = "Ya existe un tipo de activo con esa referencia" });

        var tipo = new TipoActivo
        {
            Nombre = request.Nombre,
            Referencia = request.Referencia,
            Descripcion = request.Descripcion
        };

        _context.TiposActivo.Add(tipo);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetTipoActivo), new { id = tipo.Id },
            new TipoActivoDto(tipo.Id, tipo.Nombre, tipo.Referencia, tipo.Descripcion, tipo.Activo, 0));
    }

    [Authorize(Roles = "Administrador")]
    [HttpPut("tipos/{id}")]
    public async Task<ActionResult<TipoActivoDto>> ActualizarTipoActivo(int id, [FromBody] CrearTipoActivoRequest request)
    {
        var tipo = await _context.TiposActivo.FindAsync(id);
        if (tipo == null)
            return NotFound(new { message = "Tipo de activo no encontrado" });

        if (await _context.TiposActivo.AnyAsync(t => t.Referencia == request.Referencia && t.Id != id))
            return BadRequest(new { message = "Ya existe un tipo de activo con esa referencia" });

        tipo.Nombre = request.Nombre;
        tipo.Referencia = request.Referencia;
        tipo.Descripcion = request.Descripcion;

        await _context.SaveChangesAsync();

        var totalActivos = await _context.Activos.CountAsync(a => a.TipoActivoId == id);
        return Ok(new TipoActivoDto(tipo.Id, tipo.Nombre, tipo.Referencia, tipo.Descripcion, tipo.Activo, totalActivos));
    }

    // ==================== ESTADOS ====================
    [HttpGet("estados")]
    public async Task<ActionResult<List<EstadoActivoDto>>> GetEstados()
    {
        var estados = await _context.EstadosActivo
            .OrderBy(e => e.Orden)
            .Select(e => new EstadoActivoDto(
                e.Id,
                e.Nombre,
                e.Color,
                e.Descripcion,
                e.Orden,
                e.Activos.Count
            ))
            .ToListAsync();

        return Ok(estados);
    }

    [HttpGet("estados/{id}")]
    public async Task<ActionResult<EstadoActivoDto>> GetEstado(int id)
    {
        var estado = await _context.EstadosActivo
            .Where(e => e.Id == id)
            .Select(e => new EstadoActivoDto(
                e.Id,
                e.Nombre,
                e.Color,
                e.Descripcion,
                e.Orden,
                e.Activos.Count
            ))
            .FirstOrDefaultAsync();

        if (estado == null)
            return NotFound(new { message = "Estado no encontrado" });

        return Ok(estado);
    }

    [Authorize(Roles = "Administrador")]
    [HttpPost("estados")]
    public async Task<ActionResult<EstadoActivoDto>> CrearEstado([FromBody] CrearEstadoRequest request)
    {
        var estado = new EstadoActivo
        {
            Nombre = request.Nombre,
            Color = request.Color,
            Descripcion = request.Descripcion,
            Orden = request.Orden
        };

        _context.EstadosActivo.Add(estado);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetEstado), new { id = estado.Id },
            new EstadoActivoDto(estado.Id, estado.Nombre, estado.Color, estado.Descripcion, estado.Orden, 0));
    }

    [Authorize(Roles = "Administrador")]
    [HttpPut("estados/{id}")]
    public async Task<ActionResult<EstadoActivoDto>> ActualizarEstado(int id, [FromBody] CrearEstadoRequest request)
    {
        var estado = await _context.EstadosActivo.FindAsync(id);
        if (estado == null)
            return NotFound(new { message = "Estado no encontrado" });

        estado.Nombre = request.Nombre;
        estado.Color = request.Color;
        estado.Descripcion = request.Descripcion;
        estado.Orden = request.Orden;

        await _context.SaveChangesAsync();

        var totalActivos = await _context.Activos.CountAsync(a => a.EstadoId == id);
        return Ok(new EstadoActivoDto(estado.Id, estado.Nombre, estado.Color, estado.Descripcion, estado.Orden, totalActivos));
    }
}
