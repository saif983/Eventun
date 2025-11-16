using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.IdentityModel.Tokens;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using EventunBackend.Models;
using EventunBackend.Service;
using EventunBackend.Data;

var builder = WebApplication.CreateBuilder(args);

// Add Entity Framework and SQL Server
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// Get Auth0 domain from configuration (null-safe)
var domainValue = builder.Configuration.GetRequiredSection("Auth0")["Domain"]
                 ?? throw new InvalidOperationException("Auth0:Domain is not configured.");
var domain = $"https://{domainValue}/";

// HttpClient for outbound calls (e.g., health checks, userinfo fallback)
builder.Services.AddHttpClient();

// Add services to the container.
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
.AddJwtBearer(options =>
{
    options.Authority = domain;
    options.Audience = builder.Configuration["Auth0:Audience"];
    options.TokenValidationParameters = new TokenValidationParameters
    {
        NameClaimType = ClaimTypes.NameIdentifier,
        RoleClaimType = ClaimTypes.Role,
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ClockSkew = TimeSpan.Zero
    };
    
    // Map Auth0 claims to standard claims
    options.Events = new JwtBearerEvents
    {
        OnTokenValidated = async context =>
        {
            var claimsIdentity = context.Principal?.Identity as ClaimsIdentity;
            
            // Map Auth0 'sub' claim to NameIdentifier if not already present
            if (claimsIdentity != null && claimsIdentity.FindFirst(ClaimTypes.NameIdentifier) == null)
            {
                var subClaim = claimsIdentity.FindFirst("sub");
                if (subClaim != null)
                {
                    claimsIdentity.AddClaim(new Claim(ClaimTypes.NameIdentifier, subClaim.Value));
                }
            }
            
            // Map Auth0 'email' claim to Email if not already present
            if (claimsIdentity != null && claimsIdentity.FindFirst(ClaimTypes.Email) == null)
            {
                var emailClaim = claimsIdentity.FindFirst("email")
                                  ?? claimsIdentity.FindFirst("https://eventun.api/email");
                if (emailClaim != null)
                {
                    claimsIdentity.AddClaim(new Claim(ClaimTypes.Email, emailClaim.Value));
                }
            }
            
            // Map Auth0 'name' claim to Name if not already present
            if (claimsIdentity != null && claimsIdentity.FindFirst(ClaimTypes.Name) == null)
            {
                var nameClaim = claimsIdentity.FindFirst("name")
                                 ?? claimsIdentity.FindFirst("https://eventun.api/name");
                if (nameClaim != null)
                {
                    claimsIdentity.AddClaim(new Claim(ClaimTypes.Name, nameClaim.Value));
                }
            }

            // Map namespaced 'picture' to standard 'picture' claim if missing
            if (claimsIdentity != null && claimsIdentity.FindFirst("picture") == null)
            {
                var pictureClaim = claimsIdentity.FindFirst("https://eventun.api/picture");
                if (pictureClaim != null)
                {
                    claimsIdentity.AddClaim(new Claim("picture", pictureClaim.Value));
                }
            }

            // Map user role from database to Role claim
            if (claimsIdentity != null)
            {
                var userId = claimsIdentity.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!string.IsNullOrEmpty(userId))
                {
                    using var scope = context.HttpContext.RequestServices.CreateScope();
                    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                    
                    var user = await dbContext.Users
                        .FirstOrDefaultAsync(u => u.TenantId == userId);
                    
                    if (user != null && !string.IsNullOrEmpty(user.Role))
                    {
                        // Remove existing role claims and add the database role
                        var existingRoleClaims = claimsIdentity.FindAll(ClaimTypes.Role).ToList();
                        foreach (var roleClaim in existingRoleClaims)
                        {
                            claimsIdentity.RemoveClaim(roleClaim);
                        }
                        
                        claimsIdentity.AddClaim(new Claim(ClaimTypes.Role, user.Role));
                    }
                }
            }
            
        }
    };
});

// Add authorization policies
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy(
        "read:messages",
        policy => policy.Requirements.Add(
            new HasScopeRequirement("read:messages", domain)
        )
    );
    // Additional API-specific scopes
    options.AddPolicy(
        "read:events",
        policy => policy.Requirements.Add(
            new HasScopeRequirement("read:events", domain)
        )
    );
    options.AddPolicy(
        "write:events",
        policy => policy.Requirements.Add(
            new HasScopeRequirement("write:events", domain)
        )
    );
    options.AddPolicy(
        "manage:users",
        policy => policy.Requirements.Add(
            new HasScopeRequirement("manage:users", domain)
        )
    );
});

// Register the scope authorization handler
builder.Services.AddSingleton<IAuthorizationHandler, HasScopeHandler>();

// CORS for frontend (origins from configuration)
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();
builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        if (allowedOrigins.Length > 0)
        {
            policy.WithOrigins(allowedOrigins)
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        }
        else
        {
            // Fallback for development if no origins configured
            policy.AllowAnyOrigin()
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        }
    });
});

builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo 
    { 
        Title = "EventunBackend API", 
        Version = "v1",
        Description = "SaaS Event Management API with Auth0 JWT Authentication"
    });

    // Add OAuth2 Authentication to Swagger for Auth0 (use configured domain)
    c.AddSecurityDefinition("oauth2", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.OAuth2,
        Flows = new Microsoft.OpenApi.Models.OpenApiOAuthFlows
        {
            AuthorizationCode = new Microsoft.OpenApi.Models.OpenApiOAuthFlow
            {
                AuthorizationUrl = new Uri($"{domain}authorize"),
                TokenUrl = new Uri($"{domain}oauth/token"),
                Scopes = new Dictionary<string, string>
                {
                    { "openid", "OpenID" },
                    { "profile", "Profile" },
                    { "email", "Email" },
                    { "read:events", "Read events" },
                    { "write:events", "Write events" },
                    { "manage:users", "Manage users" }
                }
            }
        }
    });

    // Also keep Bearer token option for manual testing
    c.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\"",
        Name = "Authorization",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    // Add security requirement for OAuth2
    c.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "oauth2"
                }
            },
            new string[] { "openid", "profile", "email", "read:events", "write:events", "manage:users" }
        }
    });

    // Also add Bearer token requirement for manual testing
    c.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            new string[] {}
        }
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "EventunBackend API v1");
        c.RoutePrefix = "swagger";
        c.DisplayRequestDuration();
        c.EnableTryItOutByDefault();
        c.OAuthClientId(builder.Configuration["Auth0:ClientId"]);
        c.OAuthAppName("EventunBackend API");
        c.OAuthUsePkce();
        c.OAuthScopes("openid", "profile", "email", "read:events", "write:events", "manage:users");
        // Ensure Auth0 returns an access_token for our API by passing the audience
        c.OAuthAdditionalQueryStringParams(new Dictionary<string, string>
        {
            { "audience", builder.Configuration["Auth0:Audience"] ?? string.Empty }
        });
    });
}

// Enable Swagger in production for testing (optional - remove in production)
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "EventunBackend API v1");
    c.RoutePrefix = "swagger";
    c.OAuthClientId(builder.Configuration["Auth0:ClientId"]);
    c.OAuthAppName("EventunBackend API");
    c.OAuthUsePkce();
    c.OAuthScopes("openid", "profile", "email", "read:events", "write:events", "manage:users");
    c.OAuthAdditionalQueryStringParams(new Dictionary<string, string>
    {
        { "audience", builder.Configuration["Auth0:Audience"] ?? string.Empty }
    });
});

// Enable HTTPS redirection (recommended for production)
app.UseHttpsRedirection();

// Enable CORS for frontend
app.UseCors("Frontend");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Apply pending EF Core migrations at startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
}

app.Run();
