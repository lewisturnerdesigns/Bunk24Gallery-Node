import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const samples = [
    { title: "Untitled Study 01", slug: "untitled-study-01", description: "A placeholder for a future Turner print edition." },
    { title: "Untitled Study 02", slug: "untitled-study-02", description: "A placeholder for a future Turner print edition." }
  ];

  for (const item of samples) {
    await prisma.artwork.upsert({
      where: { slug: item.slug },
      update: {},
      create: { ...item, status: "DRAFT" }
    });
  }

  console.log("BUNK24 sample draft artworks are ready.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
