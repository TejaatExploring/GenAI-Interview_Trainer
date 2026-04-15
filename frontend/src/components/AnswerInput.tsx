import { useEffect, useRef, useState } from "react";
import { transcribeAudio } from "../services/interviewApi";

interface Props {
  onSubmit: (answerText: string) => Promise<void>;
  disabled?: boolean;
  isSubmitting?: boolean;
  resetKey?: string | null;
}

export function AnswerInput({ onSubmit, disabled = false, isSubmitting = false, resetKey }: Props) {
  const [answer, setAnswer] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  useEffect(() => {
    setAnswer("");
    setVoiceError(null);
  }, [resetKey]);

  async function handleSubmit() {
    const normalized = answer.trim();
    if (!normalized || disabled || isSubmitting || isTranscribing) {
      return;
    }

    // Clear immediately to mimic chat composer behavior.
    setAnswer("");
    await onSubmit(normalized);
  }

  async function onComposerKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      await handleSubmit();
    }
  }

  async function recordVoiceAnswer() {
    if (isRecording && recorderRef.current) {
      recorderRef.current.stop();
      setIsRecording(false);
      return;
    }

    if (!navigator.mediaDevices || typeof MediaRecorder === "undefined") {
      setVoiceError("Voice recording is not supported in this browser.");
      return;
    }

    setVoiceError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      streamRef.current = stream;
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        setIsTranscribing(true);
        try {
          const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
          const result = await transcribeAudio(audioBlob);
          setAnswer((current) => [current, result.transcript].filter(Boolean).join(" "));
        } catch {
          setVoiceError("Transcription failed. Ensure FFmpeg is installed and backend is running.");
        } finally {
          setIsTranscribing(false);
          streamRef.current?.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
          recorderRef.current = null;
          chunksRef.current = [];
        }
      };

      recorder.start();
      setIsRecording(true);
    } catch {
      setVoiceError("Microphone permission denied or unavailable.");
    }
  }

  return (
    <div className="chat-composer chatgpt-composer">
      <div className="chatgpt-composer-shell">
        <textarea
          className="chatgpt-input"
          rows={1}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onKeyDown={onComposerKeyDown}
          placeholder={disabled ? "Waiting for next AI question..." : "Ask anything"}
          disabled={disabled || isSubmitting || isTranscribing}
        />

        <div className="composer-actions">
          <button
            className={isRecording ? "icon-btn composer-mic recording" : "icon-btn composer-mic"}
            onClick={recordVoiceAnswer}
            disabled={disabled || isSubmitting || isTranscribing}
            type="button"
            aria-label="Record voice"
          >
            {isRecording ? (
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                <rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" />
              </svg>
            ) : isTranscribing ? (
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                <circle cx="12" cy="12" r="3" fill="currentColor" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                <path
                  d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Zm-5 9a1 1 0 1 0-2 0 7 7 0 0 0 6 6.92V21H8a1 1 0 1 0 0 2h8a1 1 0 1 0 0-2h-3v-2.08A7 7 0 0 0 19 12a1 1 0 1 0-2 0 5 5 0 0 1-10 0Z"
                  fill="currentColor"
                />
              </svg>
            )}
          </button>

          <button
            className="icon-btn composer-send"
            onClick={handleSubmit}
            disabled={disabled || !answer.trim() || isSubmitting || isTranscribing}
            type="button"
            aria-label="Send answer"
          >
            {isSubmitting ? "..." : "->"}
          </button>
        </div>
      </div>

      <div className="composer-hint">Press Enter to send, Shift+Enter for new line.</div>

      {voiceError ? <p className="error-text">{voiceError}</p> : null}
    </div>
  );
}
