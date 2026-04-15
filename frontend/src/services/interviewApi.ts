import { apiClient } from "./apiClient";
import type { EvaluationResponse, QuestionResponse, SessionRequest, SessionResponse } from "../types";

export async function createSession(payload: SessionRequest) {
  const { data } = await apiClient.post<SessionResponse>("/interviews/sessions", payload);
  return data;
}

export async function getNextQuestion(sessionId: string, constraints: string[]) {
  const { data } = await apiClient.post<QuestionResponse>(`/interviews/sessions/${sessionId}/next-question`, {
    constraints,
  });
  return data;
}

export async function submitAnswer(sessionId: string, questionId: string, answerText: string) {
  const { data } = await apiClient.post<EvaluationResponse>(`/interviews/sessions/${sessionId}/answers`, {
    question_id: questionId,
    answer_text: answerText,
  });
  return data;
}

export async function completeSession(sessionId: string) {
  const { data } = await apiClient.post(`/interviews/sessions/${sessionId}/complete`);
  return data;
}

export async function transcribeAudio(blob: Blob) {
  const formData = new FormData();
  formData.append("audio", blob, "answer.webm");
  const { data } = await apiClient.post("/speech/transcribe", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data as { transcript: string };
}
