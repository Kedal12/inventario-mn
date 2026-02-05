using Microsoft.EntityFrameworkCore;
using InventarioTI.API.Data;
using InventarioTI.API.DTOs;
using InventarioTI.API.Models;

namespace InventarioTI.API.Services;

public interface IConciliacionService
{
    Task<ConciliacionResultadoDto> ConciliarAlmacen(int almacenId, List<string> codigosEscaneados);
    Task<EscaneoRapidoResultadoDto> VerificarCodigo(int almacenId, string codigo);
    Task<int> MarcarInventarioRealizado(List<string> codigos);
}

public class ConciliacionService : IConciliacionService
{
    private readonly InventarioDbContext _context;

    public ConciliacionService(InventarioDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Realiza la conciliación de inventario para un almacén específico.
    /// Compara los códigos escaneados contra los registrados en la base de datos.
    /// </summary>
    public async Task<ConciliacionResultadoDto> ConciliarAlmacen(int almacenId, List<string> codigosEscaneados)
    {
        var almacen = await _context.Almacenes.FindAsync(almacenId);
        if (almacen == null)
            throw new ArgumentException("Almacén no encontrado");

        var fechaConciliacion = DateTime.Now;
        var codigosUnicos = codigosEscaneados.Distinct().ToList();

        // 1. Obtener todos los activos esperados en este almacén (no dados de baja)
        var activosEsperados = await _context.Activos
            .Include(a => a.TipoActivo)
            .Include(a => a.Almacen)
            .Where(a => a.AlmacenId == almacenId && a.EstadoId != 5)
            .ToListAsync();

        var codigosEsperados = activosEsperados.Select(a => a.CodigoInterno).ToHashSet();

        // 2. Buscar todos los activos escaneados en la base de datos
        var activosEscaneados = await _context.Activos
            .Include(a => a.TipoActivo)
            .Include(a => a.Almacen)
            .Where(a => codigosUnicos.Contains(a.CodigoInterno))
            .ToListAsync();

        var activosEscaneadosDict = activosEscaneados.ToDictionary(a => a.CodigoInterno, a => a);

        // 3. Clasificar resultados
        var encontrados = new List<ActivoConciliadoDto>();
        var faltantes = new List<ActivoFaltanteDto>();
        var sobrantes = new List<ActivoSobranteDto>();
        var ubicacionIncorrecta = new List<ActivoUbicacionIncorrectaDto>();

        // 3.1 Procesar códigos escaneados
        foreach (var codigo in codigosUnicos)
        {
            if (activosEscaneadosDict.TryGetValue(codigo, out var activo))
            {
                if (activo.AlmacenId == almacenId)
                {
                    // ✅ Encontrado en ubicación correcta
                    encontrados.Add(new ActivoConciliadoDto(
                        activo.Id,
                        activo.CodigoInterno,
                        activo.Marca,
                        activo.Modelo,
                        activo.TipoActivo.Nombre
                    ));

                    // Actualizar fecha de último inventario
                    activo.FechaUltimoInventario = fechaConciliacion;
                }
                else
                {
                    // ⚠️ Existe pero está registrado en otro almacén
                    ubicacionIncorrecta.Add(new ActivoUbicacionIncorrectaDto(
                        activo.Id,
                        activo.CodigoInterno,
                        activo.Marca,
                        activo.Modelo,
                        activo.Almacen.Nombre,
                        almacen.Nombre
                    ));
                }
            }
            else
            {
                // 🔴 Código escaneado pero no existe en la BD
                sobrantes.Add(new ActivoSobranteDto(
                    codigo,
                    "Código no registrado en el sistema"
                ));
            }
        }

        // 3.2 Identificar faltantes (en BD pero no escaneados)
        var codigosEncontrados = encontrados.Select(e => e.CodigoInterno).ToHashSet();
        foreach (var activo in activosEsperados)
        {
            if (!codigosUnicos.Contains(activo.CodigoInterno))
            {
                faltantes.Add(new ActivoFaltanteDto(
                    activo.Id,
                    activo.CodigoInterno,
                    activo.Marca,
                    activo.Modelo,
                    activo.TipoActivo.Nombre,
                    activo.FechaUltimoInventario
                ));
            }
        }

        await _context.SaveChangesAsync();

        // 4. Calcular porcentaje
        var porcentaje = activosEsperados.Count > 0
            ? Math.Round((decimal)encontrados.Count / activosEsperados.Count * 100, 2)
            : 0;

        return new ConciliacionResultadoDto(
            almacenId,
            almacen.Nombre,
            fechaConciliacion,
            activosEsperados.Count,
            codigosUnicos.Count,
            encontrados.Count,
            faltantes.Count,
            sobrantes.Count,
            ubicacionIncorrecta.Count,
            porcentaje,
            encontrados,
            faltantes,
            sobrantes,
            ubicacionIncorrecta
        );
    }

    /// <summary>
    /// Verifica un código individual en tiempo real (para escaneo desde celular)
    /// </summary>
    public async Task<EscaneoRapidoResultadoDto> VerificarCodigo(int almacenId, string codigo)
    {
        var activo = await _context.Activos
            .Include(a => a.Almacen)
            .Include(a => a.TipoActivo)
            .FirstOrDefaultAsync(a => a.CodigoInterno == codigo);

        if (activo == null)
        {
            return new EscaneoRapidoResultadoDto(
                Encontrado: false,
                CodigoEscaneado: codigo,
                CodigoInterno: null,
                Marca: null,
                Modelo: null,
                AlmacenActual: null,
                Resultado: "NoExiste",
                Mensaje: "❌ Código no encontrado en el sistema"
            );
        }

        if (activo.AlmacenId != almacenId)
        {
            return new EscaneoRapidoResultadoDto(
                Encontrado: true,
                CodigoEscaneado: codigo,
                CodigoInterno: activo.CodigoInterno,
                Marca: activo.Marca,
                Modelo: activo.Modelo,
                AlmacenActual: activo.Almacen.Nombre,
                Resultado: "UbicacionIncorrecta",
                Mensaje: $"⚠️ Registrado en: {activo.Almacen.Nombre}"
            );
        }

        // Actualizar fecha de inventario
        activo.FechaUltimoInventario = DateTime.Now;
        await _context.SaveChangesAsync();

        return new EscaneoRapidoResultadoDto(
            Encontrado: true,
            CodigoEscaneado: codigo,
            CodigoInterno: activo.CodigoInterno,
            Marca: activo.Marca,
            Modelo: activo.Modelo,
            AlmacenActual: activo.Almacen.Nombre,
            Resultado: "OK",
            Mensaje: $"✅ {activo.Marca} {activo.Modelo}"
        );
    }

    /// <summary>
    /// Marca la fecha de inventario para múltiples códigos
    /// </summary>
    public async Task<int> MarcarInventarioRealizado(List<string> codigos)
    {
        var activos = await _context.Activos
            .Where(a => codigos.Contains(a.CodigoInterno))
            .ToListAsync();

        var fecha = DateTime.Now;
        foreach (var activo in activos)
        {
            activo.FechaUltimoInventario = fecha;
        }

        await _context.SaveChangesAsync();
        return activos.Count;
    }
}
