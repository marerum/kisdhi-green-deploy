# AI Business Flow - Backend

FastAPI backend application for the AI Business Flow system.

## Technology Stack

- **FastAPI** for high-performance async API
- **SQLAlchemy** for database ORM
- **Pydantic** for data validation
- **OpenAI API** for flow generation
- **MySQL** for data persistence

## Development

### Getting Started

1. Create and activate virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Copy and configure environment variables:
   ```bash
   cp .env.template .env
   ```

4. Start the development server:
   ```bash
   python app/main.py
   ```

### Project Structure

```
app/
├── main.py               # FastAPI application entry point
├── config.py             # Configuration settings
├── models/               # SQLAlchemy database models (to be implemented)
├── services/             # Business logic services (to be implemented)
├── api/                  # API route handlers (to be implemented)
└── __init__.py
```

## Environment Variables

Create `.env` from the template and configure:

### Required Variables
- `DATABASE_URL` - Complete MySQL connection string
- `OPENAI_API_KEY` - OpenAI API key for flow generation

### Optional Variables
- `DATABASE_HOST` - Database host (default: localhost)
- `DATABASE_PORT` - Database port (default: 3306)
- `DATABASE_NAME` - Database name (default: ai_business_flow)
- `DATABASE_USER` - Database username
- `DATABASE_PASSWORD` - Database password
- `ENVIRONMENT` - Environment (default: development)
- `DEBUG` - Debug mode (default: false)
- `SECRET_KEY` - Application secret key
- `ALLOWED_ORIGINS` - CORS origins (default: http://localhost:3000)
- `HOST` - Server host (default: 0.0.0.0)
- `PORT` - Server port (default: 8000)

## API Documentation

When running, visit:
- http://localhost:8000/docs - Interactive API documentation (Swagger UI)
- http://localhost:8000/redoc - Alternative API documentation (ReDoc)

## Database

The application uses MySQL with SQLAlchemy ORM. Database models and migrations will be implemented in subsequent tasks.

## AI Integration

The system integrates with OpenAI's API for business flow generation. The AI service is configured during application startup and validates the API key on initialization.