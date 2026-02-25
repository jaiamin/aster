interface LocationFooterProps {
  latitude: number;
  longitude: number;
  altitude?: number;
  altitudeLabel?: string;
  altitudeUnit?: string;
}

export function LocationFooter({
  latitude,
  longitude,
  altitude,
  altitudeLabel = "Altitude",
  altitudeUnit = "ft",
}: LocationFooterProps) {
  return (
    <div className="space-y-1.5">
      <div className="text-[10px] uppercase tracking-widest text-muted/60">
        Coordinates
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-muted">Latitude</span>
          <span className="text-foreground">{latitude.toFixed(4)}&deg;</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">Longitude</span>
          <span className="text-foreground">{longitude.toFixed(4)}&deg;</span>
        </div>
        {altitude != null && (
          <div className="flex justify-between">
            <span className="text-muted">{altitudeLabel}</span>
            <span className="text-foreground">
              {altitude.toLocaleString()} {altitudeUnit}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
