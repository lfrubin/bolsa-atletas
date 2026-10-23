import { matchOrders } from '../services/matching.engine.js';
import { prisma } from '../lib/prisma.js';

async function run() {
  const athleteId = '0505972e-2351-4d66-9666-bd5f747856bc';
  console.log(`⚡ Executando matching para o atleta ${athleteId}...`);
  const result = await matchOrders(athleteId);
  console.log('✅ Resultado do Trade:', result);
  await prisma.$disconnect();
}

run().catch(console.error);