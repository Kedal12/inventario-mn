using Microsoft.EntityFrameworkCore;
using InventarioTI.API.Data;
using InventarioTI.API.DTOs;
using InventarioTI.API.Models;
using ClosedXML.Excel;
using System.Text;

namespace InventarioTI.API.Services;

public interface IImportacionService
{
    Task<ImportacionResultadoDto> ImportarDesdeExcel(Stream archivoExcel, int almacenId, int usuarioId, string nombreUsuario);
    Task<ImportacionResultadoDto> ImportarDesdeCSV(string csvContent, int almacenId, int usuarioId, string nombreUsuario);
    byte[] GenerarPlantillaExcel(int? almacenId = null);
    byte[] GenerarPlantillaCSV();
}

public class ImportacionService : IImportacionService
{
    private readonly InventarioDbContext _context;
    private readonly IActivoService _activoService;
    private readonly IHistorialService _historialService;

    public ImportacionService(
        InventarioDbContext context,
        IActivoService activoService,
        IHistorialService historialService)
    {
        _context = context;
        _activoService = activoService;
        _historialService = historialService;
    }

    /// <summary>
    /// Importa activos desde un archivo Excel (.xlsx)
    /// Columnas esperadas: TipoActivoId, Marca, Modelo, SerialFabricante, Descripcion, Observaciones
    /// </summary>
    public async Task<ImportacionResultadoDto> ImportarDesdeExcel(
        Stream archivoExcel,
        int almacenId,
        int usuarioId,
        string nombreUsuario)
    {
        var errores = new List<ImportacionErrorDto>();
        var codigosCreados = new List<string>();
        int exitosos = 0;

        // Verificar que el almacén existe
        var almacen = await _context.Almacenes.FindAsync(almacenId);
        if (almacen == null)
        {
            return new ImportacionResultadoDto(0, 0, 1,
                new List<ImportacionErrorDto> { new(0, "AlmacenId", almacenId.ToString(), "Almacén no encontrado") },
                new List<string>());
        }

        // Cargar catálogos en memoria
        var tiposActivo = await _context.TiposActivo.ToDictionaryAsync(t => t.Id, t => t);
        var tiposPorRef = await _context.TiposActivo.ToDictionaryAsync(t => t.Referencia.ToUpper(), t => t);

        using var workbook = new XLWorkbook(archivoExcel);
        var worksheet = workbook.Worksheet(1);
        var rows = worksheet.RangeUsed()?.RowsUsed().Skip(1).ToList(); // Skip header

        if (rows == null || !rows.Any())
        {
            return new ImportacionResultadoDto(0, 0, 1,
                new List<ImportacionErrorDto> { new(1, "Archivo", "", "El archivo está vacío o no tiene datos") },
                new List<string>());
        }

        int fila = 1;
        foreach (var row in rows)
        {
            fila++;
            var erroresFila = new List<ImportacionErrorDto>();

            try
            {
                // Leer valores de las columnas
                var tipoActivoVal = row.Cell(1).GetString().Trim();
                var marca = row.Cell(2).GetString().Trim();
                var modelo = row.Cell(3).GetString().Trim();
                var serialFabricante = row.Cell(4).GetString().Trim();
                var descripcion = row.Cell(5).GetString().Trim();
                var observaciones = row.Cell(6).GetString().Trim();

                // Validar tipo de activo (puede ser ID o REF.X)
                TipoActivo? tipoActivo = null;
                if (int.TryParse(tipoActivoVal, out int tipoId))
                {
                    tiposActivo.TryGetValue(tipoId, out tipoActivo);
                }
                else if (!string.IsNullOrEmpty(tipoActivoVal))
                {
                    tiposPorRef.TryGetValue(tipoActivoVal.ToUpper(), out tipoActivo);
                }

                if (tipoActivo == null)
                {
                    erroresFila.Add(new ImportacionErrorDto(fila, "TipoActivo", tipoActivoVal,
                        "Tipo de activo no encontrado. Use ID numérico o referencia (REF.1, REF.2, etc.)"));
                }

                // Validar marca (obligatorio)
                if (string.IsNullOrWhiteSpace(marca))
                {
                    erroresFila.Add(new ImportacionErrorDto(fila, "Marca", "", "La marca es obligatoria"));
                }

                // Validar modelo (obligatorio)
                if (string.IsNullOrWhiteSpace(modelo))
                {
                    erroresFila.Add(new ImportacionErrorDto(fila, "Modelo", "", "El modelo es obligatorio"));
                }

                // Si hay errores, continuar con la siguiente fila
                if (erroresFila.Any())
                {
                    errores.AddRange(erroresFila);
                    continue;
                }

                // Generar código interno
                var codigoInterno = await _activoService.GenerarCodigoInterno(tipoActivo!.Id);

                // Crear el activo
                var activo = new Activo
                {
                    CodigoInterno = codigoInterno,
                    TipoActivoId = tipoActivo.Id,
                    AlmacenId = almacenId,
                    Marca = marca,
                    Modelo = modelo,
                    SerialFabricante = string.IsNullOrWhiteSpace(serialFabricante) ? null : serialFabricante,
                    Descripcion = string.IsNullOrWhiteSpace(descripcion) ? null : descripcion,
                    Observaciones = string.IsNullOrWhiteSpace(observaciones) ? null : observaciones,
                    EstadoId = 1, // Disponible
                    FechaIngreso = DateTime.Now,
                    FechaUltimoInventario = DateTime.Now,
                    UsuarioRegistroId = usuarioId
                };

                _context.Activos.Add(activo);
                await _context.SaveChangesAsync();

                // Registrar en historial
                await _historialService.RegistrarCambio(
                    activo.Id,
                    "Creacion",
                    "Activo",
                    null,
                    codigoInterno,
                    $"Importación masiva - Almacén: {almacen.Nombre}",
                    usuarioId,
                    nombreUsuario
                );

                codigosCreados.Add(codigoInterno);
                exitosos++;
            }
            catch (Exception ex)
            {
                errores.Add(new ImportacionErrorDto(fila, "General", "", $"Error: {ex.Message}"));
            }
        }

        return new ImportacionResultadoDto(
            rows.Count,
            exitosos,
            errores.Count,
            errores,
            codigosCreados
        );
    }

    /// <summary>
    /// Importa activos desde un archivo CSV
    /// </summary>
    public async Task<ImportacionResultadoDto> ImportarDesdeCSV(
        string csvContent,
        int almacenId,
        int usuarioId,
        string nombreUsuario)
    {
        var errores = new List<ImportacionErrorDto>();
        var codigosCreados = new List<string>();
        int exitosos = 0;

        // Verificar almacén
        var almacen = await _context.Almacenes.FindAsync(almacenId);
        if (almacen == null)
        {
            return new ImportacionResultadoDto(0, 0, 1,
                new List<ImportacionErrorDto> { new(0, "AlmacenId", almacenId.ToString(), "Almacén no encontrado") },
                new List<string>());
        }

        var lineas = csvContent.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries);
        if (lineas.Length < 2)
        {
            return new ImportacionResultadoDto(0, 0, 1,
                new List<ImportacionErrorDto> { new(1, "Archivo", "", "El archivo está vacío") },
                new List<string>());
        }

        // Cargar catálogos
        var tiposActivo = await _context.TiposActivo.ToDictionaryAsync(t => t.Id, t => t);
        var tiposPorRef = await _context.TiposActivo.ToDictionaryAsync(t => t.Referencia.ToUpper(), t => t);

        for (int i = 1; i < lineas.Length; i++)
        {
            var fila = i + 1;
            var campos = ParseCSVLine(lineas[i]);

            if (campos.Length < 3)
            {
                errores.Add(new ImportacionErrorDto(fila, "Formato", lineas[i],
                    "Formato incorrecto. Mínimo: TipoActivo, Marca, Modelo"));
                continue;
            }

            try
            {
                var tipoActivoVal = campos[0].Trim();
                var marca = campos[1].Trim();
                var modelo = campos[2].Trim();
                var serialFabricante = campos.Length > 3 ? campos[3].Trim() : null;
                var descripcion = campos.Length > 4 ? campos[4].Trim() : null;
                var observaciones = campos.Length > 5 ? campos[5].Trim() : null;

                // Validar tipo
                TipoActivo? tipoActivo = null;
                if (int.TryParse(tipoActivoVal, out int tipoId))
                {
                    tiposActivo.TryGetValue(tipoId, out tipoActivo);
                }
                else
                {
                    tiposPorRef.TryGetValue(tipoActivoVal.ToUpper(), out tipoActivo);
                }

                if (tipoActivo == null)
                {
                    errores.Add(new ImportacionErrorDto(fila, "TipoActivo", tipoActivoVal, "Tipo no encontrado"));
                    continue;
                }

                if (string.IsNullOrWhiteSpace(marca))
                {
                    errores.Add(new ImportacionErrorDto(fila, "Marca", "", "Marca requerida"));
                    continue;
                }

                if (string.IsNullOrWhiteSpace(modelo))
                {
                    errores.Add(new ImportacionErrorDto(fila, "Modelo", "", "Modelo requerido"));
                    continue;
                }

                var codigoInterno = await _activoService.GenerarCodigoInterno(tipoActivo.Id);

                var activo = new Activo
                {
                    CodigoInterno = codigoInterno,
                    TipoActivoId = tipoActivo.Id,
                    AlmacenId = almacenId,
                    Marca = marca,
                    Modelo = modelo,
                    SerialFabricante = serialFabricante,
                    Descripcion = descripcion,
                    Observaciones = observaciones,
                    EstadoId = 1,
                    FechaIngreso = DateTime.Now,
                    FechaUltimoInventario = DateTime.Now,
                    UsuarioRegistroId = usuarioId
                };

                _context.Activos.Add(activo);
                await _context.SaveChangesAsync();

                await _historialService.RegistrarCambio(
                    activo.Id, "Creacion", "Activo", null, codigoInterno,
                    $"Importación CSV - {almacen.Nombre}", usuarioId, nombreUsuario);

                codigosCreados.Add(codigoInterno);
                exitosos++;
            }
            catch (Exception ex)
            {
                errores.Add(new ImportacionErrorDto(fila, "General", "", ex.Message));
            }
        }

        return new ImportacionResultadoDto(lineas.Length - 1, exitosos, errores.Count, errores, codigosCreados);
    }

    /// <summary>
    /// Genera una plantilla Excel con los tipos de activo disponibles
    /// </summary>
    public byte[] GenerarPlantillaExcel(int? almacenId = null)
    {
        using var workbook = new XLWorkbook();

        // Hoja principal para datos
        var ws = workbook.Worksheets.Add("Activos");

        // Encabezados
        ws.Cell(1, 1).Value = "TipoActivo (ID o REF)";
        ws.Cell(1, 2).Value = "Marca *";
        ws.Cell(1, 3).Value = "Modelo *";
        ws.Cell(1, 4).Value = "Serial Fabricante";
        ws.Cell(1, 5).Value = "Descripción";
        ws.Cell(1, 6).Value = "Observaciones";

        // Estilo de encabezados
        var headerRange = ws.Range(1, 1, 1, 6);
        headerRange.Style.Font.Bold = true;
        headerRange.Style.Fill.BackgroundColor = XLColor.FromHtml("#1e3a8a");
        headerRange.Style.Font.FontColor = XLColor.White;
        headerRange.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

        // Filas de ejemplo
        ws.Cell(2, 1).Value = "REF.1";
        ws.Cell(2, 2).Value = "HP";
        ws.Cell(2, 3).Value = "ProDesk 400 G7";
        ws.Cell(2, 4).Value = "ABC123456";
        ws.Cell(2, 5).Value = "PC Escritorio";
        ws.Cell(2, 6).Value = "Nuevo";

        ws.Cell(3, 1).Value = "REF.5";
        ws.Cell(3, 2).Value = "Dell";
        ws.Cell(3, 3).Value = "P2422H";
        ws.Cell(3, 4).Value = "";
        ws.Cell(3, 5).Value = "Monitor 24 pulgadas";
        ws.Cell(3, 6).Value = "";

        // Ajustar anchos
        ws.Column(1).Width = 20;
        ws.Column(2).Width = 15;
        ws.Column(3).Width = 25;
        ws.Column(4).Width = 20;
        ws.Column(5).Width = 30;
        ws.Column(6).Width = 30;

        // Hoja de referencia con tipos de activo
        var wsRef = workbook.Worksheets.Add("Tipos de Activo");
        wsRef.Cell(1, 1).Value = "ID";
        wsRef.Cell(1, 2).Value = "Referencia";
        wsRef.Cell(1, 3).Value = "Nombre";

        var tiposHeader = wsRef.Range(1, 1, 1, 3);
        tiposHeader.Style.Font.Bold = true;
        tiposHeader.Style.Fill.BackgroundColor = XLColor.FromHtml("#059669");
        tiposHeader.Style.Font.FontColor = XLColor.White;

        var tipos = _context.TiposActivo.OrderBy(t => t.Id).ToList();
        int row = 2;
        foreach (var tipo in tipos)
        {
            wsRef.Cell(row, 1).Value = tipo.Id;
            wsRef.Cell(row, 2).Value = tipo.Referencia;
            wsRef.Cell(row, 3).Value = tipo.Nombre;
            row++;
        }

        wsRef.Columns().AdjustToContents();

        // Hoja de instrucciones
        var wsInstr = workbook.Worksheets.Add("Instrucciones");
        wsInstr.Cell(1, 1).Value = "INSTRUCCIONES DE IMPORTACIÓN - LA MEDIA NARANJA";
        wsInstr.Cell(1, 1).Style.Font.Bold = true;
        wsInstr.Cell(1, 1).Style.Font.FontSize = 14;

        wsInstr.Cell(3, 1).Value = "1. Complete la hoja 'Activos' con los datos de los equipos";
        wsInstr.Cell(4, 1).Value = "2. Los campos marcados con * son obligatorios";
        wsInstr.Cell(5, 1).Value = "3. Para TipoActivo use el ID numérico o la referencia (REF.1, REF.2, etc.)";
        wsInstr.Cell(6, 1).Value = "4. Consulte la hoja 'Tipos de Activo' para ver los tipos disponibles";
        wsInstr.Cell(7, 1).Value = "5. No modifique la fila de encabezados";
        wsInstr.Cell(8, 1).Value = "6. Guarde el archivo como .xlsx antes de importar";
        wsInstr.Cell(10, 1).Value = "El código del activo (MN-XXX-XXXXX) se genera automáticamente.";
        wsInstr.Cell(10, 1).Style.Font.Italic = true;

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return stream.ToArray();
    }

    /// <summary>
    /// Genera una plantilla CSV simple
    /// </summary>
    public byte[] GenerarPlantillaCSV()
    {
        var sb = new StringBuilder();
        sb.AppendLine("TipoActivo,Marca,Modelo,SerialFabricante,Descripcion,Observaciones");
        sb.AppendLine("REF.1,HP,ProDesk 400 G7,ABC123456,PC Escritorio,Nuevo");
        sb.AppendLine("REF.5,Dell,P2422H,,Monitor 24 pulgadas,");
        sb.AppendLine("REF.10,Epson,TM-T20III,,Impresora POS,");

        return Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(sb.ToString())).ToArray();
    }

    private string[] ParseCSVLine(string line)
    {
        var result = new List<string>();
        var current = new StringBuilder();
        bool inQuotes = false;

        foreach (var c in line)
        {
            if (c == '"') { inQuotes = !inQuotes; }
            else if ((c == ',' || c == ';') && !inQuotes) { result.Add(current.ToString()); current.Clear(); }
            else { current.Append(c); }
        }
        result.Add(current.ToString());

        return result.ToArray();
    }
}
