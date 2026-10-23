import { prisma } from '../lib/prisma.js';
import { Prisma } from '@prisma/client';

export async function matchOrders(athleteId) {
  return await prisma.$transaction(async (tx) => {
    // 1. Buscar a melhor ordem de COMPRA (maior preço, mais antiga)
    const [buyOrder] = await tx.$queryRaw`
      SELECT * FROM orders 
      WHERE "athleteId" = ${athleteId} AND side = 'BUY' AND status = 'OPEN'
      ORDER BY price DESC, "createdAt" ASC
      LIMIT 1
      FOR UPDATE
    `;

    // 2. Buscar a melhor ordem de VENDA (menor preço, mais antiga)
    const [sellOrder] = await tx.$queryRaw`
      SELECT * FROM orders 
      WHERE "athleteId" = ${athleteId} AND side = 'SELL' AND status = 'OPEN'
      ORDER BY price ASC, "createdAt" ASC
      LIMIT 1
      FOR UPDATE
    `;

    // Se não houver ambas as pontas, não há casamento
    if (!buyOrder || !sellOrder) return null;

    const buyPrice = new Prisma.Decimal(buyOrder.price);
    const sellPrice = new Prisma.Decimal(sellOrder.price);

    // O preço de compra precisa ser maior ou igual ao preço de venda
    if (buyPrice.lessThan(sellPrice)) return null;

    // Regra da especificação: sem execução parcial (sharesCount idêntico)
    if (buyOrder.sharesCount !== sellOrder.sharesCount) return null;

    // Preço de execução = Preço da ordem que já estava no livro (Maker)
    const executionPrice = buyOrder.createdAt < sellOrder.createdAt ? buyPrice : sellPrice;
    const sharesCount = buyOrder.sharesCount;
    const tradeAmount = executionPrice.mul(sharesCount);

    const buyerFee = tradeAmount.mul(0.01); // 1% do Comprador
    const sellerFee = tradeAmount.mul(0.01); // 1% do Vendedor

    // --- LIQUIDAÇÃO DO COMPRADOR ---
    const buyerRequiredAmount = tradeAmount.add(buyerFee);
    const buyerOriginalReserved = new Prisma.Decimal(buyOrder.price).mul(sharesCount).mul(1.01);
    const buyerRefund = buyerOriginalReserved.sub(buyerRequiredAmount); // Sobra se executou por preço menor

    const [buyerWallet] = await tx.$queryRaw`
      SELECT id FROM wallets WHERE "userId" = ${buyOrder.userId} FOR UPDATE
    `;

    await tx.wallet.update({
      where: { id: buyerWallet.id },
      data: {
        reservedBalance: { decrement: buyerOriginalReserved },
        ...(buyerRefund.greaterThan(0) && { availableBalance: { increment: buyerRefund } })
      }
    });

    // Creditar ações na custódia do Comprador
    await tx.userAsset.upsert({
      where: { userId_athleteId: { userId: buyOrder.userId, athleteId } },
      update: { totalShares: { increment: sharesCount } },
      create: { userId: buyOrder.userId, athleteId, totalShares: sharesCount, blockedShares: 0 }
    });

    // --- LIQUIDAÇÃO DO VENDEDOR ---
    const sellerNetAmount = tradeAmount.sub(sellerFee); // Valor líquido (descontada taxa de 1%)

    const [sellerWallet] = await tx.$queryRaw`
      SELECT id FROM wallets WHERE "userId" = ${sellOrder.userId} FOR UPDATE
    `;

    await tx.wallet.update({
      where: { id: sellerWallet.id },
      data: { availableBalance: { increment: sellerNetAmount } }
    });

    // Debitar ações da custódia do Vendedor
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

    // Lançamentos no Ledger para governança das taxas
    await tx.ledgerTransaction.create({
      data: {
        walletId: buyerWallet.id,
        type: 'BUY_ORDER',
        amount: tradeAmount,
        fee: buyerFee,
        status: 'COMPLETED',
        description: `Compra de ${sharesCount} ações do atleta ${athleteId}`
      }
    });

    await tx.ledgerTransaction.create({
      data: {
        walletId: sellerWallet.id,
        type: 'SELL_ORDER',
        amount: sellerNetAmount,
        fee: sellerFee,
        status: 'COMPLETED',
        description: `Venda de ${sharesCount} ações do atleta ${athleteId}`
      }
    });

    return trade;
  });
}