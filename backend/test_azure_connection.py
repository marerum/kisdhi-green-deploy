#!/usr/bin/env python3
"""
Azure MySQL Connection Test Script
This script helps diagnose connection issues with Azure Database for MySQL.
"""

import os
import sys
import pymysql
import ssl
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_basic_connection():
    """Test basic connection without SSL"""
    print("=== Testing Basic Connection (No SSL) ===")
    
    try:
        connection = pymysql.connect(
            host=os.getenv('DATABASE_HOST'),
            port=int(os.getenv('DATABASE_PORT', 3306)),
            user=os.getenv('DATABASE_USER'),
            password=os.getenv('DATABASE_PASSWORD'),
            database=os.getenv('DATABASE_NAME'),
            connect_timeout=10,
            charset='utf8mb4'
        )
        
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1 as test")
            result = cursor.fetchone()
            print(f"✅ Basic connection successful: {result}")
        
        connection.close()
        return True
        
    except Exception as e:
        print(f"❌ Basic connection failed: {e}")
        return False

def test_ssl_connection():
    """Test SSL connection"""
    print("\n=== Testing SSL Connection ===")
    
    try:
        # Try with SSL but without certificate verification
        connection = pymysql.connect(
            host=os.getenv('DATABASE_HOST'),
            port=int(os.getenv('DATABASE_PORT', 3306)),
            user=os.getenv('DATABASE_USER'),
            password=os.getenv('DATABASE_PASSWORD'),
            database=os.getenv('DATABASE_NAME'),
            connect_timeout=10,
            charset='utf8mb4',
            ssl_disabled=False
        )
        
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1 as test")
            result = cursor.fetchone()
            print(f"✅ SSL connection successful: {result}")
        
        connection.close()
        return True
        
    except Exception as e:
        print(f"❌ SSL connection failed: {e}")
        return False

def test_ssl_with_certificate():
    """Test SSL connection with certificate"""
    print("\n=== Testing SSL Connection with Certificate ===")
    
    ssl_ca_path = os.getenv('DATABASE_SSL_CA', 'certs/DigiCertGlobalRootG2.crt.pem')
    if not os.path.exists(ssl_ca_path):
        print(f"❌ SSL certificate not found at: {ssl_ca_path}")
        return False
    
    try:
        connection = pymysql.connect(
            host=os.getenv('DATABASE_HOST'),
            port=int(os.getenv('DATABASE_PORT', 3306)),
            user=os.getenv('DATABASE_USER'),
            password=os.getenv('DATABASE_PASSWORD'),
            database=os.getenv('DATABASE_NAME'),
            connect_timeout=10,
            charset='utf8mb4',
            ssl={
                'ca': ssl_ca_path,
                'check_hostname': False,
                'verify_mode': ssl.CERT_REQUIRED
            }
        )
        
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1 as test")
            result = cursor.fetchone()
            print(f"✅ SSL connection with certificate successful: {result}")
        
        connection.close()
        return True
        
    except Exception as e:
        print(f"❌ SSL connection with certificate failed: {e}")
        return False

def test_network_connectivity():
    """Test basic network connectivity"""
    print("\n=== Testing Network Connectivity ===")
    
    import socket
    
    host = os.getenv('DATABASE_HOST')
    port = int(os.getenv('DATABASE_PORT', 3306))
    
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(10)
        result = sock.connect_ex((host, port))
        sock.close()
        
        if result == 0:
            print(f"✅ Network connectivity to {host}:{port} successful")
            return True
        else:
            print(f"❌ Network connectivity to {host}:{port} failed (error code: {result})")
            return False
            
    except Exception as e:
        print(f"❌ Network connectivity test failed: {e}")
        return False

def main():
    print("Azure MySQL Connection Diagnostic Tool")
    print("=" * 50)
    
    # Check environment variables
    required_vars = ['DATABASE_HOST', 'DATABASE_USER', 'DATABASE_PASSWORD', 'DATABASE_NAME']
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    
    if missing_vars:
        print(f"❌ Missing required environment variables: {', '.join(missing_vars)}")
        print("Please check your .env file")
        sys.exit(1)
    
    print(f"Database Host: {os.getenv('DATABASE_HOST')}")
    print(f"Database Port: {os.getenv('DATABASE_PORT', 3306)}")
    print(f"Database Name: {os.getenv('DATABASE_NAME')}")
    print(f"Database User: {os.getenv('DATABASE_USER')}")
    print(f"SSL Required: {os.getenv('DATABASE_SSL_REQUIRED', 'false')}")
    print(f"SSL Certificate: {os.getenv('DATABASE_SSL_CA', 'Not specified')}")
    
    # Run tests
    tests = [
        test_network_connectivity,
        test_basic_connection,
        test_ssl_connection,
        test_ssl_with_certificate
    ]
    
    results = []
    for test in tests:
        try:
            result = test()
            results.append(result)
        except Exception as e:
            print(f"❌ Test failed with exception: {e}")
            results.append(False)
    
    print("\n" + "=" * 50)
    print("SUMMARY:")
    test_names = ["Network Connectivity", "Basic Connection", "SSL Connection", "SSL with Certificate"]
    for i, (name, result) in enumerate(zip(test_names, results)):
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{name}: {status}")
    
    if not any(results):
        print("\n🚨 All tests failed. This suggests a network connectivity issue.")
        print("Please check:")
        print("1. Azure MySQL firewall rules allow your IP address")
        print("2. Azure MySQL server is running and accessible")
        print("3. Your internet connection is working")
        print("4. Database credentials are correct")
    elif results[0] and not any(results[1:]):
        print("\n🚨 Network is reachable but database connections fail.")
        print("Please check:")
        print("1. Database credentials (username/password)")
        print("2. Database name exists")
        print("3. User has proper permissions")

if __name__ == "__main__":
    main()