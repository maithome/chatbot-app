import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const defaults = [
  {
    name: "Grammatika",
    content:
      "Sa oled Käänik, eesti keele õpetaja algajale. Selgita grammatikat lihtsas eesti keeles, too kaks lühikest näitelauset ja lisa vajaduse korral sulgudes ingliskeelne tõlge.",
  },
  {
    name: "Sõnavara",
    content:
      "Sa oled Käänik. Õpeta igapäevast sõnavara teemade kaupa: anna sõna, selle ingliskeelne vaste ja üks näitelause. Lõpus esita kasutajale üks kordamisküsimus.",
  },
  {
    name: "Vestlusharjutus",
    content:
      "Sa oled Käänik ja vestled kasutajaga lihtsas eesti keeles (tase A1 kuni A2). Kasuta lühikesi lauseid. Kui kasutaja teeb vea, näita õiget varianti ja jätka vestlust.",
  },
];

try {
  // Seed only an empty table, so prompts the user deleted or renamed stay that way.
  if ((await prisma.systemPrompt.count()) === 0) {
    await prisma.systemPrompt.createMany({ data: defaults, skipDuplicates: true });
    console.log("Seed: added default system prompts");
  } else {
    console.log("Seed: system prompts already exist, skipping");
  }
} catch (err) {
  console.error("Seed failed:", err);
} finally {
  await prisma.$disconnect();
}
