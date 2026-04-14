export type ExperienceLevel = "Beginner" | "Intermediate" | "Advanced";
export type QuestionType = "Technical" | "Behavioral" | "HR" | "System Design";
export type InterviewMode = "Practice" | "Mock";

export interface SessionRequest {
  user_id: string;
  role: string;
  experience_level: ExperienceLevel;
  question_type: QuestionType;
  mode: InterviewMode;
  total_questions: number;
}

export interface QuestionPayload {
  question: string;
  topic: string;
  question_type: QuestionType;
  expected_answer_points: string[];
  evaluation_rubric: Record<string, string>;
}

export interface QuestionResponse {
  question_id: string;
  session_id: string;
  sequence_number: number;
  payload: QuestionPayload;
  created_at: string;
}

export interface EvaluationResponse {
  evaluation_id: string;
  session_id: string;
  question_id: string;
  payload: {
    scores: {
      accuracy: number;
      clarity: number;
      structure: number;
      completeness: number;
      overall: number;
    };
    strengths: string[];
    improvements: string[];
    feedback: string;
    improved_answer: string;
  };
  created_at: string;
}
