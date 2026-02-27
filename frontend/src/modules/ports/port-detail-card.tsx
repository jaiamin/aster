import { Anchor } from "lucide-react";
import {
  DetailCard,
  CardBanner,
  CardHeader,
  CardSection,
  CardGrid,
  CardRow,
  CardCoordinates,
  CardSource,
  CardBody,
} from "@/components/detail-card/detail-card";
import { SpinningAerialBanner } from "@/components/detail-card/spinning-aerial-banner";
import { useMap } from "@vis.gl/react-maplibre";
import { usePortSelection } from "./port-context";
import { FOCUS_ZOOM } from "@/modules/focus-zoom";
import { DETAIL_CARD_PADDING } from "@/hooks/use-map-padding";
import { CATEGORY_COLORS } from "@/lib/category-colors";

const PORT_COLOR = "#38bdf8";

export function PortDetailCard() {
  const { selected, deselect } = usePortSelection();
  const { current: mapRef } = useMap();

  if (!selected) return null;

  const { port } = selected;

  const recenter = () => {
    const map = mapRef?.getMap();
    if (!map) return;
    map.flyTo({
      center: [port.longitude, port.latitude],
      zoom: FOCUS_ZOOM["ports"],
      duration: 1500,
      padding: DETAIL_CARD_PADDING,
    });
  };

  return (
    <DetailCard onClose={deselect}>
      <CardBanner onClose={deselect} onRecenter={recenter} accentColor={PORT_COLOR}>
        <SpinningAerialBanner
          latitude={port.latitude}
          longitude={port.longitude}
          zoom={16}
          fallback={
            <div className="w-full h-[140px] flex items-center justify-center bg-surface">
              <Anchor size={48} strokeWidth={1.5} className="text-white" />
            </div>
          }
        />
      </CardBanner>
      <CardBody>
        <CardHeader
          icon={Anchor}
          accentColor={CATEGORY_COLORS["Infrastructure"]}
          name={port.name}
          latitude={port.latitude}
          longitude={port.longitude}
          onRecenter={recenter}
        />
        {(port.country || port.state) && (
          <CardSection title="Details">
            <CardGrid>
              {port.country && <CardRow label="Country" value={port.country} />}
              {port.state && <CardRow label="State" value={port.state} />}
            </CardGrid>
          </CardSection>
        )}
        <CardCoordinates latitude={port.latitude} longitude={port.longitude} />
        <CardSource name="World Port Index" url="https://msi.nga.mil/Publications/WPI" />
      </CardBody>
    </DetailCard>
  );
}
