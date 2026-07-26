const bcrypt = require("bcryptjs");
const { PrismaPg } = require("@prisma/adapter-pg");
require("dotenv").config();

const PASSWORD = "Admin@123";
const ADMINS = [
  {
    name: "Super Admin",
    email: "admin@gmail.com",
    role: "ADMIN",
    status: "ACTIVE",
  },
  {
    name: "TCSV Admin",
    email: "tcsvapi@gmail.com",
    role: "ADMIN",
    status: "ACTIVE",
  },
  {
    name: "Cellphone Studio Admin",
    email: "cs@gmail.com",
    role: "ADMIN",
    status: "ACTIVE",
  },
];

async function main() {
  const connectionString =
    process.env.DIRECT_URL || process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DIRECT_URL or DATABASE_URL is required.");
  }

  const { PrismaClient } = await import(
    "../lib/generated/prisma/client.ts"
  );
  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    const passwordHash = await bcrypt.hash(PASSWORD, 12);

    for (const admin of ADMINS) {
      await prisma.user.upsert({
        where: { email: admin.email },
        update: {
          name: admin.name,
          passwordHash,
          role: admin.role,
          status: admin.status,
        },
        create: {
          ...admin,
          passwordHash,
        },
      });

      console.log(`Admin ready: ${admin.email}`);
    }
  } catch (error) {
    console.error("Admin creation failed:", error.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
