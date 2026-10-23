// ============================================================
// MAP — grid and path geometry, built from CONFIG.map.
// ============================================================

const GameMap = (() => {
  const { cols, rows, cell, path } = CONFIG.map;
  const width = cols * cell;
  const height = rows * cell;

  const points = path.map(([c, r]) => ({ x: c * cell + cell / 2, y: r * cell + cell / 2 }));

  // Straight segments with cumulative start distance
  const segments = [];
  let length = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], b = points[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    segments.push({ x: a.x, y: a.y, dx: (b.x - a.x) / len, dy: (b.y - a.y) / len, len, start: length });
    length += len;
  }

  // Grid cells the path covers (not buildable)
  const pathCells = new Set();
  for (let i = 0; i < path.length - 1; i++) {
    let [c, r] = path[i];
    const [c2, r2] = path[i + 1];
    const sc = Math.sign(c2 - c), sr = Math.sign(r2 - r);
    pathCells.add(c + ',' + r);
    while (c !== c2 || r !== r2) {
      c += sc; r += sr;
      pathCells.add(c + ',' + r);
    }
  }

  function posAt(d) {
    if (d <= 0) return { x: points[0].x, y: points[0].y };
    for (const s of segments) {
      if (d <= s.start + s.len) {
        const t = d - s.start;
        return { x: s.x + s.dx * t, y: s.y + s.dy * t };
      }
    }
    const last = points[points.length - 1];
    return { x: last.x, y: last.y };
  }

  function inBounds(c, r) { return c >= 0 && r >= 0 && c < cols && r < rows; }
  function isPath(c, r) { return pathCells.has(c + ',' + r); }
  function cellCenter(c, r) { return { x: c * cell + cell / 2, y: r * cell + cell / 2 }; }

  return { cols, rows, cell, width, height, points, segments, length, posAt, inBounds, isPath, cellCenter };
})();
