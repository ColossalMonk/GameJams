import { defineConfig } from 'vite';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Dev server only: the press tool (?press=1, src/tools/press.js) posts the cover,
 * screenshots and banner it renders to /__press/<name>.png, and they're saved in press/.
 */
function press() {
  const dir = resolve(__dirname, 'press');
  return {
    name: 'press',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__press/', (req, res) => {
        const name = decodeURIComponent(req.url.replace(/^\//, ''));
        if (req.method !== 'POST' || !/^[\w.@-]+\.(png|jpg)$/.test(name)) {
          res.statusCode = 400;
          res.end('bad request');
          return;
        }
        const chunks = [];
        req.on('data', (c) => chunks.push(c));
        req.on('end', () => {
          mkdirSync(dir, { recursive: true });
          writeFileSync(resolve(dir, name), Buffer.concat(chunks));
          res.end('saved');
        });
      });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [press()],
  server: {
    port: 5174,
  },
});
