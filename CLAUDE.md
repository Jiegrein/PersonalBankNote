# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## IMPORTANT: Before Any Task

**Always read this file and check `.claude/context/` for existing plans before writing any code or responding to requests.** Use existing context to avoid redoing work and to maintain consistency with prior decisions.

## Project Overview

PersonalBankingNote - A personal banking/finance tracking application built with Next.js.

## Tech Stack

- **Framework**: Next.js 14 (App Router, TypeScript)
- **Auth**: NextAuth.js + Microsoft Azure AD
- **Database**: Prisma + SQLite
- **Email API**: Microsoft Graph API
- **UI**: Tailwind CSS + shadcn/ui (dark mode default)
- **Charts**: Recharts
- **Testing**: Jest + React Testing Library

## Project Structure

```
PersonalBankingNote/
├── src/           # Next.js app source
├── prisma/        # Database schema
├── public/        # Static assets
└── .claude/       # Context and plans
```

## Development Commands (Docker)

```bash
# Start development server
docker-compose up

# Run in background
docker-compose up -d

# Stop containers
docker-compose down

# Rebuild after package.json changes
docker-compose up --build

# Run tests
docker-compose exec app npm test

# Run tests in watch mode
docker-compose exec app npm run test:watch

# Install new package
docker-compose exec app npm install <package>

# Database commands
docker-compose exec app npx prisma migrate dev
docker-compose exec app npx prisma studio
```

All commands should be run from the project root directory.

## Architecture

*To be documented as the codebase develops.*

## Development Workflow

**Always use TDD (Test-Driven Development)**

For every feature or update:

1. **Plan first** - Create a plan file in `.claude/context/` with naming format:
   ```
   yyyy-MM-dd_HH-mm_description.md
   ```
   Example: `2025-11-20_08-30_add-user-auth.md`

2. **Execute** - Implement following the plan with TDD (Red-Green-Refactor)

3. **Update** - Update the plan file with actual implementation details, changes made, and outcomes

**Important**: Update documentation every time a phase is complete.