using System.ComponentModel.DataAnnotations;

namespace InventarioTI.API.Models;

public class HistorialActivo
{
    [Key]
    public int Id { get; set; }
    
    public int ActivoId { get; set; }
    public Activo Activo { get; set; } = null!;
    
    [Required]
    [StringLength(50)]
    public string TipoCambio { get; set; } = string.Empty; // Creacion, Edicion, Traslado, CambioEstado, Baja
    
    [Required]
    [StringLength(100)]
    public string Campo { get; set; } = string.Empty;
    
    [StringLength(500)]
    public string? ValorAnterior { get; set; }
    
    [StringLength(500)]
    public string? ValorNuevo { get; set; }
    
    [StringLength(500)]
    public string? Descripcion { get; set; }
    
    public int? UsuarioId { get; set; }
    
    [StringLength(100)]
    public string? NombreUsuario { get; set; }
    
    public DateTime FechaCambio { get; set; } = DateTime.Now;
    
    [StringLength(50)]
    public string? IpAddress { get; set; }
}
