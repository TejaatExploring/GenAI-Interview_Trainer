import shutil
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.services.speech_service import SpeechService

router = APIRouter()


@router.post("/transcribe")
async def transcribe_audio(audio: UploadFile = File(...)):
    suffix = Path(audio.filename or "audio.wav").suffix or ".wav"
    tmp_path = Path(f"/tmp/{uuid4()}{suffix}")

    try:
        with tmp_path.open("wb") as buffer:
            shutil.copyfileobj(audio.file, buffer)

        speech_service = SpeechService()
        text = speech_service.transcribe(tmp_path)
        return {"transcript": text}
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {exc}") from exc
    finally:
        if tmp_path.exists():
            tmp_path.unlink(missing_ok=True)
