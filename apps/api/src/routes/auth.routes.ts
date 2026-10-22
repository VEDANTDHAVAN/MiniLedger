
import { Router } from "express";
import { randomInt } from "node:crypto";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../config/prisma";

const router = Router();

const otpStore = new Map<
  string,
  { otp: string; expiresAt: number; attempts: number }
>();

const phoneSchema = z.string().trim().regex(
  /^\+?[1-9]\d{7,14}$/,
  "Enter a valid phone number, including country code if needed."
);

const otpRequestSchema = z.object({
  phone: phoneSchema,
});

const otpVerifySchema = z.object({
  phone: phoneSchema,
  otp: z.string().regex(/^\d{6}$/, "OTP must be six digits."),
});

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be configured with at least 32 characters.");
  }

  return secret;
}

// POST /api/auth/request-otp
router.post("/request-otp", (req, res) => {
  const parsed = otpRequestSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid phone number.",
    });
  }

  const { phone } = parsed.data;
  const otp = String(randomInt(100000, 1000000));

  otpStore.set(phone, {
    otp,
    expiresAt: Date.now() + 5 * 60 * 1000,
    attempts: 0,
  });

  // Development-only mock OTP. Never log OTPs in production.
  console.log(`[MiniLedger DEV OTP] ${phone}: ${otp}`);

  return res.status(200).json({
    success: true,
    message: "OTP generated. Check the API server terminal.",
  });
});

// POST /api/auth/verify-otp
router.post("/verify-otp", async (req, res) => {
  const parsed = otpVerifySchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid request.",
    });
  }

  const { phone, otp } = parsed.data;
  const record = otpStore.get(phone);

  if (!record) {
    return res.status(400).json({
      success: false,
      message: "Request a new OTP first.",
    });
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(phone);
    return res.status(400).json({
      success: false,
      message: "OTP expired. Request a new one.",
    });
  }

  if (record.attempts >= 5) {
    otpStore.delete(phone);
    return res.status(429).json({
      success: false,
      message: "Too many attempts. Request a new OTP.",
    });
  }

  if (record.otp !== otp) {
    record.attempts += 1;

    if (record.attempts >= 5) {
      otpStore.delete(phone);
    }

    return res.status(400).json({
      success: false,
      message: "Incorrect OTP.",
    });
  }

  // Consume the OTP so it cannot be reused.
  otpStore.delete(phone);

  try {
    const user = await prisma.user.upsert({
      where: { phone },
      update: {},
      create: { phone },
      select: { id: true, phone: true },
    });

    const token = jwt.sign(
      { sub: user.id },
      getJwtSecret(),
      { expiresIn: "1h" }
    );

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      user,
    });
  } catch (error) {
    console.error("OTP verification failed:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to complete login.",
    });
  }
});

export default router;
