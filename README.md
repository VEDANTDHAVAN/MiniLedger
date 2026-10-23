# MiniLedger — Personal Lending Tracker

MiniLedger is a mobile application that helps users track money lent to friends, monitor repayment status, and identify overdue loans. It provides a simple dashboard for viewing lending totals and managing individual loans.

The project consists of a **Node.js + TypeScript REST API**, a **PostgreSQL database**, and an **Expo React Native mobile application**.

## Table of Contents

- [Features](#features)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Environment Configuration](#environment-configuration)
- [Running the Application](#running-the-application)
- [Authentication Flow](#authentication-flow)
- [API Documentation](#api-documentation)
- [Data Model](#data-model)
- [Business Rules and Validation](#business-rules-and-validation)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Security Considerations](#security-considerations)
- [Known Limitations](#known-limitations)
- [Future Improvements](#future-improvements)

## Features

### Mobile Application

- Phone-number-based authentication using a mock OTP.
- Secure storage of the authentication token on the device.
- Dashboard displaying total money lent, total money repaid, and overdue amounts.
- List of loans with friend name, amount, due date, and repayment status.
- Visual highlighting of overdue loans.
- Form to create a loan with friend name, amount, and due date.
- Ability to mark an outstanding loan as repaid.
- Loading, validation, error, and empty states.
- Automatic authentication-token attachment to API requests.

### Backend API

- RESTful API built with Node.js, Express, and TypeScript.
- PostgreSQL persistence using Prisma ORM.
- Mock OTP generation and verification.
- JWT-based authentication for protected endpoints.
- User-scoped loan operations.
- Input validation for loan amounts, dates, and identifiers.
- Loan summary calculations using database aggregates.
- Swagger/OpenAPI documentation.
- Automated API integration tests.

## Technology Stack

| Layer | Technologies |
|---|---|
| Mobile | React Native, Expo, TypeScript |
| API | Node.js, Express, TypeScript |
| Database | PostgreSQL 16 |
| ORM | Prisma |
| Authentication | Mock OTP, JSON Web Tokens |
| API client | Axios |
| Secure token storage | Expo SecureStore |
| API documentation | Swagger/OpenAPI |
| Testing | Vitest, Supertest |
| Package manager | pnpm |
| Database environment | Docker Compose |

## Architecture

The mobile application communicates with the backend through HTTP requests. The API authenticates protected requests, applies business rules, and accesses PostgreSQL through Prisma.

```text
┌───────────────────────────┐
│   Expo React Native App   │
│                           │
│ Login · Dashboard · Loans │
└─────────────┬─────────────┘
              │ HTTP / JSON
              ▼
┌───────────────────────────┐
│     Express REST API      │
│                           │
│ OTP · JWT · Validation    │
│ Loans · Repayments        │
│ Summary                   │
└─────────────┬─────────────┘
              │ Prisma ORM
              ▼
┌───────────────────────────┐
│       PostgreSQL          │
│                           │
│ Users · Loans             │
└───────────────────────────┘
```

## Project Structure

```text
miniledger/
├── apps/
│   ├── api/
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   ├── src/
│   │   │   ├── __tests__/
│   │   │   │   └── loans.test.ts
│   │   │   ├── routes/
│   │   │   │   ├── auth.routes.ts
│   │   │   │   └── loan.routes.ts
│   │   │   ├── services/
│   │   │   │   └── loan.service.ts
│   │   │   ├── app.ts
│   │   │   └── server.ts
│   │   ├── .env.example
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── mobile/
│       ├── src/
│       │   └── lib/
│       │       ├── api.ts
│       │       ├── auth.ts
│       │       └── loans.ts
│       ├── App.tsx
│       ├── .env.example
│       └── package.json
├── docker-compose.yml
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

*The tree represents the intended project layout; adjust filenames if your final repository differs.*

## Prerequisites

Install the following before running the application:

- Node.js (use a version supported by your installed Expo SDK and project dependencies).
- pnpm.
- Docker Desktop, or a compatible local PostgreSQL 16 installation.
- Expo Go on a compatible mobile device, or an Android emulator.
- Git.

Check your installations:

```bash
node --version
pnpm --version
docker --version
```

## Getting Started

### 1. Clone the repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd miniledger
```

Replace the placeholder with your actual repository URL.

### 2. Install dependencies

From the repository root:

```bash
pnpm install
```

### 3. Configure the backend environment

Create the API environment file by copying the example:

**PowerShell**

```powershell
Copy-Item apps/api/.env.example apps/api/.env
```

**macOS/Linux**

```bash
cp apps/api/.env.example apps/api/.env
```

Update the values in `apps/api/.env` as described in the environment configuration section.

### 4. Start PostgreSQL

If the repository includes the configured Docker Compose service:

```bash
docker compose up -d
```

Verify the database container is running:

```bash
docker compose ps
```

The database must be reachable using the connection string configured in `apps/api/.env`.

### 5. Apply database migrations

Run the Prisma migrations from the API workspace:

```bash
pnpm --filter @miniledger/api exec prisma migrate deploy
```

If the project uses a generated Prisma client, regenerate it when required:

```bash
pnpm --filter @miniledger/api exec prisma generate
```

Use the committed migrations to initialize the database. Avoid using `prisma migrate reset` against a database containing data you need to preserve.

### 6. Configure the mobile application

Create the mobile environment file:

**PowerShell**

```powershell
Copy-Item apps/mobile/.env.example apps/mobile/.env
```

**macOS/Linux**

```bash
cp apps/mobile/.env.example apps/mobile/.env
```

Set the API URL to the address reachable from the device running the mobile application.

For an Android emulator, `10.0.2.2` commonly maps to the host computer. For a physical phone, use the computer's LAN IPv4 address, with both devices connected to the same network.

Example:

```dotenv
EXPO_PUBLIC_API_URL=http://192.168.1.10:4000/api
```

Replace the example IP with your computer's actual LAN address. Do not use `localhost` for a physical phone: it points to the phone itself.

### 7. Start the backend

From the repository root:

```bash
pnpm dev:api
```

The API should start on port `4000`, assuming that is the configured port.

Verify the health endpoint:

```text
http://localhost:4000/api/health
```

Open the API documentation at:

```text
http://localhost:4000/api-docs
```

### 8. Start the mobile application

In a second terminal:

```bash
pnpm dev:mobile
```

Scan the Expo QR code using Expo Go, or run the app on your configured emulator.

If environment variables have changed, restart the Expo development server so the new configuration is loaded.

## Environment Configuration

### Backend — `apps/api/.env`

Use the following as a reference. Generate a unique JWT secret for your local environment.

```dotenv
PORT=4000
DATABASE_URL="postgresql://miniledger:miniledger_dev_password@localhost:5432/miniledger?schema=public"
JWT_SECRET="replace-with-a-long-random-development-secret"
```

| Variable | Description |
|---|---|
| `PORT` | HTTP port used by the API server |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret used to sign and verify JWTs |

The database credentials shown are development examples only. Keep actual credentials in local environment files and never commit secrets.

### Mobile — `apps/mobile/.env`

```dotenv
EXPO_PUBLIC_API_URL=http://192.168.1.10:4000/api
```

`EXPO_PUBLIC_API_URL` is embedded in the client bundle and is not a secret. Never place database passwords, JWT signing secrets, or other private credentials in mobile environment variables.

## Running the Application

1. Start PostgreSQL.
2. Start the backend API.
3. Start the Expo development server.
4. Enter a phone number on the login screen.
5. Request an OTP.
6. Retrieve the mock OTP from the backend terminal logs.
7. Enter the OTP to authenticate.
8. View the dashboard and loan list.
9. Add a loan by entering the friend's name, amount, and due date.
10. Mark a loan as repaid and verify that the dashboard figures update.

The mock OTP is intended for development and demonstration purposes, not production authentication.

## Authentication Flow

1. The mobile app submits a phone number to the OTP request endpoint.
2. The backend generates a temporary OTP and prints it to the server log.
3. The user enters the OTP in the mobile app.
4. The backend verifies the OTP and returns a JWT.
5. The mobile app stores the token using Expo SecureStore.
6. Axios attaches the token as a Bearer token to authenticated API requests.
7. The backend verifies the JWT and associates the request with the authenticated user.

OTP expiration, retry limits, and token validation are enforced by the backend implementation.

## API Documentation

**Base URL for local development:** `http://localhost:4000/api`

The following endpoints describe the implemented API contract. Request and response examples are illustrative; verify exact response envelopes against the current route implementation or Swagger documentation.

### Authentication

#### Request OTP

`POST /auth/request-otp`

Request body:

```json
{
  "phone": "9876543210"
}
```

Purpose: Initiates the mock OTP login flow.

The generated OTP is printed in the backend logs. The response indicates whether the request was accepted.

#### Verify OTP

`POST /auth/verify-otp`

Request body:

```json
{
  "phone": "9876543210",
  "otp": "123456"
}
```

Purpose: Validates the OTP and returns an authentication token on success.

Example response shape:

```json
{
  "success": true,
  "token": "<JWT_TOKEN>"
}
```

Use the actual OTP printed by the server; the value above is illustrative.

### Loans

All loan-management endpoints require an authenticated request:

```http
Authorization: Bearer <JWT_TOKEN>
```

#### Create a loan

`POST /loans`

Request body:

```json
{
  "friendName": "Rahul",
  "amount": 1500.50,
  "dueDate": "2026-11-15"
}
```

Purpose: Creates a loan associated with the authenticated user.

The amount must be positive and have at most two decimal places. The due date must use the supported `YYYY-MM-DD` format.

#### List loans

`GET /loans`

Purpose: Returns loans belonging to the authenticated user, including repayment status and overdue information.

The mobile app uses this endpoint to render the loan list and highlight overdue loans.

#### Mark a loan as repaid

`PATCH /loans/:id/repay`

Example:

```http
PATCH /loans/00000000-0000-4000-8000-000000000001/repay
Authorization: Bearer <JWT_TOKEN>
```

Purpose: Marks an outstanding loan as repaid.

The loan ID above is a placeholder. Use an actual loan ID returned by the API.

The backend prevents a user from modifying another user's loan and handles attempts to repay an already-repaid loan.

#### Get lending summary

`GET /summary`

Purpose: Returns aggregate figures for the authenticated user:

- `totalLent`: Total amount originally lent.
- `totalRepaid`: Total amount associated with repaid loans.
- `overdueAmount`: Total outstanding amount for overdue loans.

The mobile dashboard displays these figures.

### Health and documentation

| Endpoint | Purpose |
|---|---|
| `GET /api/health` | Checks API/database health, according to the configured health route |
| `GET /api-docs` | Opens Swagger/OpenAPI documentation |

The health route is mounted at the `/api/health` path in the configured application. Check the current router setup if you change route prefixes.

## Data Model

### User

Represents a user authenticated through a phone number.

Typical fields include:

- Unique user identifier.
- Phone number.
- Creation and update timestamps, if configured.

### Loan

Represents money lent by a user to a friend.

Typical fields include:

- Unique loan identifier.
- Owner/user identifier.
- Friend's name.
- Loan amount.
- Due date.
- Repayment status.
- Repayment timestamp, when applicable.
- Creation and update timestamps.

The Prisma schema is the source of truth for the exact field names, column types, indexes, and relationships.

## Business Rules and Validation

- A loan must have a valid friend name.
- Loan amounts must be positive and support at most two decimal places.
- Due dates must follow the supported ISO date format.
- Only authenticated users can access protected loan endpoints.
- Loan list, repayment, and summary operations are scoped to the authenticated user.
- A repaid loan cannot be repaid a second time.
- Overdue status is based on an unpaid loan whose due date has passed, according to the backend's date-handling logic.
- Summary values are calculated from persisted loan data.
- Invalid identifiers and invalid request payloads are rejected by the API.

Date calculations should be interpreted using the backend's configured date and timezone rules.

## Testing

Run the backend integration tests:

```bash
pnpm --filter @miniledger/api test
```

Build the API:

```bash
pnpm build:api
```

Check API TypeScript types:

```bash
pnpm typecheck:api
```

Check mobile TypeScript types:

```bash
pnpm --filter @miniledger/mobile exec tsc --noEmit
```

The API integration suite covers scenarios such as:

- Rejecting unauthenticated requests.
- Creating a loan.
- Validating invalid loan amounts.
- Calculating overdue loans and summary totals.
- Marking a loan as repaid and verifying updated summary values.

The current verified test result is **5 passing tests**. Build and type-check commands should also be rerun after subsequent code changes.

## Troubleshooting

### The mobile app cannot connect to the API

- Confirm that the API server is running.
- Confirm that `EXPO_PUBLIC_API_URL` points to the correct address.
- Use the computer's LAN IP for a physical device, not `localhost`.
- Confirm that the phone and computer are on the same network.
- Check Windows Firewall rules for the API port.

### Database connection errors

- Check that PostgreSQL is running.
- Verify the database name, username, password, and port.
- Confirm that the `DATABASE_URL` matches the database configuration.
- Apply pending Prisma migrations.

### OTP verification fails

- Retrieve the latest OTP from the backend logs.
- Check that the phone number is identical in both requests.
- Ensure that the OTP has not expired or exceeded its retry limit.
- Confirm that the API is running the expected code.

### Unauthorized API requests

- Authenticate again to obtain a valid token.
- Check that the Axios interceptor attaches the Bearer token.
- Confirm that the backend uses the expected JWT secret.
- Check whether the token has expired.

### Expo does not load updated environment variables

Restart the Expo development server after changing the mobile `.env` file. If needed, restart with the cache-clearing option supported by the installed Expo CLI.

### Tests fail after building

Ensure the test runner targets source test files and does not execute compiled tests from `dist`. Vitest tests should run through Vitest, not through Node.js as compiled CommonJS files.

## Security Considerations

- Mock OTP authentication is for local development and assessment demonstrations only.
- JWT signing secrets and database credentials must remain outside version control.
- Mobile requests use SecureStore for token persistence.
- Protected endpoints must enforce authentication and per-user resource ownership.
- Production deployments should use HTTPS.
- Production authentication should use a trusted OTP delivery provider, rate limiting, and stronger abuse protections.
- Logs must not expose secrets or production authentication codes.
- Database migrations and backups should be managed as part of deployment operations.

## Known Limitations

- OTP delivery is simulated through backend logs.
- The mobile application is designed as a development/demo client.
- Receipt-photo upload is not included unless implemented separately in the current codebase.
- Production deployment, external SMS integration, and production-grade monitoring are outside the current baseline scope.

## Future Improvements

- Integrate a real SMS OTP provider.
- Add receipt-photo uploads and attachment storage.
- Add pagination and filtering for larger loan histories.
- Introduce push notifications and due-date reminders.
- Add more automated tests for authentication, authorization, and edge cases.
- Add CI checks for tests, builds, and type checking.
- Prepare production deployment with HTTPS, managed PostgreSQL, and centralized logging.

## License

Add the license applicable to this repository before distributing the project publicly.
