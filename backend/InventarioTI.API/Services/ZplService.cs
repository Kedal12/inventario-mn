using Microsoft.EntityFrameworkCore;
using InventarioTI.API.Data;
using InventarioTI.API.DTOs;
using System.Text;

namespace InventarioTI.API.Services;

public interface IZplService
{
    Task<List<EtiquetaZplResponse>> GenerarEtiquetasZpl(List<string> codigosActivo, string baseUrl);
    Task<string> GenerarEtiquetaIndividual(string codigoActivo, string baseUrl);
    // VOLVER A AGREGAR ESTA LÍNEA PARA ELIMINAR EL ERROR CS1061
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
        for (int i = 0; i < codigosActivo.Count; i += 3)
        {
            var loteFila = codigosActivo.Skip(i).Take(3).ToList();
            var zplFila = await GenerarFilaTripleZpl(loteFila, baseUrl);
            foreach (var codigo in loteFila)
            {
                respuestas.Add(new EtiquetaZplResponse(codigo, zplFila));
            }
        }
        return respuestas;
    }

    private async Task<string> GenerarFilaTripleZpl(List<string> codigos, string baseUrl)
    {
        var sb = new StringBuilder();
        sb.AppendLine("^XA^PW788^LL200^LH0,0");
        int[] columnasX = { 10, 272, 535 };

        for (int j = 0; j < codigos.Count; j++)
        {
            var activo = await _context.Activos
                .Include(a => a.Almacen)
                .FirstOrDefaultAsync(a => a.CodigoInterno == codigos[j]);

            if (activo == null) continue;

            int x = columnasX[j];
            var codigoMN = activo.CodigoInterno.Replace("ICG-", "MN-");
            var qrUrl = $"{baseUrl}/activo/{codigoMN}";
            var marcaModelo = $"{activo.Marca} {activo.Modelo}";
            if (marcaModelo.Length > 16) marcaModelo = marcaModelo.Substring(0, 14) + "..";

            sb.AppendLine($"^FO{x},40^BQN,2,2^FDQA,{qrUrl}^FS");
            sb.AppendLine($"^FO{x + 95},30^A0N,18,18^FB150,1,0,L^FDMN-TI^FS");
            sb.AppendLine($"^FO{x + 95},55^A0N,20,20^FB150,1,0,L^FD{codigoMN}^FS");
            sb.AppendLine($"^FO{x + 95},85^A0N,15,15^FB150,2,0,L^FD{marcaModelo}^FS");
            sb.AppendLine($"^FO{x + 95},120^A0N,13,13^FB150,1,0,L^FD{activo.Almacen.Nombre.ToUpper()}^FS");
        }
        sb.AppendLine("^XZ");
        return sb.ToString();
    }

    public async Task<string> GenerarEtiquetaIndividual(string codigoActivo, string baseUrl)
    {
        return await GenerarFilaTripleZpl(new List<string> { codigoActivo }, baseUrl);
    }

    // AGREGAR EL MÉTODO FALTANTE PARA TRASLADOS
    public async Task<string> GenerarComprobanteTraslado(int trasladoId)
    {
        var traslado = await _context.Traslados
            .Include(t => t.Activo)
            .Include(t => t.AlmacenOrigen)
            .Include(t => t.AlmacenDestino)
            .FirstOrDefaultAsync(t => t.Id == trasladoId);

        if (traslado == null) throw new ArgumentException("Traslado no encontrado");

        var sb = new StringBuilder();
        sb.AppendLine("^XA^PW788^LL200");
        sb.AppendLine($"^FO20,30^A0N,30,30^FDCOMPROBANTE TRASLADO: {traslado.NumeroTraslado}^FS");
        sb.AppendLine($"^FO20,70^A0N,20,20^FDORIGEN: {traslado.AlmacenOrigen.Nombre}^FS");
        sb.AppendLine($"^FO20,100^A0N,20,20^FDDESTINO: {traslado.AlmacenDestino.Nombre}^FS");
        sb.AppendLine($"^FO20,130^A0N,18,18^FDFECHA: {traslado.FechaTraslado:dd/MM/yyyy}^FS");
        sb.AppendLine("^XZ");
        return sb.ToString();
    }

    public string GenerarEtiquetaMantenimientoZpl(DatosEtiquetaMtto data, string baseUrl)
    {
        var sb = new StringBuilder();
        sb.AppendLine("^XA^PW788^LL200^LH0,0"); // Formato triple fila

        int x = 10; // Posición de la primera etiqueta
        var codigoMN = data.CodigoInterno.Replace("ICG-", "MN-");
        var qrUrl = $"{baseUrl}/activo/{codigoMN}";

        // QR en la misma posición que activos TI
        sb.AppendLine($"^FO{x},40^BQN,2,2^FDQA,{qrUrl}^FS");

        // Textos alineados como en tus etiquetas actuales
        sb.AppendLine($"^FO{x + 95},30^A0N,18,18^FB150,1,0,L^FDMTTO #{data.NumeroMantenimiento}^FS");
        sb.AppendLine($"^FO{x + 95},55^A0N,20,20^FB150,1,0,L^FD{codigoMN}^FS");

        // Información específica de mantenimiento en fuente más pequeña
        sb.AppendLine($"^FO{x + 95},85^A0N,14,14^FB150,2,0,L^FDFec: {data.FechaMantenimiento:dd/MM/yy}^FS");
        sb.AppendLine($"^FO{x + 95},110^A0N,13,13^FB150,1,0,L^FDProx: {data.FechaProximoMtto:dd/MM/yy}^FS");

        sb.AppendLine("^XZ");
        return sb.ToString();
    }
}