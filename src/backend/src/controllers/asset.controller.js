import { prisma } from '../lib/prisma.js';

export async function getMyAssets(req, res) {
  const userId = req.user.id;

  try {
    const assets = await prisma.userAsset.findMany({
      where: { userId },
      include: {
        athlete: {
          select: {
            id: true,
            name: true,
            position: true
          }
        }
      }
    });

    return res.status(200).json(assets);
  } catch (error) {
    console.error('Erro ao buscar custódia de ativos:', error);
    return res.status(500).json({ error: 'Erro interno ao buscar custódia.' });
  }
}