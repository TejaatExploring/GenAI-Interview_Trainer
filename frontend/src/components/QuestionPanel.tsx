import { useEffect, useMemo } from "react";

import type { QuestionResponse } from "../types";

interface Props {
  question: QuestionResponse | null;
  isGenerating?: boolean;
  autoSpeak?: boolean;
}

export function QuestionPanel({ question, isGenerating = false, autoSpeak = true }: Props) {
  const speechSupported = useMemo(
    () => typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window,
    [],
  );

  function speakQuestion() {
    if (!question || !speechSupported) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(question.payload.question);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
  }

  useEffect(() => {
    if (!autoSpeak || !question || !speechSupported) return;
    speakQuestion();

    return () => {
      window.speechSynthesis.cancel();
    };
  }, [question?.question_id, autoSpeak, speechSupported]);

  if (isGenerating) {
    return (
      <div className="chat-message ai-message loading-card">
        <div className="chat-avatar ai-avatar">AI</div>
        <div className="chat-bubble">
          <p className="eyebrow">AI Interviewer</p>
          <h4>Thinking of your next question...</h4>
          <div className="typing-indicator" aria-label="AI is typing">
            <span />
            <span />
            <span />
          </div>
        </div>
      </div>
    );
  }

  if (!question) {
    return <div className="chat-empty-state">Start AI Interview to begin the conversation.</div>;
  }

  return (
    <div className="chat-message ai-message">
      <div className="chat-avatar ai-avatar">AI</div>
      <div className="chat-bubble">
        <div className="chat-head">
          <p className="eyebrow">AI Interviewer</p>
          <div className="chip-row">
            <span className="chat-chip">Q{question.sequence_number}</span>
            <span className={question.source === "fallback" ? "source-badge fallback" : "source-badge ai"}>
              {question.source === "fallback" ? "Fallback" : "AI"}
            </span>
          </div>
        </div>
        <p className="card-subtitle">Topic: {question.payload.topic}</p>
        <p className="question-copy">{question.payload.question}</p>
        {speechSupported ? (
          <div className="chat-row">
            <button className="secondary-action" onClick={speakQuestion} type="button">
              Replay Audio Question
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
