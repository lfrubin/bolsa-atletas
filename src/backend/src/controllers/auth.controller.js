import { prisma } from '../lib/prisma.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { validateDocument } from '../utils/document-validator.js';

const registerSchema = z.object({
  name: z.string().min(2),
  document: z.string(),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['INVESTOR', 'CLUB', 'ADMIN']).optional().default('INVESTOR'),
});

export async function register(req, res) {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.format() });
  }

  const { name, document, email, password, role } = parsed.data;
  const cleanDocument = document.replace(/\D/g, '');

  if (!validateDocument(cleanDocument)) {
    return res.status(400).json({ error: 'CPF ou CNPJ inválido' });
  }

  const existingUser = await prisma.user.findFirst({
    where: { OR: [{ email }, { document: cleanDocument }] }
  });

  if (existingUser) {
    return res.status(409).json({ error: 'Usuário já cadastrado com este e-mail ou documento' });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: { name, document: cleanDocument, email, passwordHash, role }
    });

    await tx.wallet.create({
      data: { userId: newUser.id, availableBalance: 0, reservedBalance: 0 }
    });

    return newUser;
  });

  return res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role });
}

export async function login(req, res) {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  const token = jwt.sign(
    { id: user.id, role: user.role, document: user.document },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '1d' }
  );

  return res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
}