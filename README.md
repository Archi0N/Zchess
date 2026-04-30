# Zchess

Zchess is a fully static browser chess game with no build step and no external dependencies. It supports local two-player play, a simple Black AI, browser save/load, pause/continue, and GitHub Pages deployment.

## How to Play

1. Open `index.html` in a browser.
2. Choose `Local 2 Player` or `Play vs AI`.
3. White moves first. In AI mode, you control White, the AI controls Black, and you can choose Beginner, Medium, Hard, or Master difficulty.
4. Click one of your pieces, then click a highlighted legal square to move.
5. Use `Pause` to freeze the board, `Continue` to resume, `Save` to store the match, `Load` to restore it later, and `Undo Move` to go back. The History panel shows every move played.
6. In AI mode, `Undo Move` removes both the Black AI reply and your previous White move when possible.
7. Checkmate ends the game. The turn banner shows `GAME OVER` and the status text shows `White win` or `Black win`.

## Rules Implemented

- Standard starting setup with `rook knight bishop queen king bishop knight rook` on each back rank.
- Real chess movement for `King`, `Queen`, `Rook`, `Bishop`, `Knight`, and `Pawn`.
- Pawn single move, opening double move, diagonal capture, auto-promotion to `Queen`, and en passant.
- Castling only when the King and rook are unmoved, the path is clear, the King is not in check, and it does not cross or land on an attacked square.
- Legal-move filtering so you cannot leave your own King in check.
- Check detection and checkmate detection.
- Stalemate detection when the side to move has no legal move but is not in check.
- 50-move rule draw after 100 halfmoves / 50 moves by each player with no pawn move and no capture.

## AI Behavior

- In `Play vs AI`, Black only chooses from legal moves.
- Difficulty levels: `Beginner`, `Medium`, `Hard`, and `Master`.
- The AI prefers checkmate or winning moves first, then strong captures, then checking moves, then positional heuristics.

## Save Compatibility

- Saves are stored in browser `localStorage`.
- The current save format is versioned.
- Older saves with the legacy internal piece names are migrated when possible.
- If a saved game is incompatible with the legal-chess engine, Zchess starts a new game instead of crashing.

## Files

- `index.html`: App structure and on-page rules text.
- `styles.css`: Responsive styling for the board and panels.
- `script.js`: Chess engine, UI state, visible move history, AI logic, undo history, save migration, and embedded self-tests.

## Verification

Run the syntax check:

```bash
node --check script.js
```

Run the embedded pure-JavaScript rule tests:

```bash
node -e "const chess = require('./script.js'); console.log(chess.runSelfTests())"
```
