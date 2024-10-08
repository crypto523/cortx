from typing import List

from fastapi import HTTPException
from models.databases.supabase.chats import CreateChatHistory
from models import ChatHistory, get_supabase_db


def update_chat_history(chat_history: CreateChatHistory) -> ChatHistory:
    supabase_db = get_supabase_db()
    response: List[ChatHistory] = (supabase_db.update_chat_history(
        chat_history.chat_id, chat_history.user_message, chat_history.assistant, chat_history.prompt_id, chat_history.brain_id)).data
    if len(response) == 0:
        raise HTTPException(
            status_code=500, detail="An exception occurred while updating chat history."
        )
    return ChatHistory(response[0])  # pyright: ignore reportPrivateUsage=none


