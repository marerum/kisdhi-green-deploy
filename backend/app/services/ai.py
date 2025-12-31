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
    async def generate_business_flow(self, hearing_logs: List[str]) -> Dict[str, Any]:
        """
        Generate a business flow from hearing logs with comprehensive error handling.
        
        Args:
            hearing_logs: List of hearing log content strings
            
        Returns:
            Dictionary containing actors, steps, and flow_nodes
            
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
                flow_data = self._parse_ai_response(ai_response)
                
                # Validate the flow meets requirements
                self._validate_flow_structure(flow_data)
                
                logger.info(f"Successfully generated flow with {len(flow_data['flow_nodes'])} nodes, {len(flow_data['actors'])} actors, {len(flow_data['steps'])} steps on attempt {attempt + 1}")
                return flow_data
                
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
                    "content": "あなたはビジネスプロセス整理の専門家です。インタビュー内容を構造化されたビジネスフロー手順に変換することが仕事です。必ず以下の形式でJSONを返してください：{\"actors\": [{\"name\": \"登場人物名\", \"role\": \"役割\"}], \"steps\": [{\"name\": \"ステップ名\", \"description\": \"説明\"}], \"flow_nodes\": [{\"text\": \"アクション\", \"order\": 0, \"actor\": \"登場人物名\", \"step\": \"ステップ名\"}]}。すべての説明は日本語で記述してください。"
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
以下のビジネスプロセスインタビュー内容に基づいて、構造化されたビジネスフローを作成してください。

インタビュー内容:
{hearing_content}

要件:
- 3-5人の登場人物（役割）を特定してください
- 3-8個のプロセスステップを作成してください
- 各ステップで各登場人物が行うアクションを明確にしてください
- ステップは論理的な時系列順序である必要があります
- 分岐、条件ロジック、並列プロセスは含めないでください
- 改善提案、評価、採点は含めないでください
- 既存のプロセスを改善するのではなく、整理することに焦点を当ててください
- すべての説明は日本語で記述してください

以下の正確な形式で有効なJSONで応答してください:
{{
  "actors": [
    {{"name": "営業担当", "role": "商品提案と顧客対応"}},
    {{"name": "顧客", "role": "商品検討と購入決定"}},
    {{"name": "管理者", "role": "注文確認と発送手続き"}}
  ],
  "steps": [
    {{"name": "商品提案", "description": "営業担当が顧客に商品を提案する"}},
    {{"name": "検討・決定", "description": "顧客が商品を検討し購入を決定する"}},
    {{"name": "注文処理", "description": "管理者が注文を確認し発送手続きを行う"}}
  ],
  "flow_nodes": [
    {{"text": "顧客に商品を提案する", "order": 0, "actor": "営業担当", "step": "商品提案"}},
    {{"text": "商品を検討する", "order": 1, "actor": "顧客", "step": "検討・決定"}},
    {{"text": "購入を決定する", "order": 2, "actor": "顧客", "step": "検討・決定"}},
    {{"text": "注文を確認する", "order": 3, "actor": "管理者", "step": "注文処理"}},
    {{"text": "発送手続きを行う", "order": 4, "actor": "管理者", "step": "注文処理"}}
  ]
}}

応答は有効なJSONのみで、追加のテキストや説明は含めないでください。
"""
    
    def _parse_ai_response(self, response: str) -> Dict[str, Any]:
        """
        Parse and validate AI response with enhanced error handling.
        
        Args:
            response: Raw AI response string
            
        Returns:
            Dictionary containing actors, steps, and flow_nodes
            
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
            
            # Validate required fields
            required_fields = ["actors", "steps", "flow_nodes"]
            for field in required_fields:
                if field not in parsed_data:
                    raise ValidationError(
                        f"AI response missing '{field}' field",
                        "missing_field",
                        {"available_fields": list(parsed_data.keys())}
                    )
            
            # Validate actors
            actors = parsed_data["actors"]
            if not isinstance(actors, list) or len(actors) < 3 or len(actors) > 5:
                raise ValidationError(
                    "Actors must be a list with 3-5 items",
                    "actors_count",
                    {"actual_count": len(actors) if isinstance(actors, list) else "not_list"}
                )
            
            for i, actor in enumerate(actors):
                if not isinstance(actor, dict) or "name" not in actor or "role" not in actor:
                    raise ValidationError(
                        f"Actor {i} must have 'name' and 'role' fields",
                        f"actor_{i}_format"
                    )
            
            # Validate steps
            steps = parsed_data["steps"]
            if not isinstance(steps, list) or len(steps) < 3 or len(steps) > 10:
                raise ValidationError(
                    "Steps must be a list with 3-10 items",
                    "steps_count",
                    {"actual_count": len(steps) if isinstance(steps, list) else "not_list"}
                )
            
            for i, step in enumerate(steps):
                if not isinstance(step, dict) or "name" not in step or "description" not in step:
                    raise ValidationError(
                        f"Step {i} must have 'name' and 'description' fields",
                        f"step_{i}_format"
                    )
            
            # Extract flow nodes
            flow_nodes = parsed_data["flow_nodes"]
            
            if not isinstance(flow_nodes, list):
                raise ValidationError(
                    "'flow_nodes' must be a list",
                    "invalid_type",
                    {"actual_type": type(flow_nodes).__name__}
                )
            
            # Validate each node
            actor_names = [actor["name"] for actor in actors]
            step_names = [step["name"] for step in steps]
            
            for i, node in enumerate(flow_nodes):
                if not isinstance(node, dict):
                    raise ValidationError(
                        f"Flow node {i} must be a dictionary",
                        f"node_{i}_type",
                        {"actual_type": type(node).__name__}
                    )
                
                required_node_fields = ["text", "order", "actor", "step"]
                for field in required_node_fields:
                    if field not in node:
                        raise ValidationError(
                            f"Flow node {i} missing required field '{field}'",
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
                
                if node["actor"] not in actor_names:
                    raise ValidationError(
                        f"Flow node {i} 'actor' must be one of the defined actors",
                        f"node_{i}_actor",
                        {"actor_value": node.get("actor"), "valid_actors": actor_names}
                    )
                
                if node["step"] not in step_names:
                    raise ValidationError(
                        f"Flow node {i} 'step' must be one of the defined steps",
                        f"node_{i}_step",
                        {"step_value": node.get("step"), "valid_steps": step_names}
                    )
            
            # Return the complete parsed data including actors and steps
            return {
                "actors": actors,
                "steps": steps,
                "flow_nodes": flow_nodes
            }
            
        except ValidationError:
            raise
        except Exception as e:
            logger.error(f"Unexpected error parsing AI response: {str(e)}")
            raise ValidationError(
                f"Failed to parse AI response: {str(e)}",
                "parse_error",
                {"error_details": str(e)}
            )
    
    def _validate_flow_structure(self, flow_data: Dict[str, Any]) -> None:
        """
        Validate that the flow structure meets requirements.
        
        Args:
            flow_data: Dictionary containing actors, steps, and flow_nodes
            
        Raises:
            ValidationError: If flow structure is invalid
        """
        actors = flow_data["actors"]
        steps = flow_data["steps"]
        flow_nodes = flow_data["flow_nodes"]
        
        # Check actor count (3-5 actors)
        if len(actors) < 3 or len(actors) > 5:
            raise ValidationError(
                f"Flow must contain 3-5 actors, got {len(actors)}",
                "actor_count",
                {"actual_count": len(actors), "required_range": "3-5"}
            )
        
        # Check step count (3-10 steps)
        if len(steps) < 3 or len(steps) > 10:
            raise ValidationError(
                f"Flow must contain 3-10 steps, got {len(steps)}",
                "step_count",
                {"actual_count": len(steps), "required_range": "3-10"}
            )
        
        # Check node count
        if len(flow_nodes) < 3 or len(flow_nodes) > 30:  # Allow more nodes since we have multiple actors
            raise ValidationError(
                f"Flow must contain 3-30 nodes, got {len(flow_nodes)}",
                "node_count",
                {"actual_count": len(flow_nodes), "required_range": "3-30"}
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