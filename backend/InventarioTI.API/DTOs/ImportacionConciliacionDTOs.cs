namespace InventarioTI.API.DTOs;

// ==================== IMPORTACIÓN MASIVA ====================

public record ImportacionResultadoDto(
    int TotalFilas,
    int Exitosos,
    int Errores,
    List<ImportacionErrorDto> DetalleErrores,
    List<string> CodigosCreados
);

public record ImportacionErrorDto(
    int Fila,
    string Campo,
    string Valor,
    string Error
);

// ==================== CONCILIACIÓN / INVENTARIO ====================

public record ConciliacionRequest(
    int AlmacenId,
    List<string> CodigosEscaneados
);

public record ConciliacionResultadoDto(
    int AlmacenId,
    string AlmacenNombre,
    DateTime FechaConciliacion,
    int TotalEsperado,
    int TotalEscaneados,
    int TotalEncontrados,
    int TotalFaltantes,
    int TotalSobrantes,
    int TotalUbicacionIncorrecta,
    decimal PorcentajeConciliado,
    List<ActivoConciliadoDto> Encontrados,
    List<ActivoFaltanteDto> Faltantes,
    List<ActivoSobranteDto> Sobrantes,
    List<ActivoUbicacionIncorrectaDto> UbicacionIncorrecta
);

public record ActivoConciliadoDto(
    int Id,
    string CodigoInterno,
    string Marca,
    string Modelo,
    string TipoActivo
);

public record ActivoFaltanteDto(
    int Id,
    string CodigoInterno,
    string Marca,
    string Modelo,
    string TipoActivo,
    DateTime? FechaUltimoInventario
);

public record ActivoSobranteDto(
    string CodigoEscaneado,
    string Mensaje
);

public record ActivoUbicacionIncorrectaDto(
    int Id,
    string CodigoInterno,
    string Marca,
    string Modelo,
    string AlmacenRegistrado,
    string AlmacenEsperado
);

// ==================== ESCANEO RÁPIDO (Para móvil) ====================

public record EscaneoRapidoRequest(
    int AlmacenId,
    string Codigo
);

public record EscaneoRapidoResultadoDto(
    bool Encontrado,
    string CodigoEscaneado,
    string? CodigoInterno,
    string? Marca,
    string? Modelo,
    string? AlmacenActual,
    string Resultado,  // "OK", "NoExiste", "UbicacionIncorrecta"
    string Mensaje
);
