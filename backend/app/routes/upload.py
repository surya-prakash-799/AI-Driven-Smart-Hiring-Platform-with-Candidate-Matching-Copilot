import json
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from loguru import logger
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.routes.deps import get_current_user
from app.schemas.candidate import CandidateResponse, UploadResponse
from app.services import extractor, parser
from app.services.candidate_service import upsert_candidate_from_extraction
from app.utils.file_helper import (
    cleanup_artifacts,
    generate_unique_filename,
    get_extracted_path,
    get_file_extension,
    save_upload_file,
    validate_file_extension,
    validate_file_signature,
)

router = APIRouter(dependencies=[Depends(get_current_user)])
settings = get_settings()

_ALLOWED_MEDIA_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/octet-stream",  # some browsers/OS report PDF/DOCX as a generic binary type
}


@router.post(
    "/upload",
    response_model=UploadResponse,
    summary="Upload a resume",
    description="Upload a PDF or DOCX resume file (max 10MB). The file is validated, parsed, and candidate information is extracted and saved to the database.",
    responses={
        200: {"description": "Resume uploaded and parsed successfully"},
        400: {"description": "Invalid file type, content mismatch, or validation error"},
        413: {"description": "File too large"},
        500: {"description": "Internal server error"},
    },
)
async def upload_resume(
    file: UploadFile = File(
        ...,
        description="Resume file (PDF or DOCX, max 10MB)",
        media_type="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ),
    db: Session = Depends(get_db),
):
    logger.info(f"Upload initiated: {file.filename}")

    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    ext = get_file_extension(file.filename)
    if not validate_file_extension(file.filename):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Allowed types: {', '.join(settings.ALLOWED_EXTENSIONS)}",
        )

    if file.content_type and file.content_type not in _ALLOWED_MEDIA_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported media type '{file.content_type}'. Allowed: PDF or DOCX.",
        )

    content = await file.read()
    if len(content) > settings.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File size exceeds maximum allowed size of {settings.MAX_FILE_SIZE // (1024 * 1024)} MB",
        )
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    if not validate_file_signature(content, ext):
        raise HTTPException(
            status_code=400,
            detail=f"File content does not match the declared .{ext} extension",
        )

    unique_filename = generate_unique_filename(file.filename)
    file_path = ""
    try:
        file_path = await save_upload_file(file, unique_filename, content=content)
    except Exception as e:
        logger.error(f"File save failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to save uploaded file")

    try:
        resume_text = parser.parse_resume(file_path)
    except ValueError as e:
        cleanup_artifacts(file_path)
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Resume parsing failed: {e}")
        cleanup_artifacts(file_path)
        raise HTTPException(status_code=500, detail="Failed to parse resume")

    try:
        extracted_data = extractor.extract_information(resume_text)
    except Exception as e:
        logger.error(f"Information extraction failed: {e}")
        cleanup_artifacts(file_path)
        raise HTTPException(
            status_code=500, detail="Failed to extract information from resume"
        )

    extracted_path = get_extracted_path(f"{Path(unique_filename).stem}.json")
    try:
        with open(extracted_path, "w", encoding="utf-8") as f:
            json.dump(extracted_data, f, indent=2, ensure_ascii=False)
        logger.info(f"Extracted data saved to: {extracted_path}")
    except Exception as e:
        logger.warning(f"Failed to save extracted data: {e}")

    try:
        candidate = upsert_candidate_from_extraction(
            db, extracted_data, resume_text, unique_filename
        )
    except Exception as e:
        logger.error(f"Database save failed: {e}")
        cleanup_artifacts(file_path, extracted_path)
        raise HTTPException(status_code=500, detail="Failed to save candidate to database")

    logger.info(f"Upload complete: candidate_id={candidate.id}")

    return UploadResponse(
        status="success",
        message="Resume uploaded, parsed, and candidate information extracted successfully",
        candidate=CandidateResponse.model_validate(candidate),
        extracted_data=extracted_data,
    )
