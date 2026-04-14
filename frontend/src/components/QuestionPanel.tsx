import type { QuestionResponse } from "../types";

interface Props {
  question: QuestionResponse | null;
}

export function QuestionPanel({ question }: Props) {
  const title = question ? question.payload.question : "Generate a question to begin.";
  const topic = question?.payload.topic;

  return (
    <div className="question-banner">
      <p className="eyebrow label-inline">Current Question</p>
      <h3 className="question-title">{title}</h3>
      {topic ? <p className="question-topic">Topic: {topic}</p> : null}
    </div>
  );
}
