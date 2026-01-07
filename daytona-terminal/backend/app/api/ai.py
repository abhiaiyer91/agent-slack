"""AI Assistant API routes."""

from fastapi import APIRouter, HTTPException, status

from app.models.ai_assistant import (
    AIAssistant,
    AIAssistantType,
    AICommandRequest,
    AICommandResponse,
    AIConversation,
)
from app.services.ai_assistant import AIAssistantError, get_ai_assistant_service
from app.services.terminal import get_terminal_service

router = APIRouter(prefix="/ai", tags=["ai"])


@router.get("/assistants", response_model=list[AIAssistant])
async def list_assistants():
    """List available AI assistants."""
    service = get_ai_assistant_service()
    return service.list_assistants()


@router.get("/assistants/{assistant_type}", response_model=AIAssistant)
async def get_assistant(assistant_type: str):
    """Get an AI assistant by type."""
    service = get_ai_assistant_service()
    assistant = service.get_assistant(assistant_type)
    if not assistant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assistant not found: {assistant_type}",
        )
    return assistant


@router.post("/conversations", response_model=AIConversation)
async def create_conversation(
    session_id: str,
    assistant_type: AIAssistantType = AIAssistantType.CLAUDE,
    system_prompt: str | None = None,
):
    """Create a new AI conversation for a terminal session."""
    service = get_ai_assistant_service()
    
    # Verify session exists
    terminal_service = get_terminal_service()
    session = await terminal_service.get_session(session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session not found: {session_id}",
        )
    
    conversation = await service.create_conversation(
        session_id, assistant_type, system_prompt
    )
    return conversation


@router.get("/conversations/{conversation_id}", response_model=AIConversation)
async def get_conversation(conversation_id: str):
    """Get a conversation by ID."""
    service = get_ai_assistant_service()
    conversation = await service.get_conversation(conversation_id)
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation not found: {conversation_id}",
        )
    return conversation


@router.post("/conversations/{conversation_id}/message", response_model=AICommandResponse)
async def send_message(conversation_id: str, request: AICommandRequest):
    """Send a message to the AI assistant."""
    service = get_ai_assistant_service()
    terminal_service = get_terminal_service()
    
    # Get conversation
    conversation = await service.get_conversation(conversation_id)
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation not found: {conversation_id}",
        )
    
    # Get terminal context if requested
    terminal_context = None
    if request.include_terminal_context:
        terminal_context = terminal_service.get_terminal_context(
            conversation.session_id
        )
    
    try:
        response = await service.send_message(
            conversation_id, request, terminal_context
        )
        return response
    except AIAssistantError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(conversation_id: str):
    """Delete a conversation."""
    service = get_ai_assistant_service()
    success = await service.delete_conversation(conversation_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation not found: {conversation_id}",
        )


@router.post("/conversations/{conversation_id}/clear", status_code=status.HTTP_204_NO_CONTENT)
async def clear_conversation(conversation_id: str):
    """Clear messages from a conversation."""
    service = get_ai_assistant_service()
    success = await service.clear_conversation(conversation_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation not found: {conversation_id}",
        )
