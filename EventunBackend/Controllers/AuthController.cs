using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using EventunBackend.Data;
using Microsoft.AspNetCore.Authentication;
using System.Text.Json;
using EventunBackend.DTOs;
using EventunBackend.Constants;
using EventunBackend.Extensions;
namespace EventunBackend.Controllers
{
    [Route("api")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _config;
        public AuthController(AppDbContext context, IHttpClientFactory httpClientFactory, IConfiguration config)
        {
            _context = context;
            _httpClientFactory = httpClientFactory;
            _config = config;
        }
        [HttpGet("public")]
        public IActionResult Public()
        {
            return Ok(new
            {
                Message = "Hello from a public endpoint! You don't need to be authenticated to see this."
            });
        }

        [HttpGet("private")]
        [Authorize]
        public IActionResult Private()
        {
            return Ok(new
            {
                Message = "Hello from a private endpoint! You need to be authenticated to see this.",
                User = new
                {
                    Id = User.GetUserId(),
                    Email = User.GetUserEmail(),
                    Name = User.GetUserName()
                }
            });
        }

        [HttpGet("private-scoped")]
        [Authorize(Roles = Roles.User + "," + Roles.Owner)]
        public IActionResult Scoped()
        {
            return Ok(new
            {
                Message = "Hello from a private-scoped endpoint! You need the 'read:events' permission to see this.",
                User = new
                {
                    Id = User.GetUserId(),
                    Email = User.GetUserEmail(),
                    Name = User.GetUserName(),
                    Scopes = User.FindFirst("scope")?.Value?.Split(' '),
                    Permissions = User.FindAll("permissions").Select(c => c.Value)
                }
            });
        }

        [HttpGet("user-profile")]
        [Authorize]
        public async Task<IActionResult> GetUserProfile(CancellationToken cancellationToken = default)
        {
            var userInfo = await GetUserInfoFromClaimsAsync();
            var existingUser = await GetOrCreateUserAsync(userInfo, cancellationToken);
            
            return Ok(new
            {
                Message = "User profile information",
                User = new
                {
                    Id = userInfo.Auth0UserId,
                    Email = existingUser?.Email ?? userInfo.Email,
                    Name = existingUser?.Name ?? userInfo.Name,
                    Picture = existingUser?.Picture ?? userInfo.Picture,
                    Role = existingUser?.Role ?? Roles.User,
                    IsActive = existingUser?.IsActive ?? true
                }
            });
        }

        private async Task<(string Auth0UserId, string Email, string Name, string Picture)> GetUserInfoFromClaimsAsync()
        {
            var auth0UserId = User.GetUserId();
            var email = User.GetUserEmail();
            var name = User.GetUserName();
            var picture = User.GetUserPicture();

            // If profile claims are missing, try Auth0 UserInfo fallback
            if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(name) || string.IsNullOrWhiteSpace(picture))
            {
                var fetched = await FetchUserInfoAsync();
                if (fetched != null)
                {
                    email = string.IsNullOrWhiteSpace(email) ? (fetched.Email ?? string.Empty) : email;
                    name = string.IsNullOrWhiteSpace(name) ? (fetched.Name ?? string.Empty) : name;
                    picture = string.IsNullOrWhiteSpace(picture) ? (fetched.Picture ?? string.Empty) : picture;
                }
            }

            return (auth0UserId, email, name, picture);
        }

        private async Task<EventunBackend.Models.User?> GetOrCreateUserAsync(
            (string Auth0UserId, string Email, string Name, string Picture) userInfo, 
            CancellationToken cancellationToken)
        {
            var existingUser = await _context.Users
                .FirstOrDefaultAsync(u => u.TenantId == userInfo.Auth0UserId, cancellationToken)
                .ConfigureAwait(false);

            if (existingUser == null && !string.IsNullOrEmpty(userInfo.Auth0UserId))
            {
                existingUser = await CreateNewUserAsync(userInfo, cancellationToken);
            }
            else if (existingUser != null)
            {
                await UpdateExistingUserAsync(existingUser, userInfo, cancellationToken);
            }

            return existingUser;
        }

        private async Task<EventunBackend.Models.User> CreateNewUserAsync(
            (string Auth0UserId, string Email, string Name, string Picture) userInfo,
            CancellationToken cancellationToken)
        {
            var newUser = new EventunBackend.Models.User
            {
                TenantId = userInfo.Auth0UserId,
                Email = userInfo.Email,
                Name = userInfo.Name,
                Picture = userInfo.Picture,
                Role = Roles.User,
                CreatedAt = DateTime.UtcNow,
                LastLoginAt = DateTime.UtcNow,
                IsActive = true
            };

            _context.Users.Add(newUser);
            await _context.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
            return newUser;
        }

        private async Task UpdateExistingUserAsync(
            EventunBackend.Models.User existingUser,
            (string Auth0UserId, string Email, string Name, string Picture) userInfo,
            CancellationToken cancellationToken)
        {
            existingUser.LastLoginAt = DateTime.UtcNow;
            
            // Backfill any missing fields from token values
            if (string.IsNullOrWhiteSpace(existingUser.Email) && !string.IsNullOrWhiteSpace(userInfo.Email))
                existingUser.Email = userInfo.Email;
            
            if (string.IsNullOrWhiteSpace(existingUser.Name) && !string.IsNullOrWhiteSpace(userInfo.Name))
                existingUser.Name = userInfo.Name;
            
            if (string.IsNullOrWhiteSpace(existingUser.Picture) && !string.IsNullOrWhiteSpace(userInfo.Picture))
                existingUser.Picture = userInfo.Picture;

            await _context.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        }

        [HttpPost("assign-owner-role")]
        [Authorize(Roles = Roles.Owner)]
        public async Task<IActionResult> AssignOwnerRole(CancellationToken cancellationToken = default)
        {
            var auth0UserId = User.GetUserId();
            
            if (string.IsNullOrEmpty(auth0UserId))
            {
                return BadRequest("User ID not found");
            }

            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.TenantId == auth0UserId, cancellationToken)
                .ConfigureAwait(false);

            if (user == null)
            {
                return NotFound("User not found in database");
            }

            user.Role = Roles.Owner;
            await _context.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

            return Ok(new
            {
                Message = "Owner role assigned successfully",
                User = new
                {
                    Id = user.TenantId,
                    Email = user.Email,
                    Name = user.Name,
                    Role = user.Role
                }
            });
        }

        private async Task<UserInfoResponse?> FetchUserInfoAsync()
        {
            try
            {
                var accessToken = await HttpContext.GetTokenAsync("access_token");
                if (string.IsNullOrEmpty(accessToken))
                {
                    return null;
                }

                var domain = _config["Auth0:Domain"];
                if (string.IsNullOrEmpty(domain))
                {
                    return null;
                }

                var httpClient = _httpClientFactory.CreateClient();
                httpClient.DefaultRequestHeaders.Authorization = 
                    new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);

                var response = await httpClient.GetAsync($"https://{domain}/userinfo");
                if (!response.IsSuccessStatusCode)
                {
                    return null;
                }

                var content = await response.Content.ReadAsStringAsync();
                return JsonSerializer.Deserialize<UserInfoResponse>(content);
            }
            catch (HttpRequestException ex)
            {
                // Log the exception if you have logging configured
                return null;
            }
            catch (JsonException ex)
            {
                // Log the exception if you have logging configured
                return null;
            }
            catch (Exception ex)
            {
                // Log the exception if you have logging configured
                return null;
            }
        }

        [HttpPost("auth/token")]
        public async Task<IActionResult> ExchangeCodeForToken([FromBody] TokenExchangeRequest request)
        {
            try
            {
                var httpClient = _httpClientFactory.CreateClient();
                
                var tokenRequest = new
                {
                    grant_type = "authorization_code",
                    client_id = _config["Auth0:ClientId"],
                    client_secret = _config["Auth0:ClientSecret"],
                    code = request.Code,
                    redirect_uri = request.RedirectUri
                };

                var content = new StringContent(
                    JsonSerializer.Serialize(tokenRequest),
                    System.Text.Encoding.UTF8,
                    "application/json"
                );

                var domain = _config["Auth0:Domain"];
                var response = await httpClient.PostAsync($"https://{domain}/oauth/token", content);
                
                if (!response.IsSuccessStatusCode)
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    return BadRequest(new { error = "Token exchange failed", details = errorContent });
                }

                var tokenResponse = await response.Content.ReadAsStringAsync();
                var tokenData = JsonSerializer.Deserialize<JsonElement>(tokenResponse);
                
                var accessToken = tokenData.GetProperty("access_token").GetString();
                
                // Get user info using the access token
                httpClient.DefaultRequestHeaders.Authorization = 
                    new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);
                
                var userInfoResponse = await httpClient.GetAsync($"https://{domain}/userinfo");
                if (userInfoResponse.IsSuccessStatusCode)
                {
                    var userInfoContent = await userInfoResponse.Content.ReadAsStringAsync();
                    var userInfo = JsonSerializer.Deserialize<JsonElement>(userInfoContent);
                    
                    // Create or update user in database
                    var auth0UserId = userInfo.GetProperty("sub").GetString();
                    var email = userInfo.TryGetProperty("email", out var emailProp) ? emailProp.GetString() : "";
                    var name = userInfo.TryGetProperty("name", out var nameProp) ? nameProp.GetString() : "";
                    var picture = userInfo.TryGetProperty("picture", out var pictureProp) ? pictureProp.GetString() : "";
                    
                    var existingUser = await _context.Users
                        .FirstOrDefaultAsync(u => u.TenantId == auth0UserId);
                    
                    if (existingUser == null)
                    {
                        existingUser = new EventunBackend.Models.User
                        {
                            TenantId = auth0UserId,
                            Email = email,
                            Name = name,
                            Picture = picture,
                            Role = Roles.User,
                            CreatedAt = DateTime.UtcNow,
                            LastLoginAt = DateTime.UtcNow,
                            IsActive = true
                        };
                        _context.Users.Add(existingUser);
                    }
                    else
                    {
                        existingUser.LastLoginAt = DateTime.UtcNow;
                        if (string.IsNullOrWhiteSpace(existingUser.Email)) existingUser.Email = email;
                        if (string.IsNullOrWhiteSpace(existingUser.Name)) existingUser.Name = name;
                        if (string.IsNullOrWhiteSpace(existingUser.Picture)) existingUser.Picture = picture;
                    }
                    
                    await _context.SaveChangesAsync();
                    
                    return Ok(new
                    {
                        access_token = accessToken,
                        user = new
                        {
                            id = existingUser.TenantId,
                            email = existingUser.Email,
                            name = existingUser.Name,
                            picture = existingUser.Picture,
                            role = existingUser.Role,
                            isActive = existingUser.IsActive
                        }
                    });
                }
                
                return Ok(new { access_token = accessToken });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = "Token exchange failed", message = ex.Message });
            }
        }
    }

    public class TokenExchangeRequest
    {
        public string Code { get; set; } = string.Empty;
        public string RedirectUri { get; set; } = string.Empty;
    }
}