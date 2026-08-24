import { useParams } from "react-router-dom";
import { ComingSoon } from "../components/layout/ComingSoon";

export function InsightDetailPage() {
  const { id } = useParams();
  return (
    <ComingSoon
      title={`Insight ${id}`}
      description="Driver list, contribution waterfall, evidence card, and persona narrative tabs — pending the explanation service."
    />
  );
}
