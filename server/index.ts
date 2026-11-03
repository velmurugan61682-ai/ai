import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { keyRouter } from './routes/keyRoutes';
import { apiV1Router } from './routes/apiV1Routes';
import { connectToDatabase } from './db';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: '*' }));
app.use(express.json());

// Request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[API] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount Routes
app.use('/api/keys', keyRouter);
app.use('/api/v1', apiV1Router);

// Start server
connectToDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`[SaaS AI Brain Server] Running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.warn('[SaaS AI Brain Server] Started in offline fallback mode:', err.message);
    app.listen(PORT, () => {
      console.log(`[SaaS AI Brain Server] Running on http://localhost:${PORT} (offline DB mode)`);
    });
  });

export default app;
