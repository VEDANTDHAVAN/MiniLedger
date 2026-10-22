
import "dotenv/config";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../app";
import { prisma } from "../config/prisma";

const phone = "+919000000001";
const secret = process.env.JWT_SECRET;

if (!secret || secret.length < 32) {
  throw new Error("Configure JWT_SECRET in apps/api/.env before testing.");
}

describe("MiniLedger loan API", () => {
  let userId: string;
  let token: string;

  beforeAll(async () => {
    const user = await prisma.user.upsert({
      where: { phone },
      update: {},
      create: { phone },
    });

    userId = user.id;
    token = jwt.sign({ sub: userId }, secret, { expiresIn: "1h" });

    await prisma.loan.deleteMany({ where: { userId } });
  });

  beforeEach(async () => {
    await prisma.loan.deleteMany({ where: { userId } });
  });

  afterAll(async () => {
    await prisma.loan.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it("rejects requests without a JWT", async () => {
    const response = await request(app).get("/api/loans");

    expect(response.status).toBe(401);
  });

  it("creates a loan for the authenticated user", async () => {
    const response = await request(app)
      .post("/api/loans")
      .set("Authorization", `Bearer ${token}`)
      .send({
        friendName: "Test Friend",
        amount: 1500.5,
        dueDate: "2099-12-31",
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.friendName).toBe("Test Friend");
    expect(response.body.data.amount).toBe("1500.5");
    expect(response.body.data.userId).toBe(userId);
  });

  it("rejects invalid loan amounts", async () => {
    const response = await request(app)
      .post("/api/loans")
      .set("Authorization", `Bearer ${token}`)
      .send({
        friendName: "Test Friend",
        amount: -100,
        dueDate: "2099-12-31",
      });

    expect(response.status).toBe(400);
  });

  it("lists loans and calculates the summary", async () => {
    await prisma.loan.create({
      data: {
        userId,
        friendName: "Overdue Friend",
        amount: "750.25",
        dueDate: new Date("2020-01-01T00:00:00.000Z"),
      },
    });

    const listResponse = await request(app)
      .get("/api/loans")
      .set("Authorization", `Bearer ${token}`);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data).toHaveLength(1);
    expect(listResponse.body.data[0].isOverdue).toBe(true);

    const summaryResponse = await request(app)
      .get("/api/summary")
      .set("Authorization", `Bearer ${token}`);

    expect(summaryResponse.status).toBe(200);
    expect(summaryResponse.body.data).toEqual({
      totalLent: "750.25",
      totalRepaid: "0.00",
      overdueAmount: "750.25",
    });
  });

  it("marks a loan as repaid", async () => {
    const loan = await prisma.loan.create({
      data: {
        userId,
        friendName: "Repaid Friend",
        amount: "500.00",
        dueDate: new Date("2020-01-01T00:00:00.000Z"),
      },
    });

    const response = await request(app)
      .patch(`/api/loans/${loan.id}/repay`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.isRepaid).toBe(true);

    const summaryResponse = await request(app)
      .get("/api/summary")
      .set("Authorization", `Bearer ${token}`);

    expect(summaryResponse.body.data.totalRepaid).toBe("500.00");
    expect(summaryResponse.body.data.overdueAmount).toBe("0.00");
  });
});
