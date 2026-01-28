using System.ComponentModel.DataAnnotations;

namespace InventarioTI.API.Models;

public class TipoActivo
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    [StringLength(150)]
    public string Nombre { get; set; } = string.Empty;
    
    [Required]
    [StringLength(10)]
    public string Referencia { get; set; } = string.Empty; // REF.1, REF.2, etc.
    
    [StringLength(500)]
    public string? Descripcion { get; set; }
    
    public bool Activo { get; set; } = true;
    
    public DateTime FechaCreacion { get; set; } = DateTime.Now;
    
    // Navegación
    public ICollection<Activo> Activos { get; set; } = new List<Activo>();
}
