import { formatDriverLabel } from "../../lib/driverLabels";

export interface DriverCorrectionFormProps {
  driverOptions: string[];
  correctedDriver: string;
  onCorrectedDriverChange: (value: string) => void;
  comments: string;
  onCommentsChange: (value: string) => void;
}

export function DriverCorrectionForm({
  driverOptions,
  correctedDriver,
  onCorrectedDriverChange,
  comments,
  onCommentsChange,
}: DriverCorrectionFormProps) {
  return (
    <div className="space-y-3">
      <label className="block text-sm text-slate-700">
        If the root cause was wrong, what should it have been?
        <select
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={correctedDriver}
          onChange={(event) => onCorrectedDriverChange(event.target.value)}
        >
          <option value="">No correction</option>
          {driverOptions.map((driverId) => (
            <option key={driverId} value={driverId}>
              {formatDriverLabel(driverId)}
            </option>
          ))}
          <option value="other">Other (see comments)</option>
        </select>
      </label>

      <label className="block text-sm text-slate-700">
        Comments
        <textarea
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          rows={3}
          value={comments}
          onChange={(event) => onCommentsChange(event.target.value)}
          placeholder="Optional — anything else worth flagging?"
        />
      </label>
    </div>
  );
}
