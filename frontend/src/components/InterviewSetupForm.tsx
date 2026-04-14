import { useState } from "react";
import type { ChangeEvent } from "react";
import type { InterviewMode, QuestionType, SessionRequest, ExperienceLevel } from "../types";

const ROLE_OPTIONS = [
  "Software Engineer",
  "Data Scientist",
  "Cybersecurity Engineer",
  "Frontend Engineer",
  "Backend Engineer",
  "DevOps Engineer",
];

interface Props {
  onStart: (payload: SessionRequest) => Promise<void>;
  isStarted: boolean;
}

export function InterviewSetupForm({ onStart, isStarted }: Props) {
  const [isStarting, setIsStarting] = useState(false);
  const [form, setForm] = useState<SessionRequest>({
    user_id: "demo-user",
    role: "Software Engineer",
    experience_level: "Intermediate",
    question_type: "Technical",
    mode: "Practice",
    total_questions: 1,
  });

  function onRole(e: ChangeEvent<HTMLSelectElement>) {
    setForm({ ...form, role: e.target.value });
  }

  function onExperience(e: ChangeEvent<HTMLSelectElement>) {
    setForm({ ...form, experience_level: e.target.value as ExperienceLevel });
  }

  function onQuestionType(e: ChangeEvent<HTMLSelectElement>) {
    setForm({ ...form, question_type: e.target.value as QuestionType });
  }

  function onMode(e: ChangeEvent<HTMLSelectElement>) {
    const mode = e.target.value as InterviewMode;
    setForm({ ...form, mode, total_questions: mode === "Practice" ? 1 : 5 });
  }

  async function onStartClick() {
    if (isStarting) return;
    setIsStarting(true);
    try {
      await onStart(form);
    } finally {
      setIsStarting(false);
    }
  }

  return (
    <div className="card session-setup-card">
      <div className="setup-head">
        <div>
          <h2>Session Setup</h2>
          <p className="card-subtitle">Configure your role and focus areas to generate tailored questions.</p>
        </div>
        {!isStarted ? (
          <button className="primary-action" onClick={onStartClick} disabled={isStarting}>
            {isStarting ? "Starting..." : "Start Session"}
          </button>
        ) : null}
      </div>
      <div className="grid">
        <label>
          Role / Domain
          <select
            value={form.role}
            onChange={onRole}
          >
            {ROLE_OPTIONS.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </label>
        <label>
          Experience Level
          <select
            value={form.experience_level}
            onChange={onExperience}
          >
            <option>Beginner</option>
            <option>Intermediate</option>
            <option>Advanced</option>
          </select>
        </label>
        <label>
          Question Type
          <select
            value={form.question_type}
            onChange={onQuestionType}
          >
            <option>Technical</option>
            <option>Behavioral</option>
            <option>HR</option>
            <option>System Design</option>
          </select>
        </label>
        <label>
          Interview Mode
          <select
            value={form.mode}
            onChange={onMode}
          >
            <option>Practice</option>
            <option>Mock</option>
          </select>
        </label>
      </div>
    </div>
  );
}
