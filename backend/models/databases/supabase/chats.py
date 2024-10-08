from typing import Optional
from uuid import UUID

from models.chat import Chat
from models.databases.repository import Repository
from pydantic import BaseModel


class CreateChatHistory(BaseModel):
    chat_id: UUID
    user_message: str
    assistant: str
    prompt_id: Optional[UUID]
    brain_id: Optional[UUID]


class QuestionAndAnswer(BaseModel):
    question: str
    answer: str


class Chats(Repository):
    def __init__(self, supabase_client):
        self.db = supabase_client

    def create_chat(self, new_chat):
        response = self.db.table("chats").insert(new_chat).execute()
        return response

    def get_chat_by_id(self, chat_id: str):
        response = (
            self.db.from_("chats")
            .select("*")
            .filter("chat_id", "eq", chat_id)
            .execute()
        )
        return response

    def add_question_and_answer(
            self, chat_id: str, question_and_answer: QuestionAndAnswer
        ) -> None:
            response = (
                self.db.table("chat_history")
                .insert(
                    {
                        "chat_id": chat_id,
                        "user_message": question_and_answer.question,
                        "assistant": question_and_answer.answer,
                    }
                )
                .execute()
            ).data
            if len(response) > 0:
                chat = Chat(response[0])
                # Perform any additional operations with the 'chat' object if needed
            return None


    def get_chat_history(self, chat_id: str):
        reponse = (
            self.db.from_("chat_history")
            .select("*")
            .filter("chat_id", "eq", chat_id)
            .order("message_time", desc=False)  # Add the ORDER BY clause
            .execute()
        )

        return reponse

    def get_user_chats(self, user_id: str):
        response = (
            self.db.from_("chats")
            .select("chat_id,user_id,creation_time,chat_name")
            .filter("user_id", "eq", user_id)
            .order("creation_time", desc=False)
            .execute()
        )
        return response

    def update_chat_history(self, chat_id, user_message, assistant, prompt_id=None, brain_id=None):
        response = (
            self.db.table("chat_history")
            .insert(
                {
                    "chat_id": str(chat_id),
                    "user_message": user_message,
                    "assistant": assistant,
                    "prompt_id": str(prompt_id) if prompt_id else None,
                    "brain_id": str(brain_id) if brain_id else None,
                }
            )
            .execute()
        )

        return response


    def update_chat(self, chat_id, updates):
        response = (
            self.db.table("chats").update(updates).match({"chat_id": chat_id}).execute()
        )

        return response

    def update_message_by_id(self, message_id, updates):
        response = (
            self.db.table("chat_history")
            .update(updates)
            .match({"message_id": message_id})
            .execute()
        )

        return response

    def get_chat_details(self, chat_id):
        response = (
            self.db.from_("chats")
            .select("*")
            .filter("chat_id", "eq", chat_id)
            .execute()
        )
        return response

    def delete_chat(self, chat_id):
        self.db.table("chats").delete().match({"chat_id": chat_id}).execute()

    def delete_chat_history(self, chat_id):
        self.db.table("chat_history").delete().match({"chat_id": chat_id}).execute()
