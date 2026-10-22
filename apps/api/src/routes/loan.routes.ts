
import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.middleware";
import {
  createLoan,
  getLoanSummary,
  listLoans,
  repayLoan,
} from "../services/loan.service";

const router = Router();

const createLoanSchema = z.object({
  friendName: z.string().trim().min(1).max(100),
  amount: z
    .number()
    .finite()
    .positive()
    .max(9_999_999_999.99)
    .refine(
      (amount) => Number.isInteger(amount * 100),
      "Amount must have at most two decimal places."
    ),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Due date must use YYYY-MM-DD format.")
    .refine((value) => {
      const date = new Date(`${value}T00:00:00.000Z`);
      return (
        !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value
      );
    }, "Enter a valid calendar date."),
});

router.use(requireAuth);

// GET /api/loans
router.get("/loans", async (req, res) => {
  try {
    const loans = await listLoans(req.userId!);

    res.json({ success: true, data: loans });
  } catch (error) {
    console.error("Failed to list loans:", error);
    res.status(500).json({
      success: false,
      message: "Unable to retrieve loans.",
    });
  }
});

// POST /api/loans
router.post("/loans", async (req, res) => {
  const parsed = createLoanSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid loan details.",
    });
    return;
  }

  try {
    const { friendName, amount, dueDate } = parsed.data;

    const loan = await createLoan(
      req.userId!,
      friendName,
      amount.toFixed(2),
      new Date(`${dueDate}T00:00:00.000Z`)
    );

    res.status(201).json({
      success: true,
      data: { ...loan, amount: loan.amount.toString() },
    });
  } catch (error) {
    console.error("Failed to create loan:", error);
    res.status(500).json({
      success: false,
      message: "Unable to create loan.",
    });
  }
});

// PATCH /api/loans/:id/repay
router.patch("/loans/:id/repay", async (req, res) => {
  const loanId = req.params.id;

  if (!loanId || !z.string().uuid().safeParse(loanId).success) {
    res.status(400).json({
      success: false,
      message: "A valid loan ID is required.",
    });
    return;
  }

  try {
    const result = await repayLoan(req.userId!, loanId);

    if (result.status === "not_found") {
      res.status(404).json({
        success: false,
        message: "Loan not found.",
      });
      return;
    }

    if (result.status === "already_repaid") {
      res.status(409).json({
        success: false,
        message: "This loan has already been repaid.",
      });
      return;
    }

    res.json({ success: true, data: result.loan });
  } catch (error) {
    console.error("Failed to mark loan as repaid:", error);
    res.status(500).json({
      success: false,
      message: "Unable to update loan.",
    });
  }
});

// GET /api/summary
router.get("/summary", async (req, res) => {
  try {
    const summary = await getLoanSummary(req.userId!);

    res.json({ success: true, data: summary });
  } catch (error) {
    console.error("Failed to calculate summary:", error);
    res.status(500).json({
      success: false,
      message: "Unable to calculate loan summary.",
    });
  }
});

export default router;
