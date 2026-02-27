/**
 * Padding to shift the visual center when the detail card overlays the map.
 * The detail card is w-[370px] at right-4 (16px), totaling ~386px.
 *
 * Left panels (sidebar, explorer) are flex-layout and already shrink
 * the map container, so no left padding is needed.
 */
export const DETAIL_CARD_PADDING = { top: 0, bottom: 0, left: 0, right: 386 };
