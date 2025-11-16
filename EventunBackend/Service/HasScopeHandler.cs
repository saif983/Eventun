using Microsoft.AspNetCore.Authorization;
using EventunBackend.Models;

namespace EventunBackend.Service
{
    public class HasScopeHandler : AuthorizationHandler<HasScopeRequirement>
    {
        protected override Task HandleRequirementAsync(
            AuthorizationHandlerContext context,
            HasScopeRequirement requirement)
        {
            // First, check for Auth0 "permissions" claim (RBAC)
            var permissionsClaims = context.User.FindAll("permissions");
            if (permissionsClaims != null && permissionsClaims.Any())
            {
                // permissions claims may not include issuer; accept if any matches required scope
                if (permissionsClaims.Any(pc => string.Equals(pc.Value, requirement.Scope, StringComparison.OrdinalIgnoreCase)))
                {
                    context.Succeed(requirement);
                    return Task.CompletedTask;
                }
            }

            // Fallback to classic "scope" (space-delimited) claim with matching issuer
            var scopeClaim = context.User.FindFirst(c => c.Type == "scope" && c.Issuer == requirement.Issuer);
            if (scopeClaim != null)
            {
                var scopes = scopeClaim.Value.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
                if (scopes.Any(s => string.Equals(s, requirement.Scope, StringComparison.OrdinalIgnoreCase)))
                {
                    context.Succeed(requirement);
                    return Task.CompletedTask;
                }
            }

            return Task.CompletedTask;
        }
    }
}