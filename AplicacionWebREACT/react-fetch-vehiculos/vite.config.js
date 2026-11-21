import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Proxy del servidor de Vite (desarrollo y preview).
 *
 * - Todas las peticiones REST salen hacia NGINX (puerto 8090), la puerta de entrada del sistema.
 * - /oauth/token: el navegador solo envía usuario y contraseña. El cliente OAuth (OAUTH_CLIENT_ID y
 *   OAUTH_CLIENT_SECRET) lo agrega ESTE archivo desde el .env, que se lee en el servidor de Vite.
 *   Las variables no empiezan con VITE_, por lo que nunca se incluyen en el código del navegador.
 * - /api: solo se permite GET. React es un cliente de consulta y no registra ventas.
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const nginx = (env.API_BASE_URL || 'http://127.0.0.1:8090').replace(/\/$/, '');
  const clienteOAuth =
    env.OAUTH_CLIENT_ID && env.OAUTH_CLIENT_SECRET
      ? 'Basic ' + Buffer.from(`${env.OAUTH_CLIENT_ID}:${env.OAUTH_CLIENT_SECRET}`).toString('base64')
      : '';

  const responder = (res, estado, mensaje) => {
    res.statusCode = estado;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ mensaje }));
    return false; // la petición termina aquí y no se reenvía
  };

  const proxy = {
    '/oauth': {
      target: nginx,
      changeOrigin: true,
      bypass(req, res) {
        if (req.method !== 'POST' || !req.url.startsWith('/oauth/token')) {
          return responder(res, 404, 'Ruta no disponible en el cliente web.');
        }
        if (!clienteOAuth) {
          return responder(res, 500, 'Falta configurar OAUTH_CLIENT_ID y OAUTH_CLIENT_SECRET en el .env de React.');
        }
        return undefined;
      },
      configure(servidor) {
        // El navegador no puede imponer su propio cliente: siempre se usa el configurado en el servidor.
        servidor.on('proxyReq', (peticion) => peticion.setHeader('Authorization', clienteOAuth));
      },
    },
    '/api': {
      target: nginx,
      changeOrigin: true,
      bypass(req, res) {
        if (req.method !== 'GET') {
          return responder(res, 405, 'El cliente web React solo consulta datos (GET); no registra ventas.');
        }
        return undefined;
      },
    },
  };

  return {
    plugins: [react()],
    server: { port: 5173, strictPort: true, proxy },
    preview: { port: 4173, strictPort: true, proxy },
  };
});
