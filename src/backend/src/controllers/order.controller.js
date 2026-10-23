import { prisma } from '../lib/prisma.js';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { matchOrders } from '../services/matching.engine.js';

// Emissão de Ordem de Compra (BUY)
export async function createBuyOrder(req, res) {
  const schema = z.object({
    athleteId: z.string().uuid(),
    price: z.number().positive(),
    sharesCount: z.number().int().positive()
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });

  const { athleteId, price, sharesCount } = parsed.data;
  const userId = req.user.id;
  const orderPrice = new Prisma.Decimal(price.toFixed(4));
  const totalAmount = orderPrice.mul(sharesCount);
  const fee = totalAmount.mul(0.01); // Taxa de 1%
  const totalRequired = totalAmount.add(fee);

  try {
    const order = await prisma.$transaction(async (tx) => {
      const [wallet] = await tx.$queryRaw`
        SELECT id, "availableBalance" FROM wallets WHERE "userId" = ${userId} FOR UPDATE
      `;

      if (!wallet || new Prisma.Decimal(wallet.availableBalance).lessThan(totalRequired)) {
        throw new Error('INSUFFICIENT_FUNDS');
      }

      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          availableBalance: { decrement: totalRequired },
          reservedBalance: { increment: totalRequired }
        }
      });

      return await tx.order.create({
        data: {
          userId,
          athleteId,
          side: 'BUY',
          price: orderPrice,
          totalShares: sharesCount,
          remainingShares: sharesCount,
          status: 'OPEN'
        }
      });
    });

    // Disparar motor de matching de forma assíncrona
    setImmediate(() => matchOrders(athleteId).catch(console.error));

    return res.status(201).json(order);
  } catch (error) {
    if (error.message === 'INSUFFICIENT_FUNDS') {
      return res.status(400).json({ error: 'Saldo disponível insuficiente (incluindo 1% de taxa).' });
    }
    console.error('Erro ao criar ordem de compra:', error);
    return res.status(500).json({ error: 'Erro interno ao criar ordem de compra.' });
  }
}

// Emissão de Ordem de Venda (SELL)
export async function createSellOrder(req, res) {
  const schema = z.object({
    athleteId: z.string().uuid(),
    price: z.number().positive(),
    sharesCount: z.number().int().positive()
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });

  const { athleteId, price, sharesCount } = parsed.data;
  const userId = req.user.id;
  const orderPrice = new Prisma.Decimal(price.toFixed(4));

  try {
    const order = await prisma.$transaction(async (tx) => {
      const asset = await tx.userAsset.findUnique({
        where: { userId_athleteId: { userId, athleteId } }
      });

      if (!asset || (asset.totalShares - asset.blockedShares) < sharesCount) {
        throw new Error('INSUFFICIENT_SHARES');
      }

      await tx.userAsset.update({
        where: { id: asset.id },
        data: { blockedShares: { increment: sharesCount } }
      });

      return await tx.order.create({
        data: {
          userId,
          athleteId,
          side: 'SELL',
          price: orderPrice,
          totalShares: sharesCount,
          remainingShares: sharesCount,
          status: 'OPEN'
        }
      });
    });

    // Disparar motor de matching de forma assíncrona
    setImmediate(() => matchOrders(athleteId).catch(console.error));

    return res.status(201).json(order);
  } catch (error) {
    if (error.message === 'INSUFFICIENT_SHARES') {
      return res.status(400).json({ error: 'Ações em custódia insuficientes para venda.' });
    }
    console.error('Erro ao criar ordem de venda:', error);
    return res.status(500).json({ error: 'Erro interno ao criar ordem de venda.' });
  }
}

// Cancelamento de Ordem Aberta
export async function cancelOrder(req, res) {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id } });

      if (!order || order.userId !== userId) throw new Error('ORDER_NOT_FOUND');
      if (order.status !== 'OPEN') throw new Error('ORDER_NOT_OPEN');

      if (order.side === 'BUY') {
        const totalAmount = new Prisma.Decimal(order.price).mul(order.remainingShares);
        const fee = totalAmount.mul(0.01);
        const totalToRefund = totalAmount.add(fee);

        const [wallet] = await tx.$queryRaw`
          SELECT id FROM wallets WHERE "userId" = ${userId} FOR UPDATE
        `;

        await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            reservedBalance: { decrement: totalToRefund },
            availableBalance: { increment: totalToRefund }
          }
        });
      } else {
        const asset = await tx.userAsset.findUnique({
          where: { userId_athleteId: { userId, athleteId: order.athleteId } }
        });

        if (asset) {
          await tx.userAsset.update({
            where: { id: asset.id },
            data: { blockedShares: { decrement: order.remainingShares } }
          });
        }
      }

      return await tx.order.update({
        where: { id },
        data: { status: 'CANCELLED' }
      });
    });

    return res.status(200).json(result);
  } catch (error) {
    if (error.message === 'ORDER_NOT_FOUND') return res.status(404).json({ error: 'Ordem não encontrada.' });
    if (error.message === 'ORDER_NOT_OPEN') return res.status(400).json({ error: 'Apenas ordens abertas podem ser canceladas.' });

    console.error('Erro ao cancelar ordem:', error);
    return res.status(500).json({ error: 'Erro interno ao cancelar ordem.' });
  }
}

// Consultar Livro de Ofertas Públicas de um Atleta
export async function getOrderBook(req, res) {
  const { athleteId } = req.params;

  try {
    const buyOrders = await prisma.order.findMany({
      where: { athleteId, side: 'BUY', status: 'OPEN' },
      orderBy: [{ price: 'desc' }, { createdAt: 'asc' }],
      select: { id: true, price: true, remainingShares: true, createdAt: true }
    });

    const sellOrders = await prisma.order.findMany({
      where: { athleteId, side: 'SELL', status: 'OPEN' },
      orderBy: [{ price: 'asc' }, { createdAt: 'asc' }],
      select: { id: true, price: true, remainingShares: true, createdAt: true }
    });

    return res.status(200).json({ buyOrders, sellOrders });
  } catch (error) {
    console.error('Erro ao buscar livro de ofertas:', error);
    return res.status(500).json({ error: 'Erro interno ao buscar livro de ofertas.' });
  }
}