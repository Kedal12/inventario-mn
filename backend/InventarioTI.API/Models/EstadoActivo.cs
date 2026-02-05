using System.ComponentModel.DataAnnotations;

namespace InventarioTI.API.Models;

public class EstadoActivo
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    [StringLength(50)]
    public string Nombre { get; set; } = string.Empty;
    
    [StringLength(7)]
    public string Color { get; set; } = "#6B7280"; // Color hex para UI
    
    [StringLength(255)]
    public string? Descripcion { get; set; }
    
    public int Orden { get; set; } = 0;
    
    public bool Activo { get; set; } = true;
    
    // Navegación
    public ICollection<Activo> Activos { get; set; } = new List<Activo>();
}
