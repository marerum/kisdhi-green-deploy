#!/usr/bin/env python3
"""
Direct SQLAlchemy test using the exact same parameters as the successful PyMySQL test
"""

import os
import ssl
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_direct_connection():
    """Test using the exact same parameters that worked in the diagnostic script"""
    
    host = os.getenv('DATABASE_HOST')
    port = int(os.getenv('DATABASE_PORT', 3306))
    user = os.getenv('DATABASE_USER')
    password = os.getenv('DATABASE_PASSWORD')
    database = os.getenv('DATABASE_NAME')
    ssl_ca = os.getenv('DATABASE_SSL_CA', 'certs/DigiCertGlobalRootG2.crt.pem')
    
    print(f"Testing direct SQLAlchemy connection...")
    
    # Use the exact same configuration that worked in the diagnostic script
    try:
        url = f"mysql+pymysql://{user}:{password}@{host}:{port}/{database}"
        
        # Minimal engine configuration - no pooling
        engine = create_engine(
            url,
            poolclass=None,  # Disable connection pooling
            connect_args={
                "connect_timeout": 10,  # Same as diagnostic script
                "charset": "utf8mb4",
                "ssl": {
                    "ca": ssl_ca,
                    "check_hostname": False,
                    "verify_mode": ssl.CERT_REQUIRED
                }
            }
        )
        
        print("Engine created, testing connection...")
        
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1 as test"))
            row = result.fetchone()
            print(f"✅ Success: {row}")
        
        engine.dispose()
        return True
        
    except Exception as e:
        print(f"❌ Failed: {e}")
        return False

if __name__ == "__main__":
    success = test_direct_connection()
    if success:
        print("\n🎉 SQLAlchemy connection successful!")
        print("The issue might be with connection pooling or other engine settings.")
    else:
        print("\n❌ SQLAlchemy connection failed.")
        print("There might be a fundamental issue with the SQLAlchemy configuration.")