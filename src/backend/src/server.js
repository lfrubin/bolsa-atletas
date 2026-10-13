import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { register, login } from './controllers/auth.controller.js';
import { depositPixSimulation, withdrawPix } from './controllers/wallet.controller.js';
import { createAthlete, createIpoOffer, reserveIpoShares } from './controllers/ipo.controller.js';
import { authMiddleware } from './middlewares/auth.middleware.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Autenticação e Usuários
app.post('/api/v1/auth/register', register);
app.post('/api/v1/auth/login', login);

// Módulo Financeiro (Carteiras / PIX)
app.post('/api/v1/wallets/deposit/pix', authMiddleware(), depositPixSimulation);
app.post('/api/v1/wallets/withdraw/pix', authMiddleware(), withdrawPix);

// Módulo de IPO / Mercado Primário
app.post('/api/v1/athletes', authMiddleware(['CLUB', 'ADMIN']), createAthlete);
app.post('/api/v1/ipo/offers', authMiddleware(['CLUB', 'ADMIN']), createIpoOffer);
app.post('/api/v1/ipo/reserve', authMiddleware(['INVESTOR']), reserveIpoShares);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});