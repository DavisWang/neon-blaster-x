export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function length(x, y) {
  return Math.hypot(x, y);
}

export function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function normalize(x, y) {
  const size = Math.hypot(x, y) || 1;
  return { x: x / size, y: y / size };
}

export function dot(ax, ay, bx, by) {
  return ax * bx + ay * by;
}

export function rotate(x, y, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: x * cos - y * sin,
    y: x * sin + y * cos
  };
}

export function wrapAngle(angle) {
  let value = angle;
  while (value > Math.PI) {
    value -= Math.PI * 2;
  }
  while (value < -Math.PI) {
    value += Math.PI * 2;
  }
  return value;
}

export function angleBetween(a, b) {
  return Math.atan2(b.y - a.y, b.x - a.x);
}

export function randInRange(min, max, rng = Math.random) {
  return min + (max - min) * rng();
}

export function choose(items, rng = Math.random) {
  return items[Math.floor(rng() * items.length)];
}

export function hash2D(x, y) {
  const sinValue = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return sinValue - Math.floor(sinValue);
}
