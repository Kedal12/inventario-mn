using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace InventarioTI.API.Models;

public class Activo
{
    [Key]
    public int Id { get; set; }

    [Required]
    [StringLength(50)]
    public string CodigoInterno { get; set; } = string.Empty; // ICG-TIP-XXXX

    [StringLength(100)]
    public string? SerialFabricante { get; set; }

    [Required]
    [StringLength(100)]
    public string Marca { get; set; } = string.Empty;

    [Required]
    [StringLength(100)]
    public string Modelo { get; set; } = string.Empty;

    [StringLength(500)]
    public string? Descripcion { get; set; }

    // Relaciones
    public int TipoActivoId { get; set; }
    public TipoActivo TipoActivo { get; set; } = null!;

    public int AlmacenId { get; set; }
    public Almacen Almacen { get; set; } = null!;

    public int EstadoId { get; set; }
    public EstadoActivo Estado { get; set; } = null!;

    // Fechas
    public DateTime FechaIngreso { get; set; } = DateTime.Now;

    public DateTime? FechaUltimoInventario { get; set; }

    public DateTime? FechaBaja { get; set; }

    [StringLength(500)]
    public string? MotivoBaja { get; set; }

    // Información adicional
    [StringLength(500)]
    public string? Observaciones { get; set; }

    // Usuario que registró
    public int? UsuarioRegistroId { get; set; }

    // QR URL
    [NotMapped]
    public string QrUrl => $"/activo/{CodigoInterno}";

    //URL
    public string? FotoUrl { get; set; }

    // Navegacion
    public virtual ICollection<HistorialActivo> Historial { get; set; } = new List<HistorialActivo>();
    public virtual ICollection<Traslado> TrasladosOrigen { get; set; } = new List<Traslado>();
    public virtual ICollection<Traslado> TrasladosDestino { get; set; } = new List<Traslado>();
}