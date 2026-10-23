
import express from "express";
import cors from "cors";
import { prisma } from "./config/prisma";
import authRoutes from "./routes/auth.routes";
import loanRoutes from "./routes/loan.routes";
import swaggerUi from "swagger-ui-express";
import openApiSpec from "./config/openapi";

const app = express();

app.use(cors());
app.use(express.json());

// API health check
app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "MiniLedger API is running",
  });
});

// Database health check
app.get("/api/health/db", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      success: true,
      database: "connected",
    });
  } catch (error) {
    console.error("Database health check failed:", error);

    res.status(503).json({
      success: false,
      database: "unavailable",
    });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api", loanRoutes);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));

export default app;
