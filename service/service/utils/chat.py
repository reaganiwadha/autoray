import os
from langchain_openai import ChatOpenAI
from langchain.memory import ConversationBufferMemory
from langchain.chains import ConversationChain
from langchain.prompts import PromptTemplate

# Dictionary to store memory per user/project session
# In a real app, this should be persistent (e.g. in DB)
memories = {}

def get_chat_chain(user_id: int, project_id: int):
    session_key = f"{user_id}_{project_id}"
    
    if session_key not in memories:
        memories[session_key] = ConversationBufferMemory()
    
    memory = memories[session_key]
    
    llm = ChatOpenAI(
        model_name="deepseek/deepseek-chat",
        openai_api_key=os.getenv("OPENROUTER_API_KEY"),
        openai_api_base="https://openrouter.ai/api/v1",
        default_headers={
            "HTTP-Referer": os.getenv("SITE_URL", "http://localhost:3000"),
            "X-Title": os.getenv("SITE_NAME", "Autoray"),
        }
    )
    
    template = """The following is a friendly conversation between a human and an AI Video Editor Assistant named Autoray. 
    The AI is helpful and helps the user organize, analyze, and edit their media projects.
    
    Current conversation:
    {history}
    Human: {input}
    Autoray:"""
    
    PROMPT = PromptTemplate(input_variables=["history", "input"], template=template)
    
    chain = ConversationChain(
        llm=llm,
        verbose=True,
        memory=memory,
        prompt=PROMPT
    )
    
    return chain

async def chat_with_project(user_id: int, project_id: int, message: str):
    chain = get_chat_chain(user_id, project_id)
    response = await chain.ainvoke(input=message)
    return response["response"]
