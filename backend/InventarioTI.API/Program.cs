using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using InventarioTI.API.Data;
using InventarioTI.API.Services;

var builder = WebApplication.CreateBuilder(args);

// Base de datos SQL Server
builder.Services.AddDbContext<InventarioDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection") 
        ?? "Server=localhost;Database=InventarioTI_ICG;Trusted_Connection=True;TrustServerCertificate=True;"));

// Autenticación JWT
var jwtKey = builder.Configuration["Jwt:Key"] ?? "ICG-InventarioTI-SecretKey-2025-SuperSegura";
var key = Encoding.UTF8.GetBytes(jwtKey);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "InventarioTI.API",
        ValidateAudience = true,
        ValidAudience = builder.Configuration["Jwt:Audience"] ?? "InventarioTI.Client",
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero
    };
});

builder.Services.AddAuthorization();

// Servicios
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IHistorialService, HistorialService>();
builder.Services.AddScoped<IActivoService, ActivoService>();
builder.Services.AddScoped<ITrasladoService, TrasladoService>();
builder.Services.AddScoped<IReporteService, ReporteService>();
builder.Services.AddScoped<IZplService, ZplService>();

builder.Services.AddControllers();

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
    });
});

// Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Inventario TI - ICG API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header. Example: \"Bearer {token}\"",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI(c => { c.SwaggerEndpoint("/swagger/v1/swagger.json", "Inventario TI - ICG API v1"); });
app.UseDefaultFiles();
app.UseStaticFiles();
app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapFallbackToFile("index.html");

// Inicializar BD
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<InventarioDbContext>();
    try
    {
        context.Database.EnsureCreated();
        if (!context.Usuarios.Any(u => u.NombreUsuario == "admin"))
        {
            context.Usuarios.Add(new InventarioTI.API.Models.Usuario
            {
                NombreUsuario = "admin",
                NombreCompleto = "Administrador Sistema",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123"),
                Rol = "Administrador",
                Activo = true
            });
            context.SaveChanges();
            Console.WriteLine("Usuario admin creado: admin / admin123");
        }
        Console.WriteLine("BD inicializada correctamente");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Error BD: {ex.Message}");
    }
}

Console.WriteLine("=== INVENTARIO TI - ICG ===");
Console.WriteLine("API: http://localhost:5000");
Console.WriteLine("Swagger: http://localhost:5000/swagger");
Console.WriteLine("Login: admin / admin123");

app.Run();
