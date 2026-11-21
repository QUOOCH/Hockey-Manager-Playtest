export type MotionPoint = { x: number; y: number };

export type PlayerMotionOptions = {
  maxSpeed: number;
  response: number;
  arrivalGain: number;
  arrivalRadius?: number;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
};

export type PlayerMotionResult = {
  position: MotionPoint;
  velocity: MotionPoint;
  speed: number;
  distanceToTarget: number;
  arrived: boolean;
};

/**
 * Shared kinematic step for every skater.
 *
 * The same solver is used during open play and faceoff setup, so players
 * never switch between unrelated movement rules. Coordinates, speed and
 * acceleration are expressed in the match engine's rink units / seconds.
 *
 * Stick and puck interaction can later consume this stable position and
 * velocity output without owning or replacing the movement simulation.
 */
export function stepPlayerMotion(
  position: MotionPoint,
  velocity: MotionPoint,
  target: MotionPoint,
  dt: number,
  options: PlayerMotionOptions,
): PlayerMotionResult {
  const safeDt = Math.max(0, Math.min(0.05, Number.isFinite(dt) ? dt : 0));
  const dx = target.x - position.x;
  const dy = target.y - position.y;
  const distance = Math.hypot(dx, dy);
  const arrivalRadius = Math.max(0, options.arrivalRadius ?? 1);
  const maxSpeed = Math.max(0, options.maxSpeed);
  const response = Math.max(0, options.response);
  const desiredSpeed = Math.min(maxSpeed, distance * Math.max(0, options.arrivalGain));
  const desiredVx = distance > arrivalRadius ? (dx / Math.max(distance, 1e-6)) * desiredSpeed : 0;
  const desiredVy = distance > arrivalRadius ? (dy / Math.max(distance, 1e-6)) * desiredSpeed : 0;
  const blend = Math.min(1, safeDt * response);

  let vx = velocity.x + (desiredVx - velocity.x) * blend;
  let vy = velocity.y + (desiredVy - velocity.y) * blend;
  const speed = Math.hypot(vx, vy);
  if (speed > maxSpeed && speed > 0) {
    vx = (vx / speed) * maxSpeed;
    vy = (vy / speed) * maxSpeed;
  }

  let x = position.x + vx * safeDt;
  let y = position.y + vy * safeDt;
  if (x < options.bounds.minX) { x = options.bounds.minX; vx = Math.max(0, vx); }
  if (x > options.bounds.maxX) { x = options.bounds.maxX; vx = Math.min(0, vx); }
  if (y < options.bounds.minY) { y = options.bounds.minY; vy = Math.max(0, vy); }
  if (y > options.bounds.maxY) { y = options.bounds.maxY; vy = Math.min(0, vy); }

  const nextDistance = Math.hypot(target.x - x, target.y - y);
  const nextSpeed = Math.hypot(vx, vy);
  return {
    position: { x, y },
    velocity: { x: vx, y: vy },
    speed: nextSpeed,
    distanceToTarget: nextDistance,
    arrived: nextDistance <= arrivalRadius && nextSpeed < 12,
  };
}
