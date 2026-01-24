"""
AI Service for generating business flow diagrams from hearing logs.

2026/01/20更新: Claude API統合を追加
- ClaudeServiceクラスを追加してリアルタイムフロー生成をサポート
- 増分フロー生成機能を実装
"""

import json
import logging
import asyncio
from typing import List, Dict, Any, Optional
from openai import AsyncOpenAI, APITimeoutError, APIConnectionError, RateLimitError, AuthenticationError
# 2026/01/20追加: Anthropic Claude SDKをインポート
from anthropic import AsyncAnthropic, APIError, APIConnectionError as AnthropicConnectionError
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
            
            # Test the connection with a simple request (skip for dummy keys)
            if not settings.openai_api_key.startswith('sk-dummy'):
                await self._test_connection()
            else:
                logger.warning("Using dummy API key - skipping connection test")
            
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
                    "content": "あなたはビジネスプロセス整理の専門家です。インタビュー内容を構造化されたビジネスフロー手順に変換することが仕事です。条件分岐や並列処理を適切に識別し、ノード間の接続（エッジ）を明示してください。必ず以下の形式でJSONを返してください：{\"actors\": [{\"name\": \"登場人物名\", \"role\": \"役割\"}], \"steps\": [{\"name\": \"ステップ名\", \"description\": \"説明\"}], \"flow_nodes\": [{\"text\": \"アクション\", \"order\": 0, \"actor\": \"登場人物名\", \"step\": \"ステップ名\"}], \"edges\": [{\"from_order\": 0, \"to_order\": 1, \"condition\": \"条件（オプション）\"}]}。すべての説明は日本語で記述してください。"
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
- 3-10個のプロセスステップを作成してください
- 各ステップで各登場人物が行うアクションを明確にしてください
- **条件分岐がある場合は、それを明示的に表現してください**（例：承認/却下、成功/失敗、メール/電話など）
- **並列プロセスがある場合は、複数のフローパスを作成してください**
- ステップは論理的な順序である必要があります
- **ノード間の接続（エッジ）を "edges" 配列で明示してください**
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
    {{"text": "購入するか判断する", "order": 2, "actor": "顧客", "step": "検討・決定"}},
    {{"text": "注文を確認する", "order": 3, "actor": "管理者", "step": "注文処理"}},
    {{"text": "購入を見送る", "order": 4, "actor": "顧客", "step": "検討・決定"}},
    {{"text": "発送手続きを行う", "order": 5, "actor": "管理者", "step": "注文処理"}}
  ],
  "edges": [
    {{"from_order": 0, "to_order": 1}},
    {{"from_order": 1, "to_order": 2}},
    {{"from_order": 2, "to_order": 3, "condition": "購入する"}},
    {{"from_order": 2, "to_order": 4, "condition": "見送る"}},
    {{"from_order": 3, "to_order": 5}}
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
            
            # Return the complete parsed data including actors, steps, nodes, and edges
            edges = parsed_data.get("edges", [])
            if not isinstance(edges, list):
                logger.warning(f"'edges' is not a list, defaulting to empty: {type(edges)}")
                edges = []
            
            # Validate edges if present
            if edges:
                for i, edge in enumerate(edges):
                    if not isinstance(edge, dict):
                        logger.warning(f"Edge {i} is not a dict, skipping")
                        continue
                    if "from_order" not in edge or "to_order" not in edge:
                        logger.warning(f"Edge {i} missing required fields, skipping")
                        continue
                    if not isinstance(edge["from_order"], int) or not isinstance(edge["to_order"], int):
                        logger.warning(f"Edge {i} has invalid order types, skipping")
                        continue
            
            return {
                "actors": actors,
                "steps": steps,
                "flow_nodes": flow_nodes,
                "edges": edges
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

# ============================================
# 2026/01/20追加: Claude Service for Real-time Flow Generation
# ============================================

class ClaudeService:
    """
    Service for Claude-powered incremental flow generation.
    リアルタイムフロー生成のための新しいサービス実装
    """
    
    def __init__(self):
        self.client: Optional[AsyncAnthropic] = None
        self.initialized = False
        self.max_retries = 3
        self.base_timeout = 30.0
        self.max_timeout = 90.0
    
    async def initialize(self):
        """Initialize the Claude client during application startup."""
        if not settings.anthropic_api_key:
            raise ConfigurationError(
                "Anthropic API key not configured. Please set ANTHROPIC_API_KEY environment variable.",
                "ANTHROPIC_API_KEY"
            )
        
        try:
            # 2026/01/20修正: anthropic 0.39.0ではtimeoutとmax_retriesのパラメータ指定方法が異なる
            self.client = AsyncAnthropic(
                api_key=settings.anthropic_api_key
            )
            
            # Test the connection with a simple request (skip for dummy keys)
            if not settings.anthropic_api_key.startswith('sk-ant-dummy'):
                await self._test_connection()
            else:
                logger.warning("Using dummy Anthropic API key - skipping connection test")
            
            self.initialized = True
            logger.info("Claude Service initialized successfully")
            
        except Exception as e:
            raise ConfigurationError(
                f"Failed to initialize Claude service: {str(e)}",
                "CLAUDE_SERVICE_INIT",
                {"init_error": str(e)}
            )
    
    async def _test_connection(self):
        """Test the Claude API connection."""
        try:
            # Make a minimal request to test the connection
            # 2026/01/20修正: timeoutパラメータを削除（グローバル設定を使用）
            await self.client.messages.create(
                model=settings.claude_model,
                max_tokens=10,
                messages=[{"role": "user", "content": "test"}]
            )
        except Exception as e:
            logger.error(f"Claude service connection test failed: {str(e)}")
            raise
    
    @handle_ai_service_errors("incremental flow generation")
    async def generate_incremental_flow(
        self,
        current_flow: Optional[Dict[str, Any]],
        new_text: str,
        full_context: str
    ) -> Dict[str, Any]:
        """
        Generate or update a flow incrementally based on new hearing content.
        
        Args:
            current_flow: Existing flow structure (None if first generation)
            new_text: New hearing content to process
            full_context: Full hearing context for better understanding
            
        Returns:
            Dictionary containing:
            - flow: Updated flow structure
            - operations: List of operations applied (add/modify/delete/reorder)
            - reason: Explanation of changes made
            
        Raises:
            ValidationError: If service not initialized or invalid input
            AIServiceError: If AI generation fails
        """
        if not self.initialized or not self.client:
            raise ValidationError("Claude Service not initialized")
        
        if not new_text or not new_text.strip():
            raise ValidationError("No new content provided for flow generation")
        
        # Generate the prompt for incremental flow generation
        prompt = self._format_incremental_prompt(current_flow, new_text, full_context)
        system_prompt = self._get_system_prompt()
        
        # Attempt generation with retries
        last_error = None
        for attempt in range(self.max_retries):
            try:
                timeout = min(self.base_timeout * (2 ** attempt), self.max_timeout)
                logger.info(f"Claude generation attempt {attempt + 1}/{self.max_retries} with timeout {timeout}s")
                
                # Call Claude API with timeout
                response = await asyncio.wait_for(
                    self._make_claude_request(system_prompt, prompt),
                    timeout=timeout
                )
                
                # Extract and parse the response
                ai_response = response.content[0].text
                if not ai_response:
                    raise AIServiceError("Empty response from Claude", "empty_response")
                
                # Parse and validate the response
                result = self._parse_claude_response(ai_response)
                
                # Validate the flow structure
                self._validate_incremental_flow(result)
                
                logger.info(f"Successfully generated incremental flow on attempt {attempt + 1}")
                return result
                
            except asyncio.TimeoutError:
                last_error = AIServiceError(
                    f"Claude request timed out after {timeout} seconds (attempt {attempt + 1})",
                    "timeout"
                )
                logger.warning(f"Claude request timeout on attempt {attempt + 1}")
                
            except APIError as e:
                last_error = AIServiceError(
                    f"Claude API error: {str(e)}",
                    "api_error",
                    {"api_error": str(e)}
                )
                logger.warning(f"Claude API error on attempt {attempt + 1}: {str(e)}")
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(2 ** attempt)
                
            except AnthropicConnectionError as e:
                last_error = AIServiceError(
                    f"Claude connection error: {str(e)}",
                    "connection",
                    {"connection_error": str(e)}
                )
                logger.warning(f"Connection error on attempt {attempt + 1}")
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(1 * (attempt + 1))
                
            except (ValidationError, AIServiceError):
                # Don't retry validation or AI service errors
                raise
                
            except Exception as e:
                last_error = AIServiceError(
                    f"Unexpected error during Claude generation: {str(e)}",
                    "unexpected",
                    {"unexpected_error": str(e)}
                )
                logger.error(f"Unexpected error on attempt {attempt + 1}: {str(e)}")
        
        # All retries failed
        logger.error(f"Claude flow generation failed after {self.max_retries} attempts")
        raise last_error or AIServiceError("Claude flow generation failed after all retry attempts", "retry_exhausted")
    
    async def _make_claude_request(self, system_prompt: str, user_prompt: str):
        """Make the actual Claude API request."""
        return await self.client.messages.create(
            model=settings.claude_model,
            max_tokens=settings.claude_max_tokens,
            temperature=settings.claude_temperature,
            system=system_prompt,
            messages=[
                {
                    "role": "user",
                    "content": user_prompt
                }
            ]
        )
    
    def _get_system_prompt(self) -> str:
        """Get the system prompt for Claude."""
        return """あなたはビジネスプロセス整理の専門家です。
ヒアリング内容を分析し、構造化されたビジネスフローを増分的に構築・更新します。

重要な原則:
1. **既存フローの尊重**: 既存のフロー構造を可能な限り保持し、必要最小限の変更のみ行う
2. **文脈理解**: 新しい情報を既存フローの文脈で解釈し、適切に統合する
3. **アクター自動判定**: 発言内容から関連するアクターを自動的に判定する
4. **ステップ構造**: ビジネスプロセスを論理的なステップに分割する
5. **時系列順序**: フローノードは時系列に並べる（order値で管理）
6. **日本語**: すべての出力は日本語で記述する

操作タイプ:
- add: 新しいノードをフローに追加
- modify: 既存ノードの内容を更新
- delete: 不要なノードを削除
- reorder: ノードの順序を変更

必ず以下のJSON形式で応答してください（JSONのみ、説明文は不要）:
{
  "flow": {
    "actors": [{"name": "登場人物名", "role": "役割"}],
    "steps": [{"name": "ステップ名", "description": "説明"}],
    "flow_nodes": [{"text": "アクション", "order": 0, "actor": "登場人物名", "step": "ステップ名"}]
  },
  "operations": [
    {"type": "add", "node": {...}, "reason": "追加理由"}
  ],
  "reason": "全体的な変更の説明"
}"""
    
    def _format_incremental_prompt(
        self,
        current_flow: Optional[Dict[str, Any]],
        new_text: str,
        full_context: str
    ) -> str:
        """Format the prompt for incremental flow generation."""
        
        if current_flow is None:
            # Initial flow generation
            return f"""以下のヒアリング内容から、初期ビジネスフローを生成してください。

ヒアリング内容:
{new_text}

要件:
- 2-5人の登場人物を特定
- 2-6個のステップを作成
- 各アクションを明確に記述
- order値は0から連番で設定

JSON形式で応答してください。"""
        
        else:
            # Incremental update
            return f"""既存のビジネスフローを、新しいヒアリング内容に基づいて更新してください。

【既存フロー】
{json.dumps(current_flow, ensure_ascii=False, indent=2)}

【新しいヒアリング内容】
{new_text}

【全体コンテキスト（参考用）】
{full_context[:1000]}...

要件:
- 既存フローとの整合性を保つ
- 新情報を適切に統合
- 必要最小限の変更
- 重複を避ける
- 論理的な順序を維持

operationsには実際に適用した変更を記録してください。
JSON形式で応答してください。"""
    
    def _parse_claude_response(self, response: str) -> Dict[str, Any]:
        """Parse Claude's JSON response."""
        try:
            # Extract JSON from response (handle potential markdown code blocks)
            response = response.strip()
            if response.startswith('```'):
                # Remove markdown code block markers
                lines = response.split('\n')
                response = '\n'.join(lines[1:-1]) if len(lines) > 2 else response
                if response.startswith('json'):
                    response = response[4:].strip()
            
            result = json.loads(response)
            
            # Validate required keys
            if "flow" not in result:
                raise ValidationError("Response missing 'flow' key")
            if "operations" not in result:
                result["operations"] = []  # Optional
            if "reason" not in result:
                result["reason"] = "フローを更新しました"
            
            return result
            
        except json.JSONDecodeError as e:
            raise ValidationError(
                f"Failed to parse Claude response as JSON: {str(e)}",
                "json_parse_error",
                {"parse_error": str(e), "response_preview": response[:200]}
            )
        except Exception as e:
            raise ValidationError(
                f"Failed to process Claude response: {str(e)}",
                "response_processing_error"
            )
    
    def _validate_incremental_flow(self, result: Dict[str, Any]) -> None:
        """Validate the incremental flow structure."""
        flow = result.get("flow", {})
        
        # Validate actors
        if "actors" not in flow or not isinstance(flow["actors"], list):
            raise ValidationError("Flow must contain 'actors' list")
        
        if len(flow["actors"]) < 1 or len(flow["actors"]) > 10:
            raise ValidationError(f"Flow must have 1-10 actors, got {len(flow['actors'])}")
        
        # Validate steps
        if "steps" not in flow or not isinstance(flow["steps"], list):
            raise ValidationError("Flow must contain 'steps' list")
        
        if len(flow["steps"]) < 1 or len(flow["steps"]) > 15:
            raise ValidationError(f"Flow must have 1-15 steps, got {len(flow['steps'])}")
        
        # Validate flow_nodes
        if "flow_nodes" not in flow or not isinstance(flow["flow_nodes"], list):
            raise ValidationError("Flow must contain 'flow_nodes' list")
        
        if len(flow["flow_nodes"]) < 1 or len(flow["flow_nodes"]) > 50:
            raise ValidationError(f"Flow must have 1-50 nodes, got {len(flow['flow_nodes'])}")
        
        # Validate each node structure
        actor_names = {actor["name"] for actor in flow["actors"]}
        step_names = {step["name"] for step in flow["steps"]}
        
        for i, node in enumerate(flow["flow_nodes"]):
            if not isinstance(node, dict):
                raise ValidationError(f"Flow node {i} must be a dictionary")
            
            if "text" not in node or not node["text"]:
                raise ValidationError(f"Flow node {i} missing or empty 'text'")
            
            if "order" not in node or not isinstance(node["order"], int):
                raise ValidationError(f"Flow node {i} missing or invalid 'order'")
            
            if "actor" not in node or node["actor"] not in actor_names:
                raise ValidationError(f"Flow node {i} has invalid or missing 'actor'")
            
            if "step" not in node or node["step"] not in step_names:
                raise ValidationError(f"Flow node {i} has invalid or missing 'step'")

# Global service instances
ai_service = AIService()
# 2026/01/20追加: ClaudeServiceのグローバルインスタンス
claude_service = ClaudeService()
