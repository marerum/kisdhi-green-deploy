# AI Business Flow

An AI-powered application that helps business DX/improvement personnel transform interview content into structured business process diagrams. The system provides a three-screen workflow: project management, hearing input, and flow editing.

## Architecture

- **Frontend**: Next.js 14+ with TypeScript and Tailwind CSS
- **Backend**: FastAPI with Python 3.11+
- **Database**: Azure Database for MySQL
- **AI Integration**: OpenAI API for flow generation

## Project Structure

```
ai-business-flow/
├── frontend/                 # Next.js frontend application
│   ├── src/
│   │   ├── app/             # Next.js App Router pages
│   │   ├── components/      # React components
│   │   └── lib/             # Utility functions and API client
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   └── .env.local.template
├── backend/                  # FastAPI backend application
│   ├── app/
│   │   ├── main.py          # FastAPI application entry point
│   │   ├── config.py        # Configuration settings
│   │   ├── models/          # SQLAlchemy database models
│   │   ├── services/        # Business logic services
│   │   └── api/             # API route handlers
│   ├── requirements.txt
│   ├── pyproject.toml
│   └── .env.template
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- Python 3.11+
- MySQL database (Azure Database for MySQL recommended)
- OpenAI API key

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment template and configure:
   ```bash
   cp .env.local.template .env.local
   ```
   
   Edit `.env.local` and set:
   - `NEXT_PUBLIC_API_URL`: Backend API URL (default: http://localhost:8000)

4. Start the development server:
   ```bash
   npm run dev
   ```

   The frontend will be available at http://localhost:3000

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Copy environment template and configure:
   ```bash
   cp .env.template .env
   ```
   
   Edit `.env` and set:
   - `DATABASE_URL`: MySQL connection string
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `SECRET_KEY`: A secure secret key for the application

5. Start the development server:
   ```bash
   python app/main.py
   ```

   The backend API will be available at http://localhost:8000

## Features

### MVP Scope

- **Project Management**: Create and manage business process analysis projects
- **Hearing Input**: Input and store interview content with automatic saving
- **AI Flow Generation**: Convert hearing logs into structured 5-8 node business flows
- **Flow Editing**: Edit, reorder, and modify generated flow diagrams
- **Automatic Saving**: All changes are automatically persisted without save buttons

### Limitations

This MVP intentionally excludes:
- Sharing, commenting, or approval workflows
- Automatic improvement suggestions or scoring
- Branching or conditional logic in flows
- Organization management or permissions
- Estimation or requirements definition features

## Development

### Code Style

- **Frontend**: ESLint with Next.js configuration
- **Backend**: Follow PEP 8 Python style guidelines
- **TypeScript**: Strict mode enabled for type safety

### Testing

- **Frontend**: Jest and React Testing Library (to be implemented)
- **Backend**: pytest with async support and Hypothesis for property-based testing

### Environment Variables

All sensitive configuration is managed through environment variables:

**Frontend** (`.env.local`):
- `NEXT_PUBLIC_API_URL`: Backend API base URL

**Backend** (`.env`):
- `DATABASE_URL`: Complete MySQL connection string
- `OPENAI_API_KEY`: OpenAI API key for flow generation
- `SECRET_KEY`: Application secret key
- `ALLOWED_ORIGINS`: CORS allowed origins (comma-separated)

## API Documentation

Once the backend is running, visit http://localhost:8000/docs for interactive API documentation powered by FastAPI's automatic OpenAPI generation.

## Contributing

1. Follow the existing code structure and naming conventions
2. Ensure all environment variables are properly configured
3. Test changes locally before committing
4. Update documentation for any new features or configuration changes

## License

This project is proprietary software for internal business use.