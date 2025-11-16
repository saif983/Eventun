using System.Security.Claims;

namespace EventunBackend.Extensions
{
    public static class ClaimsPrincipalExtensions
    {
        public static string GetUserId(this ClaimsPrincipal user)
        {
            return user.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? 
                   user.FindFirst("sub")?.Value ?? 
                   string.Empty;
        }

        public static string GetUserEmail(this ClaimsPrincipal user)
        {
            return user.FindFirst(ClaimTypes.Email)?.Value ?? 
                   user.FindFirst("email")?.Value ?? 
                   string.Empty;
        }

        public static string GetUserName(this ClaimsPrincipal user)
        {
            return user.FindFirst(ClaimTypes.Name)?.Value ?? 
                   user.FindFirst("name")?.Value ?? 
                   string.Empty;
        }

        public static string GetUserPicture(this ClaimsPrincipal user)
        {
            return user.FindFirst("picture")?.Value ?? string.Empty;
        }

        public static string GetUserRole(this ClaimsPrincipal user)
        {
            return user.FindFirst(ClaimTypes.Role)?.Value ?? string.Empty;
        }

        public static string GetTenantId(this ClaimsPrincipal user)
        {
            return user.FindFirst("tenant_id")?.Value ?? string.Empty;
        }
       
    }
}
