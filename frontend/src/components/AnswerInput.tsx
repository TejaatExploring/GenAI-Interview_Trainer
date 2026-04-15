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
    <div className="card glass-card">
      <h3>Your Answer</h3>
      <p className="card-subtitle">Respond in text or record voice, then submit for AI coaching feedback.</p>
      <textarea
        rows={8}
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder={disabled ? "Generate a question to unlock your answer box..." : "Write your interview answer here..."}
        disabled={disabled || isSubmitting || isTranscribing}
      />
      <div className="action-row">
        <button
          className="primary-action"
          onClick={() => onSubmit(answer)}
          disabled={disabled || !answer.trim() || isSubmitting || isTranscribing}
        >
          {isSubmitting ? "Analyzing answer..." : "Submit Answer"}
        </button>
        <button
          className={isRecording ? "secondary-action mic-action recording" : "secondary-action mic-action"}
          onClick={recordVoiceAnswer}
          disabled={disabled || isSubmitting || isTranscribing}
        >
          {isRecording ? "Stop Recording" : isTranscribing ? "Transcribing..." : "Record Voice"}
        </button>
      </div>
      {voiceError ? <p className="error-text">{voiceError}</p> : null}
    </div>
  );
}
