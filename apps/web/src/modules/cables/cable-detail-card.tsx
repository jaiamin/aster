import { Cable } from "lucide-react";
import { memo } from "react";

import { useCableSelection } from "./cable-context";

import {
  DetailCard,
  CardBanner,
  CardSource,
  CardBody,
  ScrollText,
} from "@/components/detail-card/detail-card";

export const CableDetailCard = memo(function CableDetailCard() {
  const { selected, deselect } = useCableSelection();

  if (!selected) return null;

  const { cable } = selected;
  const color = cable.properties.color || "#939597";

  return (
    <DetailCard onClose={deselect}>
      <CardBanner onClose={deselect} accentColor={color}>
        <div className="flex items-center justify-center h-full bg-surface">
          <Cable size={48} strokeWidth={1.5} className="text-white" />
        </div>
      </CardBanner>
      <CardBody>
        <ScrollText text={cable.properties.name} className="text-sm font-semibold text-white" />
        <CardSource name="TeleGeography" url="https://www.submarinecablemap.com" />
      </CardBody>
    </DetailCard>
  );
});
