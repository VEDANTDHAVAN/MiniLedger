
import { prisma } from "../config/prisma";

function formatMoney(value: { toFixed: (digits: number) => string } | null): string {
  return value === null ? "0.00" : value.toFixed(2);
}

export async function createLoan(
  userId: string,
  friendName: string,
  amount: string,
  dueDate: Date
) {
  return prisma.loan.create({
    data: {
      userId,
      friendName,
      amount,
      dueDate,
    },
  });
}

export async function listLoans(userId: string) {
  const loans = await prisma.loan.findMany({
    where: { userId },
    orderBy: [{ isRepaid: "asc" }, { dueDate: "asc" }],
  });

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  return loans.map((loan) => ({
    ...loan,
    amount: loan.amount.toFixed(2),
    isOverdue: !loan.isRepaid && loan.dueDate < today,
  }));
}

export async function repayLoan(userId: string, loanId: string) {
  // updateMany scopes the update to the owner and avoids
  // changing a loan that has already been repaid.
  const result = await prisma.loan.updateMany({
    where: {
      id: loanId,
      userId,
      isRepaid: false,
    },
    data: {
      isRepaid: true,
      repaidAt: new Date(),
    },
  });

  if (result.count === 0) {
    const existingLoan = await prisma.loan.findFirst({
      where: { id: loanId, userId },
    });

    if (!existingLoan) {
      return { status: "not_found" as const };
    }

    return { status: "already_repaid" as const };
  }

  const loan = await prisma.loan.findFirstOrThrow({
    where: { id: loanId, userId },
  });

  return {
    status: "repaid" as const,
    loan: {
      ...loan,
      amount: loan.amount.toFixed(2),
    },
  };
}

export async function getLoanSummary(userId: string) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const [allLoans, repaidLoans, overdueLoans] = await Promise.all([
    prisma.loan.aggregate({
      where: { userId },
      _sum: { amount: true },
    }),
    prisma.loan.aggregate({
      where: { userId, isRepaid: true },
      _sum: { amount: true },
    }),
    prisma.loan.aggregate({
      where: {
        userId,
        isRepaid: false,
        dueDate: { lt: today },
      },
      _sum: { amount: true },
    }),
  ]);

  return {
    totalLent: formatMoney(allLoans._sum.amount),
    totalRepaid: formatMoney(repaidLoans._sum.amount),
    overdueAmount: formatMoney(overdueLoans._sum.amount),
  };
}
