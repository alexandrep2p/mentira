import { existsSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { Server } from 'socket.io';
import { registerHandlers } from './handlers';

const PORT = Number(process.env.PORT ?? 3000);
const here = path.dirname(fileURLToPath(import.meta.url));
const clientDist = process.env.CLIENT_DIST ?? path.resolve(here, '../../client/dist/client/browser');

const app = express();
app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

if (existsSync(clientDist)) {
  app.use(express.static(clientDist, { index: false, maxAge: '1h' }));
  // Fallback da SPA: qualquer rota que não seja arquivo devolve o index.html.
  app.get(/.*/, (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: process.env.NODE_ENV === 'production' ? undefined : { origin: true },
});
registerHandlers(io);

httpServer.listen(PORT, () => {
  console.log(`Mentira! no ar em http://localhost:${PORT}`);
});
