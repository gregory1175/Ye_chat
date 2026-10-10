import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import * as argon2 from 'argon2';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not defined');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seed started');

  await prisma.$connect();
  console.log('Database connected');

  await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: { name: 'ADMIN' },
  });

  await prisma.role.upsert({
    where: { name: 'MANAGER' },
    update: {},
    create: { name: 'MANAGER' },
  });

  const employeeRole = await prisma.role.upsert({
    where: { name: 'EMPLOYEE' },
    update: {},
    create: { name: 'EMPLOYEE' },
  });

  console.log('Roles created');

  const login = process.env.SEED_USER_LOGIN;
  const password = process.env.SEED_USER_PASSWORD;

  if (!login || !password) {
    throw new Error('SEED_USER_LOGIN or SEED_USER_PASSWORD is missing');
  }

  if (password.length < 8) {
    throw new Error('Seed password must be at least 8 characters');
  }

  const passwordHash = await argon2.hash(password);

  const user = await prisma.user.upsert({
    where: { login },
    update: {},
    create: {
      login,
      passwordHash,
      roleId: employeeRole.id,
    },
  });

  console.log(`Test user ready: ${user.login}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exitCode = 1;
  });
