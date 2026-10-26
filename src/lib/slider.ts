/** The index of the slide after `index` in `direction` (1 forward, -1 back), wrapping round at the ends. */
export function nextIndex(index: number, count: number, direction: 1 | -1): number {
  if (count <= 0) return 0;
  return (((index + direction) % count) + count) % count;
}
