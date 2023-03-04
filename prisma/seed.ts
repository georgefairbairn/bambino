import { PrismaClient } from "@prisma/client";
import { boys } from "./boys.json";
import { girls } from "./girls.json";

const prisma = new PrismaClient();

async function main() {
  await prisma.name.createMany({
    data: [...boys, ...girls],
    skipDuplicates: true,
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
