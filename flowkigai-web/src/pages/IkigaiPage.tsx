import IkigaiJourney from "@/components/ikigai/IkigaiJourney";
import { usePageAnalytics } from "@/hooks/usePageAnalytics";

export default function IkigaiPage() {
  usePageAnalytics("/ikigai");
  return <IkigaiJourney />;
}
