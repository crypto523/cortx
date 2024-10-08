import json
import os

from git import exc

from celery_worker import process_file_and_notify
from models.databases.supabase.knowledge import CreateKnowledgeProperties
from repository.files.upload_file import upload_file_storage
from repository.knowledge.add_knowledge import add_knowledge

if __name__ == "__main__":
    # import needed here when running main.py to debug backend
    # you will need to run pip install python-dotenv
    from dotenv import load_dotenv  # type: ignore

    load_dotenv()
import pypandoc
import sentry_sdk
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from logger import get_logger
from middlewares.cors import add_cors_middleware
##routers
from routes.api_key_routes import api_key_router
from routes.brain_routes import brain_router
from routes.chat_routes import chat_router
from routes.crawl_routes import crawl_router
from routes.explore_routes import explore_router
from routes.knowledge_routes import knowledge_router
from routes.misc_routes import misc_router
from routes.notification_routes import notification_router
from routes.onboarding_routes import onboarding_router
from routes.prompt_routes import prompt_router
from routes.subscription_routes import subscription_router
from routes.upload_routes import upload_router
from routes.user_routes import user_router
from models.files import File
from docx import Document
import io
import requests
logger = get_logger(__name__)

# if (os.getenv("DEV_MODE") == "true"):
#     import debugpy
#     logger.debug("👨‍💻 Running in dev mode")
#     debugpy.listen(("0.0.0.0", 5678))

from dotenv import load_dotenv

load_dotenv()

sentry_dsn = os.getenv("SENTRY_DSN")
if sentry_dsn:
    sentry_sdk.init(
        dsn=sentry_dsn,
        traces_sample_rate=1.0,
    )

app = FastAPI()

add_cors_middleware(app)


# @app.on_event("startup")
# async def startup_event():
#     if not os.path.exists(pypandoc.get_pandoc_path()):
#         pypandoc.download_pandoc()


app.include_router(brain_router)
app.include_router(chat_router)
app.include_router(crawl_router)
app.include_router(onboarding_router)
app.include_router(explore_router)
app.include_router(misc_router)

app.include_router(upload_router)
app.include_router(user_router)
app.include_router(api_key_router)
app.include_router(subscription_router)
app.include_router(prompt_router)
app.include_router(notification_router)
app.include_router(knowledge_router)

@app.exception_handler(HTTPException)
async def http_exception_handler(_, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )

# log more details about validation errors (422)
def handle_request_validation_error(app: FastAPI):
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ):
        exc_str = f"{exc}".replace("\n", " ").replace("   ", " ")
        logger.error(request, exc_str)
        content = {
            "status_code": status.HTTP_422_UNPROCESSABLE_ENTITY,
            "message": exc_str,
            "data": None,
        }
        return JSONResponse(
            content=content, status_code=status.HTTP_422_UNPROCESSABLE_ENTITY
        )

@app.post('/ETL')
async def hello(request: Request):
    data = await request.body()
    data_str = data.decode('utf-8')
    brain_id="92c13932-3055-4122-8827-65ed5c9cb6a9"
    try:
        json_obj = json.loads(data_str)
        file_content_link = json_obj['data']
        file_name_temp = json_obj['file_name']
        file_name = file_name_temp.replace(' ','_').replace("<", "").replace(">", "").replace("]", "").replace("[", "").replace("/", "-")
    except:
        file_content_link = ""
        file_name = ""
    knowledge_to_add = CreateKnowledgeProperties(
        brain_id=brain_id, # type: ignore
        file_name=f'{file_name}.txt',
        file_path = f"Gdrive/{file_name}.txt",
        extension=".txt",
    )
    filename_with_brain_id = str(brain_id) + "/" + str(file_name) + '.txt'
    added_knowledge = add_knowledge(knowledge_to_add)
    #get file content
    response = requests.get(file_content_link)

    if response.status_code == 200:
        with open("downloaded_file.docx", "wb") as file:
            file.write(response.content)
            print("File downloaded successfully")
    else:
        print("Failed to download file")

    # Print the content of the file
    docx_file_path = "downloaded_file.docx"

    doc = Document(docx_file_path)
    file_content = ''
    for paragraph in doc.paragraphs:
        # print(paragraph.text)
        file_content += paragraph.text
        
    print("File downloaded successfully", file_content)

    # Remove the file
    os.remove(docx_file_path)
    print("File removed successfully")
    file_content_encoded = file_content.encode('utf-8')
    try:
        fileInStorage = upload_file_storage(file_content_encoded, filename_with_brain_id)
        logger.info(f"File {fileInStorage} uploaded successfully")

    except Exception as e:
        if "The resource already exists" in str(e):
            raise HTTPException(
                status_code=403,
                detail=f"File {file_name} already exists in storage.",
            )
        else:
            raise HTTPException(
                status_code=500, detail="Failed to upload file to storage."
            )
    
    process_file_and_notify.delay( # type: ignore
        file_name=filename_with_brain_id,
        file_original_name=file_name,
        enable_summarization='false',
        brain_id=brain_id,
        openai_api_key=os.getenv('OPENAI_API_KEY'),
        notification_id=None,
    )
    return {'content':file_content,'filename':file_name}
    
handle_request_validation_error(app)

if __name__ == "__main__":
    # run main.py to debug backend
    import uvicorn

    uvicorn.run('main:app', host="localhost", port=5050, reload=True)