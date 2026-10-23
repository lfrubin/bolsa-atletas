import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { register, login } from './controllers/auth.controller.js';
import { depositPixSimulation, withdrawPix, getWallet } from './controllers/wallet.controller.js';
import { createAthlete, createIpoOffer, reserveIpoShares, settleIpoOffer } from './controllers/ipo.controller.js';
import { authMiddleware } from './middlewares/auth.middleware.js';
import { getMyAssets } from './controllers/asset.controller.js';
import { createBuyOrder, createSellOrder, cancelOrder, getOrderBook } from './controllers/order.controller.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Autenticação e Usuários
app.post('/api/v1/auth/register', register);
app.post('/api/v1/auth/login', login);

// Módulo Financeiro (Carteiras / PIX)
app.get('/api/v1/wallets/me', authMiddleware(), getWallet);
app.post('/api/v1/wallets/deposit/pix', authMiddleware(), depositPixSimulation);
app.post('/api/v1/wallets/withdraw/pix', authMiddleware(), withdrawPix);

// Módulo de IPO / Mercado Primário
app.post('/api/v1/athletes', authMiddleware(['CLUB', 'ADMIN']), createAthlete);
app.post('/api/v1/ipo/offers', authMiddleware(['CLUB', 'ADMIN']), createIpoOffer);
app.post('/api/v1/ipo/reserve', authMiddleware(['INVESTOR']), reserveIpoShares);
app.post('/api/v1/ipo/offers/:id/settle', authMiddleware(['CLUB', 'ADMIN']), settleIpoOffer);

// Módulo de Custódia e Ativos
app.get('/api/v1/assets/me', authMiddleware(), getMyAssets);

// Módulo de Mercado Secundário / Order Book
app.post('/api/v1/orders/buy', authMiddleware(['INVESTOR']), createBuyOrder);
app.post('/api/v1/orders/sell', authMiddleware(['INVESTOR']), createSellOrder);
app.post('/api/v1/orders/:id/cancel', authMiddleware(['INVESTOR']), cancelOrder);
app.get('/api/v1/orders/book/:athleteId', getOrderBook);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});