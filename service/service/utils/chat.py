import os
import json
from typing import AsyncGenerator, List, Annotated
import semantic_kernel as sk
from semantic_kernel.connectors.ai.open_ai import OpenAIChatCompletion, OpenAIChatPromptExecutionSettings
from semantic_kernel.contents import ChatHistory
from semantic_kernel.functions import kernel_function
from openai import AsyncOpenAI
from sqlmodel import Session, select, or_
from service.core.database import engine
from service.models.media import Media
from service.models.media_summary import MediaSummary
from service.models.thumbnail import Thumbnail

histories = {}

class MediaSearchPlugin:
    def __init__(self, user_id: int):
        self.user_id = user_id

    @kernel_function(
        description="ALWAYS use this to access the user's media bin. Searches by filename or content summary. Use this to find specific items or see what files are available.",
        name="search_media",
    )
    def search_media(
        self,
        query: Annotated[str, "Keywords to search for in filenames and AI summaries"]
    ) -> str:
        with Session(engine) as session:
            search_pattern = f"%{query}%"
            
            statement = (
                select(Media)
                .outerjoin(MediaSummary, Media.id == MediaSummary.media_id)
                .where(Media.user_id == self.user_id)
                .where(
                    or_(
                        Media.filename.ilike(search_pattern),
                        MediaSummary.summary.ilike(search_pattern)
                    )
                )
                .distinct()
            )
            
            results = session.exec(statement).all()
            
            media_list = []
            for m in results:
                thumb_statement = select(Thumbnail).where(Thumbnail.media_id == m.id)
                thumbs = session.exec(thumb_statement).all()
                
                media_list.append({
                    "id": m.id,
                    "filename": m.filename,
                    "content_type": m.content_type,
                    "summaries": [s.summary for s in m.summaries],
                    "thumbnails": [{"type": t.type, "s3_key": t.s3_key} for t in thumbs]
                })
            
            return json.dumps(media_list)

def get_kernel(user_id: int):
    kernel = sk.Kernel()
    
    service_id = "default"
    
    async_client = AsyncOpenAI(
        api_key=os.getenv("OPENROUTER_API_KEY"),
        base_url="https://openrouter.ai/api/v1",
        default_headers={
            "HTTP-Referer": os.getenv("SITE_URL", "http://localhost:3000"),
            "X-Title": os.getenv("SITE_NAME", "Autoray"),
        }
    )

    kernel.add_service(
        OpenAIChatCompletion(
            service_id=service_id,
            ai_model_id="deepseek/deepseek-r1",
            async_client=async_client
        )
    )
    
    kernel.add_plugin(MediaSearchPlugin(user_id), plugin_name="media_search")
    
    return kernel

def get_history(user_id: int, project_id: int) -> ChatHistory:
    session_key = f"{user_id}_{project_id}"
    if session_key not in histories:
        history = ChatHistory()
        history.add_system_message(
            "You are Autoray, a professional AI Video Editor Assistant with direct access to the user's media bin. "
            "You MUST use the 'search_media' tool whenever the user asks about their files, "
            "what's in their project, or if they are looking for specific content. "
            "Never say you don't have access to files; instead, use the search tool to find them."
        )
        histories[session_key] = history
    return histories[session_key]

async def chat_with_project_stream(user_id: int, project_id: int, message: str) -> AsyncGenerator[str, None]:
    kernel = get_kernel(user_id)
    chat_completion = kernel.get_service("default")
    history = get_history(user_id, project_id)
    
    history.add_user_message(message)
    
    execution_settings = OpenAIChatPromptExecutionSettings(
        service_id="default",
        tool_choice="auto",
    )

    while True:
        result = await chat_completion.get_chat_message_contents(
            chat_history=history,
            settings=execution_settings,
            kernel=kernel
        )
        
        msg = result[0]
        
        tool_calls = [item for item in msg.items if isinstance(item, sk.contents.function_call_content.FunctionCallContent)]
        if tool_calls:
            history.add_message(msg)
            for tc in tool_calls:
                yield f"EVENT:TOOL_CALL:{json.dumps({'function': tc.function_name, 'args': tc.arguments})}\n"
                
                tool_result = await kernel.invoke(
                    plugin_name=tc.plugin_name,
                    function_name=tc.function_name,
                    arguments=tc.arguments
                )
                
                result_msg = sk.contents.ChatMessageContent(
                    role=sk.contents.AuthorRole.TOOL,
                    items=[
                        sk.contents.function_result_content.FunctionResultContent(
                            function_name=tc.function_name,
                            plugin_name=tc.plugin_name,
                            id=tc.id,
                            result=tool_result.value
                        )
                    ]
                )
                history.add_message(result_msg)
                
                yield f"EVENT:TOOL_RESULT:{json.dumps({'function': tc.function_name, 'result': tool_result.value})}\n"
            
            continue
        
        if msg.content:
            history.add_message(msg)
            
            async for chunk in chat_completion.get_streaming_chat_message_contents(
                chat_history=history,
                settings=execution_settings,
                kernel=kernel
            ):
                if chunk[0].content:
                    yield f"TEXT:{chunk[0].content}"
        
        break


async def chat_with_project(user_id: int, project_id: int, message: str):
    kernel = get_kernel(user_id)
    chat_completion = kernel.get_service("default")
    history = get_history(user_id, project_id)
    
    history.add_user_message(message)
    
    result = await chat_completion.get_chat_message_contents(
        chat_history=history,
        settings=kernel.get_prompt_execution_settings_from_service_id("default")
    )
    
    response = str(result[0])
    history.add_assistant_message(response)
    return response