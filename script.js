const BOARD_SIZE = 8;
const FILES = ["A", "B", "C", "D", "E", "F", "G", "H"];
const SAVE_KEY = "rune-chess-save-v1";
const AI_MOVE_DELAY_MS = 520;
const AI_MOVE_DELAY_VARIANCE_MS = 280;
const DIRECTIONS_ORTHOGONAL = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];
const DIRECTIONS_DIAGONAL = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
];
const DIRECTIONS_ALL = [...DIRECTIONS_ORTHOGONAL, ...DIRECTIONS_DIAGONAL];
const KNIGHT_JUMPS = [
  [-2, -1],
  [-2, 1],
  [-1, -2],
  [-1, 2],
  [1, -2],
  [1, 2],
  [2, -1],
  [2, 1],
];
const STARTING_BACK_RANK = [
  "bastion",
  "knight",
  "seer",
  "runeblade",
  "crown",
  "seer",
  "knight",
  "bastion",
];

const PIECES = {
  crown: {
    name: "Crown",
    short: "Cr",
    value: 1000,
    symbols: {
      white: "♔",
      black: "♚",
    },
  },
  runeblade: {
    name: "Runeblade",
    short: "Rb",
    value: 8,
    symbols: {
      white: "♕",
      black: "♛",
    },
  },
  bastion: {
    name: "Bastion",
    short: "Ba",
    value: 5,
    symbols: {
      white: "♖",
      black: "♜",
    },
  },
  seer: {
    name: "Seer",
    short: "Se",
    value: 4,
    symbols: {
      white: "♗",
      black: "♝",
    },
  },
  knight: {
    name: "Knight",
    short: "Kn",
    value: 3,
    symbols: {
      white: "♘",
      black: "♞",
    },
  },
  rune: {
    name: "Rune",
    short: "Ru",
    value: 1,
    symbols: {
      white: "♙",
      black: "♟",
    },
  },
};

const boardElement = document.getElementById("board");
const turnIndicatorElement = document.getElementById("turn-indicator");
const statusTextElement = document.getElementById("status-text");
const restartButtonElement = document.getElementById("restart-button");
const pauseButtonElement = document.getElementById("pause-button");
const continueButtonElement = document.getElementById("continue-button");
const saveButtonElement = document.getElementById("save-button");
const loadButtonElement = document.getElementById("load-button");
const modeInputElements = document.querySelectorAll('input[name="game-mode"]');

const state = {
  board: [],
  currentPlayer: "white",
  selected: null,
  legalMoves: [],
  mode: "local",
  status: "White opens the ritual.",
  winner: null,
  lastMove: null,
  isPaused: false,
  isAiThinking: false,
  aiTimerId: null,
};

function createPiece(type, side) {
  return {
    type,
    side,
    moved: false,
  };
}

function createInitialBoard() {
  const board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));

  STARTING_BACK_RANK.forEach((type, col) => {
    board[0][col] = createPiece(type, "black");
    board[1][col] = createPiece("rune", "black");
    board[6][col] = createPiece("rune", "white");
    board[7][col] = createPiece(type, "white");
  });

  return board;
}

function resetGame() {
  cancelAiTurn();
  state.board = createInitialBoard();
  state.currentPlayer = "white";
  state.selected = null;
  state.legalMoves = [];
  state.status = getOpeningStatus();
  state.winner = null;
  state.lastMove = null;
  state.isPaused = false;
  syncModeInputs();
  saveGame(true);
  render();
}

function render() {
  renderStatus();
  renderControls();
  renderBoard();
}

function renderStatus() {
  if (state.winner) {
    turnIndicatorElement.textContent = `${getSideLabel(state.winner)} wins`;
  } else if (state.isPaused) {
    turnIndicatorElement.textContent = "Paused";
  } else if (state.isAiThinking) {
    turnIndicatorElement.textContent = `${getSideLabel(state.currentPlayer)} thinking`;
  } else {
    turnIndicatorElement.textContent = `${getSideLabel(state.currentPlayer)} to move`;
  }

  statusTextElement.textContent = state.status;
}

function renderControls() {
  pauseButtonElement.disabled = Boolean(state.winner || state.isPaused);
  continueButtonElement.disabled = Boolean(state.winner || !state.isPaused);
  saveButtonElement.disabled = false;
  loadButtonElement.disabled = !hasSavedGame();
}

function renderBoard() {
  const boardLocked = state.isAiThinking || state.isPaused;

  boardElement.classList.toggle("locked", boardLocked);
  boardElement.setAttribute("aria-busy", boardLocked ? "true" : "false");
  boardElement.textContent = "";

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const squareElement = document.createElement("button");
      const squareColor = (row + col) % 2 === 0 ? "light" : "dark";
      const piece = state.board[row][col];
      const move = findMove(row, col);

      squareElement.type = "button";
      squareElement.className = `square ${squareColor}`;
      squareElement.setAttribute("role", "gridcell");
      squareElement.dataset.row = String(row);
      squareElement.dataset.col = String(col);
      squareElement.setAttribute("aria-label", buildSquareLabel(row, col, piece, move));
      squareElement.disabled = boardLocked;

      if (isSelectedSquare(row, col)) {
        squareElement.classList.add("selected");
      }

      if (move) {
        squareElement.classList.add(move.capture ? "hint-capture" : "hint-move");
      }

      if (state.lastMove) {
        if (state.lastMove.from.row === row && state.lastMove.from.col === col) {
          squareElement.classList.add("last-from");
        }

        if (state.lastMove.to.row === row && state.lastMove.to.col === col) {
          squareElement.classList.add("last-to");
        }
      }

      if (col === 0) {
        squareElement.append(createCoordinate("rank", String(BOARD_SIZE - row)));
      }

      if (row === BOARD_SIZE - 1) {
        squareElement.append(createCoordinate("file", FILES[col]));
      }

      if (piece) {
        squareElement.append(createPieceElement(piece));
      }

      squareElement.addEventListener("click", () => handleSquareClick(row, col));
      boardElement.append(squareElement);
    }
  }
}

function createCoordinate(kind, value) {
  const label = document.createElement("span");
  label.className = `coord ${kind}`;
  label.textContent = value;
  label.setAttribute("aria-hidden", "true");
  return label;
}

function createPieceElement(piece) {
  const pieceElement = document.createElement("span");
  const symbolElement = document.createElement("span");

  pieceElement.className = `piece ${piece.side}`;
  pieceElement.dataset.piece = piece.type;
  pieceElement.title = `${capitalize(piece.side)} ${PIECES[piece.type].name}`;
  pieceElement.setAttribute("aria-hidden", "true");

  symbolElement.className = "piece-symbol";
  symbolElement.textContent = PIECES[piece.type].symbols[piece.side];

  pieceElement.append(symbolElement);
  return pieceElement;
}

function handleSquareClick(row, col) {
  if (state.winner || state.isAiThinking || state.isPaused) {
    return;
  }

  const piece = state.board[row][col];
  const move = findMove(row, col);

  if (move && state.selected) {
    applyMove(state.selected, move);
    return;
  }

  if (state.selected && state.selected.row === row && state.selected.col === col) {
    clearSelection();
    state.status = "Selection cleared.";
    render();
    return;
  }

  if (piece && piece.side === state.currentPlayer) {
    const legalMoves = getLegalMoves(row, col);
    state.selected = { row, col };
    state.legalMoves = legalMoves;
    state.status = legalMoves.length
      ? `${capitalize(piece.side)} ${PIECES[piece.type].name} selected. Choose a highlighted square.`
      : `${capitalize(piece.side)} ${PIECES[piece.type].name} has no legal moves.`;
    render();
    return;
  }

  if (state.selected) {
    clearSelection();
    state.status = "No legal move there.";
    render();
  }
}

function applyMove(from, move) {
  const movingPiece = state.board[from.row][from.col];
  const targetPiece = state.board[move.row][move.col];
  const destination = toCoordinate(move.row, move.col);
  const movingPieceName = PIECES[movingPiece.type].name;
  const mover = getSideLabel(movingPiece.side);

  state.board[move.row][move.col] = {
    ...movingPiece,
    moved: true,
  };
  state.board[from.row][from.col] = null;
  state.lastMove = {
    from,
    to: { row: move.row, col: move.col },
  };
  clearSelection();
  state.isAiThinking = false;

  if (targetPiece && targetPiece.type === "crown") {
    state.winner = movingPiece.side;
    state.status = `${mover} ${movingPieceName} captured the Crown on ${destination}.`;
    saveGame(true);
    render();
    return;
  }

  const nextPlayer = movingPiece.side === "white" ? "black" : "white";
  const responder = getSideLabel(nextPlayer);
  state.currentPlayer = nextPlayer;

  if (!playerHasLegalMoves(nextPlayer)) {
    state.winner = movingPiece.side;
    state.status = `${mover} ${movingPieceName} moved to ${destination} and left ${responder} with no legal reply.`;
    saveGame(true);
    render();
    return;
  }

  let status;
  if (targetPiece) {
    status = `${mover} ${movingPieceName} captured ${PIECES[targetPiece.type].name} on ${destination}. ${responder} to respond.`;
  } else {
    status = `${mover} ${movingPieceName} moved to ${destination}. ${responder} to respond.`;
  }

  if (isAiTurn()) {
    state.isAiThinking = true;
    status = `${status} AI is thinking...`;
  }

  state.status = status;
  saveGame(true);
  render();

  if (state.isAiThinking) {
    queueAiMove();
  }
}

function clearSelection() {
  state.selected = null;
  state.legalMoves = [];
}

function findMove(row, col) {
  return state.legalMoves.find((move) => move.row === row && move.col === col) || null;
}

function isSelectedSquare(row, col) {
  return Boolean(state.selected && state.selected.row === row && state.selected.col === col);
}

function playerHasLegalMoves(side) {
  return getAllLegalMoves(side).length > 0;
}

function getAllLegalMoves(side) {
  const candidates = [];

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const piece = state.board[row][col];

      if (!piece || piece.side !== side) {
        continue;
      }

      getLegalMoves(row, col).forEach((move) => {
        candidates.push({
          from: { row, col },
          move,
          piece,
          target: state.board[move.row][move.col],
        });
      });
    }
  }

  return candidates;
}

function getLegalMoves(row, col) {
  const piece = state.board[row][col];

  if (!piece) {
    return [];
  }

  switch (piece.type) {
    case "crown":
      return getDirectionalMoves(row, col, piece.side, DIRECTIONS_ALL, 1);
    case "runeblade":
      return getDirectionalMoves(row, col, piece.side, DIRECTIONS_ALL, 2);
    case "bastion":
      return getDirectionalMoves(row, col, piece.side, DIRECTIONS_ORTHOGONAL, BOARD_SIZE);
    case "seer":
      return getDirectionalMoves(row, col, piece.side, DIRECTIONS_DIAGONAL, BOARD_SIZE);
    case "knight":
      return getKnightMoves(row, col, piece.side);
    case "rune":
      return getRuneMoves(row, col, piece);
    default:
      return [];
  }
}

function getDirectionalMoves(row, col, side, directions, maxSteps) {
  const moves = [];

  directions.forEach(([rowDelta, colDelta]) => {
    for (let step = 1; step <= maxSteps; step += 1) {
      const nextRow = row + rowDelta * step;
      const nextCol = col + colDelta * step;

      if (!isInBounds(nextRow, nextCol)) {
        break;
      }

      const target = state.board[nextRow][nextCol];

      if (!target) {
        moves.push({ row: nextRow, col: nextCol, capture: false });
        continue;
      }

      if (target.side !== side) {
        moves.push({ row: nextRow, col: nextCol, capture: true });
      }

      break;
    }
  });

  return moves;
}

function getKnightMoves(row, col, side) {
  return KNIGHT_JUMPS.reduce((moves, [rowDelta, colDelta]) => {
    const nextRow = row + rowDelta;
    const nextCol = col + colDelta;

    if (!isInBounds(nextRow, nextCol)) {
      return moves;
    }

    const target = state.board[nextRow][nextCol];

    if (!target || target.side !== side) {
      moves.push({
        row: nextRow,
        col: nextCol,
        capture: Boolean(target),
      });
    }

    return moves;
  }, []);
}

function getRuneMoves(row, col, piece) {
  const moves = [];
  const forward = piece.side === "white" ? -1 : 1;
  const startingRow = piece.side === "white" ? 6 : 1;
  const oneStepRow = row + forward;

  if (isInBounds(oneStepRow, col) && !state.board[oneStepRow][col]) {
    moves.push({ row: oneStepRow, col, capture: false });

    const twoStepRow = row + forward * 2;
    if (
      row === startingRow &&
      !piece.moved &&
      isInBounds(twoStepRow, col) &&
      !state.board[twoStepRow][col]
    ) {
      moves.push({ row: twoStepRow, col, capture: false });
    }
  }

  [-1, 1].forEach((colDelta) => {
    const captureCol = col + colDelta;

    if (!isInBounds(oneStepRow, captureCol)) {
      return;
    }

    const target = state.board[oneStepRow][captureCol];

    if (target && target.side !== piece.side) {
      moves.push({ row: oneStepRow, col: captureCol, capture: true });
    }
  });

  return moves;
}

function isInBounds(row, col) {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

function toCoordinate(row, col) {
  return `${FILES[col]}${BOARD_SIZE - row}`;
}

function buildSquareLabel(row, col, piece, move) {
  const coordinate = toCoordinate(row, col);

  if (piece) {
    const pieceLabel = `${capitalize(piece.side)} ${PIECES[piece.type].name}`;
    return move ? `${coordinate}, capture ${pieceLabel}` : `${coordinate}, ${pieceLabel}`;
  }

  if (move) {
    return `${coordinate}, legal move`;
  }

  return `${coordinate}, empty`;
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getOpeningStatus() {
  return state.mode === "ai"
    ? "White opens the ritual. Black AI awaits your move."
    : "White opens the ritual.";
}

function getSideLabel(side) {
  return state.mode === "ai" && side === "black" ? `${capitalize(side)} (AI)` : capitalize(side);
}

function isAiTurn() {
  return state.mode === "ai" && state.currentPlayer === "black" && !state.winner && !state.isPaused;
}

function clearAiTimer() {
  if (state.aiTimerId !== null) {
    window.clearTimeout(state.aiTimerId);
    state.aiTimerId = null;
  }
}

function cancelAiTurn() {
  clearAiTimer();
  state.isAiThinking = false;
}

function queueAiMove() {
  clearAiTimer();
  state.aiTimerId = window.setTimeout(performAiTurn, AI_MOVE_DELAY_MS + Math.floor(Math.random() * AI_MOVE_DELAY_VARIANCE_MS));
}

function performAiTurn() {
  state.aiTimerId = null;

  if (!isAiTurn()) {
    state.isAiThinking = false;
    render();
    return;
  }

  const choice = chooseAiMove();
  state.isAiThinking = false;

  if (!choice) {
    state.winner = "white";
    state.status = "White wins. Black (AI) has no legal move.";
    saveGame(true);
    render();
    return;
  }

  applyMove(choice.from, choice.move);
}

function chooseAiMove() {
  const legalMoves = getAllLegalMoves("black");

  if (!legalMoves.length) {
    return null;
  }

  return legalMoves.reduce((best, candidate) => {
    const score = scoreAiMove(candidate);

    if (!best || score > best.score) {
      return {
        ...candidate,
        score,
      };
    }

    return best;
  }, null);
}

function scoreAiMove(candidate) {
  const { from, move, piece, target } = candidate;
  let score = Math.random();

  if (target && target.type === "crown") {
    return 100000 + score;
  }

  if (target) {
    score += PIECES[target.type].value * 100;
  }

  score += getCenterScore(move.row, move.col) * 2;
  score += move.capture ? 1.5 : 0;
  score += piece.type === "rune" ? move.row - from.row : 0;
  score += from.row === 0 && ["knight", "seer", "runeblade", "bastion"].includes(piece.type) ? 1.25 : 0;
  score -= piece.type === "crown" && !target ? 1.5 : 0;

  return score;
}

function getCenterScore(row, col) {
  const distanceFromCenter = Math.abs(3.5 - row) + Math.abs(3.5 - col);
  return 4 - distanceFromCenter / 2;
}

function syncModeInputs() {
  modeInputElements.forEach((input) => {
    input.checked = input.value === state.mode;
  });
}

function setGameMode(mode) {
  if (!["local", "ai"].includes(mode) || mode === state.mode) {
    syncModeInputs();
    return;
  }

  state.mode = mode;
  resetGame();
}

function pauseGame() {
  if (state.winner || state.isPaused) {
    return;
  }

  cancelAiTurn();
  clearSelection();
  state.isPaused = true;
  state.status = "Game paused. Press Continue when you are ready.";
  saveGame(true);
  render();
}

function continueGame() {
  if (!state.isPaused || state.winner) {
    return;
  }

  state.isPaused = false;
  state.status = isAiTurn()
    ? "Game continued. AI is thinking..."
    : `${getSideLabel(state.currentPlayer)} to move. Game continued.`;

  if (isAiTurn()) {
    state.isAiThinking = true;
    queueAiMove();
  }

  saveGame(true);
  render();
}

function serializeGame() {
  return {
    board: state.board,
    currentPlayer: state.currentPlayer,
    mode: state.mode,
    status: state.status,
    winner: state.winner,
    lastMove: state.lastMove,
    isPaused: state.isPaused,
    savedAt: new Date().toISOString(),
  };
}

function saveGame(silent = false) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(serializeGame()));
    if (!silent) {
      state.status = "Game saved. You can close the page and continue later.";
      render();
    }
    return true;
  } catch (error) {
    if (!silent) {
      state.status = "Could not save this game in your browser.";
      render();
    }
    return false;
  }
}

function hasSavedGame() {
  return Boolean(localStorage.getItem(SAVE_KEY));
}

function loadGame() {
  const rawSave = localStorage.getItem(SAVE_KEY);

  if (!rawSave) {
    return false;
  }

  try {
    const saved = JSON.parse(rawSave);
    cancelAiTurn();
    state.board = saved.board;
    state.currentPlayer = saved.currentPlayer || "white";
    state.mode = saved.mode === "ai" ? "ai" : "local";
    state.selected = null;
    state.legalMoves = [];
    state.status = saved.isPaused
      ? "Saved game loaded. Press Continue to resume."
      : "Saved game loaded. Continue playing.";
    state.winner = saved.winner || null;
    state.lastMove = saved.lastMove || null;
    state.isPaused = Boolean(saved.isPaused);
    state.isAiThinking = false;
    syncModeInputs();

    if (isAiTurn()) {
      state.isAiThinking = true;
      state.status = "Saved game loaded. AI is thinking...";
      queueAiMove();
    }

    render();
    return true;
  } catch (error) {
    localStorage.removeItem(SAVE_KEY);
    return false;
  }
}

restartButtonElement.addEventListener("click", resetGame);
pauseButtonElement.addEventListener("click", pauseGame);
continueButtonElement.addEventListener("click", continueGame);
saveButtonElement.addEventListener("click", () => saveGame(false));
loadButtonElement.addEventListener("click", loadGame);
window.addEventListener("beforeunload", () => saveGame(true));
modeInputElements.forEach((input) => {
  input.addEventListener("change", () => {
    if (input.checked) {
      setGameMode(input.value);
    }
  });
});

if (!loadGame()) {
  resetGame();
}
