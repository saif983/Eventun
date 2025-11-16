export const environment = {
  production: true,
  apiUrl: 'https://your-production-api.com/api',
  auth0: {
    domain: 'dev-ik5cqbvl4zsq0xty.us.auth0.com',
    clientId: 'U9fOY9qC5G1Q40LyuTazsfhmx6HUYnrv',
    audience: 'https://eventun.api',
    redirectUri: typeof window !== 'undefined' ? window.location.origin + '/callback' : 'https://your-domain.com/callback'
  }
};
