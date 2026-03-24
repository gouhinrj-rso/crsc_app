# CRSC Filing Assistant

A HIPAA-compliant web application that assists military veterans in filing for Combat-Related Special Compensation (CRSC). The application uses AI-powered chat to guide veterans through the complex filing process, collect necessary information, generate required documents, and prepare complete submission packets.

## Features

- **AI-Powered Guidance**: Conversational AI assistant helps veterans understand eligibility and collects required information
- **HIPAA Compliant**: All Protected Health Information (PHI) stored in secure, encrypted PostgreSQL database on Google Cloud
- **Document Generation**: Automatically generates DD Form 2860 and supporting documentation
- **Progress Tracking**: Real-time progress indicators for each phase of the application
- **Secure Authentication**: Supabase Auth with email verification
- **Payment Processing**: Stripe integration for secure payment handling

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **Backend**: Supabase Edge Functions (Deno runtime)
- **Database**: PostgreSQL on Google Cloud Platform
- **AI**: Anthropic Claude API
- **Payments**: Stripe
- **Authentication**: Supabase Auth

## Project Structure

```
crsc_app/
├── src/
│   ├── components/     # Reusable UI components
│   ├── contexts/       # React contexts (Auth, DevMode)
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Utilities, API client, constants
│   ├── pages/          # Page components
│   └── types/          # TypeScript type definitions
├── supabase/
│   ├── functions/      # Edge functions
│   │   ├── chat-handler/      # AI chat with Claude (streaming)
│   │   ├── db-proxy/          # Database operations proxy (Google Cloud PostgreSQL)
│   │   ├── extract-document/  # Document data extraction via Claude Vision
│   │   ├── generate-pdf/      # PDF document generation (DD Form 2860)
│   │   ├── idme-auth/         # ID.me OAuth authorization URL generation
│   │   ├── idme-callback/     # ID.me OAuth callback & veteran verification
│   │   ├── payment-handler/   # Stripe payment processing
│   │   └── upload-document/   # Document upload to Google Cloud Storage
│   └── migrations/     # Database migrations
└── public/             # Static assets
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase CLI
- Google Cloud PostgreSQL instance

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Vets4Claims/crsc_app.git
   cd crsc_app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```

   Configure the following variables:
   ```env
   VITE_SUPABASE_URL=your-supabase-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   VITE_STRIPE_PUBLISHABLE_KEY=your-stripe-key
   ```

4. Set up Supabase secrets (for edge functions):
   ```bash
   supabase secrets set DB_HOST=your-db-host
   supabase secrets set DB_PORT=5432
   supabase secrets set DB_NAME=crsc_filing
   supabase secrets set DB_USER=your-db-user
   supabase secrets set DB_PASSWORD=your-db-password
   supabase secrets set ANTHROPIC_API_KEY=your-anthropic-key
   supabase secrets set STRIPE_SECRET_KEY=your-stripe-secret-key
   supabase secrets set GCS_BUCKET_NAME=crsc-documents
   supabase secrets set GCS_PROJECT_ID=your-gcp-project-id
   supabase secrets set GCS_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
   supabase secrets set GCS_PRIVATE_KEY=your-gcs-private-key
   supabase secrets set IDME_CLIENT_ID=your-idme-client-id
   supabase secrets set IDME_CLIENT_SECRET=your-idme-client-secret
   supabase secrets set IDME_REDIRECT_URI=https://your-project.supabase.co/functions/v1/idme-callback
   supabase secrets set FRONTEND_URL=https://your-frontend-domain.com
   supabase secrets set ENCRYPTION_KEY=your-32-byte-encryption-key
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

### Deploying Edge Functions

```bash
supabase link --project-ref your-project-ref
supabase functions deploy chat-handler
supabase functions deploy db-proxy
supabase functions deploy extract-document
supabase functions deploy generate-pdf
supabase functions deploy idme-auth
supabase functions deploy idme-callback
supabase functions deploy payment-handler
supabase functions deploy upload-document
```

## Application Flow

1. **Eligibility Check**: Verify veteran meets CRSC requirements
2. **Personal Information**: Collect name, contact details, SSN
3. **Military Service**: Branch, rank, retirement details
4. **VA Disability Info**: VA file number, current rating
5. **Disability Claims**: Individual disabilities with combat-related codes
6. **Document Upload**: DD214, VA decisions, medical records
7. **Review & Payment**: Review all information, process payment
8. **Download Package**: Generate and download complete filing package

## Combat-Related Codes

| Code | Description |
|------|-------------|
| PH | Purple Heart - Injury from armed conflict |
| AC | Armed Conflict - Direct result of armed conflict |
| HS | Hazardous Service - Demolition, flight, parachuting |
| SW | Simulating War - Live fire practice, combat training |
| IN | Instrument of War - Military vehicle, weapon injury |
| AO | Agent Orange - Herbicide exposure |
| RE | Radiation Exposure - Combat-related radiation |
| GW | Gulf War - Gulf War-related disabilities |
| MG | Mustard Gas - Chemical exposure |

## Security

- All PHI encrypted at rest and in transit
- Row-level security policies enforced
- Audit logging for all data access
- Automatic session timeout
- No PHI stored in browser storage

## License

Proprietary - All rights reserved.

## Support

For support inquiries, please contact support@vets4claims.com
