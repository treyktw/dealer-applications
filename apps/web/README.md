# Dealership Admin Dashboard

A comprehensive dealership management dashboard built with Next.js 14, featuring role-based access control, multi-dealership support, and integrated marketing tools.

## Features

### Authentication & Authorization
- Clerk-based authentication
- Role-based access control (admin, staff, readonly)
- IP-based access restrictions
- Multi-dealership support

### Client Management
- Comprehensive client profiles
- Client import/export functionality
- Client history tracking
- Custom form fields

### Marketing Suite
- Campaign management
- Campaign analytics
- Automated campaign tracking
- Marketing statistics dashboard

### Settings & Administration
- User management
- IP access management
- Dealership configuration
- Brand customization

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Clerk
- **UI Components**: Custom components with shadcn/ui
- **Styling**: Tailwind CSS
- **File Handling**: Uploadthing
- **Email**: Resend

## Project Structure

```
dealership-admin/
├── prisma/                # Database schema and migrations
├── public/                # Static assets
├── src/
│   ├── app/              # Next.js app router pages
│   │   ├── (auth)/       # Authentication routes
│   │   ├── (dashboard)/  # Protected dashboard routes
│   │   └── api/          # API routes
│   ├── components/       # React components
│   │   ├── dashboard/    # Dashboard-specific components
│   │   ├── forms/        # Form components
│   │   └── ui/           # UI components
│   ├── lib/             # Utility functions
│   └── types/           # TypeScript types
```

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- PostgreSQL database
- npm or yarn

### Environment Setup

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Configure the following environment variables:
```env
DATABASE_DEV_URL=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
UPLOADTHING_TOKEN=
RESEND_API_KEY=
NEXT_PUBLIC_APP_URL=
```

### Installation

1. Install dependencies:
```bash
npm install
```

2. Generate Prisma client:
```bash
npx prisma generate
```

3. Run database migrations:
```bash
npx prisma migrate dev
```

4. Start the development server:
```bash
npm run dev
```

### Available Scripts

```bash
# Development
npm run dev          # Start development server with Turbopack

# Database
npm run db:generate  # Generate Prisma client
npm run db:push     # Push schema changes to database
npm run db:studio   # Launch Prisma Studio

# Production
npm run build       # Build for production
npm run start       # Start production server

# Code Quality
npm run lint        # Run ESLint
```

## Development Guidelines

### File Structure
- Place page components in `src/app`
- Reusable components go in `src/components`
- Utility functions belong in `src/lib`
- API routes should be in `src/app/api`

### Component Organization
- Use the `_components` folder within feature directories for page-specific components
- Place shared UI components in `components/ui`
- Form-related components go in `components/forms`

### Database Schema
- Schema modifications should be made in `prisma/schema.prisma`
- Run migrations for schema changes
- Test changes in development before pushing to production

## Security Features

- IP-based access restrictions
- Role-based access control
- Secure authentication with Clerk
- API route protection
- Environment variable validation

## Deployment

The application is designed to be deployed on Vercel:

1. Connect your repository to Vercel
2. Configure environment variables
3. Deploy from main branch

## Error Handling

The application implements:
- Global error boundaries
- API error handling
- Form validation
- Database error handling

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests and linting
4. Submit a pull request

## Support

For support, please contact:
- Technical issues: Create an issue in the repository
- User support: Contact your system administrator

## License

This project is proprietary software. All rights reserved.


I'll help you brainstorm the architecture and approach for each new feature. Let's break this down:

1. **Subscription System**
   - **Schema Design**:
     - `subscriptions` table to track:
       - Subscription status (active, expired, cancelled)
       - Plan type (basic, premium, enterprise)
       - Billing cycle
       - Payment history
       - Features enabled
     - `dealerships` table updates:
       - Add subscription status
       - Add plan type
       - Add billing information
   - **Integration Points**:
     - Stripe for payment processing
     - Webhook handlers for subscription events
     - Feature flags based on subscription level

2. **Enhanced Employee Management**
   - **Schema Updates**:
     - `users` table enhancements:
       - Role-based access control (RBAC)
       - Department assignments
       - Permission sets
     - `invitations` table improvements:
       - Expiration handling
       - Role assignment
       - Department assignment
       - Status tracking
   - **Workflow Improvements**:
     - Multi-step invitation process
     - Email templates for different stages
     - Automated role assignment

3. **Subscription-Gated Onboarding**
   - **Flow Changes**:
     - Check subscription status before allowing onboarding
     - Different onboarding paths based on subscription level
     - Feature availability based on plan
   - **Implementation**:
     - Middleware checks for subscription status
     - Conditional rendering of features
     - Graceful degradation for non-subscribers

4. **Real-time Vehicle API**
   - **Architecture**:
     - Convex real-time queries for vehicle status
     - Webhook endpoints for external applications
     - API key management for external access
   - **Data Flow**:
     - Vehicle status changes trigger real-time updates
     - Webhook notifications to connected applications
     - Rate limiting and access control
   - **Security**:
     - API key authentication
     - IP whitelisting
     - Request rate limiting
     - Data access scoping

5. **Cloud Readiness**
   - **Infrastructure**:
     - Environment configuration
     - Secrets management
     - Scaling considerations
   - **Monitoring**:
     - Error tracking
     - Performance monitoring
     - Usage analytics
   - **Deployment**:
     - CI/CD pipeline
     - Environment separation
     - Backup strategies

Would you like to dive deeper into any of these areas? We can discuss:
1. Specific implementation details
2. Security considerations
3. User experience flows
4. Integration points
5. Technical requirements

Which aspect would you like to explore first?
