"""AI Assistant service for Claude Code and OpenAI integration."""

import uuid
from datetime import datetime
from typing import Any, Optional

from app.core.config import settings
from app.core.logging import logger
from app.models.ai_assistant import (
    AIAssistant,
    AIAssistantType,
    AICommandRequest,
    AICommandResponse,
    AIConversation,
    AIMessage,
)


class AIAssistantError(Exception):
    """Exception raised for AI assistant errors."""
    pass


# Available AI assistants configuration
AVAILABLE_ASSISTANTS: dict[str, AIAssistant] = {
    "claude": AIAssistant(
        type=AIAssistantType.CLAUDE,
        name="Claude Code",
        description="Anthropic's Claude AI for code assistance",
        model="claude-sonnet-4-20250514",
        installation_command="pip install anthropic",
        api_key_env_var="ANTHROPIC_API_KEY",
    ),
    "openai": AIAssistant(
        type=AIAssistantType.OPENAI,
        name="OpenAI Codex",
        description="OpenAI's GPT for code assistance",
        model="gpt-4o",
        installation_command="pip install openai",
        api_key_env_var="OPENAI_API_KEY",
    ),
}


class AIAssistantService:
    """
    Service for AI coding assistant integration.
    
    Provides:
    - Claude Code integration
    - OpenAI integration
    - Conversation management
    - Command suggestion and execution
    """

    def __init__(self):
        self._conversations: dict[str, AIConversation] = {}
        self._anthropic_client = None
        self._openai_client = None

    def _get_anthropic_client(self):
        """Get or create Anthropic client."""
        if self._anthropic_client is None and settings.anthropic_api_key:
            try:
                import anthropic
                self._anthropic_client = anthropic.Anthropic(
                    api_key=settings.anthropic_api_key
                )
            except ImportError:
                logger.warning("Anthropic package not installed")
        return self._anthropic_client

    def _get_openai_client(self):
        """Get or create OpenAI client."""
        if self._openai_client is None and settings.openai_api_key:
            try:
                import openai
                self._openai_client = openai.OpenAI(
                    api_key=settings.openai_api_key
                )
            except ImportError:
                logger.warning("OpenAI package not installed")
        return self._openai_client

    def list_assistants(self) -> list[AIAssistant]:
        """List available AI assistants."""
        assistants = []
        for key, assistant in AVAILABLE_ASSISTANTS.items():
            # Check if API key is configured
            if key == "claude":
                assistant.installed = settings.anthropic_api_key is not None
            elif key == "openai":
                assistant.installed = settings.openai_api_key is not None
            assistants.append(assistant)
        return assistants

    def get_assistant(self, assistant_type: str) -> Optional[AIAssistant]:
        """Get an AI assistant by type."""
        return AVAILABLE_ASSISTANTS.get(assistant_type)

    async def create_conversation(
        self,
        session_id: str,
        assistant_type: AIAssistantType = AIAssistantType.CLAUDE,
        system_prompt: Optional[str] = None,
    ) -> AIConversation:
        """Create a new AI conversation."""
        conversation_id = str(uuid.uuid4())
        
        # Default system prompt for coding assistance
        default_prompt = """You are an expert AI coding assistant integrated into a terminal.
You help users with:
- Writing and debugging code
- Running shell commands
- Explaining errors and solutions
- Code review and optimization
- Git operations and workflow

When suggesting shell commands, format them as:
```bash
command here
```

When suggesting code changes, include the file path and show the full code block.
Be concise but thorough. Always explain what commands will do before suggesting them.
"""
        
        conversation = AIConversation(
            id=conversation_id,
            session_id=session_id,
            assistant_type=assistant_type,
            system_prompt=system_prompt or default_prompt,
            model=self._get_model_for_type(assistant_type),
        )
        
        self._conversations[conversation_id] = conversation
        return conversation

    def _get_model_for_type(self, assistant_type: AIAssistantType) -> str:
        """Get the default model for an assistant type."""
        models = {
            AIAssistantType.CLAUDE: "claude-sonnet-4-20250514",
            AIAssistantType.OPENAI: "gpt-4o",
            AIAssistantType.CUSTOM: "custom",
        }
        return models.get(assistant_type, "claude-sonnet-4-20250514")

    async def get_conversation(self, conversation_id: str) -> Optional[AIConversation]:
        """Get a conversation by ID."""
        return self._conversations.get(conversation_id)

    async def send_message(
        self,
        conversation_id: str,
        request: AICommandRequest,
        terminal_context: Optional[str] = None,
    ) -> AICommandResponse:
        """
        Send a message to the AI assistant.
        
        Args:
            conversation_id: Conversation to send to
            request: Command request with prompt
            terminal_context: Recent terminal output for context
            
        Returns:
            AI response with suggestions
        """
        conversation = await self.get_conversation(conversation_id)
        if not conversation:
            raise AIAssistantError(f"Conversation not found: {conversation_id}")
        
        # Build message with context
        message_content = request.prompt
        if request.include_terminal_context and terminal_context:
            message_content = f"""Terminal context:
```
{terminal_context[-5000:]}  # Limit context size
```

User request: {request.prompt}"""
        
        # Add user message to conversation
        user_message = AIMessage(
            id=str(uuid.uuid4()),
            role="user",
            content=message_content,
            terminal_context=terminal_context[:1000] if terminal_context else None,
        )
        conversation.messages.append(user_message)
        
        # Get AI response
        try:
            if conversation.assistant_type == AIAssistantType.CLAUDE:
                response_text = await self._get_claude_response(conversation)
            elif conversation.assistant_type == AIAssistantType.OPENAI:
                response_text = await self._get_openai_response(conversation)
            else:
                raise AIAssistantError(f"Unknown assistant type: {conversation.assistant_type}")
        except Exception as e:
            logger.error(f"AI request failed: {e}")
            raise AIAssistantError(f"AI request failed: {e}")
        
        # Parse response for commands and code blocks
        commands, code_blocks = self._parse_response(response_text)
        
        # Add assistant message
        assistant_message = AIMessage(
            id=str(uuid.uuid4()),
            role="assistant",
            content=response_text,
        )
        conversation.messages.append(assistant_message)
        conversation.updated_at = datetime.utcnow()
        
        return AICommandResponse(
            message=response_text,
            suggested_commands=commands,
            code_blocks=code_blocks,
            requires_confirmation=not request.auto_execute,
            conversation_id=conversation_id,
        )

    async def _get_claude_response(self, conversation: AIConversation) -> str:
        """Get response from Claude."""
        client = self._get_anthropic_client()
        if not client:
            raise AIAssistantError("Anthropic client not available")
        
        # Build messages
        messages = []
        for msg in conversation.messages:
            if msg.role in ("user", "assistant"):
                messages.append({
                    "role": msg.role,
                    "content": msg.content,
                })
        
        response = client.messages.create(
            model=conversation.model,
            max_tokens=conversation.max_tokens,
            system=conversation.system_prompt,
            messages=messages,
        )
        
        return response.content[0].text

    async def _get_openai_response(self, conversation: AIConversation) -> str:
        """Get response from OpenAI."""
        client = self._get_openai_client()
        if not client:
            raise AIAssistantError("OpenAI client not available")
        
        # Build messages
        messages = [{"role": "system", "content": conversation.system_prompt}]
        for msg in conversation.messages:
            if msg.role in ("user", "assistant"):
                messages.append({
                    "role": msg.role,
                    "content": msg.content,
                })
        
        response = client.chat.completions.create(
            model=conversation.model,
            max_tokens=conversation.max_tokens,
            messages=messages,
        )
        
        return response.choices[0].message.content

    def _parse_response(
        self, response: str
    ) -> tuple[list[str], list[dict[str, str]]]:
        """Parse AI response for commands and code blocks."""
        import re
        
        commands = []
        code_blocks = []
        
        # Find all code blocks
        pattern = r"```(\w*)\n(.*?)```"
        matches = re.findall(pattern, response, re.DOTALL)
        
        for lang, code in matches:
            code = code.strip()
            if lang in ("bash", "sh", "shell", "zsh", ""):
                # Extract individual commands
                for line in code.split("\n"):
                    line = line.strip()
                    if line and not line.startswith("#"):
                        commands.append(line)
            
            code_blocks.append({
                "language": lang or "text",
                "content": code,
            })
        
        return commands, code_blocks

    async def delete_conversation(self, conversation_id: str) -> bool:
        """Delete a conversation."""
        if conversation_id in self._conversations:
            del self._conversations[conversation_id]
            return True
        return False

    async def clear_conversation(self, conversation_id: str) -> bool:
        """Clear messages from a conversation."""
        conversation = await self.get_conversation(conversation_id)
        if conversation:
            conversation.messages = []
            conversation.updated_at = datetime.utcnow()
            return True
        return False

    async def install_assistant_in_workspace(
        self,
        workspace_id: str,
        assistant_type: str,
        daytona_service: Any,
    ) -> bool:
        """Install an AI assistant in a workspace."""
        assistant = self.get_assistant(assistant_type)
        if not assistant:
            raise AIAssistantError(f"Unknown assistant type: {assistant_type}")
        
        if not assistant.installation_command:
            return True
        
        logger.info(f"Installing {assistant.name} in workspace {workspace_id}")
        
        try:
            output, exit_code = await daytona_service.execute_command(
                workspace_id,
                assistant.installation_command,
            )
            
            if exit_code != 0:
                logger.error(f"Installation failed: {output}")
                return False
            
            return True
        except Exception as e:
            logger.error(f"Failed to install assistant: {e}")
            return False


# Singleton instance
_ai_service: Optional[AIAssistantService] = None


def get_ai_assistant_service() -> AIAssistantService:
    """Get the AI assistant service singleton."""
    global _ai_service
    if _ai_service is None:
        _ai_service = AIAssistantService()
    return _ai_service
