"""Groq Whisper Speech-to-Text integration for Voice Screening.

Converts candidate voice recordings into text transcripts using the Groq
hosted Whisper API. The API key is read from backend settings (GROQ_API_KEY)
and is never exposed to the frontend or printed to logs.
"""
import io
from typing import Optional

from loguru import logger
from groq import Groq

from app.core.config import get_settings

_settings = get_settings()

# Maximum accepted audio size (defaults to ~25 MB, matching Groq's request cap).
MAX_AUDIO_BYTES = 25 * 1024 * 1024

SUPPORTED_AUDIO_MIME_TYPES = {
    "audio/webm",
    "audio/wav",
    "audio/mpeg",
    "audio/mp4",
    "audio/x-m4a",
    "audio/ogg",
    "audio/aac",
    "audio/flac",
}


class GroqSTTError(Exception):
    """Raised when the Groq speech-to-text provider cannot produce a transcript.

    ``status_code`` lets callers map the failure to the correct HTTP response.
    """

    def __init__(self, message: str, status_code: int = 502) -> None:
        super().__init__(message)
        self.status_code = status_code


def validate_audio(content: bytes, content_type: Optional[str]) -> None:
    """Validate audio size and (when known) MIME type before calling Groq."""
    if not content:
        raise GroqSTTError("The recording is empty. Please record some audio.", status_code=400)

    if len(content) > MAX_AUDIO_BYTES:
        raise GroqSTTError(
            "The recording is too large. Please keep recordings under 25 MB.",
            status_code=413,
        )

    if content_type:
        base_type = content_type.split(";")[0].strip().lower()
        if base_type in SUPPORTED_AUDIO_MIME_TYPES:
            return
        if base_type.startswith("audio/"):
            # Accept any audio/* that Groq may support; unknown subtypes still
            # pass through so the provider can return a precise error.
            return
        raise GroqSTTError(
            f"Unsupported audio format: {content_type}. Please use a supported audio format.",
            status_code=415,
        )


def transcribe_audio(file_bytes: bytes, filename: str = "recording.webm", mime_type: Optional[str] = None) -> str:
    """Send audio bytes to Groq Whisper and return the transcript text.

    Falls back to the alternative whisper-large-v3 model if the preferred
    model is unavailable.
    """
    api_key = _settings.GROQ_API_KEY
    if not api_key or api_key == "your_groq_api_key_here":
        raise GroqSTTError(
            "Speech-to-text service is not configured. Set GROQ_API_KEY in backend/.env.",
            status_code=503,
        )

    validate_audio(file_bytes, mime_type)

    try:
        client = Groq(api_key=api_key)
    except Exception as e:  # pragma: no cover
        logger.error(f"Failed to initialise Groq client: {type(e).__name__}")
        raise GroqSTTError(
            "Could not initialise the speech-to-text service. Please try again later."
        )

    models = [_settings.GROQ_WHISPER_MODEL]
    if _settings.GROQ_WHISPER_MODEL != "whisper-large-v3":
        models.append("whisper-large-v3")

    last_error: Optional[GroqSTTError] = None

    for model in models:
        try:
            logger.info(f"Groq transcription started (model={model}).")
            transcription = client.audio.transcriptions.create(
                model=model,
                file=(filename, io.BytesIO(file_bytes), mime_type or "application/octet-stream"),
                response_format="json",
            )
            text = getattr(transcription, "text", "") or (transcription if isinstance(transcription, str) else "")
            text = str(text).strip()
            if not text:
                raise GroqSTTError(
                    "The speech-to-text service returned an empty transcript. Please try again.",
                    status_code=502,
                )
            logger.info(f"Groq transcription completed (model={model}).")
            return text
        except GroqSTTError as e:
            raise e
        except Exception as e:
            logger.error(f"Groq transcription failed ({model}): {type(e).__name__}")
            last_error = _map_groq_error(e)
            if last_error.status_code == 401 or last_error.status_code == 403:
                raise last_error
            if last_error.status_code == 429:
                raise last_error
            continue

    if last_error is not None:
        raise last_error
    raise GroqSTTError(
        "Could not transcribe the recording. Please try again later.",
        status_code=502,
    )


def _map_groq_error(exc: Exception) -> GroqSTTError:
    """Map common Groq SDK exception types to friendly GroqSTTError messages."""
    name = type(exc).__name__.lower()
    text = str(exc)
    low = text.lower()

    if "apikey" in low or name == "authenticationerror" or "invalid_api_key" in low:
        return GroqSTTError(
            "Speech-to-text service authentication failed. Check GROQ_API_KEY in backend/.env.",
            status_code=401,
        )
    if "permission" in name or "forbidden" in low or "unauthorized" in low or "403" in text:
        return GroqSTTError(
            "Speech-to-text service denied access. Check that GROQ_API_KEY is valid.",
            status_code=403,
        )
    if "rate" in low or "quota" in low or "429" in text or "limit" in low:
        return GroqSTTError(
            "Speech-to-text service rate limit reached. Please try again later.",
            status_code=429,
        )
    if "timeout" in name or "timeout" in low or "deadline" in low:
        return GroqSTTError(
            "The speech-to-text service timed out. Please try again in a moment.",
            status_code=502,
        )
    if "model" in low and ("not" in low or "unavailable" in low or "not_found" in low):
        return GroqSTTError(
            "The selected speech-to-text model is not available. Update GROQ_WHISPER_MODEL in backend/.env.",
            status_code=502,
        )
    if "service_unavailable" in low or "503" in text:
        return GroqSTTError(
            "The speech-to-text service is temporarily unavailable. Please try again later.",
            status_code=502,
        )
    if "unsupported" in low or "invalid" in low or "400" in text or "unsupported_file" in low:
        return GroqSTTError(
            "The recording format is not supported by the speech-to-text service. Please try a different format.",
            status_code=415,
        )

    return GroqSTTError(
        "Could not transcribe the recording. Please try again later.",
        status_code=502,
    )
