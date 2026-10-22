import "dotenv/config";
import app from "./app";
import { prisma } from "./config/prisma";

const port = Number(process.env.PORT ?? 4000);

async function startServer(): Promise<void> {
  try {
    await prisma.$connect();
    console.log("PostgreSQL connection established");

    app.listen(port, "0.0.0.0", () => {
      console.log(`MiniLedger API running at http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Failed to start MiniLedger API:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

async function shutdown(): Promise<void> {
  console.log("Shutting down MiniLedger API...");
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());

void startServer();