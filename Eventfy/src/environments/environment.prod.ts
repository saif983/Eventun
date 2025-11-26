export const environment = {
  production: true,
  apiUrl: typeof window !== 'undefined' ? `${window.location.origin}/api` : '/api',
  auth0: {
    domain: 'dev-ik5cqbvl4zsq0xty.us.auth0.com',
    clientId: 'U9fOY9qC5G1Q40LyuTazsfhmx6HUYnrv',
    audience: 'https://eventun.api',
    redirectUri: typeof window !== 'undefined' ? window.location.origin + '/callback' : '/callback'
  }
};
