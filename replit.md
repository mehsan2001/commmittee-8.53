# Overview

This is a Committee ROSCA (Rotating Savings and Credit Association) application that manages rotating savings committees with dual-role support for administrators and users. The platform enables admins to manage committees, payments, and payouts while allowing users to join committees, make payments, and track their contributions. The application features Firebase authentication with username/PIN login and uses Firestore for data persistence.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The frontend is built as a React SPA using Vite with TypeScript. It implements a component-based architecture using:
- **Routing**: Wouter for client-side routing with role-based route protection
- **State Management**: React Context for authentication state, TanStack Query for server state
- **UI Framework**: Radix UI components with shadcn/ui design system and Tailwind CSS
- **Forms**: React Hook Form with Zod validation for type-safe form handling
- **Theme**: Custom dark theme with cyan/green gradient accents and orange borders

## Backend Architecture
The backend follows a hybrid approach:
- **Express Server**: Minimal REST API server for future extensibility
- **Storage Interface**: Abstract storage layer with in-memory implementation (ready for database integration)
- **Development Setup**: Vite middleware integration for seamless dev experience

## Authentication & Authorization
- **Firebase Authentication**: Custom username/PIN system using Firebase Auth with email transformation
- **Role-Based Access**: Two-tier system (admin/user) with route-level protection
- **Session Management**: Firebase handles session persistence and token management

## Data Storage & Schema
- **Primary Database**: Firebase Firestore with prefixed collections (`cmt_rplt_*`)
- **Schema Definition**: Shared Zod schemas for type safety across client/server
- **Collections**: Users, committees, payments, payouts, notifications, join requests
- **Backup Storage**: Drizzle ORM configured for PostgreSQL (ready for migration)

## External Dependencies

- **Firebase Services**: Authentication, Firestore database, Cloud Storage
- **Google Cloud**: Firebase project hosted on Google Cloud Platform
- **Service Account**: Firebase Admin SDK with service account credentials for server-side operations
- **Neon Database**: PostgreSQL database configured via Drizzle (DATABASE_URL required)
- **Third-party UI**: Radix UI primitives, Embla Carousel, CMDK command palette
- **Development Tools**: Replit integration with cartographer and runtime error overlay