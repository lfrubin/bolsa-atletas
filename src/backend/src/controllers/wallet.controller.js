import { prisma } from '../lib/prisma.js';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

const WITHDRAW_FEE = new Prisma.Decimal('1.50');

export async function depositPixSimulation(req, res) {
  const depositSchema = z.object({
    amount: z.number().positive(),
  });

  const parsed = depositSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });

  const amount = new Prisma.Decimal(parsed.data.amount.toFixed(4));
  const userId = req.user.id;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId } });

      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: { availableBalance: { increment: amount } }
      });

      const ledger = await tx.ledgerTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'DEPOSIT',
          amount,
          fee: 0.00,
          status: 'COMPLETED',
          description: 'Depósito PIX (Simulado Cash-In)'
        }
      });

      return { wallet: updatedWallet, transaction: ledger };
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('Erro no depósito PIX:', error);
    return res.status(500).json({ error: 'Erro ao processar depósito PIX' });
  }
}

export async function withdrawPix(req, res) {
  const withdrawSchema = z.object({
    amount: z.number().positive(),
    pixKeyDocument: z.string()
  });

  const parsed = withdrawSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });

  const { amount: requestedAmount, pixKeyDocument } = parsed.data;
  const cleanPixDoc = pixKeyDocument.replace(/\D/g, '');

  if (cleanPixDoc !== req.user.document) {
    return res.status(400).json({ 
      error: 'Validação de titularidade falhou: O saque PIX deve ser realizado para uma chave cadastrada no mesmo CPF/CNPJ do titular da conta' 
    });
  }

  const amount = new Prisma.Decimal(requestedAmount.toFixed(4));
  const totalDeduction = amount.add(WITHDRAW_FEE);
  const userId = req.user.id;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Bloqueio pessimista ajustado com aspas duplas nas colunas camelCase do PostgreSQL
      const [wallet] = await tx.$queryRaw`
        SELECT id, "availableBalance" 
        FROM wallets 
        WHERE "userId" = ${userId} 
        FOR UPDATE
      `;

      if (!wallet) throw new Error('WALLETS_NOT_FOUND');

      const currentBalance = new Prisma.Decimal(wallet.availableBalance);
      if (currentBalance.lessThan(totalDeduction)) {
        throw new Error('INSUFFICIENT_FUNDS');
      }

      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: { availableBalance: { decrement: totalDeduction } }
      });

      const ledger = await tx.ledgerTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'WITHDRAWAL',
          amount,
          fee: WITHDRAW_FEE,
          status: 'COMPLETED',
          description: `Saque PIX para titularidade ${cleanPixDoc} (Taxa R$ 1,50)`
        }
      });

      return { wallet: updatedWallet, transaction: ledger };
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('Erro no saque PIX:', error);
    if (error.message === 'INSUFFICIENT_FUNDS') {
      return res.status(400).json({ error: 'Saldo disponível insuficiente para cobrir o saque e a taxa de R$ 1,50' });
    }
    return res.status(500).json({ error: 'Erro ao processar saque PIX' });
  }
}
// Consultar saldo e últimas transações da carteira do utilizador autenticado
export async function getWallet(req, res) {
  const userId = req.user.id;

  try {
    const wallet = await prisma.wallet.findUnique({
      where: { userId },
      include: {
        transactions: {
          take: 10,
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!wallet) {
      return res.status(404).json({ error: 'Carteira não encontrada.' });
    }

    return res.status(200).json(wallet);
  } catch (error) {
    console.error('Erro ao buscar carteira:', error);
    return res.status(500).json({ error: 'Erro interno ao consultar carteira.' });
  }
}