from pathlib import Path
import shutil

import whisper

from app.core.config import settings


class SpeechService:
    def __init__(self):
        if shutil.which("ffmpeg") is None:
            raise RuntimeError(
                "FFmpeg is not installed or not in PATH. Install FFmpeg to enable speech transcription."
            )
        self.model = whisper.load_model(settings.whisper_model)

    def transcribe(self, audio_path: Path) -> str:
        # Force CPU-safe precision; the FP16 warning is informational only.
        result = self.model.transcribe(str(audio_path), fp16=False)
        return result.get("text", "").strip()
