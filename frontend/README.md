# AI Business Flow - Frontend

Next.js frontend application for the AI Business Flow system.

## Technology Stack

- **Next.js 14+** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **React 18** for UI components

## Development

### Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy and configure environment variables:
   ```bash
   cp .env.local.template .env.local
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

### Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles
├── components/            # React components (to be implemented)
│   ├── common/           # Shared components
│   ├── project/          # Project management components
│   ├── hearing/          # Hearing input components
│   └── flow/             # Flow editing components
└── lib/                  # Utilities and API client (to be implemented)
    └── api.ts            # Centralized API client
```

## Environment Variables

Create `.env.local` from the template and configure:

- `NEXT_PUBLIC_API_URL` - Backend API URL (default: http://localhost:8000)
- `NODE_ENV` - Environment (development/production)

## Styling

This project uses Tailwind CSS for styling with a focus on:
- Clean, minimal design
- Card-based layouts
- Ample whitespace
- Consistent spacing and typography
- Responsive design principles