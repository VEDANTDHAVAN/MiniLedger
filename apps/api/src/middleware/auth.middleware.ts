
import type { NextFunction, Request, Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      message: "Authentication token is required.",
    });
    return;
  }

  const token = authorization.slice("Bearer ".length);
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    res.status(500).json({
      success: false,
      message: "Authentication is not configured correctly.",
    });
    return;
  }

  try {
    const payload = jwt.verify(token, secret);

    if (
      typeof payload === "string" ||
      !(payload as JwtPayload).sub ||
      typeof (payload as JwtPayload).sub !== "string"
    ) {
      res.status(401).json({
        success: false,
        message: "Invalid authentication token.",
      });
      return;
    }

    req.userId = (payload as JwtPayload).sub;
    next();
  } catch {
    res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token.",
    });
  }
}
