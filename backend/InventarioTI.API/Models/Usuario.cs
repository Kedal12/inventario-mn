using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace InventarioTI.API.Models;

public class Usuario
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    [StringLength(50)]
    public string NombreUsuario { get; set; } = string.Empty;
    
    [Required]
    [StringLength(100)]
    public string NombreCompleto { get; set; } = string.Empty;
    
    [Required]
    [StringLength(255)]
    public string PasswordHash { get; set; } = string.Empty;
    
    [Required]
    [StringLength(20)]
    public string Rol { get; set; } = "Consultor"; // Administrador, Consultor
    
    public bool Activo { get; set; } = true;
    
    public DateTime FechaCreacion { get; set; } = DateTime.Now;
    
    public DateTime? UltimoAcceso { get; set; }
    
    // Almacenes asignados para consulta (solo para rol Consultor)
    public ICollection<UsuarioAlmacen> AlmacenesAsignados { get; set; } = new List<UsuarioAlmacen>();
}

public class UsuarioAlmacen
{
    [Key]
    public int Id { get; set; }
    
    public int UsuarioId { get; set; }
    public Usuario Usuario { get; set; } = null!;
    
    public int AlmacenId { get; set; }
    public Almacen Almacen { get; set; } = null!;
}
