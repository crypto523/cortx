from uuid import UUID
import os
from auth import AuthBearer, get_current_user
from fastapi import APIRouter, Depends, HTTPException
from logger import get_logger
from models import UserIdentity, UserUsage
from models.brain_entity import PublicBrain
from models.databases.supabase.brains import (
    BrainQuestionRequest,
    BrainUpdatableProperties,
    CreateBrainProperties,
)
from repository.brain import (
    create_brain,
    create_brain_user,
    delete_brain_users,
    get_brain_details,
    get_default_user_brain_or_create_new,
    get_public_brains,
    get_question_context_from_brain,
    get_user_brains,
    get_user_default_brain,
    set_as_default_brain_for_user,
    update_brain_by_id,
)
from repository.prompt import delete_prompt_by_id, get_prompt_by_id
from routes.authorizations.brain_authorization import has_brain_authorization
from routes.authorizations.types import RoleEnum
from pydantic import BaseModel
from fastapi.security import OAuth2PasswordRequestForm
from google_auth_oauthlib.flow import Flow



import os.path

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# If modifying these scopes, delete the file token.json.
SCOPES = ['https://www.googleapis.com/auth/drive.metadata.readonly']

logger = get_logger(__name__)
brain_router = APIRouter()

class Document(BaseModel):
    url: str
    access_token: object

@brain_router.get('/brains/ETL')
async def hello():
    return "hello"

@brain_router.get("/brains/", dependencies=[Depends(AuthBearer())], tags=["Brain"])
async def retrieve_all_brains_for_user(
    current_user: UserIdentity = Depends(get_current_user),
):
    """Retrieve all brains for the current user."""
    brains = get_user_brains(current_user.id)
    return {"brains": brains}


@brain_router.get(
    "/brains/public", dependencies=[Depends(AuthBearer())], tags=["Brain"]
)
async def retrieve_public_brains() -> list[PublicBrain]:
    """Retrieve all Quivr public brains."""
    return get_public_brains()


@brain_router.get(
    "/brains/default/", dependencies=[Depends(AuthBearer())], tags=["Brain"]
)
async def retrieve_default_brain(
    current_user: UserIdentity = Depends(get_current_user),
):
    """Retrieve or create the default brain for the current user."""
    brain = get_default_user_brain_or_create_new(current_user)
    return {"id": brain.brain_id, "name": brain.name, "rights": "Owner"}


@brain_router.get(
    "/brains/{brain_id}/",
    dependencies=[Depends(AuthBearer()), Depends(has_brain_authorization())],
    tags=["Brain"],
)
async def retrieve_brain_by_id(brain_id: UUID):
    """Retrieve details of a specific brain by its ID."""
    brain_details = get_brain_details(brain_id)
    if brain_details is None:
        raise HTTPException(status_code=404, detail="Brain details not found")
    return brain_details


@brain_router.post("/brains/", dependencies=[Depends(AuthBearer())], tags=["Brain"])
async def create_new_brain(
    brain: CreateBrainProperties, current_user: UserIdentity = Depends(get_current_user)
):
    """Create a new brain for the user."""
    user_brains = get_user_brains(current_user.id)
    user_usage = UserUsage(
        id=current_user.id,
        email=current_user.email,
        openai_api_key=current_user.openai_api_key,
    )
    user_settings = user_usage.get_user_settings()

    if len(user_brains) >= user_settings.get("max_brains", 5):  # type: ignore
        raise HTTPException(
            status_code=429,
            detail=f"Maximum number of brains reached ({user_settings.get('max_brains', 5)}).",  # type: ignore
        )

    new_brain = create_brain(brain)
    if get_user_default_brain(current_user.id):
        logger.info(f"Default brain already exists for user {current_user.id}")
        create_brain_user(
            user_id=current_user.id,
            brain_id=new_brain.brain_id,
            rights=RoleEnum.Owner,
            is_default_brain=False,
        )
    else:
        logger.info(f"Creating default brain for user {current_user.id}.")
        create_brain_user(
            user_id=current_user.id,
            brain_id=new_brain.brain_id,
            rights=RoleEnum.Owner,
            is_default_brain=True,
        )

    return {"id": new_brain.brain_id, "name": brain.name, "rights": "Owner"}


@brain_router.put(
    "/brains/{brain_id}/",
    dependencies=[
        Depends(AuthBearer()),
        Depends(has_brain_authorization([RoleEnum.Editor, RoleEnum.Owner])),
    ],
    tags=["Brain"],
)
async def update_existing_brain(
    brain_id: UUID, brain_update_data: BrainUpdatableProperties
):
    """Update an existing brain's configuration."""
    existing_brain = get_brain_details(brain_id)
    if existing_brain is None:
        raise HTTPException(status_code=404, detail="Brain not found")

    if brain_update_data.prompt_id is None and existing_brain.prompt_id:
        prompt = get_prompt_by_id(existing_brain.prompt_id)
        if prompt and prompt.status == "private":
            delete_prompt_by_id(existing_brain.prompt_id)

    if brain_update_data.status == "private" and existing_brain.status == "public":
        delete_brain_users(brain_id)

    update_brain_by_id(brain_id, brain_update_data)
    return {"message": f"Brain {brain_id} has been updated."}


@brain_router.post(
    "/brains/{brain_id}/default",
    dependencies=[Depends(AuthBearer()), Depends(has_brain_authorization())],
    tags=["Brain"],
)
async def set_brain_as_default(
    brain_id: UUID, user: UserIdentity = Depends(get_current_user)
):
    """Set a brain as the default for the current user."""
    set_as_default_brain_for_user(user.id, brain_id)
    return {"message": f"Brain {brain_id} has been set as default brain."}


@brain_router.post(
    "/brains/{brain_id}/question_context",
    dependencies=[Depends(AuthBearer()), Depends(has_brain_authorization())],
    tags=["Brain"],
)
async def get_question_context_for_brain(brain_id: UUID, request: BrainQuestionRequest):
    """Retrieve the question context from a specific brain."""
    context = get_question_context_from_brain(brain_id, request.question)  # type: ignore
    return {"context": context}

@brain_router.get('/brains/extract-transform-load')
async def extract_transform_load():
    creds = None
    # The file token.json stores the user's access and refresh tokens, and is
    # created automatically when the authorization flow completes for the first
    # time.
    if os.path.exists('token.json'):
        creds = Credentials.from_authorized_user_file('token.json', SCOPES)

    # If there are no (valid) credentials available, let the user log in.
    if not creds or not creds.valid:

        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(
                'credentials.json',
                 SCOPES,
                 redirect_uri='http://localhost:5051')
            # flow = InstalledAppFlow.from_client_config(
            #     client_config,
            #     scopes=["https://www.googleapis.com/auth/calendar"]
            # )
            # authorization_url, _ = flow.authorization_url(prompt='consent')
            # print(authorization_url)
            credentials  = flow.run_local_server(port=5051)
            # print('credentials',credentials)
            # creds = credentials.credentials
            # print('creds',creds)
            authorization_code = '4/2F0AfJohXmTaEjjlGlRqNIGN3DhmNr87HZo-vTr3mhw6LCKSAfsv08QmTyKsx36mfPDMh3wzg'
            # flow.fetch_token(code=authorization_code)
            # credentials = flow.credentials
            # access_token = credentials.token
            # refresh_token = credentials.refresh_token
            # print('Access Token:', access_token)
            # print('Refresh Token:', refresh_token)

            # Exchange the authorization code for tokens
            # creds.fetch_token(authorization_response=authorization_code)

            # Retrieve the access token and refresh token
            # access_token = creds.token
            # refresh_token = creds.refresh_token

            # Use the tokens for authorized API requests
            # print("Access Token:", access_token)
            # print("Refresh Token:", refresh_token)


        # Save the credentials for the next run
        with open('token.json', 'w') as token:
            token.write(credentials.to_json())  # type: ignore
    try:

        service = build('drive', 'v3', credentials=credentials)  # type: ignore

        # Call the Drive v3 API
        results = service.files().get(fileId='1YK1M68j5n8QzEYUCx8iKFp3i6IFDz0bJkURBNF3m2mo').execute()
        print(results)
        items = results.get('files', [])

        if not items:
            print('No files found.')
            return
        print('Files:')
        for item in items:
            print(u'{0} ({1})'.format(item['name'], item['id']))
    except HttpError as error:
        # TODO(developer) - Handle errors from drive API.
        print(f'An error occurred: {error}')