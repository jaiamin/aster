/** Grid-sample a list of geo-located items at low zoom to reduce GPU draw calls.
 *  At zoom < threshold, keeps only one item per cellSize° grid cell.
 *  Always preserves the selected item. */
export function gridSample<T>(
  items: T[],
  getLng: (item: T) => number,
  getLat: (item: T) => number,
  isSelected: (item: T) => boolean,
  zoom: number,
  threshold = 5,
  cellSize = 2,
): T[] {
  if (zoom >= threshold || items.length <= 500) return items;

  const seen = new Set<string>();
  const result: T[] = [];

  for (const item of items) {
    if (isSelected(item)) {
      result.push(item);
      continue;
    }

    const cellX = Math.floor(getLng(item) / cellSize);
    const cellY = Math.floor(getLat(item) / cellSize);
    const key = `${cellX},${cellY}`;

    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }

  return result;
}
