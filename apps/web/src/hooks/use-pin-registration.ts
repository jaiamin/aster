import { useEffect, useState } from "react";
import { useMap } from "@vis.gl/react-maplibre";
import { registerModulePins, unregisterModulePins, type PinConfig } from "@/lib/pin-icon";

export function usePinRegistration(config: PinConfig): boolean {
  const { current: mapRef } = useMap();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;

    if (config.statusVariants?.length) {
      const clusterConfig: PinConfig = {
        moduleId: config.moduleId,
        icon: config.icon,
        bgColor: config.bgColor,
      };
      Promise.all([registerModulePins(map, config), registerModulePins(map, clusterConfig)]).then(
        () => setReady(true),
      );
      return () => {
        unregisterModulePins(map, config);
        unregisterModulePins(map, clusterConfig);
      };
    }
    registerModulePins(map, config).then(() => setReady(true));
    return () => {
      unregisterModulePins(map, config);
    };
  }, [mapRef]);

  return ready;
}
