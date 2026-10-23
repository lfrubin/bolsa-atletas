import { prisma } from '../lib/prisma.js';
import { Prisma } from '@prisma/client';

export async function matchOrders(athleteId) {
  try {
    return await prisma.$transaction(async (tx) => {
      // 1. Melhor ordem de COMPRA (maior preço, mais antiga)
      const [buyOrder] = await tx.$queryRaw`
        SELECT * FROM orders 
        WHERE "athleteId" = ${athleteId} AND side = 'BUY' AND status = 'OPEN'
        ORDER BY price DESC, "createdAt" ASC
        LIMIT 1
        FOR UPDATE
      `;

      // 2. Melhor ordem de VENDA (menor preço, mais antiga)
      const [sellOrder] = await tx.$queryRaw`
        SELECT * FROM orders 
        WHERE "athleteId" = ${athleteId} AND side = 'SELL' AND status = 'OPEN'
        ORDER BY price ASC, "createdAt" ASC
        LIMIT 1
        FOR UPDATE
      `;

      if (!buyOrder || !sellOrder) return null;

      const buyPrice = new Prisma.Decimal(buyOrder.price);
      const sellPrice = new Prisma.Decimal(sellOrder.price);

      if (buyPrice.lessThan(sellPrice)) return null;

      const buyShares = Number(buyOrder.remainingShares ?? buyOrder.totalShares);
      const sellShares = Number(sellOrder.remainingShares ?? sellOrder.totalShares);

      if (buyShares !== sellShares) return null;

      const executionPrice = new Date(buyOrder.createdAt) < new Date(sellOrder.createdAt) ? buyPrice : sellPrice;
      const sharesCount = buyShares;
      const tradeAmount = executionPrice.mul(sharesCount);

      const buyerFee = tradeAmount.mul(0.01);
      const sellerFee = tradeAmount.mul(0.01);

      // --- LIQUIDAÇÃO DO COMPRADOR ---
      const buyerRequiredAmount = tradeAmount.add(buyerFee);
      const buyerOriginalReserved = buyPrice.mul(sharesCount).mul(1.01);
      const buyerRefund = buyerOriginalReserved.sub(buyerRequiredAmount);

      const [buyerWallet] = await tx.$queryRaw`
        SELECT id FROM wallets WHERE "userId" = ${buyOrder.userId} FOR UPDATE
      `;

      await tx.wallet.update({
        where: { id: buyerWallet.id },
        data: {
          reservedBalance: { decrement: buyerOriginalReserved },
          ...(buyerRefund.gt(0) && { availableBalance: { increment: buyerRefund } })
        }
      });

      await tx.userAsset.upsert({
        where: { userId_athleteId: { userId: buyOrder.userId, athleteId } },
        update: { totalShares: { increment: sharesCount } },
        create: { userId: buyOrder.userId, athleteId, totalShares: sharesCount, blockedShares: 0 }
      });

      // --- LIQUIDAÇÃO DO VENDEDOR ---
      const sellerNetAmount = tradeAmount.sub(sellerFee);

      const [sellerWallet] = await tx.$queryRaw`
        SELECT id FROM wallets WHERE "userId" = ${sellOrder.userId} FOR UPDATE
      `;

      await tx.wallet.update({
        where: { id: sellerWallet.id },
        data: { availableBalance: { increment: sellerNetAmount } }
      });

      await tx.userAsset.update({
        where: { userId_athleteId: { userId: sellOrder.userId, athleteId } },
        data: {
          totalShares: { decrement: sharesCount },
          blockedShares: { decrement: sharesCount }
        }
      });

      // --- ATUALIZAR ORDENS E REGISTRAR TRADE ---
      await tx.order.update({ where: { id: buyOrder.id }, data: { status: 'FILLED', remainingShares: 0 } });
      await tx.order.update({ where: { id: sellOrder.id }, data: { status: 'FILLED', remainingShares: 0 } });

      const trade = await tx.trade.create({
        data: {
          buyOrderId: buyOrder.id,
          sellOrderId: sellOrder.id,
          athleteId,
          sharesCount,
          price: executionPrice,
          totalAmount: tradeAmount
        }
      });

      await tx.ledgerTransaction.create({
        data: {
          walletId: buyerWallet.id,
          type: 'TRADE_BUY',
          amount: tradeAmount,
          fee: buyerFee,
          status: 'COMPLETED',
          description: `Compra de ${sharesCount} ações do atleta ${athleteId}`
        }
      });

      await tx.ledgerTransaction.create({
        data: {
          walletId: sellerWallet.id,
          type: 'TRADE_SELL',
          amount: sellerNetAmount,
          fee: sellerFee,
          status: 'COMPLETED',
          description: `Venda de ${sharesCount} ações do atleta ${athleteId}`
        }
      });

      return trade;
    });
  } catch (error) {
    console.error('Erro na execução do matchOrders:', error);
    throw error;
  }
}