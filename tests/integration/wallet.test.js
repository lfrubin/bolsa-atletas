import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../../src/backend/src/lib/prisma.js';

test('Módulo Financeiro - Carteira e Saque', async (t) => {
  let testUser;

  t.before(async () => {
    // Limpeza / Criação do usuário de teste no banco
    testUser = await prisma.user.create({
      data: {
        name: 'Test Integration User',
        document: '52998224725',
        email: `test-${Date.now()}@test.com`,
        passwordHash: 'hash_fake',
        wallet: {
          create: {
            availableBalance: 200.00,
            reservedBalance: 0.00
          }
        }
      },
      include: { wallet: true }
    });
  });

  t.after(async () => {
    // Cleanup dos dados criados
    if (testUser) {
      await prisma.ledgerTransaction.deleteMany({ where: { walletId: testUser.wallet.id } });
      await prisma.wallet.delete({ where: { id: testUser.wallet.id } });
      await prisma.user.delete({ where: { id: testUser.id } });
    }
  });

  await t.test('Deve verificar o saldo inicial criado para a carteira', async () => {
    const wallet = await prisma.wallet.findUnique({ where: { userId: testUser.id } });
    assert.equal(Number(wallet.availableBalance), 200.00);
  });
});