import { readFileSync, existsSync } from "fs";
import { join } from "path";

// Load .env.local (Next.js's default secret store) before any other code runs.
// tsx doesn't auto-load env files like Next.js does, so we do it manually.
const envPath = join(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  for (const rawLine of readFileSync(envPath, "utf8").split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;
    process.env[key] = rawValue.replace(/^["']|["']$/g, "").split(" #")[0];
  }
}

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL ?? "admin@atbu.edu.ng";
  const password = process.env.SUPER_ADMIN_PASSWORD ?? "changeme";
  const name = process.env.SUPER_ADMIN_NAME ?? "Super Admin";
  const fareKobo = process.env.DEFAULT_FARE_KOBO ?? "60000";

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.admin.upsert({
    where: { email },
    update: { name, passwordHash },
    create: { email, name, passwordHash, createdById: null },
  });

  await prisma.setting.upsert({
    where: { key: "fareKobo" },
    update: {},
    create: { key: "fareKobo", value: fareKobo },
  });

  console.log(`Seed complete:`);
  console.log(`  email:    ${email}`);
  console.log(`  password: ${password}`);
  console.log(`  fare:     ₦${Number(fareKobo) / 100}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
