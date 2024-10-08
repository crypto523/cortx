import asyncio
import os
from typing import Optional
from uuid import UUID

from fastapi.responses import StreamingResponse

from auth import AuthBearer, get_current_user
from celery_worker import process_file_and_notify
from fastapi import APIRouter, Depends, HTTPException, Query, Request, UploadFile
from logger import get_logger
from models import Brain, UserIdentity, UserUsage
from models.databases.supabase.knowledge import CreateKnowledgeProperties
from models.databases.supabase.notifications import CreateNotificationProperties
from models.notifications import NotificationsStatusEnum
from repository.brain import get_brain_details
from repository.files.upload_file import upload_file_storage
from repository.knowledge.add_knowledge import add_knowledge
from repository.knowledge.get_all_knowledge import get_all_knowledge
from repository.notification.add_notification import add_notification
from repository.user_identity import get_user_identity
from routes.authorizations.brain_authorization import (
    RoleEnum,
    validate_brain_authorization,
)
from utils.file import convert_bytes, get_file_size

logger = get_logger(__name__)
upload_router = APIRouter()

@upload_router.get("/upload/healthz", tags=["Streaming"])
async def healthz():
    return {'status':'ok'}

@upload_router.post("/upload", dependencies=[Depends(AuthBearer())], tags=["Upload"])
async def upload_file(
    request: Request,
    file_path: str,
    uploadFile: UploadFile,
    brain_id: UUID = Query(..., description="The ID of the brain"),
    chat_id: Optional[UUID] = Query(None, description="The ID of the chat"),
    enable_summarization: bool = False,
    current_user: UserIdentity = Depends(get_current_user),
):
    validate_brain_authorization(
        brain_id, current_user.id, [RoleEnum.Editor, RoleEnum.Owner]
    )
    brain = Brain(id=brain_id)
    userDailyUsage = UserUsage(
        id=current_user.id,
        email=current_user.email,
        openai_api_key=current_user.openai_api_key,
    )
    userSettings = userDailyUsage.get_user_settings()

    if request.headers.get("Openai-Api-Key"):
        brain.max_brain_size = userSettings.get("max_brain_size", 1000000000) # type: ignore

    remaining_free_space = userSettings.get("max_brain_size", 1000000000) # type: ignore

    file_size = get_file_size(uploadFile)
    
    if remaining_free_space - file_size < 0:
        message = {
            "message": f"❌ UserIdentity's brain will exceed maximum capacity with this upload. Maximum file allowed is : {convert_bytes(remaining_free_space)}",
            "type": "error",
        }
        return message
    upload_notification = None
    if chat_id:
        upload_notification = add_notification(
            CreateNotificationProperties(
                action="UPLOAD",
                chat_id=chat_id,
                status=NotificationsStatusEnum.Pending,
            )
        )
    openai_api_key = request.headers.get("Openai-Api-Key", None)
    if openai_api_key is None:
        brain_details = get_brain_details(brain_id)
        if brain_details:
            openai_api_key = brain_details.openai_api_key
    if openai_api_key is None:
        openai_api_key = get_user_identity(current_user.id).openai_api_key
    # Given file path and file name
    # Split the file path into directory path and file name
    directory_path, old_file_name = file_path.rsplit('/', 1)
    directory_path += '/'

    # Update the file name in the file path with the dynamic file name
    if uploadFile.filename is not None:
        file_path = directory_path + uploadFile.filename


    file_content = await uploadFile.read()
    filename_with_brain_id = str(brain_id) + "/" + str(uploadFile.filename)
    try:
        fileInStorage = upload_file_storage(file_content, filename_with_brain_id)
        logger.info(f"File {fileInStorage} uploaded successfully")

    except Exception as e:
        if "The resource already exists" in str(e):
            raise HTTPException(
                status_code=403,
                detail=f"File {uploadFile.filename} already exists in storage.",
            )
        else:
            raise HTTPException(
                status_code=500, detail="Failed to upload file to storage."
            )

    knowledge_to_add = CreateKnowledgeProperties(
        brain_id=brain_id,
        file_name=uploadFile.filename,
        file_path = file_path,
        extension=os.path.splitext(
            uploadFile.filename  # pyright: ignore reportPrivateUsage=none
        )[-1].lower(),
    )

    added_knowledge = add_knowledge(knowledge_to_add)
    logger.info(f"Knowledge {added_knowledge} added successfully")

    process_file_and_notify.delay( # type: ignore
        file_name=filename_with_brain_id,
        file_original_name=uploadFile.filename,
        enable_summarization=enable_summarization,
        brain_id=brain_id,
        openai_api_key=openai_api_key,
        notification_id=upload_notification.id if upload_notification else None,
    )
    return {"message": "File processing has started."}

@upload_router.get("/fileStructure")
async def fileStructure(
    brain_id: UUID = Query(..., description="The ID of the brain"),
    # current_user: UserIdentity = Depends(get_current_user),
):
    result = get_all_knowledge(
        brain_id=brain_id,
    )
    file_paths = [item["file_path"] for item in result if item["file_path"] is not None] # type: ignore
    sorted_file_paths = sorted(file_paths, key=os.path.basename)
    return {"file_paths": sorted_file_paths}
