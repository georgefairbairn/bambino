import { PrismaClient } from '@prisma/client';
import { boys } from './boys.json';
import { girls } from './girls.json';

const prisma = new PrismaClient();

async function main() {
  try {
    // reset database
    await prisma.name.deleteMany();

    // comment out for prod seeding
    await prisma.$queryRaw`ALTER SEQUENCE "Name_id_seq" RESTART WITH 1;`;
    console.log('Reset auto-increments');

    // add name data
    await prisma.name.createMany({
      data: [...boys, ...girls],
      skipDuplicates: true,
    });
    console.log('Seeded name data');
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
