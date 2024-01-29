import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { boys } from './boys.json';
import { girls } from './girls.json';

const prisma = new PrismaClient();

async function main() {
  try {
    // reset database
    await prisma.name.deleteMany();
    console.log('Deleted name data');
    await prisma.search.deleteMany();
    console.log('Deleted searches data');
    await prisma.user.deleteMany();
    console.log('Deleted user data');

    // comment out for prod seeding
    await prisma.$queryRaw`ALTER TABLE Name AUTO_INCREMENT = 1`;
    await prisma.$queryRaw`ALTER TABLE Search AUTO_INCREMENT = 1`;
    await prisma.$queryRaw`ALTER TABLE User AUTO_INCREMENT = 1`;
    console.log('Reset auto-increments');

    // add name data
    await prisma.name.createMany({
      data: [...boys, ...girls],
      skipDuplicates: true,
    });
    console.log('Seeded name data');

    const passwordHash = await bcrypt.hash(
      process.env.ADMIN_PASSWORD ?? 'password',
      10
    );

    // add single user
    await prisma.user.create({
      data: {
        name: 'George Admin',
        email: 'george.fair@icloud.com',
        passwordHash,
      },
    });
    console.log('Seeded user data');
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
