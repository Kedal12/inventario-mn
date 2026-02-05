using System.ComponentModel.DataAnnotations;

namespace InventarioTI.API.Models;

public class Almacen
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    [StringLength(100)]
    public string Nombre { get; set; } = string.Empty;
    
    [StringLength(10)]
    public string Codigo { get; set; } = string.Empty;
    
    [StringLength(255)]
    public string? Direccion { get; set; }
    
    [StringLength(50)]
    public string? Telefono { get; set; }
    
    [StringLength(100)]
    public string? Responsable { get; set; }
    
    public bool Activo { get; set; } = true;
    
    public DateTime FechaCreacion { get; set; } = DateTime.Now;
    
    // Navegación
    public ICollection<Activo> Activos { get; set; } = new List<Activo>();
}
