import { prisma } from '../lib/prisma.js';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

// Cadastrar novo atleta (Apenas CLUB ou ADMIN)
export async function createAthlete(req, res) {
  const schema = z.object({
    name: z.string().min(2),
    position: z.string().min(2)
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });

  const { name, position } = parsed.data;
  const clubId = req.user.id;

  const athlete = await prisma.athlete.create({
    data: { name, position, clubId }
  });

  return res.status(201).json(athlete);
}

// Criar oferta de IPO para um atleta (Apenas CLUB ou ADMIN)
export async function createIpoOffer(req, res) {
  const schema = z.object({
    athleteId: z.string().uuid(),
    sharePrice: z.number().positive(),
    totalShares: z.number().int().positive(),
    softCapShares: z.number().int().positive(),
    hardCapShares: z.number().int().positive(),
    startDate: z.string().datetime(),
    endDate: z.string().datetime()
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });

  const data = parsed.data;

  if (data.softCapShares > data.hardCapShares || data.hardCapShares > data.totalShares) {
    return res.status(400).json({ error: 'Inconsistência nos valores de Soft Cap, Hard Cap ou Total de Ações' });
  }

  const ipo = await prisma.ipoOffer.create({
    data: {
      athleteId: data.athleteId,
      sharePrice: new Prisma.Decimal(data.sharePrice.toFixed(4)),
      totalShares: data.totalShares,
      softCapShares: data.softCapShares,
      hardCapShares: data.hardCapShares,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      status: 'ACTIVE'
    }
  });

  return res.status(201).json(ipo);
}

// Reserva de Ações no IPO (Investidor)
export async function reserveIpoShares(req, res) {
  const schema = z.object({
    ipoOfferId: z.string().uuid(),
    sharesCount: z.number().int().positive()
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });

  const { ipoOfferId, sharesCount } = parsed.data;
  const userId = req.user.id;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Bloqueio pessimista na oferta de IPO para evitar overbooking
      const [ipo] = await tx.$queryRaw`
        SELECT * FROM ipo_offers WHERE id = ${ipoOfferId} FOR UPDATE
      `;

      if (!ipo || ipo.status !== 'ACTIVE') {
        throw new Error('IPO_NOT_ACTIVE');
      }

      const now = new Date();
      if (now < new Date(ipo.startDate) || now > new Date(ipo.endDate)) {
        throw new Error('IPO_OUT_OF_SCHEDULE');
      }

      const availableShares = ipo.hardCapShares - ipo.soldShares;
      if (sharesCount > availableShares) {
        throw new Error('EXCEEDS_HARD_CAP');
      }

      const sharePrice = new Prisma.Decimal(ipo.sharePrice);
      const totalAmount = sharePrice.mul(sharesCount);

      // Bloqueio pessimista na carteira do investidor
      const [wallet] = await tx.$queryRaw`
        SELECT id, "availableBalance" FROM wallets WHERE "userId" = ${userId} FOR UPDATE
      `;

      const availableBalance = new Prisma.Decimal(wallet.availableBalance);
      if (availableBalance.lessThan(totalAmount)) {
        throw new Error('INSUFFICIENT_FUNDS');
      }

      // 1. Mover saldo de disponível para reservado
      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          availableBalance: { decrement: totalAmount },
          reservedBalance: { increment: totalAmount }
        }
      });

      // 2. Incrementar contagem de ações vendidas
      await tx.ipoOffer.update({
        where: { id: ipoOfferId },
        data: { soldShares: { increment: sharesCount } }
      });

      // 3. Registrar transação no Ledger
      await tx.ledgerTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'IPO_RESERVATION',
          amount: totalAmount,
          fee: 0.00,
          status: 'COMPLETED',
          description: `Reserva de ${sharesCount} ações na oferta ${ipoOfferId}`
        }
      });

      // 4. Criar registro de reserva
      const reservation = await tx.ipoReservation.create({
        data: {
          ipoOfferId,
          userId,
          sharesCount,
          totalAmount,
          status: 'RESERVED'
        }
      });

      return reservation;
    });

    return res.status(201).json(result);
  } catch (error) {
    if (error.message === 'IPO_NOT_ACTIVE') return res.status(400).json({ error: 'Oferta de IPO não está ativa' });
    if (error.message === 'IPO_OUT_OF_SCHEDULE') return res.status(400).json({ error: 'Oferta de IPO fora do período de captação' });
    if (error.message === 'EXCEEDS_HARD_CAP') return res.status(400).json({ error: 'A quantidade solicitada excede o limite disponível (Hard Cap)' });
    if (error.message === 'INSUFFICIENT_FUNDS') return res.status(400).json({ error: 'Saldo disponível insuficiente na carteira' });

    console.error('Erro ao reservar ações de IPO:', error);
    return res.status(500).json({ error: 'Erro ao processar reserva no IPO' });
  }
}