import { prisma } from '../lib/prisma.js';

async function syncConfirmedReservations() {
  console.log('🔄 Sincronizando reservas confirmadas com a custódia...');

  const confirmedReservations = await prisma.ipoReservation.findMany({
    where: { status: 'CONFIRMED' },
    include: { ipoOffer: true }
  });

  for (const reservation of confirmedReservations) {
    await prisma.userAsset.upsert({
      where: {
        userId_athleteId: {
          userId: reservation.userId,
          athleteId: reservation.ipoOffer.athleteId
        }
      },
      update: {
        totalShares: { increment: reservation.sharesCount }
      },
      create: {
        userId: reservation.userId,
        athleteId: reservation.ipoOffer.athleteId,
        totalShares: reservation.sharesCount,
        blockedShares: 0
      }
    });
  }

  console.log('✅ Sincronização concluída!');
  await prisma.$disconnect();
}

syncConfirmedReservations().catch(console.error);