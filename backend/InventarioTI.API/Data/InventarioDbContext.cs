using Microsoft.EntityFrameworkCore;
using InventarioTI.API.Models;

namespace InventarioTI.API.Data;

public class InventarioDbContext : DbContext
{
    public InventarioDbContext(DbContextOptions<InventarioDbContext> options) : base(options)
    {
    }

    public DbSet<Usuario> Usuarios { get; set; }
    public DbSet<UsuarioAlmacen> UsuarioAlmacenes { get; set; }
    public DbSet<Almacen> Almacenes { get; set; }
    public DbSet<TipoActivo> TiposActivo { get; set; }
    public DbSet<EstadoActivo> EstadosActivo { get; set; }
    public DbSet<Activo> Activos { get; set; }
    public DbSet<HistorialActivo> HistorialActivos { get; set; }
    public DbSet<Traslado> Traslados { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Índices únicos
        modelBuilder.Entity<Usuario>()
            .HasIndex(u => u.NombreUsuario)
            .IsUnique();

        modelBuilder.Entity<Almacen>()
            .HasIndex(a => a.Codigo)
            .IsUnique();

        modelBuilder.Entity<Activo>()
            .HasIndex(a => a.CodigoInterno)
            .IsUnique();

        modelBuilder.Entity<TipoActivo>()
            .HasIndex(t => t.Referencia)
            .IsUnique();

        modelBuilder.Entity<Traslado>()
            .HasIndex(t => t.NumeroTraslado)
            .IsUnique();
        // Relaciones
        modelBuilder.Entity<Activo>()
            .HasOne(a => a.Almacen)
            .WithMany(al => al.Activos)
            .HasForeignKey(a => a.AlmacenId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Activo>()
            .HasOne(a => a.TipoActivo)
            .WithMany(t => t.Activos)
            .HasForeignKey(a => a.TipoActivoId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Activo>()
            .HasOne(a => a.Estado)
            .WithMany(e => e.Activos)
            .HasForeignKey(a => a.EstadoId)
            .OnDelete(DeleteBehavior.Restrict);

        // CONFIGURACIÓN CORREGIDA PARA TRASLADOS
        modelBuilder.Entity<Traslado>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.NumeroTraslado).IsRequired().HasMaxLength(20);

            // SOLUCIÓN AL ERROR ActivoId1:
            // Mapeamos explícitamente la relación principal
            entity.HasOne(d => d.Activo)
                .WithMany(p => p.TrasladosOrigen) // Usamos una de las colecciones de Activo.cs
                .HasForeignKey(d => d.ActivoId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(d => d.AlmacenOrigen)
                .WithMany()
                .HasForeignKey(d => d.AlmacenOrigenId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(d => d.AlmacenDestino)
                .WithMany()
                .HasForeignKey(d => d.AlmacenDestinoId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // Seed Data - Estados
        modelBuilder.Entity<EstadoActivo>().HasData(
            new EstadoActivo { Id = 1, Nombre = "Disponible", Color = "#10B981", Orden = 1 },
            new EstadoActivo { Id = 2, Nombre = "Asignado", Color = "#3B82F6", Orden = 2 },
            new EstadoActivo { Id = 3, Nombre = "En Mantenimiento", Color = "#F59E0B", Orden = 3 },
            new EstadoActivo { Id = 4, Nombre = "En Reparación", Color = "#EF4444", Orden = 4 },
            new EstadoActivo { Id = 5, Nombre = "Dado de Baja", Color = "#6B7280", Orden = 5 }
        );

        // Seed Data - Almacenes (22 sedes)
        modelBuilder.Entity<Almacen>().HasData(
            // Tiendas
            new Almacen { Id = 1, Nombre = "Tienda Bello", Codigo = "TDA-BEL" },
            new Almacen { Id = 2, Nombre = "Tienda Envigado", Codigo = "TDA-ENV" },
            new Almacen { Id = 3, Nombre = "Tienda Itagüí", Codigo = "TDA-ITA" },
            new Almacen { Id = 4, Nombre = "Tienda Laureles", Codigo = "TDA-LAU" },
            new Almacen { Id = 5, Nombre = "Tienda Poblado", Codigo = "TDA-POB" },
            new Almacen { Id = 6, Nombre = "Tienda Centro", Codigo = "TDA-CEN" },
            new Almacen { Id = 7, Nombre = "Tienda Rionegro", Codigo = "TDA-RIO" },
            new Almacen { Id = 8, Nombre = "Tienda Sabaneta", Codigo = "TDA-SAB" },
            new Almacen { Id = 9, Nombre = "Tienda Copacabana", Codigo = "TDA-COP" },
            new Almacen { Id = 10, Nombre = "Tienda La Estrella", Codigo = "TDA-EST" },
            new Almacen { Id = 11, Nombre = "Tienda Caldas", Codigo = "TDA-CAL" },
            new Almacen { Id = 12, Nombre = "Tienda Marinilla", Codigo = "TDA-MAR" },
            new Almacen { Id = 13, Nombre = "Tienda Guarne", Codigo = "TDA-GUA" },
            // Áreas Administrativas
            new Almacen { Id = 14, Nombre = "Bilariu", Codigo = "ADM-BIL" },
            new Almacen { Id = 15, Nombre = "RRHH", Codigo = "ADM-RRH" },
            new Almacen { Id = 16, Nombre = "Compras", Codigo = "ADM-COM" },
            new Almacen { Id = 17, Nombre = "Mercadeo", Codigo = "ADM-MKT" },
            new Almacen { Id = 18, Nombre = "Sistemas", Codigo = "ADM-SIS" },
            new Almacen { Id = 19, Nombre = "Bodega de Sistemas", Codigo = "BOD-SIS" },
            new Almacen { Id = 20, Nombre = "Contabilidad", Codigo = "ADM-CON" },
            new Almacen { Id = 21, Nombre = "Seguridad", Codigo = "ADM-SEG" },
            new Almacen { Id = 22, Nombre = "Gerencia", Codigo = "ADM-GER" }
        );

        // Seed Data - Tipos de Activo (120 tipos)
        modelBuilder.Entity<TipoActivo>().HasData(
            new TipoActivo { Id = 1, Nombre = "CPU ESCRITORIO GENERICO", Referencia = "REF.1" },
            new TipoActivo { Id = 2, Nombre = "PORTATILES ASUS", Referencia = "REF.2" },
            new TipoActivo { Id = 3, Nombre = "CPU TODO EN UNO", Referencia = "REF.3" },
            new TipoActivo { Id = 4, Nombre = "PANTALLAS TOUCH ELO", Referencia = "REF.4" },
            new TipoActivo { Id = 5, Nombre = "PANTALLAS MONITOR HP", Referencia = "REF.5" },
            new TipoActivo { Id = 6, Nombre = "PANTALLAS LED", Referencia = "REF.6" },
            new TipoActivo { Id = 7, Nombre = "SERVIDORES RACKEABLES", Referencia = "REF.7" },
            new TipoActivo { Id = 8, Nombre = "SERVIDORES TORRES", Referencia = "REF.8" },
            new TipoActivo { Id = 9, Nombre = "TELEVISORES LG", Referencia = "REF.9" },
            new TipoActivo { Id = 10, Nombre = "IMPRESORAS POS EPSON", Referencia = "REF.10" },
            new TipoActivo { Id = 11, Nombre = "IMPRESORAS LASER HP", Referencia = "REF.11" },
            new TipoActivo { Id = 12, Nombre = "SCANERS PISTOLA", Referencia = "REF.12" },
            new TipoActivo { Id = 13, Nombre = "TECLADOS INALAMBRICO", Referencia = "REF.13" },
            new TipoActivo { Id = 14, Nombre = "TECLADOS ALAMBRICO", Referencia = "REF.14" },
            new TipoActivo { Id = 15, Nombre = "MOUSE INALAMBRICO", Referencia = "REF.15" },
            new TipoActivo { Id = 16, Nombre = "MOUSE ALAMBRICO", Referencia = "REF.16" },
            new TipoActivo { Id = 17, Nombre = "COMBO TECLADO Y MOUSE INALAM", Referencia = "REF.17" },
            new TipoActivo { Id = 18, Nombre = "LECTORES DE PISTOLA", Referencia = "REF.18" },
            new TipoActivo { Id = 19, Nombre = "CAJONES MONEDERO 3NSTAR", Referencia = "REF.19" },
            new TipoActivo { Id = 20, Nombre = "DIADEMAS", Referencia = "REF.20" },
            new TipoActivo { Id = 21, Nombre = "BAFLES PC", Referencia = "REF.21" },
            new TipoActivo { Id = 22, Nombre = "UPS POS PEQUEÑA INTERACTIVA", Referencia = "REF.22" },
            new TipoActivo { Id = 23, Nombre = "CAMARAS WEB", Referencia = "REF.23" },
            new TipoActivo { Id = 24, Nombre = "HUELLEROS", Referencia = "REF.24" },
            new TipoActivo { Id = 25, Nombre = "MEMORIAS RAM DDR3", Referencia = "REF.25" },
            new TipoActivo { Id = 26, Nombre = "MEMORIAS USB", Referencia = "REF.26" },
            new TipoActivo { Id = 27, Nombre = "DISCOS SOLIDOS", Referencia = "REF.27" },
            new TipoActivo { Id = 28, Nombre = "DISCOS M2", Referencia = "REF.28" },
            new TipoActivo { Id = 29, Nombre = "DISCOS MECANICOS", Referencia = "REF.29" },
            new TipoActivo { Id = 30, Nombre = "DISCOS EXTERNOS USB", Referencia = "REF.30" },
            new TipoActivo { Id = 31, Nombre = "BOARDS", Referencia = "REF.31" },
            new TipoActivo { Id = 32, Nombre = "CHASIS GENERICO", Referencia = "REF.32" },
            new TipoActivo { Id = 33, Nombre = "FUENTES DE PODER", Referencia = "REF.33" },
            new TipoActivo { Id = 34, Nombre = "TARJETAS DE VIDEO", Referencia = "REF.34" },
            new TipoActivo { Id = 35, Nombre = "TARJETAS DE RED", Referencia = "REF.35" },
            new TipoActivo { Id = 36, Nombre = "TARJETAS DE SONIDO", Referencia = "REF.36" },
            new TipoActivo { Id = 37, Nombre = "PROCESADORES", Referencia = "REF.37" },
            new TipoActivo { Id = 38, Nombre = "DISPLAY", Referencia = "REF.38" },
            new TipoActivo { Id = 39, Nombre = "CABLES DE PODER", Referencia = "REF.39" },
            new TipoActivo { Id = 40, Nombre = "CABLES DE RED", Referencia = "REF.40" },
            new TipoActivo { Id = 41, Nombre = "CABLES VGA", Referencia = "REF.41" },
            new TipoActivo { Id = 42, Nombre = "CABLES HDMI", Referencia = "REF.42" },
            new TipoActivo { Id = 43, Nombre = "CABLES DISPLAYPORT", Referencia = "REF.43" },
            new TipoActivo { Id = 44, Nombre = "CONSOLAS DE SONIDO", Referencia = "REF.44" },
            new TipoActivo { Id = 45, Nombre = "MICROFONOS INALAMBRICOS", Referencia = "REF.45" },
            new TipoActivo { Id = 46, Nombre = "MICROFONOS ALAMBRICOS", Referencia = "REF.46" },
            new TipoActivo { Id = 47, Nombre = "PARLANTES", Referencia = "REF.47" },
            new TipoActivo { Id = 48, Nombre = "PLANTAS DE SONIDO", Referencia = "REF.48" },
            new TipoActivo { Id = 49, Nombre = "DESPINADOR IMAN", Referencia = "REF.49" },
            new TipoActivo { Id = 50, Nombre = "DESPINADOR ELECTRICO", Referencia = "REF.50" },
            new TipoActivo { Id = 51, Nombre = "DESPINADOR PIN BLANDO", Referencia = "REF.51" },
            new TipoActivo { Id = 52, Nombre = "CPU ESCRITORIO HP", Referencia = "REF.52" },
            new TipoActivo { Id = 53, Nombre = "CPU ESCRITORIO LENOVO", Referencia = "REF.53" },
            new TipoActivo { Id = 54, Nombre = "PORTATILES DELL", Referencia = "REF.54" },
            new TipoActivo { Id = 55, Nombre = "PANTALLA MONITOR LG", Referencia = "REF.55" },
            new TipoActivo { Id = 56, Nombre = "PANTALLA MONITOR LENOVO", Referencia = "REF.56" },
            new TipoActivo { Id = 57, Nombre = "PANTALLA MONITOR DELL", Referencia = "REF.57" },
            new TipoActivo { Id = 58, Nombre = "TELEFONO GRANDSTREAM", Referencia = "REF.58" },
            new TipoActivo { Id = 59, Nombre = "IMPRESORAS POS BIXOLON", Referencia = "REF.59" },
            new TipoActivo { Id = 60, Nombre = "IMPRESORAS TINTA EPSON", Referencia = "REF.60" },
            new TipoActivo { Id = 61, Nombre = "IMPRESORAS TIQUETES ZEBRA", Referencia = "REF.61" },
            new TipoActivo { Id = 62, Nombre = "SCANER OMNIDIRECCIONAL MOTOROLA", Referencia = "REF.62" },
            new TipoActivo { Id = 63, Nombre = "SCANER OMNIDIRECCIONAL DATALOGIC", Referencia = "REF.63" },
            new TipoActivo { Id = 64, Nombre = "SCANER OMNIDIRECCIONAL HONEYWELL", Referencia = "REF.64" },
            new TipoActivo { Id = 65, Nombre = "CAJONES MONEDEROS SAT", Referencia = "REF.65" },
            new TipoActivo { Id = 66, Nombre = "UPS POS PEQUEÑA ONLINE", Referencia = "REF.66" },
            new TipoActivo { Id = 67, Nombre = "REGULADOR POS", Referencia = "REF.67" },
            new TipoActivo { Id = 68, Nombre = "BASE MICROFONO", Referencia = "REF.68" },
            new TipoActivo { Id = 69, Nombre = "SWITCH RED GENERICO", Referencia = "REF.69" },
            new TipoActivo { Id = 70, Nombre = "SWITCH RED RACKEABLES", Referencia = "REF.70" },
            new TipoActivo { Id = 71, Nombre = "CPU TIPO GAMER", Referencia = "REF.71" },
            new TipoActivo { Id = 72, Nombre = "MINITORRE LENOVO", Referencia = "REF.72" },
            new TipoActivo { Id = 73, Nombre = "PORTATILES LENOVO", Referencia = "REF.73" },
            new TipoActivo { Id = 74, Nombre = "PANTALLA MONITOR SAMSUNG", Referencia = "REF.74" },
            new TipoActivo { Id = 75, Nombre = "TELEVISORES KALLEY", Referencia = "REF.75" },
            new TipoActivo { Id = 76, Nombre = "SCANER OMNIDIRECCIONAL SYMBOL", Referencia = "REF.76" },
            new TipoActivo { Id = 77, Nombre = "CAJONES MONEDEROS DINAPOS", Referencia = "REF.77" },
            new TipoActivo { Id = 78, Nombre = "TELEVISORES SAMSUNG", Referencia = "REF.78" },
            new TipoActivo { Id = 79, Nombre = "CAJONES MONEDEROS BENMATECH", Referencia = "REF.79" },
            new TipoActivo { Id = 80, Nombre = "MINITORRE DELL", Referencia = "REF.80" },
            new TipoActivo { Id = 81, Nombre = "IMPRESORAS POS SAT", Referencia = "REF.81" },
            new TipoActivo { Id = 82, Nombre = "PANTALLAS TOUCH LOGIC CONTROLS", Referencia = "REF.82" },
            new TipoActivo { Id = 83, Nombre = "PANTALLA MONITOR ACER", Referencia = "REF.83" },
            new TipoActivo { Id = 84, Nombre = "TELEVISORES GENERICOS", Referencia = "REF.84" },
            new TipoActivo { Id = 85, Nombre = "IMPRESORAS PLOTTER HP MULTIF", Referencia = "REF.85" },
            new TipoActivo { Id = 86, Nombre = "TELEFONO ATCOM", Referencia = "REF.86" },
            new TipoActivo { Id = 87, Nombre = "PORTATILES VAIO SONY", Referencia = "REF.87" },
            new TipoActivo { Id = 88, Nombre = "PANTALLAS TOUCH 3NSTAR", Referencia = "REF.88" },
            new TipoActivo { Id = 89, Nombre = "CPU ESCRITORIO DELL", Referencia = "REF.89" },
            new TipoActivo { Id = 90, Nombre = "ROUTER MICROTIK", Referencia = "REF.90" },
            new TipoActivo { Id = 91, Nombre = "TELEVISORES CHALLENGER", Referencia = "REF.91" },
            new TipoActivo { Id = 92, Nombre = "CAJONES MONEDEROS POINT", Referencia = "REF.92" },
            new TipoActivo { Id = 93, Nombre = "VALIDADORA DE BILLETES", Referencia = "REF.93" },
            new TipoActivo { Id = 94, Nombre = "ACCESS POINT UNIFI", Referencia = "REF.94" },
            new TipoActivo { Id = 95, Nombre = "ROUTER TP-LINK WIFI", Referencia = "REF.95" },
            new TipoActivo { Id = 96, Nombre = "SCANER OMNIDIRECCIONAL ZEBRA", Referencia = "REF.96" },
            new TipoActivo { Id = 97, Nombre = "PORTATILES HP", Referencia = "REF.97" },
            new TipoActivo { Id = 98, Nombre = "SCANER MULTIFUNCIONAL EPSON", Referencia = "REF.98" },
            new TipoActivo { Id = 99, Nombre = "PANTALLA MONITOR SAT", Referencia = "REF.99" },
            new TipoActivo { Id = 100, Nombre = "PORTATILES SAMSUNG", Referencia = "REF.100" },
            new TipoActivo { Id = 101, Nombre = "TELEVISORES @LHUA", Referencia = "REF.101" },
            new TipoActivo { Id = 102, Nombre = "PORTATILES ACER", Referencia = "REF.102" },
            new TipoActivo { Id = 103, Nombre = "MAQUINA ENROLLADORA DE TIQUETES", Referencia = "REF.103" },
            new TipoActivo { Id = 104, Nombre = "IMPRESORA DE CARNETS ZEBRA", Referencia = "REF.104" },
            new TipoActivo { Id = 105, Nombre = "CALCULADORA ELECTRICA", Referencia = "REF.105" },
            new TipoActivo { Id = 106, Nombre = "BANCO DE ALMACENAMIENTO NAS", Referencia = "REF.106" },
            new TipoActivo { Id = 107, Nombre = "MARCADORA DYMO", Referencia = "REF.107" },
            new TipoActivo { Id = 108, Nombre = "iMAC-MacOS BIG SUR", Referencia = "REF.108" },
            new TipoActivo { Id = 109, Nombre = "iMAC-MacOS VENTURA", Referencia = "REF.109" },
            new TipoActivo { Id = 110, Nombre = "TECLADO USB NUMERO", Referencia = "REF.110" },
            new TipoActivo { Id = 111, Nombre = "TABLET LENOVO", Referencia = "REF.111" },
            new TipoActivo { Id = 112, Nombre = "IMPRESORAS TIQUETES PRINTRONIX", Referencia = "REF.112" },
            new TipoActivo { Id = 113, Nombre = "CELULAR XIAOMI", Referencia = "REF.113" },
            new TipoActivo { Id = 114, Nombre = "MEMORIAS RAM DDR4", Referencia = "REF.114" },
            new TipoActivo { Id = 115, Nombre = "MEMORIAS RAM PEQUEÑA", Referencia = "REF.115" },
            new TipoActivo { Id = 116, Nombre = "CAJONES MONEDEROS XPOS", Referencia = "REF.116" },
            new TipoActivo { Id = 117, Nombre = "CAJONES MONEDEROS 3BUMEN", Referencia = "REF.117" },
            new TipoActivo { Id = 118, Nombre = "IMPRESORAS TIQUETES TSC", Referencia = "REF.118" },
            new TipoActivo { Id = 119, Nombre = "CPU ESCRITORIO LG", Referencia = "REF.119" },
            new TipoActivo { Id = 120, Nombre = "EXTENSION ENERGIA", Referencia = "REF.120" }
        );

        // Seed Data - Usuario Admin por defecto
        modelBuilder.Entity<Usuario>().HasData(
            new Usuario
            {
                Id = 1,
                NombreUsuario = "admin",
                NombreCompleto = "Administrador Sistema",
                PasswordHash = "$2a$11$K5xXbKfXtqKxO7P5QLWG5.VQ5fxFqxKjRvVXqYXnHxfVKQ1qXqXqX", // admin123
                Rol = "Administrador",
                Activo = true,
                FechaCreacion = new DateTime(2025, 1, 1)
            }
        );
    }
}