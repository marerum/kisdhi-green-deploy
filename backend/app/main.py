from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import os
import logging
from dotenv import load_dotenv

from .database import init_db, close_db, test_db_connection
from .config import settings
from .routers import projects, hearing, flow
from .services.ai import ai_service
from .exceptions import BusinessFlowException, create_http_exception, get_user_friendly_message

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting AI Business Flow Backend...")
    
    try:
        # Log safe configuration summary (no sensitive data)
        config_summary = settings.get_safe_config_summary()
        logger.info(f"Configuration loaded: {config_summary}")
        
        # Test database connection
        if not test_db_connection():
            error_msg = "Failed to connect to database. Please check your DATABASE_URL configuration."
            logger.error(error_msg)
            raise RuntimeError(error_msg)
        
        # Initialize database tables
        await init_db()
        logger.info("Database initialized successfully")
        
        # Initialize AI service
        await ai_service.initialize()
        logger.info("AI service initialized successfully")
        
    except Exception as e:
        logger.error(f"Failed to start application: {str(e)}")
        raise
    
    yield
    
    # Shutdown
    logger.info("Shutting down AI Business Flow Backend...")
    try:
        await close_db()
        logger.info("Database connections closed")
    except Exception as e:
        logger.error(f"Error during shutdown: {str(e)}")

app = FastAPI(
    title="AI Business Flow API",
    description="Backend API for transforming business process interviews into structured flow diagrams",
    version="0.1.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global exception handler for business exceptions
@app.exception_handler(BusinessFlowException)
async def business_exception_handler(request: Request, exc: BusinessFlowException):
    """Handle business exceptions with structured error responses."""
    logger.error(f"Business exception in {request.method} {request.url}: {exc.message}")
    http_exc = create_http_exception(exc)
    
    return JSONResponse(
        status_code=http_exc.status_code,
        content=http_exc.detail
    )

# Global exception handler for HTTP exceptions
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions with consistent error format."""
    logger.warning(f"HTTP exception in {request.method} {request.url}: {exc.detail}")
    
    # If detail is already in our error format, return as-is
    if isinstance(exc.detail, dict) and "error" in exc.detail:
        return JSONResponse(
            status_code=exc.status_code,
            content=exc.detail
        )
    
    # Otherwise, wrap in our error format
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": f"HTTP_{exc.status_code}",
                "message": str(exc.detail),
                "details": {}
            }
        }
    )

# Global exception handler for unhandled exceptions
@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle unexpected exceptions with safe error responses."""
    logger.error(f"Unhandled exception in {request.method} {request.url}: {str(exc)}", exc_info=True)
    
    # Don't expose internal error details in production
    if settings.environment == "production":
        error_message = "An internal server error occurred"
    else:
        error_message = f"Internal server error: {str(exc)}"
    
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": error_message,
                "details": {
                    "environment": settings.environment,
                    "request_id": getattr(request.state, 'request_id', None)
                }
            }
        }
    )

# Request ID middleware for better error tracking
@app.middleware("http")
async def add_request_id(request: Request, call_next):
    """Add request ID for better error tracking."""
    import uuid
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response

# Include routers
app.include_router(projects.router)
app.include_router(hearing.router)
app.include_router(flow.router)

# Import and include auth router
from .routers import auth
app.include_router(auth.router)

@app.get("/")
async def root():
    return {"message": "AI Business Flow API", "version": "0.1.0"}

@app.get("/health")
async def health_check():
    """Health check endpoint with detailed status."""
    try:
        # Test database connection
        db_healthy = test_db_connection()
        
        # Test AI service
        ai_healthy = ai_service.initialized
        
        overall_status = "healthy" if db_healthy and ai_healthy else "unhealthy"
        
        return {
            "status": overall_status,
            "environment": settings.environment,
            "services": {
                "database": "healthy" if db_healthy else "unhealthy",
                "ai_service": "healthy" if ai_healthy else "unhealthy"
            }
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "environment": settings.environment,
                "error": str(e)
            }
        )

if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level="info"
    )