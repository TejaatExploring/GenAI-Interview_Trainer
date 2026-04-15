import { useMemo, useState } from "react";

import { AnswerInput } from "../components/AnswerInput";
import { FeedbackCard } from "../components/FeedbackCard";
import { InterviewSetupForm } from "../components/InterviewSetupForm";
import { QuestionPanel } from "../components/QuestionPanel";
import { completeSession, createSession, getNextQuestion, submitAnswer } from "../services/interviewApi";
import type { EvaluationResponse, InterviewMode, QuestionResponse, SessionRequest } from "../types";

interface Props {
  onSessionComplete: () => void;
}

export function InterviewPage({ onSessionComplete }: Props) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionMode, setSessionMode] = useState<InterviewMode>("Practice");
  const [targetQuestions, setTargetQuestions] = useState(1);
  const [question, setQuestion] = useState<QuestionResponse | null>(null);
  const [evaluation, setEvaluation] = useState<EvaluationResponse | null>(null);
  const [mockEvaluations, setMockEvaluations] = useState<EvaluationResponse[]>([]);
  const [isStarting, setIsStarting] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isGeneratingNext, setIsGeneratingNext] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAnswerPreview, setLastAnswerPreview] = useState<string>("");

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
      setSessionMode(session.mode);
      setTargetQuestions(session.mode === "Mock" ? 5 : 1);
      setMockEvaluations([]);
      setEvaluation(null);
      const nextQuestion = await getNextQuestion(session.session_id, []);
      setQuestion(nextQuestion);
      setLastAnswerPreview("");
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
    setLastAnswerPreview(answerText.trim());
    try {
      const result = await submitAnswer(sessionId, question.question_id, answerText);
      if (sessionMode === "Mock") {
        const updatedEvaluations = [...mockEvaluations, result];
        setMockEvaluations(updatedEvaluations);

        if (updatedEvaluations.length < targetQuestions) {
          setIsGeneratingNext(true);
          const nextQuestion = await getNextQuestion(sessionId, []);
          setQuestion(nextQuestion);
          setLastAnswerPreview("");
        } else {
          setQuestion(null);
        }
      } else {
        setEvaluation(result);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsEvaluating(false);
      setIsGeneratingNext(false);
    }
  }

  async function loadNextPracticeQuestion() {
    if (!sessionId || sessionMode !== "Practice" || !evaluation) return;
    setIsGeneratingNext(true);
    setError(null);
    try {
      const nextQuestion = await getNextQuestion(sessionId, []);
      setQuestion(nextQuestion);
      setEvaluation(null);
      setLastAnswerPreview("");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsGeneratingNext(false);
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

  const mockCompleted = sessionMode === "Mock" && mockEvaluations.length === targetQuestions;

  const mergedMockEvaluation = useMemo<EvaluationResponse | null>(() => {
    if (!mockCompleted || !sessionId || mockEvaluations.length === 0) return null;

    const average = (values: number[]) => values.reduce((sum, current) => sum + current, 0) / values.length;
    const unique = (items: string[]) => Array.from(new Set(items));

    const scores = {
      accuracy: Number(average(mockEvaluations.map((item) => item.payload.scores.accuracy)).toFixed(1)),
      clarity: Number(average(mockEvaluations.map((item) => item.payload.scores.clarity)).toFixed(1)),
      structure: Number(average(mockEvaluations.map((item) => item.payload.scores.structure)).toFixed(1)),
      completeness: Number(average(mockEvaluations.map((item) => item.payload.scores.completeness)).toFixed(1)),
      overall: Number(average(mockEvaluations.map((item) => item.payload.scores.overall)).toFixed(1)),
    };

    return {
      evaluation_id: `mock-summary-${sessionId}`,
      session_id: sessionId,
      question_id: "mock-combined",
      created_at: new Date().toISOString(),
      payload: {
        scores,
        strengths: unique(mockEvaluations.flatMap((item) => item.payload.strengths)).slice(0, 5),
        improvements: unique(mockEvaluations.flatMap((item) => item.payload.improvements)).slice(0, 5),
        feedback: `Mock interview complete. Final summary is based on all ${targetQuestions} answers.`,
        improved_answer:
          "Review each response, tighten structure with STAR, and focus your next mock on the lowest scoring dimension from this summary.",
      },
    };
  }, [mockCompleted, mockEvaluations, sessionId, targetQuestions]);

  const shownEvaluation = sessionMode === "Mock" ? mergedMockEvaluation : evaluation;
  const practiceLocked = sessionMode === "Practice" && Boolean(evaluation);
  const answerDisabled = !question || isStarting || isGeneratingNext || isEvaluating || practiceLocked || mockCompleted;
  const canComplete =
    Boolean(sessionId) && ((sessionMode === "Practice" && Boolean(evaluation)) || (sessionMode === "Mock" && mockCompleted));

  const progressText =
    sessionMode === "Mock"
      ? `Mock Progress: ${mockEvaluations.length}/${targetQuestions}`
      : evaluation
        ? "Practice feedback ready. Use Next Question to continue."
        : "Practice mode: answer this question to get feedback.";

  return (
    <div className="interview-layout fade-in-up">
      <section className="interview-main stack">
        <InterviewSetupForm onStart={startInterview} isStarted={Boolean(sessionId)} />
        {error ? <div className="card status-card error-card">Error: {error}</div> : null}
        {sessionId ? <div className="card awaiting-card chat-progress-card">{progressText}</div> : null}
        <div className="card chat-panel">
          <QuestionPanel question={question} isGenerating={isStarting || isGeneratingNext} autoSpeak />
          {lastAnswerPreview ? (
            <div className="chat-message user-message">
              <div className="chat-avatar user-avatar">U</div>
              <div className="chat-bubble">
                <p>{lastAnswerPreview}</p>
              </div>
            </div>
          ) : null}
          <AnswerInput
            onSubmit={evaluate}
            disabled={answerDisabled}
            isSubmitting={isEvaluating}
            resetKey={question?.question_id ?? null}
          />
        </div>
        {sessionMode === "Practice" && evaluation ? (
          <div className="next-question-wrap">
            <button className="primary-action next-question-action" onClick={loadNextPracticeQuestion} disabled={isGeneratingNext}>
              {isGeneratingNext ? "Generating next question..." : "Next Question"}
            </button>
          </div>
        ) : null}
      </section>

      <aside className="interview-aside stack">
        <FeedbackCard evaluation={shownEvaluation} isEvaluating={isEvaluating} />
        {sessionId ? (
          <button className="primary-action finish-action" onClick={finishSession} disabled={isCompleting || !canComplete}>
            {isCompleting ? "Completing..." : "Complete Session"}
          </button>
        ) : null}
      </aside>
    </div>
  );
}
