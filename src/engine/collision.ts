/**
 * AABB collision detection on the XY plane.
 *
 * Each entity is described by a centre position (x, y) and half-extents (hx, hy).
 * Two entities overlap if their axis-aligned bounding boxes intersect.
 */
export function aabbOverlap(
  ax: number, ay: number, ahx: number, ahy: number,
  bx: number, by: number, bhx: number, bhy: number,
): boolean {
  return (
    Math.abs(ax - bx) < (ahx + bhx) &&
    Math.abs(ay - by) < (ahy + bhy)
  );
}
