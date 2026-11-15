import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.js';
import walletRoutes from './routes/wallet.js';
import merchantRoutes from './routes/merchants.js';
import catalogRoutes from './routes/catalog.js';
import orderRoutes from './routes/orders.js';
import requestRoutes from './routes/requests.js';
import userRoutes from './routes/users.js';

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET is missing or too short (use at least 32 characters) in api/.env');
  process.exit(1);
}

const app = express();
app.set('trust proxy', 1); // Codespaces and hosting sit behind a proxy
app.use(helmet());
app.use(cors()); // open for development; we will restrict it before going live
app.use(express.json({ limit: '10kb' }));

app.get('/health', (req, res) => res.json({ ok: true }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/auth', authLimiter, authRoutes);
app.use('/wallet', walletRoutes);
app.use('/merchants', merchantRoutes);
app.use('/catalog', catalogRoutes);
app.use('/orders', orderRoutes);
app.use('/requests', requestRoutes);
app.use('/users', userRoutes);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body is not valid JSON' });
  }
  console.error(err);
  res.status(500).json({ error: 'Something went wrong' });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`MultiWallet API running on port ${port}`));
