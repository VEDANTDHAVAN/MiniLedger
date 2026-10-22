
const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "MiniLedger API",
    version: "1.0.0",
    description:
      "API for managing money lent to friends, repayments, and overdue loans.",
  },
  servers: [
    {
      url: "http://localhost:4000",
      description: "Local development server",
    },
  ],
  tags: [
    { name: "Health", description: "API and database health checks" },
    { name: "Authentication", description: "Mock phone OTP authentication" },
    { name: "Loans", description: "Loan management" },
    { name: "Summary", description: "Loan totals and overdue amounts" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      Loan: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          userId: { type: "string", format: "uuid" },
          friendName: { type: "string", example: "Rahul" },
          amount: { type: "string", example: "1500.5" },
          dueDate: { type: "string", format: "date-time" },
          isRepaid: { type: "boolean", example: false },
          repaidAt: {
            type: "string",
            format: "date-time",
            nullable: true,
          },
          isOverdue: { type: "boolean", example: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      LoanSummary: {
        type: "object",
        properties: {
          totalLent: { type: "string", example: "1500.5" },
          totalRepaid: { type: "string", example: "500.00" },
          overdueAmount: { type: "string", example: "1000.50" },
        },
      },
    },
  },
  paths: {
    "/api/health": {
      get: {
        tags: ["Health"],
        summary: "Check API status",
        responses: {
          "200": { description: "API is running" },
        },
      },
    },

    "/api/health/db": {
      get: {
        tags: ["Health"],
        summary: "Check PostgreSQL connection",
        responses: {
          "200": { description: "Database connected" },
          "503": { description: "Database unavailable" },
        },
      },
    },

    "/api/auth/request-otp": {
      post: {
        tags: ["Authentication"],
        summary: "Generate a mock OTP",
        description: "The development OTP is printed in the API terminal.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["phone"],
                properties: {
                  phone: {
                    type: "string",
                    example: "+919876543210",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "OTP generated" },
          "400": { description: "Invalid phone number" },
        },
      },
    },

    "/api/auth/verify-otp": {
      post: {
        tags: ["Authentication"],
        summary: "Verify OTP and log in",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["phone", "otp"],
                properties: {
                  phone: {
                    type: "string",
                    example: "+919876543210",
                  },
                  otp: {
                    type: "string",
                    example: "123456",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Login successful; returns JWT" },
          "400": { description: "Invalid or expired OTP" },
          "429": { description: "Too many attempts" },
        },
      },
    },

    "/api/loans": {
      get: {
        tags: ["Loans"],
        summary: "List the authenticated user's loans",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Loans retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Loan" },
                    },
                  },
                },
              },
            },
          },
          "401": { description: "Missing or invalid JWT" },
        },
      },

      post: {
        tags: ["Loans"],
        summary: "Create a loan",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["friendName", "amount", "dueDate"],
                properties: {
                  friendName: {
                    type: "string",
                    minLength: 1,
                    maxLength: 100,
                    example: "Rahul",
                  },
                  amount: {
                    type: "number",
                    exclusiveMinimum: 0,
                    example: 1500.5,
                  },
                  dueDate: {
                    type: "string",
                    format: "date",
                    example: "2026-10-30",
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Loan created successfully" },
          "400": { description: "Invalid loan details" },
          "401": { description: "Missing or invalid JWT" },
        },
      },
    },

    "/api/loans/{id}/repay": {
      patch: {
        tags: ["Loans"],
        summary: "Mark a loan as fully repaid",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "UUID of the loan",
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "200": { description: "Loan marked as repaid" },
          "400": { description: "Invalid loan ID" },
          "401": { description: "Missing or invalid JWT" },
          "404": { description: "Loan not found" },
          "409": { description: "Loan already repaid" },
        },
      },
    },

    "/api/summary": {
      get: {
        tags: ["Summary"],
        summary: "Get lending and repayment totals",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Summary calculated successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      $ref: "#/components/schemas/LoanSummary",
                    },
                  },
                },
              },
            },
          },
          "401": { description: "Missing or invalid JWT" },
        },
      },
    },
  },
};

export default openApiSpec;