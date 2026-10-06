import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/password";

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@marketplace.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "Admin@123456";
  const adminName = "Platform Administrator";

  console.log(`Creating / Updating Admin account: ${adminEmail}...`);

  const passwordHash = await hashPassword(adminPassword);

  const existing = await prisma.user.findUnique({
    where: { email: adminEmail.toLowerCase().trim() },
  });

  if (existing) {
    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: {
        role: "ADMIN",
        passwordHash,
        isActive: true,
        isEmailVerified: true,
      },
    });
    console.log(`Successfully updated existing user to ADMIN role: ${updated.email}`);
  } else {
    const created = await prisma.user.create({
      data: {
        fullName: adminName,
        email: adminEmail.toLowerCase().trim(),
        passwordHash,
        role: "ADMIN",
        isActive: true,
        isEmailVerified: true,
      },
    });
    console.log(`Successfully created new ADMIN user: ${created.email} (ID: ${created.id})`);
  }

  console.log("-----------------------------------------");
  console.log("Admin Credentials:");
  console.log(`Email:    ${adminEmail}`);
  console.log(`Password: ${adminPassword}`);
  console.log("-----------------------------------------");
}

main()
  .catch((e) => {
    console.error("Error creating admin:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
