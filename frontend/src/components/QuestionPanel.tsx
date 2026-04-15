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
      <div className="card glass-card ai-event-card loading-card">
        <h3>AI Interviewer</h3>
        <div className="typing-indicator" aria-label="AI is typing">
          <span />
          <span />
          <span />
        </div>
        <p className="card-subtitle">AI is generating question...</p>
      </div>
    );
  }

  if (!question) {
    return <div className="card muted-card">Start AI Interview to generate your first question.</div>;
  }

  return (
    <div className="card glass-card ai-event-card">
      <p className="eyebrow">AI Interviewer</p>
      <h3>Question #{question.sequence_number}</h3>
      <p className="card-subtitle">Topic: {question.payload.topic}</p>
      <p className="question-copy">{question.payload.question}</p>
      {speechSupported ? (
        <div className="action-row">
          <button className="secondary-action" onClick={speakQuestion} type="button">
            Replay Audio Question
          </button>
        </div>
      ) : null}
    </div>
  );
}
