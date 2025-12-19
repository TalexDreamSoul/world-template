interface Point {
  x: number;
  y: number;
}

interface Circle extends Point {
  r: number;
}

export default function wetzls(points: Point[]) {
  const clonedPoints = points.slice();
  shuffle(clonedPoints);
  return mec(clonedPoints, points.length, [], 0);
}

function shuffle(a: Point[]) {
  let j, x, i;
  for (i = a.length - 1; i > 0; i--) {
    j = Math.floor(Math.random() * (i + 1));
    x = a[i]!;
    a[i] = a[j]!;
    a[j] = x;
  }
  return a;
}

function mec(points: Point[], n: number, boundary: Point[], b: number): Circle {
  let localCircle = null;

  if (b === 3)
    localCircle = calcCircle3(boundary[0]!, boundary[1]!, boundary[2]!);
  else if (n === 1 && b === 0)
    localCircle = { x: points[0]!.x, y: points[0]!.y, r: 0 };
  else if (n === 0 && b === 2)
    localCircle = calcCircle2(boundary[0]!, boundary[1]!);
  else if (n === 1 && b === 1)
    localCircle = calcCircle2(boundary[0]!, points[0]!);
  else {
    localCircle = mec(points, n - 1, boundary, b);
    if (!isInCircle(points[n - 1]!, localCircle)) {
      boundary[b++] = points[n - 1]!;
      localCircle = mec(points, n - 1, boundary, b);
    }
  }

  return localCircle;
}

function calcCircle3(p1: Point, p2: Point, p3: Point) {
  const p1x = p1.x,
    p1y = p1.y,
    p2x = p2.x,
    p2y = p2.y,
    p3x = p3.x,
    p3y = p3.y,
    a = p2x - p1x,
    b = p2y - p1y,
    c = p3x - p1x,
    d = p3y - p1y,
    e = a * (p2x + p1x) * 0.5 + b * (p2y + p1y) * 0.5,
    f = c * (p3x + p1x) * 0.5 + d * (p3y + p1y) * 0.5,
    det = a * d - b * c,
    cx = (d * e - b * f) / det,
    cy = (-c * e + a * f) / det;

  return {
    x: cx,
    y: cy,
    r: Math.sqrt((p1x - cx) * (p1x - cx) + (p1y - cy) * (p1y - cy)),
  };
}

function calcCircle2(p1: Point, p2: Point) {
  const p1x = p1.x,
    p1y = p1.y,
    p2x = p2.x,
    p2y = p2.y,
    cx = 0.5 * (p1x + p2x),
    cy = 0.5 * (p1y + p2y);

  return {
    x: cx,
    y: cy,
    r: Math.sqrt((p1x - cx) * (p1x - cx) + (p1y - cy) * (p1y - cy)),
  };
}

function isInCircle(p: Point, c: Circle) {
  return (c.x - p.x) * (c.x - p.x) + (c.y - p.y) * (c.y - p.y) <= c.r * c.r;
}
