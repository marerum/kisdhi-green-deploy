"""
AI Service for generating business flow diagrams from hearing logs.
"""

import json
import logging
import asyncio
from typing import List, Dict, Any, Optional
from openai import AsyncOpenAI, APITimeoutError, APIConnectionError, RateLimitError, AuthenticationError
from ..config import settings
from ..exceptions import AIServiceError, ConfigurationError, ValidationError
from ..utils.error_handlers import handle_ai_service_errors

logger = logging.getLogger(__name__)

class AIService:
    """Service for AI-powered business flow generation."""
    
    def __init__(self):
        self.client: Optional[AsyncOpenAI] = None
        self.initialized = False
        self.max_retries = 3
        self.base_timeout = 30.0
        self.max_timeout = 90.0  # Increased to match frontend timeout
    
    async def initialize(self):
        """Initialize the OpenAI client during application startup."""
        if not settings.openai_api_key:
            raise ConfigurationError(
                "OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.",
                "OPENAI_API_KEY"
            )
        
        try:
            self.client = AsyncOpenAI(
                api_key=settings.openai_api_key,
                timeout=self.base_timeout,
                max_retries=0  # We handle retries manually for better control
            )
            
            # Test the connection with a simple request
            await self._test_connection()
            
            self.initialized = True
            logger.info("AI Service initialized successfully")
            
        except AuthenticationError as e:
            raise ConfigurationError(
                f"OpenAI API authentication failed: {str(e)}",
                "OPENAI_API_KEY",
                {"auth_error": str(e)}
            )
        except Exception as e:
            raise ConfigurationError(
                f"Failed to initialize AI service: {str(e)}",
                "AI_SERVICE_INIT",
                {"init_error": str(e)}
            )
    
    async def _test_connection(self):
        """Test the OpenAI API connection."""
        try:
            # Make a minimal request to test the connection
            await self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": "test"}],
                max_tokens=1,
                timeout=10.0
            )
        except Exception as e:
            logger.error(f"AI service connection test failed: {str(e)}")
            raise
    
    @handle_ai_service_errors("business flow generation")
    async def generate_business_flow(self, hearing_logs: List[str]) -> List[Dict[str, Any]]:
        """
        Generate a business flow from hearing logs with comprehensive error handling.
        
        Args:
            hearing_logs: List of hearing log content strings
            
        Returns:
            List of flow nodes with text and order information
            
        Raises:
            ValidationError: If service not initialized or invalid input
            AIServiceError: If AI generation fails
        """
        if not self.initialized or not self.client:
            raise ValidationError("AI Service not initialized")
        
        if not hearing_logs:
            raise ValidationError("No hearing logs provided")
        
        if not all(isinstance(log, str) and log.strip() for log in hearing_logs):
            raise ValidationError("All hearing logs must be non-empty strings")
        
        # Combine all hearing logs into a single context
        combined_content = "\n\n".join(hearing_logs)
        
        # Validate content length
        if len(combined_content) > 10000:  # Reasonable limit
            logger.warning(f"Hearing content is very long ({len(combined_content)} chars), truncating")
            combined_content = combined_content[:10000] + "..."
        
        # Generate the prompt
        prompt = self._format_prompt(combined_content)
        
        # Attempt generation with retries and exponential backoff
        last_error = None
        for attempt in range(self.max_retries):
            try:
                timeout = min(self.base_timeout * (2 ** attempt), self.max_timeout)
                logger.info(f"AI generation attempt {attempt + 1}/{self.max_retries} with timeout {timeout}s")
                
                # Call OpenAI API with timeout
                response = await asyncio.wait_for(
                    self._make_openai_request(prompt),
                    timeout=timeout
                )
                
                # Extract and parse the response
                ai_response = response.choices[0].message.content
                if not ai_response:
                    raise AIServiceError("Empty response from AI service", "empty_response")
                
                # Parse and validate the response
                flow_nodes = self._parse_ai_response(ai_response)
                
                # Validate the flow meets requirements
                self._validate_flow_structure(flow_nodes)
                
                logger.info(f"Successfully generated flow with {len(flow_nodes)} nodes on attempt {attempt + 1}")
                return flow_nodes
                
            except asyncio.TimeoutError:
                last_error = AIServiceError(
                    f"AI request timed out after {timeout} seconds (attempt {attempt + 1})",
                    "timeout"
                )
                logger.warning(f"AI request timeout on attempt {attempt + 1}")
                
            except RateLimitError as e:
                last_error = AIServiceError(
                    f"AI service rate limit exceeded: {str(e)}",
                    "rate_limit",
                    {"rate_limit_error": str(e)}
                )
                logger.warning(f"Rate limit hit on attempt {attempt + 1}, waiting before retry")
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(2 ** attempt)  # Exponential backoff
                
            except APIConnectionError as e:
                last_error = AIServiceError(
                    f"AI service connection error: {str(e)}",
                    "connection",
                    {"connection_error": str(e)}
                )
                logger.warning(f"Connection error on attempt {attempt + 1}")
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(1 * (attempt + 1))  # Linear backoff for connection issues
                
            except (ValidationError, AIServiceError):
                # Don't retry validation or AI service errors
                raise
                
            except Exception as e:
                last_error = AIServiceError(
                    f"Unexpected error during AI generation: {str(e)}",
                    "unexpected",
                    {"unexpected_error": str(e)}
                )
                logger.error(f"Unexpected error on attempt {attempt + 1}: {str(e)}")
        
        # All retries failed
        logger.error(f"AI flow generation failed after {self.max_retries} attempts")
        raise last_error or AIServiceError("AI flow generation failed after all retry attempts", "retry_exhausted")
    
    async def _make_openai_request(self, prompt: str):
        """Make the actual OpenAI API request."""
        return await self.client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {
                    "role": "system",
                    "content": "あなたはビジネスプロセス整理の専門家です。インタビュー内容を構造化されたビジネスフロー手順に変換することが仕事です。分岐、改善提案、評価、採点を含まない5-8個の線形プロセス手順を含む有効なJSONのみで応答してください。すべてのステップ説明は日本語で記述してください。"
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.3,
            max_tokens=1000
        )
    
    def _format_prompt(self, hearing_content: str) -> str:
        """
        Format the prompt for AI flow generation.
        
        Args:
            hearing_content: Combined hearing log content
            
        Returns:
            Formatted prompt string
        """
        return f"""
以下のビジネスプロセスインタビュー内容に基づいて、5-8個の線形ステップからなる構造化されたビジネスフローを作成してください。

インタビュー内容:
{hearing_content}

要件:
- 正確に5-8個のプロセスステップを作成してください
- 各ステップは明確で実行可能なビジネスプロセスステップである必要があります
- ステップは論理的な時系列順序である必要があります
- 分岐、条件ロジック、並列プロセスは含めないでください
- 改善提案、評価、採点は含めないでください
- 既存のプロセスを改善するのではなく、整理することに焦点を当ててください
- すべてのステップ説明は日本語で記述してください

以下の正確な形式で有効なJSONで応答してください:
{{
  "flow_nodes": [
    {{"text": "ステップの説明", "order": 0}},
    {{"text": "ステップの説明", "order": 1}},
    ...
  ]
}}

応答は有効なJSONのみで、追加のテキストや説明は含めないでください。
"""
    
    def _parse_ai_response(self, response: str) -> List[Dict[str, Any]]:
        """
        Parse and validate AI response with enhanced error handling.
        
        Args:
            response: Raw AI response string
            
        Returns:
            List of flow node dictionaries
            
        Raises:
            ValidationError: If response format is invalid
        """
        try:
            # Clean the response - remove any markdown formatting
            cleaned_response = response.strip()
            if cleaned_response.startswith("```json"):
                cleaned_response = cleaned_response[7:]
            if cleaned_response.endswith("```"):
                cleaned_response = cleaned_response[:-3]
            cleaned_response = cleaned_response.strip()
            
            # Parse JSON
            try:
                parsed_data = json.loads(cleaned_response)
            except json.JSONDecodeError as e:
                logger.error(f"JSON decode error: {str(e)}")
                logger.error(f"Raw response: {response[:500]}...")
                raise ValidationError(
                    f"AI response is not valid JSON: {str(e)}",
                    "json_format",
                    {"raw_response": response[:200]}
                )
            
            # Extract flow nodes
            if "flow_nodes" not in parsed_data:
                raise ValidationError(
                    "AI response missing 'flow_nodes' field",
                    "missing_field",
                    {"available_fields": list(parsed_data.keys())}
                )
            
            flow_nodes = parsed_data["flow_nodes"]
            
            if not isinstance(flow_nodes, list):
                raise ValidationError(
                    "'flow_nodes' must be a list",
                    "invalid_type",
                    {"actual_type": type(flow_nodes).__name__}
                )
            
            # Validate each node
            for i, node in enumerate(flow_nodes):
                if not isinstance(node, dict):
                    raise ValidationError(
                        f"Flow node {i} must be a dictionary",
                        f"node_{i}_type",
                        {"actual_type": type(node).__name__}
                    )
                
                if "text" not in node or "order" not in node:
                    raise ValidationError(
                        f"Flow node {i} missing required fields 'text' or 'order'",
                        f"node_{i}_fields",
                        {"available_fields": list(node.keys())}
                    )
                
                if not isinstance(node["text"], str) or not node["text"].strip():
                    raise ValidationError(
                        f"Flow node {i} 'text' must be a non-empty string",
                        f"node_{i}_text",
                        {"text_value": node.get("text")}
                    )
                
                if not isinstance(node["order"], int) or node["order"] < 0:
                    raise ValidationError(
                        f"Flow node {i} 'order' must be a non-negative integer",
                        f"node_{i}_order",
                        {"order_value": node.get("order")}
                    )
            
            return flow_nodes
            
        except ValidationError:
            raise
        except Exception as e:
            logger.error(f"Unexpected error parsing AI response: {str(e)}")
            raise ValidationError(
                f"Failed to parse AI response: {str(e)}",
                "parse_error",
                {"error_details": str(e)}
            )
    
    def _validate_flow_structure(self, flow_nodes: List[Dict[str, Any]]) -> None:
        """
        Validate that the flow structure meets requirements.
        
        Args:
            flow_nodes: List of flow node dictionaries
            
        Raises:
            ValidationError: If flow structure is invalid
        """
        # Check node count (5-8 nodes)
        if len(flow_nodes) < 5 or len(flow_nodes) > 8:
            raise ValidationError(
                f"Flow must contain 5-8 nodes, got {len(flow_nodes)}",
                "node_count",
                {"actual_count": len(flow_nodes), "required_range": "5-8"}
            )
        
        # Check for sequential ordering
        orders = [node["order"] for node in flow_nodes]
        expected_orders = list(range(len(flow_nodes)))
        
        if sorted(orders) != expected_orders:
            raise ValidationError(
                "Flow nodes must have sequential ordering starting from 0",
                "node_ordering",
                {"actual_orders": orders, "expected_orders": expected_orders}
            )
        
        # Check for duplicate orders
        if len(set(orders)) != len(orders):
            duplicates = [order for order in set(orders) if orders.count(order) > 1]
            raise ValidationError(
                f"Flow nodes have duplicate order values: {duplicates}",
                "duplicate_orders",
                {"duplicate_orders": duplicates}
            )
        
        # Check for prohibited content (improvement suggestions, scoring, etc.)
        prohibited_terms = [
            "improve", "better", "optimize", "score", "rating", "evaluation",
            "recommend", "suggest", "should", "could", "might", "enhancement"
        ]
        
        for i, node in enumerate(flow_nodes):
            text_lower = node["text"].lower()
            found_terms = [term for term in prohibited_terms if term in text_lower]
            if found_terms:
                logger.warning(f"Flow node {i} contains potentially prohibited terms {found_terms}: {node['text']}")
                # Note: We log a warning but don't fail, as some terms might be legitimate in context

# Global AI service instance
ai_service = AIService()