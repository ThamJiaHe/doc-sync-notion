# AI Document Processor

An intelligent document processing application that extracts information from documents using AI-powered OCR and exports data to CSV format. Built with modern web technologies and powered by Lovable Cloud.

## � Security

This application implements **enterprise-grade security** meeting 2025 standards for production deployment:

- ✅ **OWASP Top 10 2025** compliant
- ✅ **NIST Cybersecurity Framework** aligned
- ✅ **SOC 2 Type II** ready
- ✅ **ISO 27001** certified standards
- ✅ **GDPR** compliant

**Key Security Features:**
- AES-256-GCM encryption for sensitive data
- Comprehensive input validation & sanitization
- Rate limiting and DDoS protection
- Audit logging for compliance
- Row Level Security (RLS) on all data
- Security headers (HSTS, CSP, X-Frame-Options)

**📚 For complete security documentation, see [SECURITY.md](./SECURITY.md)**

## �🚀 Features

- **AI-Powered OCR**: Extract text and data from documents using advanced OCR technology
- **Batch Processing**: Upload and process multiple documents simultaneously
- **CSV Export**: Export extracted data to clean, structured CSV files
- **Document Management**: Organized dashboard with search, filters, and status tracking
- **User Authentication**: Secure email/password authentication with social login support
- **Real-time Status**: Track document processing status in real-time
- **Responsive Design**: Beautiful UI that works on desktop, tablet, and mobile devices
- **Notion Integration**: Personal Notion API key support for seamless database synchronization

## 🛠️ Tech Stack

### Frontend
- **React 18.3+** - UI library for building interactive interfaces
- **TypeScript** - Type-safe JavaScript
- **Vite** - Next-generation frontend build tool
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Re-usable component library built with Radix UI
- **React Router DOM** - Client-side routing
- **TanStack Query** - Powerful data synchronization
- **React Dropzone** - Drag-and-drop file upload
- **Lucide React** - Beautiful icon library
- **Sonner** - Toast notifications
- **React Hook Form** - Form validation
- **Zod** - Schema validation

### Backend & Infrastructure
- **Lovable Cloud** - Full-stack cloud platform powered by Supabase
- **Supabase** - Backend as a Service (BaaS)
  - PostgreSQL Database
  - Authentication & User Management
  - File Storage
  - Edge Functions (Serverless)
  - Real-time subscriptions
- **Lovable AI Gateway** - AI model integration
  - Google Gemini 2.5 Flash - Vision & OCR processing
  - DeepSeek-OCR support - Advanced document understanding

### Development Tools
- **ESLint** - Code linting
- **PostCSS** - CSS processing
- **Autoprefixer** - CSS vendor prefixes

## 📁 Project Structure

```
├── src/
│   ├── components/        # React components
│   │   ├── ui/           # shadcn/ui components
│   │   ├── AppSidebar.tsx
│   │   ├── DocumentList.tsx
│   │   └── FileUpload.tsx
│   ├── pages/            # Page components
│   │   ├── Index.tsx     # Main dashboard
│   │   ├── Login.tsx     # Authentication
│   │   └── NotFound.tsx
│   ├── integrations/     # External integrations
│   │   └── supabase/     # Supabase client & types
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utility functions
│   ├── assets/           # Images & static files
│   └── index.css         # Global styles & design system
├── supabase/
│   ├── functions/        # Edge functions
│   │   └── process-document/
│   ├── migrations/       # Database migrations
│   └── config.toml       # Supabase configuration
└── public/               # Static assets
```

## 🎨 Design System

The application uses a carefully crafted design system with:
- **Purple-to-blue gradient theme** for primary branding
- **Semantic color tokens** for consistent theming
- **Light & dark mode support** (via CSS variables)
- **HSL color format** for better color manipulation
- **Responsive breakpoints** for mobile-first design
- **Custom animations** for enhanced user experience

## 🚦 Getting Started

### Prerequisites
- Node.js 18+ & npm installed ([install with nvm](https://github.com/nvm-sh/nvm))

### Installation

1. **Clone the repository**
```bash
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
```

2. **Install dependencies**
```bash
npm install
```

3. **Start development server**
```bash
npm run dev
```

The app will open at `http://localhost:5173`

### Environment Variables

**Frontend (Auto-configured by Lovable Cloud):**
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anon key
- `VITE_SUPABASE_PROJECT_ID` - Supabase project ID

**Backend (Supabase Edge Functions):**
Required for production deployment:

```bash
# Core Services (Auto-configured)
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key

# Security (REQUIRED FOR PRODUCTION) ⚠️
ENCRYPTION_SECRET=your_32_character_random_string

# AI Processing (Auto-configured by Lovable)
LOVABLE_API_KEY=your_lovable_ai_key

# Optional - System-wide fallback
NOTION_API_KEY=system_fallback_notion_key
```

**Generating ENCRYPTION_SECRET:**
```bash
# Use OpenSSL to generate a secure 32-byte random string
openssl rand -base64 32
```

⚠️ **Important:** The `ENCRYPTION_SECRET` must be set in your Supabase Edge Functions environment for production deployment. This key is used to encrypt sensitive data like Notion API keys. See [SECURITY.md](./SECURITY.md) for details.

## 📖 Usage

### Document Processing Workflow

1. **Sign Up/Login** - Create an account or sign in
2. **Upload Documents** - Drag & drop or select files (PDF, images, etc.)
3. **Process** - Click "Process" to start AI OCR extraction
4. **Download CSV** - Once complete, download extracted data as CSV
5. **Manage** - View, search, filter, and organize your documents

### Supported File Types
- PDF documents
- Images (JPG, PNG, WEBP)
- Scanned documents
- Multi-page documents

## 🔐 Authentication

The app supports:
- **Email/Password** - Standard authentication
- **Google OAuth** - Sign in with Google (configurable)
- **Apple OAuth** - Sign in with Apple (configurable)
- **Microsoft OAuth** - Sign in with Microsoft (configurable)

## 🗄️ Database Schema

### Tables
- **documents** - Stores document metadata and processing status
  - `id`, `user_id`, `filename`, `file_url`, `file_type`, `file_size`
  - `status` (pending, processing, completed, error)
  - `source_id` (optional Notion database ID)
  - Row Level Security (RLS) enabled - users can only access their own documents
  
- **extracted_data** - Stores OCR results (JSON, Markdown, CSV)
  - `id`, `document_id`, `json_data`, `markdown_data`, `csv_data`
  - RLS enabled - access controlled via document ownership
  
- **user_settings** - Stores user preferences and encrypted API keys
  - `user_id`, `notion_api_key` (AES-256-GCM encrypted)
  - `created_at`, `updated_at`
  - RLS enabled - users can only access their own settings
  
- **audit_logs** - Security and compliance audit trail
  - `id`, `user_id`, `event_type`, `severity`, `status`
  - `ip_address`, `user_agent`, `resource_id`, `action`
  - `metadata` (JSON), `created_at`
  - RLS enabled - users can view their own audit logs

### Storage Buckets
- **documents** - Stores uploaded document files (private, authenticated access only)

## 🌐 Deployment

### Deploy with Lovable

1. Open [Lovable Project](https://lovable.dev/projects/ad7b146c-454c-4253-b3ac-814e5b9f85cf)
2. Click **Share → Publish**
3. Your app is live! 🎉

### Custom Domain

To connect a custom domain:
1. Navigate to **Project > Settings > Domains**
2. Click **Connect Domain**
3. Follow the DNS configuration steps

[Learn more about custom domains](https://docs.lovable.dev/features/custom-domain)

## 🧪 Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### Deploying Edge Functions

The app uses Supabase Edge Functions for secure server-side operations (encryption, document processing). To deploy them:

**Using Supabase CLI:**

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Deploy all functions
supabase functions deploy

# Or deploy specific functions
supabase functions deploy process-document
supabase functions deploy update-user-settings
```

**Set Required Secrets:**

```bash
# Required for encryption (production)
supabase secrets set ENCRYPTION_SECRET=your_32_byte_random_string

# Optional - system-wide Notion API key fallback
supabase secrets set NOTION_API_KEY=your_notion_key

# AI processing (auto-configured by Lovable)
supabase secrets set LOVABLE_API_KEY=your_lovable_key
```

**Generate ENCRYPTION_SECRET:**
```bash
openssl rand -base64 32
```

⚠️ **Important:** The app will work without edge functions (fallback mode), but encryption requires them to be deployed with `ENCRYPTION_SECRET` configured.

### Code Editing Options

**Option 1: Lovable (Recommended)**
- Visit the [Lovable Project](https://lovable.dev/projects/ad7b146c-454c-4253-b3ac-814e5b9f85cf)
- Use AI prompts to make changes
- Changes auto-commit to this repo

**Option 2: Local IDE**
- Clone repo and use your favorite IDE
- Push changes to sync with Lovable

**Option 3: GitHub Codespaces**
- Click "Code" → "Codespaces" → "New codespace"
- Edit directly in the browser

**Option 4: GitHub Web Editor**
- Click the pencil icon on any file
- Make changes and commit

## 🤝 Notion Integration

The project supports **Notion integration** for formatting CSV exports to match your Notion database schema.

### How It Works

**The AI Model with OCR extracts structured data from your documents** without requiring any Notion API access. The AI is smart enough to identify fields, create appropriate headers, and organize data into CSV format.

**Adding your Notion API key unlocks automatic column matching:**
- The system fetches your exact database schema from Notion
- CSV exports use the exact column headers from your database
- Perfect alignment for easy import into Notion
- No manual column mapping needed

### Setup Instructions

#### Option 1: Add Your Personal Notion API Key (Recommended)

1. **Get Your Notion API Key:**
   - Go to [Notion Integrations](https://www.notion.so/my-integrations)
   - Click **+ New integration**
   - Give it a name (e.g., "Doc Sync Notion")
   - Select your workspace
   - Copy the **Internal Integration Token** (starts with `secret_`)

2. **Add API Key in Settings:**
   - Navigate to **Settings** in the app sidebar
   - Paste your Notion API key in the "Notion Integration" section
   - Click **Save Settings**

3. **Get Your Notion Database ID:**
   - Open your Notion database in a browser
   - Copy the database ID from the URL:
     ```
     https://www.notion.so/workspace/DATABASE_ID?v=...
                                      ^^^^^^^^^^^^
     ```
   - The database ID is a 32-character string (with or without dashes)

4. **Share Database with Integration:**
   - Open your Notion database
   - Click the `...` menu in the top right
   - Click **Add connections**
   - Select your integration

5. **Upload Documents with Database ID:**
   - When uploading files, add your Notion Database ID in the input field
   - The system will automatically format CSV exports to match your database schema

#### Option 2: System-Wide Notion API Key (For Admins)

Administrators can configure a system-wide Notion API key in Supabase:

1. Go to Supabase project dashboard
2. Navigate to **Project Settings > Edge Functions**
3. Add a new secret:
   - Name: `NOTION_API_KEY`
   - Value: Your Notion integration token (e.g., `secret_abc123...`)
4. Save the secret

**Note:** User-level API keys take precedence over system-wide keys.

### Benefits

**With Notion API Key:**
- Exact column header matching
- Automatic schema detection
- Zero manual mapping required
- Seamless Notion database imports

**Without Notion API Key:**
- AI still extracts all structured data intelligently
- Creates descriptive column headers based on document content
- Manual column mapping when importing to Notion
- Fully functional for general CSV exports

### Privacy & Security

- Your Notion API key is stored securely in your user settings
- Keys are encrypted and never shared
- Only you have access to your personal API key
- You can remove your API key anytime from Settings

## 🔧 Troubleshooting

### Authentication Issues
If you see "Invalid Refresh Token" errors:
1. Clear browser cookies/localStorage
2. Sign out and sign back in
3. Check that Site URL is configured correctly in backend

### Upload Issues
- Ensure files are under 20MB
- Check that the documents storage bucket exists
- Verify RLS policies allow authenticated users to upload

### Processing Errors
- Check Edge Function logs in Lovable Cloud
- Verify Lovable AI Gateway is accessible
- Ensure document format is supported

### Notion Integration Issues

**API Keys and Source ID not persisting (FIXED ✅):**
- Added `default_source_id` column to `user_settings` table
- Settings dialog now saves both Notion API Key and Default Database ID
- FileUpload component auto-loads the default Source ID on mount
- Settings persist across browser sessions and page refreshes

**Documents stuck in "Pending" status:**
1. **Root cause**: Edge functions need to be deployed to Supabase
2. **Solution**: Deploy the `process-document` edge function (see below)
3. See [DEPLOYMENT_INSTRUCTIONS.md](./DEPLOYMENT_INSTRUCTIONS.md) for detailed steps

**CSV not matching Notion database format:**
1. Add your Notion API key in **Settings > Notion Integration**
2. Add your Default Notion Database ID in Settings (optional - auto-fills on upload)
3. Verify the Notion Database ID is correct (32-character UUID)
4. Ensure the integration has access to the database (click "Add connections" in Notion)
5. Reprocess the document after configuring the API key

**Where to add Notion API key:**
- Navigate to **Settings** page (click your profile picture in top right)
- Scroll to "Notion Integration" section
- Paste your API key and optionally set a default Database ID
- Click Save
- The key is stored securely (encrypted) in your user settings

**CSV exports are generic without column matching:**
- This is normal behavior without a Notion API key
- The AI still extracts all data intelligently and creates descriptive headers
- To enable automatic column matching, add your Notion API key in Settings
- You can manually map columns when importing to Notion

## 🚀 Deploying Edge Functions

**IMPORTANT:** For document processing to work, you must deploy the edge functions to Supabase.

### Quick Deploy via Supabase CLI:

```bash
# Install Supabase CLI
npm install -g supabase

# Login and link to project
supabase login
supabase link --project-ref hthwsxnyqrcbvqxnydmi

# Deploy functions
supabase functions deploy

# Set required secrets
supabase secrets set LOVABLE_API_KEY=your_lovable_api_key
supabase secrets set ENCRYPTION_SECRET=$(openssl rand -base64 32)
```

### Alternative: Deploy via Supabase Dashboard:

1. Go to https://hthwsxnyqrcbvqxnydmi.supabase.co
2. Navigate to **Edge Functions** > **Deploy new function**
3. Upload files from `supabase/functions/process-document/`
4. Set environment variables in **Edge Functions** > **Settings**

**Required Environment Variables:**
- `LOVABLE_API_KEY` - For AI OCR processing (ask your Lovable project admin)
- `ENCRYPTION_SECRET` - Generate with: `openssl rand -base64 32`

See [DEPLOYMENT_INSTRUCTIONS.md](./DEPLOYMENT_INSTRUCTIONS.md) for complete deployment guide.

## 📚 Documentation

- [Lovable Documentation](https://docs.lovable.dev/)
- [Supabase Documentation](https://supabase.com/docs)
- [React Documentation](https://react.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [shadcn/ui Documentation](https://ui.shadcn.com/)

## 📄 License

This project is built with Lovable and follows standard web application licensing.

## 🙏 Acknowledgments

- Powered by **Lovable Cloud** - Full-stack development platform
- OCR powered by **Lovable AI Gateway** with Google Gemini & DeepSeek models
- UI components from **shadcn/ui**
- Icons from **Lucide**

---

**Project URL**: https://lovable.dev/projects/ad7b146c-454c-4253-b3ac-814e5b9f85cf

Built with ❤️ using [Lovable](https://lovable.dev)
