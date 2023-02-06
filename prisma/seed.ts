import type { Prisma } from "@prisma/client";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function getNames(): Prisma.NameCreateInput[] {
  return [
    {
      name: "Penelope",
      gender: "Female",
      meaning: "Weaver",
      origin: "Greece",
      description:
        'Penelope is a name from Greek mythology; she was the wife of Odysseus in Homer’s Odyssey. It has two possible origin stories—Penelope was either derived from the Greek pēnē, meaning "thread of a bobbin," or penelops, a type of duck. Mythological Penelope was cared for by a duck as an infant, and later was known for delaying her suiters by pretending...',
      pronunciation: "Pe‧nè‧lo‧pe",
    },
  ];
}

async function main() {
  await Promise.all(
    getNames().map((name) => {
      return prisma.name.create({ data: name });
    })
  );
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
