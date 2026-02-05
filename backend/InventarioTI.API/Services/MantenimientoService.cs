// ============================================================================
// InventarioTI - Módulo de Mantenimientos
// MantenimientoService.cs - Adaptado a BD real InventarioTI_ICG
// Agregar en: Application/Services/MantenimientoService.cs
// ============================================================================

using Dapper;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using InventarioTI.API.DTOs;

namespace InventarioTI.API.Services;

public interface IMantenimientoService
{
    // Catálogos
    Task<IEnumerable<TipoMantenimientoResponse>> ObtenerTiposMantenimiento();
    Task<IEnumerable<TecnicoResponse>> ObtenerTecnicos();
    Task<IEnumerable<AlmacenResponse>> ObtenerAlmacenes();
    Task<TecnicoResponse> CrearTecnico(CrearTecnicoRequest request);

    // Activos con estado de mantenimiento
    Task<IEnumerable<ActivoEstadoMttoResponse>> ObtenerActivos(int? almacenId = null, string? alerta = null);
    Task<ActivoEstadoMttoResponse> ObtenerActivo(int activoId);
    Task<IEnumerable<ActivoEstadoMttoResponse>> BuscarActivo(string termino);

    // Mantenimientos
    Task<CrearMantenimientoResponse> RegistrarMantenimiento(CrearMantenimientoRequest request, int? userId = null);
    Task<IEnumerable<MantenimientoResponse>> ObtenerHistorial(int activoId);
    Task<IEnumerable<MantenimientoResponse>> ObtenerPorFecha(DateTime inicio, DateTime fin, int? almacenId = null);
    Task<DatosEtiquetaMtto> ObtenerDatosEtiqueta(int mantenimientoId);

    // Dashboard
    Task<DashboardMantenimientoResponse> ObtenerDashboard();
}

public class MantenimientoService : IMantenimientoService
{
    private readonly string _connectionString;

    public MantenimientoService(IConfiguration config)
    {
        _connectionString = config.GetConnectionString("DefaultConnection");
    }

    private SqlConnection GetConnection() => new SqlConnection(_connectionString);

    // ═══════════════════════════════════════════════════════
    // CATÁLOGOS
    // ═══════════════════════════════════════════════════════

    public async Task<IEnumerable<TipoMantenimientoResponse>> ObtenerTiposMantenimiento()
    {
        using var db = GetConnection();
        return await db.QueryAsync<TipoMantenimientoResponse>(
            "SELECT Id, Nombre, Descripcion, Color FROM TiposMantenimiento WHERE Activo = 1 ORDER BY Orden");
    }

    public async Task<IEnumerable<TecnicoResponse>> ObtenerTecnicos()
    {
        using var db = GetConnection();
        return await db.QueryAsync<TecnicoResponse>(
            "SELECT Id, Nombre, Cargo, Telefono FROM Tecnicos WHERE Activo = 1 ORDER BY Nombre");
    }

    public async Task<IEnumerable<AlmacenResponse>> ObtenerAlmacenes()
    {
        using var db = GetConnection();
        return await db.QueryAsync<AlmacenResponse>(
            "SELECT Id, Nombre, Codigo FROM Almacenes WHERE Activo = 1 ORDER BY Nombre");
    }

    public async Task<TecnicoResponse> CrearTecnico(CrearTecnicoRequest request)
    {
        using var db = GetConnection();
        var id = await db.QuerySingleAsync<int>(@"
            INSERT INTO Tecnicos (Nombre, Cargo, Telefono, Email)
            VALUES (@Nombre, @Cargo, @Telefono, @Email);
            SELECT CAST(SCOPE_IDENTITY() AS INT);", request);

        return new TecnicoResponse { Id = id, Nombre = request.Nombre, Cargo = request.Cargo, Telefono = request.Telefono };
    }

    // ═══════════════════════════════════════════════════════
    // ACTIVOS CON ESTADO DE MANTENIMIENTO
    // ═══════════════════════════════════════════════════════

    public async Task<IEnumerable<ActivoEstadoMttoResponse>> ObtenerActivos(int? almacenId = null, string? alerta = null)
    {
        using var db = GetConnection();
        var sql = "SELECT * FROM VW_ActivosEstadoMantenimiento WHERE 1=1";
        var parms = new DynamicParameters();

        if (almacenId.HasValue)
        {
            sql += " AND ActivoId IN (SELECT Id FROM Activos WHERE AlmacenId = @AlmacenId)";
            parms.Add("AlmacenId", almacenId.Value);
        }
        if (!string.IsNullOrEmpty(alerta))
        {
            sql += " AND AlertaMantenimiento = @Alerta";
            parms.Add("Alerta", alerta);
        }
        sql += " ORDER BY Marca, Modelo";
        return await db.QueryAsync<ActivoEstadoMttoResponse>(sql, parms);
    }

    public async Task<ActivoEstadoMttoResponse> ObtenerActivo(int activoId)
    {
        using var db = GetConnection();
        return await db.QueryFirstOrDefaultAsync<ActivoEstadoMttoResponse>(
            "SELECT * FROM VW_ActivosEstadoMantenimiento WHERE ActivoId = @Id",
            new { Id = activoId });
    }

    public async Task<IEnumerable<ActivoEstadoMttoResponse>> BuscarActivo(string termino)
    {
        using var db = GetConnection();
        return await db.QueryAsync<ActivoEstadoMttoResponse>(@"
            SELECT * FROM VW_ActivosEstadoMantenimiento
            WHERE CodigoInterno LIKE @Term
               OR SerialFabricante LIKE @Term
               OR Marca LIKE @Term
               OR Modelo LIKE @Term
               OR Descripcion LIKE @Term
            ORDER BY Marca, Modelo",
            new { Term = $"%{termino}%" });
    }

    // ═══════════════════════════════════════════════════════
    // MANTENIMIENTOS
    // ═══════════════════════════════════════════════════════

    public async Task<CrearMantenimientoResponse> RegistrarMantenimiento(CrearMantenimientoRequest request, int? userId = null)
    {
        using var db = GetConnection();

        // Verificar que el activo existe y no está dado de baja
        var activo = await db.QueryFirstOrDefaultAsync<dynamic>(
            "SELECT Id, CodigoInterno, Marca, Modelo, TotalMantenimientos FROM Activos WHERE Id = @Id AND EstadoId NOT IN (5, 9)",
            new { Id = request.ActivoId });

        if (activo == null)
            return new CrearMantenimientoResponse { Exito = false, Mensaje = "Activo no encontrado o dado de baja" };

        // Insertar mantenimiento
        var id = await db.QuerySingleAsync<int>(@"
            INSERT INTO Mantenimientos
                (ActivoId, TipoMantenimientoId, TecnicoId, RealizadoPor, Descripcion,
                 Hallazgos, RepuestosCambiados, Costo, FechaProximoMtto, Observaciones, UsuarioRegistroId)
            VALUES
                (@ActivoId, @TipoMantenimientoId, @TecnicoId, @RealizadoPor, @Descripcion,
                 @Hallazgos, @RepuestosCambiados, @Costo, @FechaProximoMtto, @Observaciones, @UserId);
            SELECT CAST(SCOPE_IDENTITY() AS INT);",
            new
            {
                request.ActivoId,
                request.TipoMantenimientoId,
                request.TecnicoId,
                request.RealizadoPor,
                request.Descripcion,
                request.Hallazgos,
                request.RepuestosCambiados,
                request.Costo,
                request.FechaProximoMtto,
                request.Observaciones,
                UserId = userId
            });

        // Obtener el registro completo
        var mtto = await db.QueryFirstOrDefaultAsync<MantenimientoResponse>(
            "SELECT * FROM VW_HistorialMantenimientos WHERE MantenimientoId = @Id",
            new { Id = id });

        // Construir datos para etiqueta
        var etiqueta = await BuildEtiqueta(db, id);

        return new CrearMantenimientoResponse
        {
            Exito = true,
            Mensaje = "Mantenimiento registrado exitosamente",
            MantenimientoId = id,
            Mantenimiento = mtto,
            Etiqueta = etiqueta
        };
    }

    public async Task<IEnumerable<MantenimientoResponse>> ObtenerHistorial(int activoId)
    {
        using var db = GetConnection();
        return await db.QueryAsync<MantenimientoResponse>(
            "SELECT * FROM VW_HistorialMantenimientos WHERE ActivoId = @Id ORDER BY FechaMantenimiento DESC",
            new { Id = activoId });
    }

    public async Task<IEnumerable<MantenimientoResponse>> ObtenerPorFecha(DateTime inicio, DateTime fin, int? almacenId = null)
    {
        using var db = GetConnection();
        var sql = @"SELECT * FROM VW_HistorialMantenimientos
                    WHERE CAST(FechaMantenimiento AS DATE) BETWEEN @Inicio AND @Fin";
        var parms = new DynamicParameters();
        parms.Add("Inicio", inicio.Date);
        parms.Add("Fin", fin.Date);

        if (almacenId.HasValue)
        {
            sql += " AND ActivoId IN (SELECT Id FROM Activos WHERE AlmacenId = @AlmacenId)";
            parms.Add("AlmacenId", almacenId.Value);
        }
        sql += " ORDER BY FechaMantenimiento DESC";
        return await db.QueryAsync<MantenimientoResponse>(sql, parms);
    }

    // ═══════════════════════════════════════════════════════
    // ETIQUETA ZEBRA
    // ═══════════════════════════════════════════════════════

    public async Task<DatosEtiquetaMtto> ObtenerDatosEtiqueta(int mantenimientoId)
    {
        using var db = GetConnection();
        var data = await BuildEtiqueta(db, mantenimientoId);

        if (data != null)
        {
            await db.ExecuteAsync(
                "UPDATE Mantenimientos SET EtiquetaImpresa = 1 WHERE Id = @Id",
                new { Id = mantenimientoId });
        }
        return data;
    }

    private async Task<DatosEtiquetaMtto> BuildEtiqueta(SqlConnection db, int mantenimientoId)
    {
        var row = await db.QueryFirstOrDefaultAsync<dynamic>(@"
            SELECT m.Id, m.RealizadoPor, m.Descripcion, m.FechaMantenimiento, m.FechaProximoMtto,
                   a.CodigoInterno, ISNULL(a.SerialFabricante,'') AS SerialFabricante,
                   a.Marca, a.Modelo, a.TotalMantenimientos,
                   ta.Nombre AS TipoActivo,
                   al.Nombre AS Almacen,
                   tm.Nombre AS TipoMantenimiento
            FROM Mantenimientos m
            INNER JOIN Activos a ON m.ActivoId = a.Id
            INNER JOIN TiposActivo ta ON a.TipoActivoId = ta.Id
            INNER JOIN Almacenes al ON a.AlmacenId = al.Id
            INNER JOIN TiposMantenimiento tm ON m.TipoMantenimientoId = tm.Id
            WHERE m.Id = @Id", new { Id = mantenimientoId });

        if (row == null) return null;

        return new DatosEtiquetaMtto
        {
            CodigoInterno = row.CodigoInterno,
            SerialFabricante = row.SerialFabricante,
            Marca = row.Marca,
            Modelo = row.Modelo,
            TipoActivo = row.TipoActivo,
            Almacen = row.Almacen,
            TipoMantenimiento = row.TipoMantenimiento,
            RealizadoPor = row.RealizadoPor,
            Descripcion = row.Descripcion,
            FechaMantenimiento = row.FechaMantenimiento,
            FechaProximoMtto = row.FechaProximoMtto,
            NumeroMantenimiento = row.TotalMantenimientos
        };
    }

    // ═══════════════════════════════════════════════════════
    // DASHBOARD
    // ═══════════════════════════════════════════════════════

    public async Task<DashboardMantenimientoResponse> ObtenerDashboard()
    {
        using var db = GetConnection();

        var stats = await db.QueryFirstAsync<dynamic>(@"
            SELECT
                COUNT(*) AS Total,
                SUM(CASE WHEN AlertaMantenimiento = 'AL_DIA' THEN 1 ELSE 0 END) AS AlDia,
                SUM(CASE WHEN AlertaMantenimiento = 'PROXIMO' THEN 1 ELSE 0 END) AS Proximos,
                SUM(CASE WHEN AlertaMantenimiento = 'VENCIDO' THEN 1 ELSE 0 END) AS Vencidos,
                SUM(CASE WHEN AlertaMantenimiento = 'NUNCA' THEN 1 ELSE 0 END) AS Nunca
            FROM VW_ActivosEstadoMantenimiento");

        var mttosMes = await db.QueryFirstAsync<int>(@"
            SELECT COUNT(*) FROM Mantenimientos
            WHERE MONTH(FechaMantenimiento) = MONTH(GETUTCDATE())
              AND YEAR(FechaMantenimiento) = YEAR(GETUTCDATE())");

        var mttosAnio = await db.QueryFirstAsync<int>(@"
            SELECT COUNT(*) FROM Mantenimientos
            WHERE YEAR(FechaMantenimiento) = YEAR(GETUTCDATE())");

        var pendientes = (await db.QueryAsync<ActivoEstadoMttoResponse>(@"
            SELECT * FROM VW_ActivosEstadoMantenimiento
            WHERE AlertaMantenimiento IN ('VENCIDO', 'NUNCA')
            ORDER BY DiasDesdeUltimoMtto DESC")).ToList();

        return new DashboardMantenimientoResponse
        {
            TotalActivos = (int)stats.Total,
            ActivosAlDia = (int)stats.AlDia,
            ActivosProximos = (int)stats.Proximos,
            ActivosVencidos = (int)stats.Vencidos,
            ActivosNunca = (int)stats.Nunca,
            MantenimientosMes = mttosMes,
            MantenimientosAnio = mttosAnio,
            ActivosPendientes = pendientes
        };
    }
}