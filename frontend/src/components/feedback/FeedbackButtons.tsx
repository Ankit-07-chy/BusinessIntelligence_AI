import { Button } from "../ui/Button";

const ROOT_CAUSE_OPTIONS: Array<{ value: "yes" | "no" | "partial"; label: string }> = [
  { value: "yes", label: "Correct" },
  { value: "no", label: "Incorrect" },
  { value: "partial", label: "Partially correct" },
];

export interface FeedbackButtonsProps {
  helpful: boolean | null;
  onHelpfulChange: (value: boolean) => void;
  rootCauseCorrect: "yes" | "no" | "partial" | null;
  onRootCauseCorrectChange: (value: "yes" | "no" | "partial") => void;
  acceptedAction: boolean;
  onAcceptedActionChange: (value: boolean) => void;
}

export function FeedbackButtons({
  helpful,
  onHelpfulChange,
  rootCauseCorrect,
  onRootCauseCorrectChange,
  acceptedAction,
  onAcceptedActionChange,
}: FeedbackButtonsProps) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Was this explanation helpful?</p>
        <div className="mt-1 flex gap-2">
          <Button variant={helpful === true ? "primary" : "secondary"} onClick={() => onHelpfulChange(true)}>
            Yes
          </Button>
          <Button variant={helpful === false ? "primary" : "secondary"} onClick={() => onHelpfulChange(false)}>
            No
          </Button>
        </div>
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Was the root cause correct?</p>
        <div className="mt-1 flex gap-2">
          {ROOT_CAUSE_OPTIONS.map((option) => (
            <Button
              key={option.value}
              variant={rootCauseCorrect === option.value ? "primary" : "secondary"}
              onClick={() => onRootCauseCorrectChange(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={acceptedAction}
          onChange={(event) => onAcceptedActionChange(event.target.checked)}
        />
        I accepted the recommended action
      </label>
    </div>
  );
}
