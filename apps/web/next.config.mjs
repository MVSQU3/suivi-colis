/** @type {import('next').NextConfig} */
// Proxy same-origin : le navigateur appelle /api/v1, Next relaie vers l'API (variable serveur, lue au build et au démarrage).
const API_INTERNAL_URL = (process.env.API_INTERNAL_URL || 'http://127.0.0.1:4000').replace(/\/+$/, '');

export default {
  transpilePackages: ['@suivi-colis/shared'],
  async rewrites() {
    return [{ source: '/api/v1/:path*', destination: `${API_INTERNAL_URL}/api/v1/:path*` }];
  },
};
