import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { boys } from "./boys.json";
import { girls } from "./girls.json";

const prisma = new PrismaClient();

async function main() {
  // add name data
  await prisma.name.createMany({
    data: [...boys, ...girls],
    skipDuplicates: true,
  });

  const passwordHash = await bcrypt.hash(
    process.env.ADMIN_PASSWORD ?? "password",
    10
  );

  // add single user
  await prisma.user.create({
    data: {
      name: "George Admin",
      email: "george.fair@icloud.com",
      passwordHash,
    },
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
