import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { authenticateUser } from './api/auth.js';
import { fetchWorkoutsCSV } from './api/workouts.js';

function localVercelApiPlugin() {
  const attachMiddleware = (middlewares) => {
    middlewares.use('/api/auth', async (req, res, next) => {
      if (req.method !== 'POST') return next();
      let rawBody = '';
      req.on('data', chunk => { rawBody += chunk; });
      req.on('end', async () => {
        try {
          const parsed = JSON.parse(rawBody || '{}');
          const result = await authenticateUser(parsed.username, parsed.password);
          res.statusCode = result.status;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify(result.body));
        } catch {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ ok: false, error: 'Erro interno na autenticação.' }));
        }
      });
    });

    middlewares.use('/api/workouts', async (req, res, next) => {
      if (req.method !== 'GET') return next();
      try {
        const csv = await fetchWorkoutsCSV();
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.end(csv);
      } catch {
        res.statusCode = 502;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ ok: false, error: 'Falha ao buscar planilha.' }));
      }
    });
  };

  return {
    name: 'local-vercel-api',
    configureServer(server) {
      attachMiddleware(server.middlewares);
    },
    configurePreviewServer(server) {
      attachMiddleware(server.middlewares);
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), localVercelApiPlugin()],
});
