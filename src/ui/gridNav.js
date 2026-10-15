// Arrow-key navigation for the editor's row-major grids: the browsers
// (buildSoundGridTable, buildPatchTable) and the Drums tab slot grid
// (Archive #223). Items fill `cols` columns row by row: 0 1 2 3 4 / 5 6 ….
//
// Left/Right step one item, wrapping from the end of a row to the start of
// the next. Up/Down move one row; past the top or bottom of a column they
// continue at the bottom of the previous column or the top of the next one.
// Returns null at the first/last item (no wrap-around of the whole list) and
// for any other key.

export const GRID_ARROW_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

// Number of items in column `col` of a `count`-item, `cols`-wide grid.
function columnLength(col, count, cols) {
  return col < count ? Math.floor((count - 1 - col) / cols) + 1 : 0;
}

export function gridArrowTarget(pos, key, count, cols) {
  if (count <= 0 || pos < 0 || pos >= count) return null;
  const col = pos % cols;
  switch (key) {
    case 'ArrowLeft':
      return pos > 0 ? pos - 1 : null;
    case 'ArrowRight':
      return pos < count - 1 ? pos + 1 : null;
    case 'ArrowDown':
      if (pos + cols < count) return pos + cols;
      return columnLength(col + 1, count, cols) > 0 && col + 1 < cols ? col + 1 : null;
    case 'ArrowUp': {
      if (pos - cols >= 0) return pos - cols;
      if (col === 0) return null;
      const prev = col - 1;
      return prev + (columnLength(prev, count, cols) - 1) * cols;
    }
    default:
      return null;
  }
}

// Like gridArrowTarget, but keeps moving the same way past items isSkipped(pos)
// rejects (the Effect Type browser's disabled cells). null if none is left.
export function gridArrowTargetSkipping(pos, key, count, cols, isSkipped) {
  let next = gridArrowTarget(pos, key, count, cols);
  while (next !== null && isSkipped(next)) next = gridArrowTarget(next, key, count, cols);
  return next;
}
