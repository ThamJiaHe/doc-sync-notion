# AI Document Processor

An intelligent document processing application that extracts information from documents using AI-powered OCR and exports data to CSV format. Built with modern web technologies and powered by Lovable Cloud.

## 🚀 Features

- **AI-Powered OCR**: Extract text and data from documents using advanced OCR technology
- **Batch Processing**: Upload and process multiple documents simultaneously
- **CSV Export**: Export extracted data to clean, structured CSV files
- **Document Management**: Organized dashboard with search, filters, and status tracking
- **User Authentication**: Secure email/password authentication with social login support
- **Real-time Status**: Track document processing status in real-time
- **Responsive Design**: Beautiful UI that works on desktop, tablet, and mobile devices
- **Notion Integration**: Support for Notion MCP (Model Context Protocol) for seamless workflow integration

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

The project uses Lovable Cloud, which automatically configures:
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anon key
- `VITE_SUPABASE_PROJECT_ID` - Supabase project ID

These are auto-generated and managed by Lovable Cloud.

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
- **extracted_data** - Stores OCR results (JSON, Markdown, CSV)

### Storage Buckets
- **documents** - Stores uploaded document files

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

The project supports **Notion MCP (Model Context Protocol)** for:
- Importing/merging CSV data into Notion databases
- Column mapping between CSV and Notion properties
- Automatic or manual record matching
- Batch operations and conflict resolution

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
