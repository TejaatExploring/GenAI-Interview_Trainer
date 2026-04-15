import type { EvaluationResponse } from "../types";

interface Props {
  evaluation: EvaluationResponse | null;
  isEvaluating?: boolean;
}

function formatImprovedAnswer(raw: string): { isCode: boolean; text: string } {
  let text = raw.trim();

  const fenced = text.match(/^```(?:json|javascript|js|ts|python|text)?\s*([\s\S]*?)\s*```$/i);
  if (fenced && fenced[1]) {
    text = fenced[1].trim();
  }

  text = text.replace(/\\n/g, "\n").replace(/\\t/g, "\t").trim();

  try {
    const parsed = JSON.parse(text);
    if (typeof parsed === "object" && parsed !== null) {
      return { isCode: true, text: JSON.stringify(parsed, null, 2) };
    }
  } catch {
    // Keep original text if it's not valid JSON.
  }

  const looksLikeStructured = text.startsWith("{") || text.startsWith("[") || text.includes("\":") || text.includes("\n");
  return { isCode: looksLikeStructured, text };
}

export function FeedbackCard({ evaluation, isEvaluating = false }: Props) {
  if (isEvaluating) {
    return (
      <div className="card awaiting-card">
        <h4>Evaluating Response</h4>
        <p className="card-subtitle">AI is scoring your response and preparing feedback.</p>
      </div>
    );
  }

  if (!evaluation) {
    return (
      <div className="card awaiting-card">
        <h4>Awaiting Response</h4>
        <p className="card-subtitle">
          Submit your answer to receive targeted feedback, score breakdowns, and sharper alternatives from the AI Coach.
        </p>
      </div>
    );
  }

  const scores = evaluation.payload.scores;
  const improvedAnswer = formatImprovedAnswer(evaluation.payload.improved_answer);

  return (
    <div className="card feedback-card">
      <div className="feedback-header">
        <div>
          <h3>Live AI Feedback</h3>
          <p className="card-subtitle">Detailed evaluation of your latest answer.</p>
        </div>
        <div className="feedback-overall">{scores.overall.toFixed(1)} / 10</div>
      </div>

      <section className="feedback-block">
        <p className="feedback-label">AI Coach Summary</p>
        <p>{evaluation.payload.feedback}</p>
      </section>

      <section className="feedback-block">
        <p className="feedback-label">Score Breakdown</p>
        <div className="metric-grid">
          <div className="metric"><span>Accuracy</span><strong>{scores.accuracy}/10</strong></div>
          <div className="metric"><span>Clarity</span><strong>{scores.clarity}/10</strong></div>
          <div className="metric"><span>Structure</span><strong>{scores.structure}/10</strong></div>
          <div className="metric"><span>Completeness</span><strong>{scores.completeness}/10</strong></div>
          <div className="metric"><span>Overall</span><strong>{scores.overall.toFixed(1)}/10</strong></div>
        </div>
      </section>

      <section className="feedback-columns">
        <article className="feedback-note good">
          <h4>Strengths</h4>
          <ul>
            {evaluation.payload.strengths.map((s, idx) => (
              <li key={idx}>{s}</li>
            ))}
          </ul>
        </article>
        <article className="feedback-note warn">
          <h4>Improvements</h4>
          <ul>
            {evaluation.payload.improvements.map((s, idx) => (
              <li key={idx}>{s}</li>
            ))}
          </ul>
        </article>
      </section>

      <section className="feedback-block improved-answer">
        <p className="feedback-label">Improved Answer</p>
        {improvedAnswer.isCode ? (
          <pre className="improved-answer-code">
            <code>{improvedAnswer.text}</code>
          </pre>
        ) : (
          <p>{improvedAnswer.text}</p>
        )}
      </section>
    </div>
  );
}
