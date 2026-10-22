import { prisma } from '../lib/prisma.js';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

export async function createAthlete(req, res) {
  const schema = z.object({
    name: z.string().min(2),
    position: z.string().min(2)
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });

  const { name, position } = parsed.data;
  const clubId = req.user.id;

  try {
    const athlete = await prisma.athlete.create({
      data: { name, position, clubId }
    });

    return res.status(201).json(athlete);
  } catch (error) {
    console.error('Erro ao cadastrar atleta:', error);
    return res.status(500).json({ error: 'Erro ao cadastrar atleta' });
  }
}

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
    return res.status(400).json({ 
      error: 'Inconsistência nos valores: Soft Cap deve ser menor ou igual ao Hard Cap, e Hard Cap deve ser menor ou igual ao Total de Ações.' 
    });
  }

  const startDate = new Date(data.startDate);
  const endDate = new Date(data.endDate);

  if (endDate <= startDate) {
    return res.status(400).json({ error: 'A data final deve ser posterior à data inicial da oferta.' });
  }

  try {
    const ipo = await prisma.ipoOffer.create({
      data: {
        athleteId: data.athleteId,
        sharePrice: new Prisma.Decimal(data.sharePrice.toFixed(4)),
        totalShares: data.totalShares,
        softCapShares: data.softCapShares,
        hardCapShares: data.hardCapShares,
        startDate,
        endDate,
        status: 'ACTIVE'
      }
    });

    return res.status(201).json(ipo);
  } catch (error) {
    console.error('Erro ao criar oferta de IPO:', error);
    return res.status(500).json({ error: 'Erro ao criar oferta de IPO' });
  }
}

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
      const [ipo] = await tx.$queryRaw`
        SELECT id, "sharePrice", "totalShares", "softCapShares", "hardCapShares", "soldShares", "startDate", "endDate", status
        FROM ipo_offers
        WHERE id = ${ipoOfferId}
        FOR UPDATE
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

      const [wallet] = await tx.$queryRaw`
        SELECT id, "availableBalance", "reservedBalance"
        FROM wallets
        WHERE "userId" = ${userId}
        FOR UPDATE
      `;

      if (!wallet) throw new Error('WALLET_NOT_FOUND');

      const availableBalance = new Prisma.Decimal(wallet.availableBalance);
      if (availableBalance.lessThan(totalAmount)) {
        throw new Error('INSUFFICIENT_FUNDS');
      }

      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          availableBalance: { decrement: totalAmount },
          reservedBalance: { increment: totalAmount }
        }
      });

      await tx.ipoOffer.update({
        where: { id: ipoOfferId },
        data: { soldShares: { increment: sharesCount } }
      });

      await tx.ledgerTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'IPO_RESERVATION',
          amount: totalAmount,
          fee: 0.00,
          status: 'COMPLETED',
          description: `Reserva de ${sharesCount} ações no IPO ${ipoOfferId}`
        }
      });

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
    if (error.message === 'IPO_NOT_ACTIVE') return res.status(400).json({ error: 'A oferta de IPO não está ativa.' });
    if (error.message === 'IPO_OUT_OF_SCHEDULE') return res.status(400).json({ error: 'A oferta de IPO está fora do período de captação.' });
    if (error.message === 'EXCEEDS_HARD_CAP') return res.status(400).json({ error: 'A quantidade de ações solicitada excede o Hard Cap disponível.' });
    if (error.message === 'INSUFFICIENT_FUNDS') return res.status(400).json({ error: 'Saldo disponível insuficiente para realizar a reserva.' });
    if (error.message === 'WALLET_NOT_FOUND') return res.status(404).json({ error: 'Carteira do usuário não encontrada.' });

    console.error('Erro ao processar reserva de IPO:', error);
    return res.status(500).json({ error: 'Erro interno ao processar reserva de IPO.' });
  }
}

// Liquidar Oferta de IPO (Sucesso se atingir Soft Cap; Estorno se não atingir)
export async function settleIpoOffer(req, res) {
  const { id } = req.params;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Bloqueio pessimista na oferta de IPO
      const [ipo] = await tx.$queryRaw`
        SELECT * FROM ipo_offers WHERE id = ${id} FOR UPDATE
      `;

      if (!ipo) throw new Error('IPO_NOT_FOUND');
      if (ipo.status !== 'ACTIVE') throw new Error('IPO_NOT_ACTIVE');

      const soldShares = Number(ipo.soldShares);
      const softCapShares = Number(ipo.softCapShares);

      // Buscar todas as reservas pendentes da oferta
      const reservations = await tx.ipoReservation.findMany({
        where: { ipoOfferId: id, status: 'RESERVED' }
      });

      if (soldShares >= softCapShares) {
        // --- CENÁRIO DE SUCESSO (Soft Cap Atingido) ---
        let totalRaised = new Prisma.Decimal(0);

        for (const reservation of reservations) {
          const amount = new Prisma.Decimal(reservation.totalAmount);
          totalRaised = totalRaised.add(amount);

          // Atualizar status da reserva
          await tx.ipoReservation.update({
            where: { id: reservation.id },
            data: { status: 'CONFIRMED' }
          });

          // Debitar saldo reservado do investidor
          const [wallet] = await tx.$queryRaw`
            SELECT id FROM wallets WHERE "userId" = ${reservation.userId} FOR UPDATE
          `;

          await tx.wallet.update({
            where: { id: wallet.id },
            data: { reservedBalance: { decrement: amount } }
          });

          // Registrar confirmação no Ledger
          await tx.ledgerTransaction.create({
            data: {
              walletId: wallet.id,
              type: 'IPO_RESERVATION',
              amount,
              fee: 0.00,
              status: 'COMPLETED',
              description: `Confirmação de aquisição de ações no IPO ${id}`
            }
          });
        }

        // Taxa da plataforma de 5% e valor líquido do Clube
        const platformFee = totalRaised.mul(0.05);
        const netClubAmount = totalRaised.sub(platformFee);

        // Buscar clube emissor através do atleta
        const athlete = await tx.athlete.findUnique({
          where: { id: ipo.athleteId }
        });

        // Creditar valor líquido na carteira do Clube
        const [clubWallet] = await tx.$queryRaw`
          SELECT id FROM wallets WHERE "userId" = ${athlete.clubId} FOR UPDATE
        `;

        if (clubWallet) {
          await tx.wallet.update({
            where: { id: clubWallet.id },
            data: { availableBalance: { increment: netClubAmount } }
          });

          await tx.ledgerTransaction.create({
            data: {
              walletId: clubWallet.id,
              type: 'DEPOSIT',
              amount: netClubAmount,
              fee: platformFee,
              status: 'COMPLETED',
              description: `Repasse do IPO ${id} (Arrecadado: R$ ${totalRaised.toFixed(2)}, Taxa: R$ ${platformFee.toFixed(2)})`
            }
          });
        }

        const updatedIpo = await tx.ipoOffer.update({
          where: { id },
          data: { status: 'SUCCESSFUL' }
        });

        return {
          outcome: 'SUCCESSFUL',
          totalRaised,
          platformFee,
          netClubAmount,
          ipo: updatedIpo
        };

      } else {
        // --- CENÁRIO DE FALHA (Soft Cap Não Atingido) ---
        for (const reservation of reservations) {
          const amount = new Prisma.Decimal(reservation.totalAmount);

          // Marcar reserva como reembolsada
          await tx.ipoReservation.update({
            where: { id: reservation.id },
            data: { status: 'REFUNDED' }
          });

          // Devolver saldo do reservado para o disponível
          const [wallet] = await tx.$queryRaw`
            SELECT id FROM wallets WHERE "userId" = ${reservation.userId} FOR UPDATE
          `;

          await tx.wallet.update({
            where: { id: wallet.id },
            data: {
              reservedBalance: { decrement: amount },
              availableBalance: { increment: amount }
            }
          });

          // Registrar estorno no Ledger
          await tx.ledgerTransaction.create({
            data: {
              walletId: wallet.id,
              type: 'IPO_REFUND',
              amount,
              fee: 0.00,
              status: 'COMPLETED',
              description: `Estorno integral do IPO ${id} (Soft Cap não atingido)`
            }
          });
        }

        const updatedIpo = await tx.ipoOffer.update({
          where: { id },
          data: { status: 'FAILED' }
        });

        return {
          outcome: 'FAILED',
          reason: 'Soft Cap não atingido',
          ipo: updatedIpo
        };
      }
    });

    return res.status(200).json(result);
  } catch (error) {
    if (error.message === 'IPO_NOT_FOUND') return res.status(404).json({ error: 'Oferta de IPO não encontrada.' });
    if (error.message === 'IPO_NOT_ACTIVE') return res.status(400).json({ error: 'Esta oferta de IPO não está ativa para liquidação.' });

    console.error('Erro na liquidação do IPO:', error);
    return res.status(500).json({ error: 'Erro interno ao processar liquidação do IPO.' });
  }
}
