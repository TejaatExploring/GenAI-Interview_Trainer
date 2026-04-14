import { useState } from "react";

import { AnswerInput } from "../components/AnswerInput";
import { FeedbackCard } from "../components/FeedbackCard";
import { InterviewSetupForm } from "../components/InterviewSetupForm";
import { QuestionPanel } from "../components/QuestionPanel";
import { completeSession, createSession, getNextQuestion, submitAnswer } from "../services/interviewApi";
import type { EvaluationResponse, QuestionResponse, SessionRequest } from "../types";

interface Props {
  onSessionComplete: () => void;
}

export function InterviewPage({ onSessionComplete }: Props) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [question, setQuestion] = useState<QuestionResponse | null>(null);
  const [evaluation, setEvaluation] = useState<EvaluationResponse | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function getErrorMessage(err: unknown) {
    if (typeof err === "object" && err !== null && "message" in err) {
      return String((err as { message?: unknown }).message ?? "Unknown error");
    }
    return "Request failed. Please check backend logs and try again.";
  }

  async function startInterview(payload: SessionRequest) {
    setIsStarting(true);
    setError(null);
    try {
      const session = await createSession(payload);
      setSessionId(session.session_id);
      const nextQuestion = await getNextQuestion(session.session_id, []);
      setQuestion(nextQuestion);
      setEvaluation(null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsStarting(false);
    }
  }

  async function evaluate(answerText: string) {
    if (!sessionId || !question) return;
    setIsEvaluating(true);
    setError(null);
    try {
      const result = await submitAnswer(sessionId, question.question_id, answerText);
      setEvaluation(result);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsEvaluating(false);
    }
  }

  async function finishSession() {
    if (!sessionId) return;
    setIsCompleting(true);
    setError(null);
    try {
      await completeSession(sessionId);
      onSessionComplete();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsCompleting(false);
    }
  }

  return (
    <div className="stack interview-page">
      <InterviewSetupForm onStart={startInterview} isStarted={Boolean(sessionId)} />
      {isStarting ? <div className="card status-card">Starting interview and generating question...</div> : null}
      {error ? <div className="card status-card error-card">Error: {error}</div> : null}
      <div className={sessionId ? "session-area session-active" : "session-area session-inactive"}>
        <QuestionPanel question={question} />
        <AnswerInput onSubmit={evaluate} />
        <FeedbackCard evaluation={evaluation} isEvaluating={isEvaluating} />
        {sessionId ? (
          <button className="primary-action" onClick={finishSession} disabled={isCompleting}>
            {isCompleting ? "Completing..." : "Complete Session"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
