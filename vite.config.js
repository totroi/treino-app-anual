import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { authenticateUser } from './api/auth.js';
import { fetchWorkoutsCSV } from './api/workouts.js';
import { handleTrackingRequest } from './api/tracking.js';

function collectDistFiles(dir, rootDir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectDistFiles(fullPath, rootDir));
    } else if (entry.isFile()) {
      const rel = '/' + path.relative(rootDir, fullPath).split(path.sep).join('/');
      if (
        rel === '/sw.js' ||
        rel === '/precache-manifest.json' ||
        /^\/assets\/guides(Male|Female)-[^/]+\.js$/i.test(rel)
      ) {
        continue;
      }
      files.push({ rel, fullPath });
    }
  }
  return files;
}

function offlinePrecacheManifestPlugin() {
  let outDir = 'dist';
  return {
    name: 'offline-precache-manifest',
    configResolved(config) {
      outDir = config.build?.outDir || 'dist';
    },
    configureServer(server) {
      server.middlewares.use('/precache-manifest.json', (req, res) => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.end(JSON.stringify({ version: 'irontracker-shell-dev', urls: [] }));
      });
    },
    closeBundle() {
      const resolvedOutDir = path.resolve(process.cwd(), outDir);
      if (!fs.existsSync(resolvedOutDir)) return;

      const files = collectDistFiles(resolvedOutDir, resolvedOutDir).sort((a, b) =>
        a.rel.localeCompare(b.rel)
      );
      const hash = crypto.createHash('sha256');
      for (const file of files) {
        const content = fs.readFileSync(file.fullPath);
        hash.update(file.rel);
        hash.update(content);
      }
      const version = `irontracker-shell-${hash.digest('hex').slice(0, 10)}`;
      const urls = Array.from(new Set(['/', ...files.map((f) => f.rel)]));

      fs.writeFileSync(
        path.join(resolvedOutDir, 'precache-manifest.json'),
        JSON.stringify({ version, urls }, null, 2),
        'utf-8'
      );

      // Injeta hash de build em dist/sw.js garantindo que todo deploy gere SW byte-a-byte distinto (R1)
      const swOutPath = path.join(resolvedOutDir, 'sw.js');
      if (fs.existsSync(swOutPath)) {
        const swSource = fs.readFileSync(swOutPath, 'utf-8');
        const patchedSw = swSource.replace(/__IRONTRACKER_BUILD_VERSION__/g, version);
        fs.writeFileSync(swOutPath, patchedSw, 'utf-8');
      }
    }
  };
}

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
        const reqUrl = new URL(req.url || '/', 'http://localhost');
        const sexo = reqUrl.searchParams.get('sexo') || 'M';
        const csv = await fetchWorkoutsCSV(sexo);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.end(csv);
      } catch {
        res.statusCode = 502;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ ok: false, error: 'Falha ao buscar planilha.' }));
      }
    });

    middlewares.use('/api/tracking', async (req, res, next) => {
      if (req.method !== 'GET' && req.method !== 'POST') return next();
      const finish = async (parsedBody) => {
        try {
          const result = await handleTrackingRequest({
            method: req.method,
            headers: req.headers || {},
            body: parsedBody
          });
          res.statusCode = result.status;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.setHeader('Cache-Control', 'no-store');
          res.end(JSON.stringify(result.body));
        } catch {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ ok: false, skipped: true }));
        }
      };

      if (req.method === 'GET') {
        await finish({});
        return;
      }

      let rawBody = '';
      req.on('data', (chunk) => { rawBody += chunk; });
      req.on('end', async () => {
        let parsed = {};
        try {
          parsed = JSON.parse(rawBody || '{}');
        } catch {
          parsed = {};
        }
        await finish(parsed);
      });
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
  plugins: [react(), tailwindcss(), localVercelApiPlugin(), offlinePrecacheManifestPlugin()],
});
