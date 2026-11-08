
# Contributing to Cloud-Cost-Pulse

Thank you for your interest in contributing to Cloud-Cost-Pulse!

Cloud-Cost-Pulse is a cloud cost monitoring and FinOps platform that helps engineering and finance teams monitor cloud spending, manage budgets, analyze resource utilization, and identify cost optimization opportunities.

We welcome contributions that improve functionality, reliability, security, performance, accessibility, and documentation.

## Table of Contents

- [Getting Started](#getting-started)
- [Prerequisites](#prerequisites)
- [Local Development Setup](#local-development-setup)
- [Environment Configuration](#environment-configuration)
- [Running the Application](#running-the-application)
- [Running Tests](#running-tests)
- [Contribution Guidelines](#contribution-guidelines)
- [Pull Request Guidelines](#pull-request-guidelines)
- [Security Guidelines](#security-guidelines)

## Getting Started

Before contributing, familiarize yourself with the project structure and existing documentation.

Useful resources:

- [Project README](README.md)
- [Architecture Documentation](ARCHITECTURE.md)
- [API Documentation](API_DOCUMENTATION.md)
- [Deployment Guide](DEPLOYMENT_GUIDE.md)
- [Test Report](TEST_REPORT.md)

## Prerequisites

Make sure you have the following installed:

- Git
- Node.js (compatible with Next.js 15)
- npm
- A code editor such as Visual Studio Code

For full local functionality, you may also need:

- A Clerk account for authentication.
- A Supabase project for persistent database storage.

## Local Development Setup

### 1. Clone the repository

```bash
git clone https://github.com/itsCodeTide/cloud-cost-pulse.git
```

### 2. Navigate to the project directory

```bash
cd cloud-cost-pulse
```

### 3. Install dependencies

```bash
npm install
```

### 4. Create environment configuration

Copy the example environment file:

```bash
cp .env.example .env.local
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

### 5. Configure your credentials

Update `.env.local` with your own development credentials.

See [Environment Configuration](#environment-configuration).

Never commit actual credentials or secret keys.

## Environment Configuration

The application uses environment variables for authentication, database connectivity, encryption, and integrations.

| Variable | Purpose |
|---|---|
| NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY | Clerk authentication |
| CLERK_SECRET_KEY | Server-side Clerk authentication |
| SUPABASE_URL | Supabase project URL |
| SUPABASE_PUBLISHABLE_KEY | Supabase client configuration |
| SUPABASE_SECRET_KEY | Server-side database access |
| SUPABASE_JWKS_URL | Token verification |
| SECRET_ENCRYPTION_KEY | Encryption of integration credentials |
| RESEND_API_KEY | Email notifications (optional) |

Additional legacy database configuration variables are available in `.env.example`.

For persistent Supabase storage, execute the required database migration:

`migrations/002_supabase_app_data.sql`

Use the Supabase SQL Editor.

Keep `.env.local` private and never commit production credentials.

## Running the Application

Start the development server:

```bash
npm run dev
```

Open the application:

http://localhost:3000

To create a production build:

```bash
npm run build
```

To start the production server after building:

```bash
npm run start
```

## Running Tests

Run the automated test suite:

```bash
node tests/run_all_tests.js
```

Before submitting a pull request, verify that your changes do not introduce regressions.

## Contribution Guidelines

Please follow these guidelines:

1. Check existing issues and pull requests before starting work.
2. Prefer focused changes that solve one problem at a time.
3. Follow the existing project structure and coding conventions.
4. Avoid introducing unnecessary dependencies.
5. Keep documentation updated when modifying application behavior.
6. Include relevant testing or verification for functional changes.
7. Do not commit generated files, local configuration, or secrets.

### Branch Naming

Use descriptive branch names:

- `feature/add-cost-analytics`
- `fix/dashboard-loading`
- `docs/update-api-documentation`
- `refactor/optimization-engine`

### Commit Messages

Use clear and descriptive commit messages.

Examples:

```text
feat: add cloud cost analytics
fix: resolve dashboard loading issue
docs: improve deployment documentation
refactor: simplify cost calculation logic
test: add API validation tests
```

## Pull Request Guidelines

Before opening a pull request:

- Make sure the change has a clear purpose.
- Verify that the application builds successfully.
- Run relevant automated tests.
- Review your changes for accidental secrets or unrelated modifications.
- Update relevant documentation.

When submitting a pull request, include:

1. A descriptive title.
2. A summary of the problem and proposed solution.
3. A description of the files or functionality changed.
4. Testing and verification details.
5. Screenshots for UI changes, where applicable.

Keep pull requests focused, understandable, and easy to review.

## Security Guidelines

Security is important for Cloud-Cost-Pulse.

- Never commit API keys, passwords, or access tokens.
- Never expose Supabase secret keys to client-side code.
- Use environment variables for sensitive configuration.
- Validate and sanitize external input.
- Report security vulnerabilities privately rather than publishing exploit details in public issues.

Thank you for helping improve Cloud-Cost-Pulse!
