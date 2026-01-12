import os
import base64
import httpx
import json
from typing import Optional

class OpenRouterClient:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(OpenRouterClient, cls).__new__(cls)
            cls._instance.api_key = os.getenv("OPENROUTER_API_KEY")
            cls._instance.base_url = "https://openrouter.ai/api/v1"
            cls._instance.site_url = os.getenv("SITE_URL", "http://localhost:3000")
            cls._instance.site_name = os.getenv("SITE_NAME", "Autoray")
        return cls._instance

    async def describe_image(self, image_bytes: bytes, content_type: str, model: str = "openai/gpt-5-image-mini") -> Optional[str]:
        if not self.api_key:
            print("OPENROUTER_API_KEY not set")
            return None

        base64_image = base64.b64encode(image_bytes).decode('utf-8')
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "HTTP-Referer": self.site_url,
                        "X-Title": self.site_name,
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": model,
                        "messages": [
                            {
                                "role": "user",
                                "content": [
                                    {
                                        "type": "text",
                                        "text": "Describe this image in detail for a media asset management system. Focus on subject, composition, and mood."
                                    },
                                    {
                                        "type": "image_url",
                                        "image_url": {
                                            "url": f"data:{content_type};base64,{base64_image}"
                                        }
                                    }
                                ]
                            }
                        ]
                    },
                    timeout=60.0
                )
                response.raise_for_status()
                data = response.json()
                return data['choices'][0]['message']['content']
            except Exception as e:
                print(f"OpenRouter API error: {e}")
                if 'response' in locals():
                    print(f"Response: {response.text}")
                return None

def get_openrouter_client():
    return OpenRouterClient()
