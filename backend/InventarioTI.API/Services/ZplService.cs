using Microsoft.EntityFrameworkCore;
using InventarioTI.API.Data;
using InventarioTI.API.DTOs;

namespace InventarioTI.API.Services;

public interface IZplService
{
    Task<List<EtiquetaZplResponse>> GenerarEtiquetasZpl(List<string> codigosActivo, string baseUrl);
    Task<string> GenerarEtiquetaIndividual(string codigoActivo, string baseUrl);
    Task<string> GenerarComprobanteTraslado(int trasladoId);
}

public class ZplService : IZplService
{
    private readonly InventarioDbContext _context;

    public ZplService(InventarioDbContext context)
    {
        _context = context;
    }

    public async Task<List<EtiquetaZplResponse>> GenerarEtiquetasZpl(List<string> codigosActivo, string baseUrl)
    {
        var respuestas = new List<EtiquetaZplResponse>();
        foreach (var codigo in codigosActivo)
        {
            var zpl = await GenerarEtiquetaIndividual(codigo, baseUrl);
            respuestas.Add(new EtiquetaZplResponse(codigo, zpl));
        }
        return respuestas;
    }

    public async Task<string> GenerarEtiquetaIndividual(string codigoActivo, string baseUrl)
    {
        var activo = await _context.Activos
            .Include(a => a.Almacen)
            .Include(a => a.TipoActivo)
            .FirstOrDefaultAsync(a => a.CodigoInterno == codigoActivo);

        if (activo == null)
            throw new ArgumentException($"Activo {codigoActivo} no encontrado");

        // Cambio de nomenclatura para la etiqueta (ICG -> MN)
        var codigoMN = activo.CodigoInterno.Replace("ICG-", "MN-");
        var qrUrl = $"{baseUrl}/activo/{codigoMN}";

        var descripcion = $"{activo.Marca} {activo.Modelo}";
        if (descripcion.Length > 30) descripcion = descripcion.Substring(0, 27) + "...";

        var sede = activo.Almacen.Nombre;
        if (sede.Length > 25) sede = sede.Substring(0, 22) + "...";

        var zpl = new System.Text.StringBuilder();
        zpl.AppendLine("^XA");
        zpl.AppendLine("^PW787"); // Ancho 98.5mm
        zpl.AppendLine("^LL200"); // Alto 25mm
        zpl.AppendLine("^LH0,0");

        // QR a la izquierda (Ajustado para etiqueta amarilla)
        zpl.AppendLine("^FO30,30^BQN,2,3^FDQA," + qrUrl + "^FS");

        // Texto informativo a la derecha
        zpl.AppendLine("^FO200,30^A0N,25,25^FDACTIVO FIJO TI MN^FS");
        zpl.AppendLine($"^FO200,65^A0N,35,35^FD{codigoMN}^FS");
        zpl.AppendLine($"^FO200,105^A0N,22,22^FD{descripcion}^FS");
        zpl.AppendLine($"^FO200,135^A0N,20,20^FD{sede}^FS");

        zpl.AppendLine("^XZ");
        return zpl.ToString();
    }

    public async Task<string> GenerarComprobanteTraslado(int trasladoId)
    {
        var traslado = await _context.Traslados
            .Include(t => t.Activo)
                .ThenInclude(a => a.TipoActivo)
            .Include(t => t.AlmacenOrigen)
            .Include(t => t.AlmacenDestino)
            .FirstOrDefaultAsync(t => t.Id == trasladoId);

        if (traslado == null)
            throw new ArgumentException("Traslado no encontrado");

        var codigoMN = traslado.Activo.CodigoInterno.Replace("ICG-", "MN-");

        var zpl = new System.Text.StringBuilder();
        zpl.AppendLine("^XA");
        zpl.AppendLine("^PW787^LL200^LH0,0");

        zpl.AppendLine("^FO10,15^A0N,28,28^FDTRASLADO: " + traslado.NumeroTraslado + "^FS");
        zpl.AppendLine($"^FO10,50^A0N,24,24^FD{codigoMN}^FS");

        var ruta = $"{traslado.AlmacenOrigen.Nombre} > {traslado.AlmacenDestino.Nombre}";
        if (ruta.Length > 45) ruta = ruta.Substring(0, 42) + "...";

        zpl.AppendLine($"^FO10,85^A0N,20,20^FD{ruta}^FS");
        zpl.AppendLine($"^FO10,120^A0N,18,18^FDFECHA: {traslado.FechaTraslado:dd/MM/yyyy}^FS");
        zpl.AppendLine($"^FO10,150^A0N,18,18^FDPOR: {traslado.NombreUsuario}^FS");

        zpl.AppendLine("^XZ");
        return zpl.ToString();
    }
}