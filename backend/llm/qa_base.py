import asyncio
import json
from typing import Any, AsyncIterable, Awaitable, List, Optional, Tuple, Union
from uuid import UUID

from langchain.callbacks.streaming_aiter import AsyncIteratorCallbackHandler
from langchain.chains import LLMChain
from langchain.chains.question_answering import load_qa_chain
from langchain.chat_models import ChatLiteLLM
from langchain.embeddings.openai import OpenAIEmbeddings
from langchain.llms.base import BaseLLM
from langchain.chains.conversational_retrieval.base import ConversationalRetrievalChain
from langchain.prompts.chat import (
    ChatPromptTemplate,
    HumanMessagePromptTemplate,
    SystemMessagePromptTemplate,
)

from llm.utils.get_prompt_to_use import get_prompt_to_use
from llm.utils.get_prompt_to_use_id import get_prompt_to_use_id

from logger import get_logger
from models import BrainSettings  # Importing settings related to the 'brain'
from models.chats import ChatQuestion
from models.databases.supabase.chats import CreateChatHistory
from pydantic import BaseModel
from repository.brain import get_brain_by_id, get_question_context_from_brain
from repository.chat import (
    GetChatHistoryOutput,
    format_chat_history,
    get_chat_history,
    update_chat_history,
    update_message_by_id,
)
from supabase.client import Client, create_client
from models import get_supabase_db
from vectorstore.supabase import CustomSupabaseVectorStore
from .prompts.CONDENSE_PROMPT import CONDENSE_QUESTION_PROMPT

import os
from dotenv import load_dotenv
from langchain.chat_models import ChatOpenAI
from langchain.schema.messages import BaseMessage
from langchain.schema.messages import (
    HumanMessage,
    SystemMessage,
)
from langchain.schema import Document

from langgraph.graph import StateGraph, END
import operator
from typing import AsyncIterable, TypedDict, Annotated
from langchain.tools.tavily_search import TavilySearchResults
from langchain_core.pydantic_v1 import BaseModel, Field
from langchain_core.utils.function_calling import convert_to_openai_tool
from langchain.output_parsers.openai_tools import PydanticToolsParser
from langchain.prompts import PromptTemplate
load_dotenv()

os.environ["TAVILY_API_KEY"] = os.getenv("TAVILY_API_KEY")

logger = get_logger(__name__)
# QUIVR_DEFAULT_PROMPT = "Your name is Cortx. You're a helpful assistant.  If you don't know the answer, just say that you don't know, don't try to make up an answer."
QUIVR_DEFAULT_PROMPT = "Your name is Cortx. You're a helpful assistant."
CHAT_TURN_TYPE = Union[Tuple[str, str], BaseMessage]
_ROLE_MAP = {"human": "Human: ", "ai": "Assistant: "}


def _get_chat_history(chat_history: List[CHAT_TURN_TYPE]) -> str:
    buffer = ""
    for dialogue_turn in chat_history:
        if isinstance(dialogue_turn, BaseMessage):
            role_prefix = _ROLE_MAP.get(dialogue_turn.type, f"{dialogue_turn.type}: ")
            buffer += f"\n{role_prefix}{dialogue_turn.content}"
        elif isinstance(dialogue_turn, tuple):
            human = "Human: " + dialogue_turn[0]
            ai = "Assistant: " + dialogue_turn[1]
            buffer += "\n" + "\n".join([human, ai])
        else:
            raise ValueError(
                f"Unsupported chat history format: {type(dialogue_turn)}."
                f" Full chat history: {chat_history} "
            )
    return buffer


def filter_history(input_list):
    filtered_list = [
        tup for tup in input_list if not tup[0].startswith("based on your response")
    ]
    return filtered_list


class QABaseBrainPicking(BaseModel):
    """
    Main class for the Brain Picking functionality.
    It allows to initialize a Chat model, generate questions and retrieve answers using ConversationalRetrievalChain.
    It has two main methods: `generate_question` and `generate_stream`.
    One is for generating questions in a single request, the other is for generating questions in a streaming fashion.
    Both are the same, except that the streaming version streams the last message as a stream.
    Each have the same prompt template, which is defined in the `prompt_template` property.
    """

    class Config:
        """Configuration of the Pydantic Object"""

        # Allowing arbitrary types for class validation
        arbitrary_types_allowed = True

    # Instantiate settings
    brain_settings = BrainSettings()  # type: ignore other parameters are optional

    # Default class attributes
    model: str = None  # pyright: ignore reportPrivateUsage=none
    temperature: float = 0.1
    chat_id: str = None  # pyright: ignore reportPrivateUsage=none
    brain_id: str = None  # pyright: ignore reportPrivateUsage=none
    max_tokens: int = 256
    user_openai_api_key: str = None  # pyright: ignore reportPrivateUsage=none
    streaming: bool = False

    openai_api_key: str = None  # pyright: ignore reportPrivateUsage=none
    callbacks: List[AsyncIteratorCallbackHandler] = (
        None  # pyright: ignore reportPrivateUsage=none
    )

    def _determine_api_key(self, openai_api_key, user_openai_api_key):
        """If user provided an API key, use it."""
        if user_openai_api_key is not None:
            return user_openai_api_key
        else:
            return openai_api_key

    def _determine_streaming(self, model: str, streaming: bool) -> bool:
        """If the model name allows for streaming and streaming is declared, set streaming to True."""
        return streaming

    def _determine_callback_array(
        self, streaming
    ) -> List[AsyncIteratorCallbackHandler]:  # pyright: ignore reportPrivateUsage=none
        """If streaming is set, set the AsyncIteratorCallbackHandler as the only callback."""
        if streaming:
            return [
                AsyncIteratorCallbackHandler()  # pyright: ignore reportPrivateUsage=none
            ]

    @property
    def embeddings(self) -> OpenAIEmbeddings:
        return OpenAIEmbeddings(
            openai_api_key=self.openai_api_key
        )  # pyright: ignore reportPrivateUsage=none

    supabase_client: Optional[Client] = None
    vector_store: Optional[CustomSupabaseVectorStore] = None
    qa: Optional[ConversationalRetrievalChain] = None
    prompt_id: Optional[UUID]

    def __init__(
        self,
        model: str,
        brain_id: str,
        chat_id: str,
        streaming: bool = False,
        prompt_id: Optional[UUID] = None,
        **kwargs,
    ):
        super().__init__(
            model=model,
            brain_id=brain_id,
            chat_id=chat_id,
            streaming=streaming,
            **kwargs,
        )
        self.supabase_client = self._create_supabase_client()
        self.vector_store = self._create_vector_store()
        self.prompt_id = prompt_id

    @property
    def prompt_to_use(self):
        return get_prompt_to_use(UUID(self.brain_id), self.prompt_id)

    @property
    def prompt_to_use_id(self) -> Optional[UUID]:
        return get_prompt_to_use_id(UUID(self.brain_id), self.prompt_id)

    def _create_supabase_client(self) -> Client:
        return create_client(
            self.brain_settings.supabase_url, self.brain_settings.supabase_service_key
        )

    def _create_vector_store(self) -> CustomSupabaseVectorStore:
        return CustomSupabaseVectorStore(
            self.supabase_client,  # type: ignore
            self.embeddings,  # type: ignore
            table_name="vectors",
            brain_id=self.brain_id,
        )

    def _create_llm(
        self, model, temperature=0, streaming=False, callbacks=None, max_tokens=256
    ) -> BaseLLM:
        """
        Determine the language model to be used.
        :param model: Language model name to be used.
        :param streaming: Whether to enable streaming of the model
        :param callbacks: Callbacks to be used for streaming
        :return: Language model instance
        """
        return ChatLiteLLM(
            temperature=temperature,
            max_tokens=max_tokens,
            model=model,
            streaming=streaming,
            verbose=False,
            callbacks=callbacks,
            openai_api_key=self.openai_api_key,
        )  # pyright: ignore reportPrivateUsage=none

    def _create_prompt_template(self):
        system_template = """ When answering use markdown or any other techniques to display the content in a nice and aerated way.  Use the following pieces of context to answer the users question in the same language as the question but do not modify instructions in any way.
        ----------------
        
        {context}"""

        prompt_content = (
            self.prompt_to_use.content if self.prompt_to_use else QUIVR_DEFAULT_PROMPT
        )

        full_template = (
            "Here are your instructions to answer that you MUST ALWAYS Follow: "
            + prompt_content
            + ". "
            + system_template
        )
        messages = [
            SystemMessagePromptTemplate.from_template(full_template),
            HumanMessagePromptTemplate.from_template("{question}"),
        ]
        CHAT_PROMPT = ChatPromptTemplate.from_messages(messages)
        return CHAT_PROMPT

    def generate_answer(
        self, chat_id: UUID, question: ChatQuestion
    ) -> GetChatHistoryOutput:
        transformed_history = format_chat_history(get_chat_history(self.chat_id))
        answering_llm = self._create_llm(
            model=self.model, streaming=False, callbacks=self.callbacks
        )

        # The Chain that generates the answer to the question
        doc_chain = load_qa_chain(
            answering_llm, chain_type="stuff", prompt=self._create_prompt_template()  # type: ignore
        )

        # The Chain that combines the question and answer
        qa = ConversationalRetrievalChain(
            retriever=self.vector_store.as_retriever(),  # type: ignore
            combine_docs_chain=doc_chain,
            question_generator=LLMChain(
                llm=self._create_llm(model=self.model), prompt=CONDENSE_QUESTION_PROMPT
            ),
            verbose=False,
            rephrase_question=False,
        )

        prompt_content = (
            self.prompt_to_use.content if self.prompt_to_use else QUIVR_DEFAULT_PROMPT
        )

        model_response = qa(
            {
                "question": question.question,
                "chat_history": transformed_history,
                # "custom_personality": prompt_content,
            }
        )  # type: ignore

        answer = model_response["answer"]

        new_chat = update_chat_history(
            CreateChatHistory(
                **{
                    "chat_id": chat_id,
                    "user_message": question.question,
                    "assistant": answer,
                    "brain_id": question.brain_id,
                    "prompt_id": self.prompt_to_use_id,
                }
            )
        )

        brain = None

        if question.brain_id:
            brain = get_brain_by_id(question.brain_id)

        return GetChatHistoryOutput(
            **{
                "chat_id": chat_id,
                "user_message": question.question,
                "assistant": answer,
                "message_time": new_chat.message_time,
                "prompt_title": (
                    self.prompt_to_use.title if self.prompt_to_use else None
                ),
                "brain_name": brain.name if brain else None,
                "message_id": new_chat.message_id,
            }
        )

    # async def generate_stream(
    #     self, chat_id: UUID, question: ChatQuestion
    # ) -> AsyncIterable:
    #     # Get Chat History
    #     history = get_chat_history(self.chat_id)
    #     transformed_history = format_chat_history(history)
    #     filtered_transformed_history = filter_history(transformed_history)
    #     limited_history = filtered_transformed_history[-2:]
    #     chat_history = _get_chat_history(limited_history)  # type: ignore
    #     # Get individual values from question
    #     file_paths = question.file_paths
    #     file_names = [file_path.split("/")[-1] for file_path in file_paths]
    #     model = question.model
    #     user_question = question.question
    #     prompt_content = self.prompt_to_use.content if self.prompt_to_use else None
    #     brain = None
    #     if question.brain_id:
    #         brain = get_brain_by_id(question.brain_id)

    #     context_response_similarity = get_question_context_from_brain(question.brain_id, user_question, file_names)  # type: ignore

    #     response_tokens = []

    #     streamed_chat_history = update_chat_history(
    #         CreateChatHistory(
    #             **{
    #                 "chat_id": chat_id,
    #                 "user_message": question.question,
    #                 "assistant": "",
    #                 "brain_id": question.brain_id,
    #                 "prompt_id": self.prompt_to_use_id,
    #             }
    #         )
    #     )

    #     streamed_chat_history = GetChatHistoryOutput(
    #         **{
    #             "chat_id": str(chat_id),
    #             "message_id": streamed_chat_history.message_id,
    #             "message_time": streamed_chat_history.message_time,
    #             "user_message": question.question,
    #             "assistant": "",
    #             "prompt_title": (
    #                 self.prompt_to_use.title if self.prompt_to_use else None
    #             ),
    #             "brain_name": brain.name if brain else None,
    #         }
    #     )

    #     chat_llm = ChatOpenAI(model=model, openai_api_key=os.getenv("OPENAI_API_KEY"))  # type: ignore

    #     if user_question.startswith("based on your response"):
    #         messages = f"Conversation history:\n{chat_history}\n\n#######\nBased on the provided information above, answer the question proposed below. If the text doesn't provide information about it, tell me you are basing your answer on your own knowledge and don't start your response with phrases like the text doesn't provide information about question. Give me only answer. \n\nQuestion:\n{user_question}"
    #     else:
    #         ###### Rephrase user query to searchable query########
    #         # rephraseMessage = f"Conversation history:\n{chat_history}\n\n#######\n Based on the conversation history, rephrase the question below so that this question is stand alone and searchable in a vector database: \n\nQuestion:\n{user_question}"
    #         # rephrasedQuestion = chat_llm.invoke(rephraseMessage).content
    #         ######### Messages with system and Human roles
    #         messages = [
    #             SystemMessage(content=prompt_content or ""),
    #             HumanMessage(
    #                 content=f"Context:\n{context_response_similarity} \n\n#######\nConversation history:\n{chat_history}\n\n#######\nBased on the provided information above, answer the question proposed below. If the text doesn't provide information about it, tell me you are basing your answer on your own knowledge and don't start your response with phrases like the text doesn't provide information about question. Give me only answer. \n\nQuestion:\n{user_question}"
    #             ),
    #         ]
    #     for chunk in chat_llm.stream(messages):
    #         logger.info("Token: %s", chunk.content)
    #         response_tokens.append(chunk.content)
    #         streamed_chat_history.assistant = chunk.content
    #         returnValue = f"data: {json.dumps(streamed_chat_history.dict())}"
    #         print('==============returnValue================', returnValue)
    #         yield returnValue

    #     assistant = "".join(response_tokens)

    #     update_message_by_id(
    #         message_id=str(streamed_chat_history.message_id),
    #         user_message=question.question,
    #         assistant=assistant,
    #     )
        
        
    async def generate_stream(
            self, chat_id: UUID, question: ChatQuestion
        ) -> AsyncIterable:
        
        class ChatState(TypedDict):
            chat_id: UUID
            question: str
            file_names: list[str]
            model: str
            prompt: str | None
            brain: Any | None
            chat_history: str
            docs: list
            messages: list[str]
            response: Annotated[str, operator.add]
            run_web_search:str

        def get_chat_history_node(state):
            history = get_chat_history(state['chat_id'])
            transformed_history = format_chat_history(history)
            filtered_transformed_history = filter_history(transformed_history)
            limited_history = filtered_transformed_history[-2:]
            chat_history = _get_chat_history(limited_history)  # type: ignore
            return {'chat_history': chat_history}

        def get_context_node(state):
            context_response_similarity = get_question_context_from_brain(state['brain'], state['question'], state['file_names'])  # type: ignore
            return {'docs': context_response_similarity}

        def grade_documents(state):
            question = state["question"]
            documents = state["docs"]

            #Data model
            class grade(BaseModel):

                """Binary score for relevance check."""

                binary_score: str = Field(description="Relevance score 'yes' or 'no'")
            #LLM
            model = ChatOpenAI(temperature=0, model=state['model'], openai_api_key = os.getenv("OPEN_AI_API_KEY"))
            #Tool
            grade_tool_ai = convert_to_openai_tool(grade)
            
            #LLM with tool and enforce invocation
            llm_with_tool = model.bind(
                tools=[convert_to_openai_tool(grade_tool_ai)],
                tool_choice={"type": "function", "function": {"name": "grade"}}
            )
            #Parser
            parser_tool = PydanticToolsParser(tools=[grade])
            #Prompt
            prompt = PromptTemplate(
                template="""You are a grader assessing relevance of a retrieved document to a user question. \n
                Here is the retrieved document: \n\n {context} \n\n
                Here is the user question: {question} \n
                If the document contains keywordis or semantic meaning related to the user question. grade it as relevant. \n
                Give a binary score 'yes' or 'no' score to indicate whether the document is relevant to the question.""",
                input_variables=["context", "question"],
            )
            #Chain
            chain = prompt | llm_with_tool | parser_tool
            
            #Score
            filtered_docs = []
            search = "No" # Default do not opt for web search to supplement retrieval
            for d in documents:
                score = chain.invoke({"question": question, "context": d.page_content})
                grade = score[0].binary_score
                if grade == "yes":
                    print("--GRADE: DOCUHENT RELEVANT--")
                    filtered_docs.append(d)
                else:
                    print("--GRADE: DOCUMENT NOT RELEVANT-—-")
                    search = "Yes" # Perform web search
                    continue
            return {"docs":filtered_docs, "run_web_search": search}
        
        def transform_query(state):
            question = state["question"]
            documents = state["docs"]
            #Create a prompt template with format instructions and the query
            prompt = f"You are generating questions that is well optimized for retrieval. \n Look at the input and try to reason about the underlying sematic intent meaning. \n Here is the initial question: \n ---- \n {question} \n ---- \n Formulate an improved question:"
            #Grader
            model = ChatOpenAI(temperature=0, model=state["model"], openai_api_key = os.getenv("OPEN_AI_API_KEY"))

            better_question = model.invoke(prompt).content
            return {"docs": documents, "question": better_question}
        
        def web_search(state):
            question = state["question"]
            documents = state["docs"]
            tool = TavilySearchResults()
            docs = tool.invoke({"query": question})
            web_results = "\n".join([d["content"] for d in docs])
            web_results = Document(page_content=web_results)
            documents.append(web_results)
            return {"docs": documents, "question": question}
        
        def decide_to_generate(state):
            search = state["run_web_search"]
            if search == "Yes":
                print("-—-DECISION: TRANSFORM query and RUN WEB SEARCN-—")
                return "transform_query"
            else:
                # we have relevant documents, so generate answer
                print("--DECISION: GENERATE--")
                return "generate_messages"
        
        def generate_messages_node(state):
            context = "\n".join([d.page_content for d in state['docs']])
            if state['question'].startswith("based on your response"):
                messages = f"Conversation history:\n{state['chat_history']}\n\n#######\nBased on the provided information above, answer the question proposed below. If the text doesn't provide information about it, tell me you are basing your answer on your own knowledge and don't start your response with phrases like the text doesn't provide information about question. Give me only answer. \n\nQuestion:\n{state['question']}"
            else:
                messages = [
                    SystemMessage(content=state['prompt'] or ""),
                    HumanMessage(
                        content=f"Context:\n{context} \n\n#######\nConversation history:\n{state['chat_history']}\n\n#######\nBased on the provided information above, answer the question proposed below. If the text doesn't provide information about it, tell me you are basing your answer on your own knowledge and don't start your response with phrases like the text doesn't provide information about question. Give me only answer. \n\nQuestion:\n{state['question']}"
                    ),
                ]
            return {'messages': messages}
                
        def stream_response_node(state):
            chat_llm = ChatOpenAI(model=state['model'], openai_api_key=os.getenv("OPENAI_API_KEY"))
            response_tokens = []
            for chunk in chat_llm.stream(state['messages']):
                print('CHUNK:',chunk.content)
                response_tokens.append(chunk.content)
            return {'response': "".join(response_tokens)}
        
        # Create graph
        graph = StateGraph(ChatState)

        # Add nodes
        graph.add_node("get_chat_history", get_chat_history_node)
        graph.add_node("get_context", get_context_node)
        graph.add_node("generate_messages", generate_messages_node)
        graph.add_node("stream_response", stream_response_node)
        graph.add_node("transform_query", transform_query)
        graph.add_node("web_search", web_search)
        graph.add_node("grade_documents", grade_documents)

        # Add edges
        graph.add_edge("get_chat_history", "get_context")
        graph.add_edge("get_context", "grade_documents")
        graph.add_conditional_edges(
            "grade_documents",
            decide_to_generate,
            {
                "transform_query": "transform_query",
                "generate_messages": "generate_messages",
            },
        )
        graph.add_edge("transform_query", "web_search")
        graph.add_edge("web_search", "generate_messages")
        graph.add_edge("generate_messages", "stream_response")
        graph.add_edge("stream_response", END)

        # Set entry point
        graph.set_entry_point("get_chat_history")
        file_paths = question.file_paths
        file_names = [file_path.split("/")[-1] for file_path in file_paths]
        model = question.model
        user_question = question.question
        # prompt_content = question.prompt_to_use.content if question.prompt_to_use else None
        prompt_content = self.prompt_to_use.content if self.prompt_to_use else None
        brain = get_brain_by_id(question.brain_id) if question.brain_id else None

        streamed_chat_history = update_chat_history(
            CreateChatHistory(
                **{
                    "chat_id": chat_id,
                    "user_message": question.question,
                    "assistant": "",
                    "brain_id": question.brain_id,
                    "prompt_id": self.prompt_to_use_id,
                }
            )
        )

        streamed_chat_history = GetChatHistoryOutput(
            **{
                "chat_id": str(chat_id),
                "message_id": streamed_chat_history.message_id,
                "message_time": streamed_chat_history.message_time,
                "user_message": question.question,
                "assistant": "",
                "prompt_title": (
                    self.prompt_to_use.title if self.prompt_to_use else None
                ),
                "brain_name": brain.name if brain else None,
            }
        )

        initial_state = {
            'chat_id': chat_id,
            'question': user_question,
            'file_names': file_names,
            'model': model,
            'prompt': prompt_content,
            'brain': brain.brain_id, # type: ignore
            'chat_history': '',
            'docs': [],
            'messages': '',
            'response': ''
        }
        # Compile graph
        runnable = graph.compile()
        async for output in runnable.astream(initial_state):
            key = ', '.join(list(output.keys()))
            if key=='stream_response':
                response = output['stream_response']
                assistant = response['response']
                update_message_by_id(
                    message_id=str(streamed_chat_history.message_id),
                    user_message=question.question,
                    assistant=assistant,
                )
                for chunk in assistant.split(' '):
                    streamed_chat_history.assistant = chunk + ' '
                    returnValue = f"data: {json.dumps(streamed_chat_history.dict())}"
                    yield returnValue