import { FeedbackSummary } from "../components/feedback/FeedbackSummary";

export function FeedbackPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-slate-900">Feedback</h2>
      <p className="text-sm text-slate-500">
        Aggregate feedback across all insights. Submit feedback on a specific insight from its detail page.
      </p>
      <FeedbackSummary />
    </div>
  );
}
