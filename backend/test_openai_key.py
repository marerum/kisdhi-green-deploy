#!/usr/bin/env python3
"""
Simple script to test OpenAI API key validity
"""

import asyncio
import httpx
from app.config import settings

async def test_openai_key():
    """Test if the OpenAI API key is valid"""
    try:
        print("Testing OpenAI API key...")
        print(f"API key starts with: {settings.openai_api_key[:10]}..." if settings.openai_api_key else "No API key found")
        
        if not settings.openai_api_key:
            print("❌ OpenAI API key not configured in .env file")
            return False
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            url = "https://api.openai.com/v1/models"
            headers = {
                "Authorization": f"Bearer {settings.openai_api_key}"
            }
            
            print(f"Making request to: {url}")
            resp = await client.get(url, headers=headers)
            
            print(f"Response status: {resp.status_code}")
            
            if resp.status_code == 200:
                data = resp.json()
                models = [model['id'] for model in data.get('data', []) if 'whisper' in model['id']]
                print(f"✅ OpenAI API key is valid!")
                print(f"Available Whisper models: {models}")
                return True
            elif resp.status_code == 401:
                print("❌ OpenAI API key is invalid or expired")
                return False
            else:
                print(f"❌ Unexpected response: {resp.status_code}")
                try:
                    error_data = resp.json()
                    print(f"Error details: {error_data}")
                except:
                    print(f"Error text: {resp.text}")
                return False
                
    except Exception as e:
        print(f"❌ Error testing OpenAI API: {e}")
        return False

if __name__ == "__main__":
    asyncio.run(test_openai_key())