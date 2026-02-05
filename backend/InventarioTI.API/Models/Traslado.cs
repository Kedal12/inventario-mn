using System.ComponentModel.DataAnnotations;

namespace InventarioTI.API.Models;

public class Traslado
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    [StringLength(20)]
    public string NumeroTraslado { get; set; } = string.Empty; // TRS-YYYYMMDD-XXXX
    
    public int ActivoId { get; set; }
    public Activo Activo { get; set; } = null!;
    
    public int AlmacenOrigenId { get; set; }
    public Almacen AlmacenOrigen { get; set; } = null!;
    
    public int AlmacenDestinoId { get; set; }
    public Almacen AlmacenDestino { get; set; } = null!;
    
    [Required]
    [StringLength(500)]
    public string Motivo { get; set; } = string.Empty;
    
    public DateTime FechaTraslado { get; set; } = DateTime.Now;
    
    public int UsuarioId { get; set; }
    
    [StringLength(100)]
    public string NombreUsuario { get; set; } = string.Empty;
    
    [StringLength(500)]
    public string? Observaciones { get; set; }
}
