#!/usr/bin/env python3
"""
SQLAlchemy Connection Test for Azure MySQL
"""

import os
import ssl
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_sqlalchemy_connection():
    """Test SQLAlchemy connection with various SSL configurations"""
    
    # Database connection parameters
    host = os.getenv('DATABASE_HOST')
    port = int(os.getenv('DATABASE_PORT', 3306))
    user = os.getenv('DATABASE_USER')
    password = os.getenv('DATABASE_PASSWORD')
    database = os.getenv('DATABASE_NAME')
    ssl_ca = os.getenv('DATABASE_SSL_CA', 'certs/DigiCertGlobalRootG2.crt.pem')
    
    print(f"Testing SQLAlchemy connection to {host}:{port}/{database}")
    
    # Test 1: Basic URL with SSL disabled=false parameter
    print("\n=== Test 1: URL with ssl_disabled=false ===")
    try:
        url1 = f"mysql+pymysql://{user}:{password}@{host}:{port}/{database}?ssl_disabled=false"
        engine1 = create_engine(
            url1,
            connect_args={
                "connect_timeout": 30,
                "charset": "utf8mb4"
            }
        )
        
        with engine1.connect() as conn:
            result = conn.execute(text("SELECT 1 as test"))
            print(f"✅ Success: {result.fetchone()}")
        engine1.dispose()
        
    except Exception as e:
        print(f"❌ Failed: {e}")
    
    # Test 2: SSL with certificate in connect_args
    print("\n=== Test 2: SSL with certificate in connect_args ===")
    try:
        url2 = f"mysql+pymysql://{user}:{password}@{host}:{port}/{database}"
        
        if os.path.exists(ssl_ca):
            engine2 = create_engine(
                url2,
                connect_args={
                    "connect_timeout": 30,
                    "charset": "utf8mb4",
                    "ssl": {
                        "ca": ssl_ca,
                        "check_hostname": False,
                        "verify_mode": ssl.CERT_REQUIRED
                    }
                }
            )
            
            with engine2.connect() as conn:
                result = conn.execute(text("SELECT 1 as test"))
                print(f"✅ Success: {result.fetchone()}")
            engine2.dispose()
        else:
            print(f"❌ SSL certificate not found: {ssl_ca}")
        
    except Exception as e:
        print(f"❌ Failed: {e}")
    
    # Test 3: SSL disabled=false in connect_args
    print("\n=== Test 3: ssl_disabled=false in connect_args ===")
    try:
        url3 = f"mysql+pymysql://{user}:{password}@{host}:{port}/{database}"
        engine3 = create_engine(
            url3,
            connect_args={
                "connect_timeout": 30,
                "charset": "utf8mb4",
                "ssl_disabled": False
            }
        )
        
        with engine3.connect() as conn:
            result = conn.execute(text("SELECT 1 as test"))
            print(f"✅ Success: {result.fetchone()}")
        engine3.dispose()
        
    except Exception as e:
        print(f"❌ Failed: {e}")

if __name__ == "__main__":
    test_sqlalchemy_connection()