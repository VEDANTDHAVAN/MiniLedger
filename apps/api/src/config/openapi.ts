
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
  },
  paths: {
    "/api/health": {
      get: {
        tags: ["Health"],
        summary: "Check API status",
        responses: {
          "200": {
            description: "API is running",
          },
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
  },
};

export default openApiSpec;
