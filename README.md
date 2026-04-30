# Zchess

Zchess is a small browser tactics game inspired by chess. It stays fully static with no build step and no external dependencies, and now supports both local two-player play and a simple training AI.

## How to Play

1. Open `index.html` in a browser.
2. Choose `Local 2 Player` or `Play vs AI`.
3. White moves first. In AI mode, you control White and the AI controls Black.
4. Click one of your pieces, then click a highlighted square to move.
5. Capture by landing on an opposing piece.
6. Use `Pause` to freeze the board, `Continue` to resume, `Save` to store the match, and `Load` to restore it later.
7. Win by capturing the enemy `Crown`, or by leaving your opponent with no legal move.

## Piece Set

- `Crown`: Moves 1 square in any direction.
- `Runeblade`: Moves up to 2 squares in any direction.
- `Bastion`: Moves any distance horizontally or vertically.
- `Seer`: Moves any distance diagonally.
- `Knight`: Moves in an L shape and can jump.
- `Rune`: Moves forward 1, can move forward 2 from its starting row, and captures diagonally.

## Notes

- There is no check, castling, en passant, or promotion.
- The UI includes legal move highlighting, chess-style Unicode piece symbols, turn/status text, capture handling, a mode toggle, pause/continue, save/load, and restart controls.
- In `Play vs AI`, Black replies automatically after your move and the board is disabled while the AI is thinking.
- Games are saved in browser `localStorage`, so you can close the page and continue later on the same browser.
- Layout is responsive and works without a build tool.

## Files

- `index.html`: App structure and rules content.
- `styles.css`: Responsive styling for the board and panels.
- `script.js`: Board state, move generation, turn flow, and win detection.

## Verification

Run a basic JavaScript syntax check with Node:

```bash
node --check script.js
```
