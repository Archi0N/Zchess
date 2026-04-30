const BOARD_SIZE = 8;
const FILES = ["A", "B", "C", "D", "E", "F", "G", "H"];
const SAVE_KEY = "zchess-save-v2";
const LEGACY_SAVE_KEYS = ["rune-chess-save-v1"];
const SAVE_VERSION = 2;
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
  "rook",
  "knight",
  "bishop",
  "queen",
  "king",
  "bishop",
  "knight",
  "rook",
];
const LEGACY_PIECE_TYPE_MAP = {
  crown: "king",
  runeblade: "queen",
  bastion: "rook",
  seer: "bishop",
  knight: "knight",
  rune: "pawn",
};

const PIECES = {
  king: {
    name: "King",
    short: "K",
    value: 20000,
    symbols: {
      white: "♔",
      black: "♚",
    },
  },
  queen: {
    name: "Queen",
    short: "Q",
    value: 900,
    symbols: {
      white: "♕",
      black: "♛",
    },
  },
  rook: {
    name: "Rook",
    short: "R",
    value: 500,
    symbols: {
      white: "♖",
      black: "♜",
    },
  },
  bishop: {
    name: "Bishop",
    short: "B",
    value: 330,
    symbols: {
      white: "♗",
      black: "♝",
    },
  },
  knight: {
    name: "Knight",
    short: "N",
    value: 320,
    symbols: {
      white: "♘",
      black: "♞",
    },
  },
  pawn: {
    name: "Pawn",
    short: "P",
    value: 100,
    symbols: {
      white: "♙",
      black: "♟",
    },
  },
};

const AI_DIFFICULTY_LEVELS = {
  beginner: {
    name: "Beginner",
    description: "Very Easy",
    depth: 1,
    randomMoveChance: 0.7,
  },
  medium: {
    name: "Medium",
    description: "Easy",
    depth: 2,
    randomMoveChance: 0.4,
  },
  hard: {
    name: "Hard",
    description: "Hard",
    depth: 3,
    randomMoveChance: 0.15,
  },
  master: {
    name: "Master",
    description: "Very Hard",
    depth: 4,
    randomMoveChance: 0,
  },
};

const AI_SEARCH_LIMITS = {
  1: 40,
  2: 22,
  3: 16,
  4: 12,
};

const DOM_AVAILABLE = typeof document !== "undefined";
const WINDOW_AVAILABLE = typeof window !== "undefined";
const STORAGE_AVAILABLE = typeof localStorage !== "undefined";

const boardElement = DOM_AVAILABLE ? document.getElementById("board") : null;
const turnIndicatorElement = DOM_AVAILABLE ? document.getElementById("turn-indicator") : null;
const statusTextElement = DOM_AVAILABLE ? document.getElementById("status-text") : null;
const moveHistoryElement = DOM_AVAILABLE ? document.getElementById("move-history") : null;
const historyToggleElement = DOM_AVAILABLE ? document.getElementById("history-toggle") : null;
const restartButtonElement = DOM_AVAILABLE ? document.getElementById("restart-button") : null;
const pauseButtonElement = DOM_AVAILABLE ? document.getElementById("pause-button") : null;
const continueButtonElement = DOM_AVAILABLE ? document.getElementById("continue-button") : null;
const saveButtonElement = DOM_AVAILABLE ? document.getElementById("save-button") : null;
const loadButtonElement = DOM_AVAILABLE ? document.getElementById("load-button") : null;
const undoButtonElement = DOM_AVAILABLE ? document.getElementById("undo-button") : null;
const difficultySwitchElement = DOM_AVAILABLE ? document.getElementById("difficulty-switch") : null;
const modeInputElements = DOM_AVAILABLE
  ? document.querySelectorAll('input[name="game-mode"]')
  : [];
const difficultyInputElements = DOM_AVAILABLE
  ? document.querySelectorAll('input[name="ai-difficulty"]')
  : [];

const state = {
  board: createInitialBoard(),
  currentPlayer: "white",
  selected: null,
  legalMoves: [],
  pseudoMoves: [],
  mode: "local",
  aiDifficulty: "beginner",
  status: "White moves first.",
  winner: null,
  lastMove: null,
  isPaused: false,
  isAiThinking: false,
  aiTimerId: null,
  enPassantTarget: null,
  halfmoveClock: 0,
  moveHistory: [],
  gameHistory: [],
};

function createPiece(type, side, moved = false) {
  return {
    type,
    side,
    moved,
  };
}

function createEmptyBoard() {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
}

function createInitialBoard() {
  const board = createEmptyBoard();

  STARTING_BACK_RANK.forEach((type, col) => {
    board[0][col] = createPiece(type, "black");
    board[1][col] = createPiece("pawn", "black");
    board[6][col] = createPiece("pawn", "white");
    board[7][col] = createPiece(type, "white");
  });

  return board;
}

function cloneBoard(board) {
  return board.map((row) => row.map((piece) => (piece ? { ...piece } : null)));
}

function getGameSnapshot(sourceState = state) {
  return {
    board: sourceState.board,
    currentPlayer: sourceState.currentPlayer,
    winner: sourceState.winner,
    lastMove: sourceState.lastMove,
    enPassantTarget: sourceState.enPassantTarget,
    halfmoveClock: sourceState.halfmoveClock || 0,
  };
}

function createHistorySnapshot() {
  return {
    board: cloneBoard(state.board),
    currentPlayer: state.currentPlayer,
    winner: state.winner,
    lastMove: state.lastMove ? JSON.parse(JSON.stringify(state.lastMove)) : null,
    isPaused: state.isPaused,
    enPassantTarget: state.enPassantTarget ? { ...state.enPassantTarget } : null,
    halfmoveClock: state.halfmoveClock || 0,
    moveHistory: state.moveHistory.map((entry) => ({ ...entry })),
  };
}

function pushHistorySnapshot() {
  state.gameHistory.push(createHistorySnapshot());
}

function restoreHistorySnapshot(snapshot) {
  state.board = cloneBoard(snapshot.board);
  state.currentPlayer = snapshot.currentPlayer || "white";
  state.winner = snapshot.winner || null;
  state.lastMove = snapshot.lastMove || null;
  state.isPaused = Boolean(snapshot.isPaused);
  state.isAiThinking = false;
  state.enPassantTarget = snapshot.enPassantTarget || null;
  state.halfmoveClock = snapshot.halfmoveClock || 0;
  state.moveHistory = Array.isArray(snapshot.moveHistory)
    ? snapshot.moveHistory.map((entry) => ({ ...entry }))
    : [];
  clearSelection();
}

function resetGame() {
  cancelAiTurn();
  state.board = createInitialBoard();
  state.currentPlayer = "white";
  state.selected = null;
  state.legalMoves = [];
  state.pseudoMoves = [];
  state.mode = state.mode === "ai" ? "ai" : "local";
  state.status = getOpeningStatus();
  state.winner = null;
  state.lastMove = null;
  state.isPaused = false;
  state.enPassantTarget = null;
  state.halfmoveClock = 0;
  state.moveHistory = [];
  state.gameHistory = [];
  syncModeInputs();
  saveGame(true);
  render();
}

function render() {
  if (!DOM_AVAILABLE) {
    return;
  }

  renderStatus();
  renderControls();
  renderBoard();
  renderMoveHistory();
}

function renderMoveHistory() {
  if (!moveHistoryElement) {
    return;
  }

  moveHistoryElement.textContent = "";

  if (!state.moveHistory.length) {
    const emptyElement = document.createElement("li");
    emptyElement.className = "history-empty";
    emptyElement.textContent = "No moves yet.";
    moveHistoryElement.append(emptyElement);
    return;
  }

  state.moveHistory.forEach((entry, index) => {
    const itemElement = document.createElement("li");
    const numberElement = document.createElement("span");
    const detailElement = document.createElement("span");

    numberElement.className = "move-number";
    numberElement.textContent = `${index + 1}.`;
    detailElement.className = "move-detail";
    detailElement.textContent = entry.text;

    itemElement.append(numberElement, detailElement);
    moveHistoryElement.append(itemElement);
  });

  if (!moveHistoryElement.hidden) {
    moveHistoryElement.scrollTop = moveHistoryElement.scrollHeight;
  }
}

function toggleMoveHistory() {
  if (!moveHistoryElement || !historyToggleElement) {
    return;
  }

  const shouldShow = moveHistoryElement.hidden;
  moveHistoryElement.hidden = !shouldShow;
  historyToggleElement.setAttribute("aria-expanded", shouldShow ? "true" : "false");

  if (shouldShow) {
    renderMoveHistory();
  }
}

function renderStatus() {
  if (!turnIndicatorElement || !statusTextElement) {
    return;
  }

  if (state.winner) {
    turnIndicatorElement.textContent = "GAME OVER";
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
  if (!pauseButtonElement || !continueButtonElement || !saveButtonElement || !loadButtonElement) {
    return;
  }

  pauseButtonElement.disabled = Boolean(state.winner || state.isPaused);
  continueButtonElement.disabled = Boolean(state.winner || !state.isPaused);
  saveButtonElement.disabled = false;
  loadButtonElement.disabled = !hasSavedGame();

  if (undoButtonElement) {
    undoButtonElement.disabled = state.gameHistory.length === 0;
  }
}

function renderBoard() {
  if (!boardElement) {
    return;
  }

  const boardLocked = state.isAiThinking || state.isPaused || Boolean(state.winner);

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

  const game = getGameSnapshot();
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
    const pseudoMoves = getPseudoMoves(game, row, col);
    const legalMoves = getLegalMoves(game, row, col);
    const checked = isInCheck(game, piece.side);

    state.selected = { row, col };
    state.pseudoMoves = pseudoMoves;
    state.legalMoves = legalMoves;

    if (legalMoves.length) {
      state.status = checked
        ? `${getSideLabel(piece.side)} is in check. Choose a highlighted move.`
        : `${getSideLabel(piece.side)} ${PIECES[piece.type].name} selected. Choose a highlighted square.`;
    } else if (pseudoMoves.length) {
      state.status = checked
        ? "Illegal move: king remains in check."
        : `${getSideLabel(piece.side)} ${PIECES[piece.type].name} has no legal moves.`;
    } else {
      state.status = `${getSideLabel(piece.side)} ${PIECES[piece.type].name} has no legal moves.`;
    }

    render();
    return;
  }

  if (state.selected) {
    const pseudoMove = findPseudoMove(row, col);
    clearSelection();
    state.status = pseudoMove
      ? "Illegal move: king remains in check."
      : "No legal move there.";
    render();
  }
}

function applyMove(from, move) {
  const analysis = evaluateMoveOutcome(getGameSnapshot(), from, move);

  if (!analysis) {
    return;
  }

  pushHistorySnapshot();
  state.board = analysis.game.board;
  state.currentPlayer = analysis.game.currentPlayer;
  state.enPassantTarget = analysis.game.enPassantTarget;
  state.halfmoveClock = analysis.game.halfmoveClock;
  state.lastMove = analysis.game.lastMove;
  state.isAiThinking = false;
  clearSelection();

  state.moveHistory.push(createMoveHistoryEntry(analysis));

  if (analysis.checkmate) {
    setWinner(analysis.movingPiece.side);
    saveGame(true);
    render();
    return;
  }

  if (analysis.stalemate) {
    setWinner("draw");
    saveGame(true);
    render();
    return;
  }

  if (analysis.fiftyMoveDraw) {
    setWinner("draw");
    state.status = "Draw by 50-move rule.";
    saveGame(true);
    render();
    return;
  }

  let status = buildMoveStatus(analysis);

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

function buildMoveStatus(analysis) {
  const mover = getSideLabel(analysis.movingPiece.side);
  const responder = getSideLabel(analysis.game.currentPlayer);
  const destination = toCoordinate(analysis.move.row, analysis.move.col);
  const segments = [];

  if (analysis.move.castle) {
    segments.push(
      `${mover} castled ${analysis.move.castle.side === "king" ? "kingside" : "queenside"}.`
    );
  } else if (analysis.move.enPassant) {
    segments.push(`${mover} Pawn captured en passant on ${destination}.`);
  } else if (analysis.capturedPiece) {
    segments.push(
      `${mover} ${PIECES[analysis.movingPiece.type].name} captured ${PIECES[analysis.capturedPiece.type].name} on ${destination}.`
    );
  } else {
    segments.push(`${mover} ${PIECES[analysis.movingPiece.type].name} moved to ${destination}.`);
  }

  if (analysis.move.promotion) {
    segments.push(`${mover} Pawn promoted to Queen.`);
  }

  if (analysis.check) {
    segments.push(`${responder} is in check.`);
  } else {
    segments.push(`${responder} to respond.`);
  }

  return segments.join(" ");
}

function createMoveHistoryEntry(analysis) {
  const pieceName = PIECES[analysis.movingPiece.type].name;
  const from = toCoordinate(analysis.from.row, analysis.from.col);
  const to = toCoordinate(analysis.move.row, analysis.move.col);
  const side = capitalize(analysis.movingPiece.side);
  const suffixes = [];

  if (analysis.move.castle) {
    suffixes.push(analysis.move.castle.side === "king" ? "castled kingside" : "castled queenside");
  } else {
    suffixes.push(`${pieceName} ${from} → ${to}`);
  }

  if (analysis.capturedPiece) {
    suffixes.push(`captured ${PIECES[analysis.capturedPiece.type].name}`);
  }

  if (analysis.move.enPassant) {
    suffixes.push("en passant");
  }

  if (analysis.move.promotion) {
    suffixes.push("promoted to Queen");
  }

  if (analysis.checkmate) {
    suffixes.push("checkmate");
  } else if (analysis.check) {
    suffixes.push("check");
  }

  return {
    side: analysis.movingPiece.side,
    text: `${side}: ${suffixes.join(" • ")}`,
  };
}

function clearSelection() {
  state.selected = null;
  state.legalMoves = [];
  state.pseudoMoves = [];
}

function setWinner(side) {
  state.winner = side;
  state.isAiThinking = false;
  state.status = side === "white"
    ? "White win"
    : side === "black"
      ? "Black win"
      : "Stalemate.";
}

function findMove(row, col) {
  return state.legalMoves.find((move) => move.row === row && move.col === col) || null;
}

function findPseudoMove(row, col) {
  return state.pseudoMoves.find((move) => move.row === row && move.col === col) || null;
}

function isSelectedSquare(row, col) {
  return Boolean(state.selected && state.selected.row === row && state.selected.col === col);
}

function getAllLegalMoves(game, side) {
  const candidates = [];

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const piece = game.board[row][col];

      if (!piece || piece.side !== side) {
        continue;
      }

      getLegalMoves(game, row, col).forEach((move) => {
        const captureSquare = move.enPassant ? move.captureSquare : { row: move.row, col: move.col };

        candidates.push({
          from: { row, col },
          move,
          piece,
          target: move.capture && captureSquare
            ? game.board[captureSquare.row][captureSquare.col]
            : game.board[move.row][move.col],
        });
      });
    }
  }

  return candidates;
}

function getLegalMoves(game, row, col) {
  const piece = game.board[row][col];

  if (!piece) {
    return [];
  }

  return getPseudoMoves(game, row, col).filter((move) => {
    const nextGame = applyMoveToGame(game, { row, col }, move);
    return !isInCheck(nextGame, piece.side);
  });
}

function getPseudoMoves(game, row, col) {
  const piece = game.board[row][col];

  if (!piece) {
    return [];
  }

  switch (piece.type) {
    case "king":
      return getKingMoves(game, row, col, piece);
    case "queen":
      return getSlidingMoves(game, row, col, piece, DIRECTIONS_ALL, BOARD_SIZE);
    case "rook":
      return getSlidingMoves(game, row, col, piece, DIRECTIONS_ORTHOGONAL, BOARD_SIZE);
    case "bishop":
      return getSlidingMoves(game, row, col, piece, DIRECTIONS_DIAGONAL, BOARD_SIZE);
    case "knight":
      return getKnightMoves(game, row, col, piece);
    case "pawn":
      return getPawnMoves(game, row, col, piece);
    default:
      return [];
  }
}

function getSlidingMoves(game, row, col, piece, directions, maxSteps) {
  const moves = [];

  directions.forEach(([rowDelta, colDelta]) => {
    for (let step = 1; step <= maxSteps; step += 1) {
      const nextRow = row + rowDelta * step;
      const nextCol = col + colDelta * step;

      if (!isInBounds(nextRow, nextCol)) {
        break;
      }

      const target = game.board[nextRow][nextCol];

      if (!target) {
        moves.push({ row: nextRow, col: nextCol, capture: false });
        continue;
      }

      if (target.side !== piece.side && target.type !== "king") {
        moves.push({ row: nextRow, col: nextCol, capture: true });
      }

      break;
    }
  });

  return moves;
}

function getKnightMoves(game, row, col, piece) {
  return KNIGHT_JUMPS.reduce((moves, [rowDelta, colDelta]) => {
    const nextRow = row + rowDelta;
    const nextCol = col + colDelta;

    if (!isInBounds(nextRow, nextCol)) {
      return moves;
    }

    const target = game.board[nextRow][nextCol];

    if (!target) {
      moves.push({ row: nextRow, col: nextCol, capture: false });
    } else if (target.side !== piece.side && target.type !== "king") {
      moves.push({ row: nextRow, col: nextCol, capture: true });
    }

    return moves;
  }, []);
}

function getPawnMoves(game, row, col, piece) {
  const moves = [];
  const forward = piece.side === "white" ? -1 : 1;
  const startingRow = piece.side === "white" ? 6 : 1;
  const promotionRow = piece.side === "white" ? 0 : 7;
  const oneStepRow = row + forward;

  if (isInBounds(oneStepRow, col) && !game.board[oneStepRow][col]) {
    moves.push(buildPawnMove(piece, oneStepRow, col, promotionRow));

    const twoStepRow = row + forward * 2;
    if (
      row === startingRow &&
      !piece.moved &&
      isInBounds(twoStepRow, col) &&
      !game.board[twoStepRow][col]
    ) {
      moves.push({ row: twoStepRow, col, capture: false });
    }
  }

  [-1, 1].forEach((colDelta) => {
    const captureCol = col + colDelta;

    if (!isInBounds(oneStepRow, captureCol)) {
      return;
    }

    const target = game.board[oneStepRow][captureCol];

    if (target && target.side !== piece.side && target.type !== "king") {
      moves.push(buildPawnMove(piece, oneStepRow, captureCol, promotionRow, { capture: true }));
      return;
    }

    if (
      game.enPassantTarget &&
      game.enPassantTarget.row === oneStepRow &&
      game.enPassantTarget.col === captureCol &&
      game.enPassantTarget.side !== piece.side
    ) {
      const capturedPawn = game.board[game.enPassantTarget.pawnRow][game.enPassantTarget.pawnCol];

      if (capturedPawn && capturedPawn.type === "pawn" && capturedPawn.side !== piece.side) {
        moves.push({
          row: oneStepRow,
          col: captureCol,
          capture: true,
          enPassant: true,
          captureSquare: {
            row: game.enPassantTarget.pawnRow,
            col: game.enPassantTarget.pawnCol,
          },
        });
      }
    }
  });

  return moves;
}

function buildPawnMove(piece, row, col, promotionRow, extra = {}) {
  return row === promotionRow
    ? { row, col, capture: Boolean(extra.capture), promotion: "queen" }
    : { row, col, capture: Boolean(extra.capture) };
}

function getKingMoves(game, row, col, piece) {
  const moves = [];

  DIRECTIONS_ALL.forEach(([rowDelta, colDelta]) => {
    const nextRow = row + rowDelta;
    const nextCol = col + colDelta;

    if (!isInBounds(nextRow, nextCol)) {
      return;
    }

    const target = game.board[nextRow][nextCol];

    if (!target) {
      moves.push({ row: nextRow, col: nextCol, capture: false });
    } else if (target.side !== piece.side && target.type !== "king") {
      moves.push({ row: nextRow, col: nextCol, capture: true });
    }
  });

  const homeRow = piece.side === "white" ? 7 : 0;

  if (piece.moved || row !== homeRow || col !== 4) {
    return moves;
  }

  const enemySide = getOpponent(piece.side);

  if (isInCheck(game, piece.side)) {
    return moves;
  }

  const kingsideRook = game.board[homeRow][7];
  if (
    kingsideRook &&
    kingsideRook.side === piece.side &&
    kingsideRook.type === "rook" &&
    !kingsideRook.moved &&
    !game.board[homeRow][5] &&
    !game.board[homeRow][6] &&
    !isSquareAttacked(game, homeRow, 5, enemySide) &&
    !isSquareAttacked(game, homeRow, 6, enemySide)
  ) {
    moves.push({
      row: homeRow,
      col: 6,
      capture: false,
      castle: {
        side: "king",
        rookFrom: { row: homeRow, col: 7 },
        rookTo: { row: homeRow, col: 5 },
      },
    });
  }

  const queensideRook = game.board[homeRow][0];
  if (
    queensideRook &&
    queensideRook.side === piece.side &&
    queensideRook.type === "rook" &&
    !queensideRook.moved &&
    !game.board[homeRow][1] &&
    !game.board[homeRow][2] &&
    !game.board[homeRow][3] &&
    !isSquareAttacked(game, homeRow, 3, enemySide) &&
    !isSquareAttacked(game, homeRow, 2, enemySide)
  ) {
    moves.push({
      row: homeRow,
      col: 2,
      capture: false,
      castle: {
        side: "queen",
        rookFrom: { row: homeRow, col: 0 },
        rookTo: { row: homeRow, col: 3 },
      },
    });
  }

  return moves;
}

function applyMoveToGame(game, from, move) {
  const board = cloneBoard(game.board);
  const movingPiece = board[from.row][from.col];
  const captureSquare = move.enPassant ? move.captureSquare : { row: move.row, col: move.col };
  const capturedPiece = move.capture && captureSquare
    ? board[captureSquare.row][captureSquare.col]
    : null;
  const nextPiece = { ...movingPiece, moved: true };
  const halfmoveClock = movingPiece.type === "pawn" || capturedPiece
    ? 0
    : (game.halfmoveClock || 0) + 1;

  board[from.row][from.col] = null;

  if (move.enPassant && move.captureSquare) {
    board[move.captureSquare.row][move.captureSquare.col] = null;
  }

  if (move.castle) {
    const rook = board[move.castle.rookFrom.row][move.castle.rookFrom.col];
    board[move.castle.rookFrom.row][move.castle.rookFrom.col] = null;

    if (rook) {
      board[move.castle.rookTo.row][move.castle.rookTo.col] = {
        ...rook,
        moved: true,
      };
    }
  }

  if (move.promotion) {
    nextPiece.type = move.promotion;
  }

  board[move.row][move.col] = nextPiece;

  return {
    board,
    currentPlayer: getOpponent(movingPiece.side),
    winner: null,
    lastMove: {
      from: { row: from.row, col: from.col },
      to: { row: move.row, col: move.col },
    },
    halfmoveClock,
    enPassantTarget: movingPiece.type === "pawn" && Math.abs(move.row - from.row) === 2
      ? {
          row: from.row + (move.row - from.row) / 2,
          col: from.col,
          pawnRow: move.row,
          pawnCol: move.col,
          side: movingPiece.side,
        }
      : null,
  };
}

function evaluateMoveOutcome(game, from, move) {
  const movingPiece = game.board[from.row][from.col];

  if (!movingPiece) {
    return null;
  }

  const captureSquare = move.enPassant ? move.captureSquare : { row: move.row, col: move.col };
  const capturedPiece = move.capture && captureSquare
    ? game.board[captureSquare.row][captureSquare.col]
    : null;
  const nextGame = applyMoveToGame(game, from, move);
  const checkedSide = nextGame.currentPlayer;
  const check = isInCheck(nextGame, checkedSide);
  const legalReplies = getAllLegalMoves(nextGame, checkedSide);

  return {
    from,
    move,
    movingPiece: { ...movingPiece },
    capturedPiece: capturedPiece ? { ...capturedPiece } : null,
    game: nextGame,
    check,
    checkmate: check && legalReplies.length === 0,
    stalemate: !check && legalReplies.length === 0,
    fiftyMoveDraw: nextGame.halfmoveClock >= 100,
  };
}

function findKing(board, side) {
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const piece = board[row][col];

      if (piece && piece.side === side && piece.type === "king") {
        return { row, col };
      }
    }
  }

  return null;
}

function isInCheck(game, side) {
  const kingSquare = findKing(game.board, side);
  return kingSquare ? isSquareAttacked(game, kingSquare.row, kingSquare.col, getOpponent(side)) : false;
}

function isSquareAttacked(game, row, col, attackerSide) {
  const pawnRow = row + (attackerSide === "white" ? 1 : -1);

  for (const colDelta of [-1, 1]) {
    const attackCol = col + colDelta;

    if (!isInBounds(pawnRow, attackCol)) {
      continue;
    }

    const pawn = game.board[pawnRow][attackCol];
    if (pawn && pawn.side === attackerSide && pawn.type === "pawn") {
      return true;
    }
  }

  for (const [rowDelta, colDelta] of KNIGHT_JUMPS) {
    const nextRow = row + rowDelta;
    const nextCol = col + colDelta;

    if (!isInBounds(nextRow, nextCol)) {
      continue;
    }

    const piece = game.board[nextRow][nextCol];
    if (piece && piece.side === attackerSide && piece.type === "knight") {
      return true;
    }
  }

  for (const [rowDelta, colDelta] of DIRECTIONS_ALL) {
    const nextRow = row + rowDelta;
    const nextCol = col + colDelta;

    if (!isInBounds(nextRow, nextCol)) {
      continue;
    }

    const piece = game.board[nextRow][nextCol];
    if (piece && piece.side === attackerSide && piece.type === "king") {
      return true;
    }
  }

  for (const [rowDelta, colDelta] of DIRECTIONS_ORTHOGONAL) {
    for (let step = 1; step < BOARD_SIZE; step += 1) {
      const nextRow = row + rowDelta * step;
      const nextCol = col + colDelta * step;

      if (!isInBounds(nextRow, nextCol)) {
        break;
      }

      const piece = game.board[nextRow][nextCol];
      if (!piece) {
        continue;
      }

      if (piece.side === attackerSide && (piece.type === "rook" || piece.type === "queen")) {
        return true;
      }

      break;
    }
  }

  for (const [rowDelta, colDelta] of DIRECTIONS_DIAGONAL) {
    for (let step = 1; step < BOARD_SIZE; step += 1) {
      const nextRow = row + rowDelta * step;
      const nextCol = col + colDelta * step;

      if (!isInBounds(nextRow, nextCol)) {
        break;
      }

      const piece = game.board[nextRow][nextCol];
      if (!piece) {
        continue;
      }

      if (piece.side === attackerSide && (piece.type === "bishop" || piece.type === "queen")) {
        return true;
      }

      break;
    }
  }

  return false;
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
    if (move.castle) {
      return `${coordinate}, castling move`;
    }

    if (move.enPassant) {
      return `${coordinate}, en passant capture`;
    }

    if (move.capture) {
      return `${coordinate}, legal capture`;
    }

    return `${coordinate}, legal move`;
  }

  return `${coordinate}, empty`;
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getOpponent(side) {
  return side === "white" ? "black" : "white";
}

function getOpeningStatus() {
  return state.mode === "ai"
    ? "White moves first. Black AI awaits your move."
    : "White moves first.";
}

function getSideLabel(side) {
  return state.mode === "ai" && side === "black" ? `${capitalize(side)} (AI)` : capitalize(side);
}

function isAiTurn() {
  return state.mode === "ai" && state.currentPlayer === "black" && !state.winner && !state.isPaused;
}

function clearAiTimer() {
  if (state.aiTimerId !== null && WINDOW_AVAILABLE) {
    window.clearTimeout(state.aiTimerId);
    state.aiTimerId = null;
  }
}

function cancelAiTurn() {
  clearAiTimer();
  state.isAiThinking = false;
}

function queueAiMove() {
  if (!WINDOW_AVAILABLE) {
    return;
  }

  clearAiTimer();
  state.aiTimerId = window.setTimeout(
    performAiTurn,
    AI_MOVE_DELAY_MS + Math.floor(Math.random() * AI_MOVE_DELAY_VARIANCE_MS)
  );
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
    setWinner(isInCheck(getGameSnapshot(), "black") ? "white" : "draw");
    saveGame(true);
    render();
    return;
  }

  applyMove(choice.from, choice.move);
}

function chooseAiMove() {
  const game = getGameSnapshot();
  const legalMoves = getAllLegalMoves(game, "black");
  const difficulty = getSelectedAIDifficulty();

  if (!legalMoves.length) {
    return null;
  }

  if (Math.random() < difficulty.randomMoveChance) {
    return legalMoves[Math.floor(Math.random() * legalMoves.length)];
  }

  if (difficulty.depth <= 1) {
    return chooseBestImmediateMove(game, legalMoves);
  }

  return chooseBestSearchMove(game, legalMoves, difficulty);
}

function chooseBestImmediateMove(game, legalMoves) {
  return legalMoves.reduce((best, candidate) => {
    const score = scoreAiMove(game, candidate);

    if (!best || score > best.score) {
      return {
        ...candidate,
        score,
      };
    }

    return best;
  }, null);
}

function scoreAiMove(game, candidate) {
  const { from, move, piece } = candidate;
  const analysis = evaluateMoveOutcome(game, from, move);
  let score = Math.random();

  if (!analysis) {
    return score;
  }

  if (analysis.checkmate) {
    return 1000000 + score;
  }

  if (analysis.move.promotion) {
    score += 850;
  }

  if (analysis.move.castle) {
    score += 70;
  }

  if (analysis.capturedPiece) {
    score += 250 + PIECES[analysis.capturedPiece.type].value - PIECES[piece.type].value * 0.08;
  }

  if (analysis.check) {
    score += 140;
  }

  if (analysis.stalemate) {
    score += 5;
  }

  score += getCenterScore(move.row, move.col) * 6;
  score += getDevelopmentScore(from, piece);

  if (piece.type === "pawn") {
    score += move.row - from.row;
  }

  if (piece.type === "king" && !analysis.move.castle && !analysis.check) {
    score -= 10;
  }

  return score;
}

function chooseBestSearchMove(game, legalMoves, difficulty) {
  const orderedMoves = orderAiCandidates(game, legalMoves, difficulty.depth);

  return orderedMoves.reduce((best, candidate) => {
    const nextGame = applyMoveToGame(game, candidate.from, candidate.move);
    const score = minimax(nextGame, difficulty.depth - 1, -Infinity, Infinity, false);
    const adjustedScore = score + Math.random() * 0.01;

    if (!best || adjustedScore > best.score) {
      return {
        ...candidate,
        score: adjustedScore,
      };
    }

    return best;
  }, null);
}

function minimax(game, depth, alpha, beta, blackToMove) {
  const side = blackToMove ? "black" : "white";
  const legalMoves = getAllLegalMoves(game, side);

  if (!legalMoves.length) {
    if (isInCheck(game, side)) {
      return side === "black" ? -1000000 - depth : 1000000 + depth;
    }

    return 0;
  }

  if (depth <= 0) {
    return evaluatePosition(game);
  }

  const orderedMoves = orderAiCandidates(game, legalMoves, depth);

  if (blackToMove) {
    let bestScore = -Infinity;

    for (const candidate of orderedMoves) {
      const nextGame = applyMoveToGame(game, candidate.from, candidate.move);
      bestScore = Math.max(bestScore, minimax(nextGame, depth - 1, alpha, beta, false));
      alpha = Math.max(alpha, bestScore);

      if (beta <= alpha) {
        break;
      }
    }

    return bestScore;
  }

  let bestScore = Infinity;

  for (const candidate of orderedMoves) {
    const nextGame = applyMoveToGame(game, candidate.from, candidate.move);
    bestScore = Math.min(bestScore, minimax(nextGame, depth - 1, alpha, beta, true));
    beta = Math.min(beta, bestScore);

    if (beta <= alpha) {
      break;
    }
  }

  return bestScore;
}

function orderAiCandidates(game, legalMoves, depth) {
  const limit = AI_SEARCH_LIMITS[Math.max(1, Math.min(4, depth))] || 12;

  return legalMoves
    .map((candidate) => ({
      ...candidate,
      orderScore: scoreAiMove(game, candidate),
    }))
    .sort((a, b) => b.orderScore - a.orderScore)
    .slice(0, limit);
}

function evaluatePosition(game) {
  let score = 0;

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const piece = game.board[row][col];

      if (!piece) {
        continue;
      }

      const sideMultiplier = piece.side === "black" ? 1 : -1;
      score += sideMultiplier * PIECES[piece.type].value;
      score += sideMultiplier * getCenterScore(row, col) * 4;

      if (piece.type === "pawn") {
        score += piece.side === "black" ? row * 8 : (7 - row) * -8;
      }
    }
  }

  if (isInCheck(game, "white")) {
    score += 45;
  }

  if (isInCheck(game, "black")) {
    score -= 45;
  }

  return score;
}

function getCenterScore(row, col) {
  const distanceFromCenter = Math.abs(3.5 - row) + Math.abs(3.5 - col);
  return 4 - distanceFromCenter / 2;
}

function getDevelopmentScore(from, piece) {
  if (
    piece.side === "black" &&
    from.row === 0 &&
    ["knight", "bishop", "queen", "rook"].includes(piece.type)
  ) {
    return 8;
  }

  return 0;
}

function syncModeInputs() {
  Array.from(modeInputElements).forEach((input) => {
    input.checked = input.value === state.mode;
  });

  if (difficultySwitchElement) {
    difficultySwitchElement.hidden = state.mode !== "ai";
  }

  syncDifficultyInputs();
}

function syncDifficultyInputs() {
  Array.from(difficultyInputElements).forEach((input) => {
    input.checked = input.value === state.aiDifficulty;
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

function getSelectedAIDifficulty() {
  return AI_DIFFICULTY_LEVELS[state.aiDifficulty] || AI_DIFFICULTY_LEVELS.beginner;
}

function setAIDifficulty(level) {
  if (!AI_DIFFICULTY_LEVELS[level]) {
    syncDifficultyInputs();
    return;
  }

  state.aiDifficulty = level;
  const difficulty = getSelectedAIDifficulty();
  state.status = `AI Level: ${difficulty.name}.`;
  saveGame(true);
  syncDifficultyInputs();
  render();
}

function undoMove() {
  if (state.gameHistory.length === 0) {
    state.status = "No moves to undo.";
    render();
    return;
  }

  cancelAiTurn();
  const undoCount = state.mode === "ai" && state.currentPlayer === "white" && state.gameHistory.length >= 2
    ? 2
    : 1;
  let snapshot = null;

  for (let index = 0; index < undoCount; index += 1) {
    snapshot = state.gameHistory.pop();
  }

  restoreHistorySnapshot(snapshot);
  state.status = undoCount === 2
    ? "Undid your move and the AI reply."
    : "Undid the last move.";
  saveGame(true);
  render();
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
    version: SAVE_VERSION,
    board: state.board,
    currentPlayer: state.currentPlayer,
    mode: state.mode,
    aiDifficulty: state.aiDifficulty,
    status: state.status,
    winner: state.winner,
    lastMove: state.lastMove,
    isPaused: state.isPaused,
    enPassantTarget: state.enPassantTarget,
    halfmoveClock: state.halfmoveClock,
    moveHistory: state.moveHistory,
    gameHistory: state.gameHistory,
    savedAt: new Date().toISOString(),
  };
}

function saveGame(silent = false) {
  if (!STORAGE_AVAILABLE) {
    if (!silent) {
      state.status = "Could not save this game in your browser.";
      render();
    }
    return false;
  }

  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(serializeGame()));
    LEGACY_SAVE_KEYS.forEach((key) => localStorage.removeItem(key));

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

function findStoredSaveEntry() {
  if (!STORAGE_AVAILABLE) {
    return null;
  }

  try {
    for (const key of [SAVE_KEY, ...LEGACY_SAVE_KEYS]) {
      const rawSave = localStorage.getItem(key);

      if (rawSave) {
        return { key, rawSave };
      }
    }
  } catch (error) {
    return null;
  }

  return null;
}

function hasSavedGame() {
  return Boolean(findStoredSaveEntry());
}

function loadGame() {
  const entry = findStoredSaveEntry();

  if (!entry) {
    return false;
  }

  try {
    const saved = JSON.parse(entry.rawSave);
    const migrated = migrateSaveData(saved);

    if (!migrated) {
      localStorage.removeItem(entry.key);
      return false;
    }

    cancelAiTurn();
    state.board = migrated.board;
    state.currentPlayer = migrated.currentPlayer;
    state.mode = migrated.mode;
    state.aiDifficulty = migrated.aiDifficulty;
    state.selected = null;
    state.legalMoves = [];
    state.pseudoMoves = [];
    state.winner = migrated.winner;
    state.lastMove = migrated.lastMove;
    state.isPaused = migrated.isPaused;
    state.isAiThinking = false;
    state.enPassantTarget = migrated.enPassantTarget;
    state.halfmoveClock = migrated.halfmoveClock;
    state.moveHistory = migrated.moveHistory;
    state.gameHistory = migrated.gameHistory;
    syncModeInputs();

    if (!state.winner) {
      const game = getGameSnapshot();
      const legalMoves = getAllLegalMoves(game, state.currentPlayer);
      const checked = isInCheck(game, state.currentPlayer);

      if (!legalMoves.length) {
        setWinner(checked ? getOpponent(state.currentPlayer) : "draw");
      } else {
        state.status = state.isPaused
          ? "Saved game loaded. Press Continue to resume."
          : checked
            ? `Saved game loaded. ${getSideLabel(state.currentPlayer)} is in check.`
            : "Saved game loaded. Continue playing.";
      }
    } else {
      state.status = migrated.status || (state.winner === "white"
        ? "White win"
        : state.winner === "black"
          ? "Black win"
          : "Stalemate.");
    }

    if (entry.key !== SAVE_KEY || saved.version !== SAVE_VERSION) {
      saveGame(true);
    }

    if (isAiTurn()) {
      state.isAiThinking = true;
      state.status = "Saved game loaded. AI is thinking...";
      queueAiMove();
    }

    render();
    return true;
  } catch (error) {
    localStorage.removeItem(entry.key);
    return false;
  }
}

function migrateSaveData(saved) {
  if (!saved || typeof saved !== "object") {
    return null;
  }

  const board = normalizeBoard(saved.board);

  if (!board || !hasExactlyOneKingPerSide(board)) {
    return null;
  }

  return {
    board,
    currentPlayer: normalizeSide(saved.currentPlayer) || "white",
    mode: saved.mode === "ai" ? "ai" : "local",
    aiDifficulty: AI_DIFFICULTY_LEVELS[saved.aiDifficulty] ? saved.aiDifficulty : "beginner",
    winner: ["white", "black", "draw"].includes(saved.winner) ? saved.winner : null,
    status: typeof saved.status === "string" ? saved.status.slice(0, 160) : null,
    lastMove: normalizeLastMove(saved.lastMove),
    isPaused: Boolean(saved.isPaused),
    enPassantTarget: normalizeEnPassantTarget(saved.enPassantTarget, board)
      || inferLegacyEnPassantTarget(board, saved.lastMove),
    halfmoveClock: normalizeHalfmoveClock(saved.halfmoveClock),
    moveHistory: normalizeMoveHistory(saved.moveHistory),
    gameHistory: normalizeGameHistory(saved.gameHistory),
  };
}

function normalizeBoard(board) {
  if (!Array.isArray(board) || board.length !== BOARD_SIZE) {
    return null;
  }

  const normalizedBoard = createEmptyBoard();

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    if (!Array.isArray(board[row]) || board[row].length !== BOARD_SIZE) {
      return null;
    }

    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const normalizedPiece = normalizePiece(board[row][col], row, col);

      if (normalizedPiece === false) {
        return null;
      }

      normalizedBoard[row][col] = normalizedPiece;
    }
  }

  return normalizedBoard;
}

function normalizePiece(piece, row, col) {
  if (piece == null) {
    return null;
  }

  if (typeof piece !== "object") {
    return false;
  }

  const type = normalizePieceType(piece.type);
  const side = normalizeSide(piece.side);

  if (!type || !side || !PIECES[type]) {
    return false;
  }

  const moved = typeof piece.moved === "boolean"
    ? piece.moved
    : inferMovedFlag(type, side, row, col);

  return { type, side, moved };
}

function normalizePieceType(type) {
  const normalized = LEGACY_PIECE_TYPE_MAP[type] || type;
  return Object.prototype.hasOwnProperty.call(PIECES, normalized) ? normalized : null;
}

function normalizeSide(side) {
  return side === "white" || side === "black" ? side : null;
}

function inferMovedFlag(type, side, row, col) {
  if (type === "pawn") {
    return row !== (side === "white" ? 6 : 1);
  }

  if (type === "king") {
    return row !== (side === "white" ? 7 : 0) || col !== 4;
  }

  if (type === "rook") {
    return row !== (side === "white" ? 7 : 0) || ![0, 7].includes(col);
  }

  return false;
}

function hasExactlyOneKingPerSide(board) {
  let whiteKings = 0;
  let blackKings = 0;

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const piece = board[row][col];

      if (!piece || piece.type !== "king") {
        continue;
      }

      if (piece.side === "white") {
        whiteKings += 1;
      } else if (piece.side === "black") {
        blackKings += 1;
      }
    }
  }

  return whiteKings === 1 && blackKings === 1;
}

function normalizeLastMove(lastMove) {
  if (!lastMove || typeof lastMove !== "object") {
    return null;
  }

  const from = normalizeSquare(lastMove.from);
  const to = normalizeSquare(lastMove.to);

  return from && to ? { from, to } : null;
}

function normalizeGameHistory(history) {
  if (!Array.isArray(history)) {
    return [];
  }

  return history.reduce((snapshots, snapshot) => {
    if (!snapshot || typeof snapshot !== "object") {
      return snapshots;
    }

    const board = normalizeBoard(snapshot.board);

    if (!board || !hasExactlyOneKingPerSide(board)) {
      return snapshots;
    }

    snapshots.push({
      board,
      currentPlayer: normalizeSide(snapshot.currentPlayer) || "white",
      winner: ["white", "black", "draw"].includes(snapshot.winner) ? snapshot.winner : null,
      lastMove: normalizeLastMove(snapshot.lastMove),
      isPaused: Boolean(snapshot.isPaused),
      enPassantTarget: normalizeEnPassantTarget(snapshot.enPassantTarget, board),
      halfmoveClock: normalizeHalfmoveClock(snapshot.halfmoveClock),
      moveHistory: normalizeMoveHistory(snapshot.moveHistory),
    });

    return snapshots;
  }, []);
}

function normalizeMoveHistory(history) {
  if (!Array.isArray(history)) {
    return [];
  }

  return history.reduce((entries, entry) => {
    if (!entry || typeof entry !== "object" || typeof entry.text !== "string") {
      return entries;
    }

    entries.push({
      side: normalizeSide(entry.side) || "white",
      text: entry.text.slice(0, 140),
    });

    return entries;
  }, []);
}

function normalizeSquare(square) {
  if (!square || typeof square !== "object") {
    return null;
  }

  const row = normalizeIndex(square.row);
  const col = normalizeIndex(square.col);
  return row === null || col === null ? null : { row, col };
}

function normalizeIndex(value) {
  return Number.isInteger(value) && value >= 0 && value < BOARD_SIZE ? value : null;
}

function normalizeHalfmoveClock(value) {
  return Number.isInteger(value) && value >= 0 ? value : 0;
}

function normalizeEnPassantTarget(target, board) {
  if (!target || typeof target !== "object") {
    return null;
  }

  const row = normalizeIndex(target.row);
  const col = normalizeIndex(target.col);
  const pawnRow = normalizeIndex(target.pawnRow);
  const pawnCol = normalizeIndex(target.pawnCol);
  const side = normalizeSide(target.side);

  if (row === null || col === null || pawnRow === null || pawnCol === null || !side) {
    return null;
  }

  const pawn = board[pawnRow][pawnCol];
  const expectedTargetRow = pawnRow + (side === "white" ? 1 : -1);

  if (
    !pawn ||
    pawn.type !== "pawn" ||
    pawn.side !== side ||
    pawnCol !== col ||
    expectedTargetRow !== row
  ) {
    return null;
  }

  return { row, col, pawnRow, pawnCol, side };
}

function inferLegacyEnPassantTarget(board, lastMove) {
  const normalized = normalizeLastMove(lastMove);

  if (!normalized || normalized.from.col !== normalized.to.col) {
    return null;
  }

  const piece = board[normalized.to.row][normalized.to.col];

  if (!piece || piece.type !== "pawn" || Math.abs(normalized.to.row - normalized.from.row) !== 2) {
    return null;
  }

  return {
    row: normalized.from.row + (normalized.to.row - normalized.from.row) / 2,
    col: normalized.to.col,
    pawnRow: normalized.to.row,
    pawnCol: normalized.to.col,
    side: piece.side,
  };
}

function createTestGame(pieces, currentPlayer = "white", extra = {}) {
  const board = createEmptyBoard();

  pieces.forEach((piece) => {
    board[piece.row][piece.col] = createPiece(piece.type, piece.side, Boolean(piece.moved));
  });

  return {
    board,
    currentPlayer,
    winner: null,
    lastMove: extra.lastMove || null,
    enPassantTarget: extra.enPassantTarget || null,
    halfmoveClock: normalizeHalfmoveClock(extra.halfmoveClock),
  };
}

function hasMove(moves, row, col) {
  return moves.some((move) => move.row === row && move.col === col);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function runSelfTests() {
  const results = [];

  {
    const board = createInitialBoard();
    const game = {
      board,
      currentPlayer: "white",
      winner: null,
      lastMove: null,
      enPassantTarget: null,
      halfmoveClock: 0,
    };
    assert(board[0].map((piece) => piece.type).join(",") === STARTING_BACK_RANK.join(","), "Back rank setup is wrong.");
    assert(board[7][4].type === "king" && board[0][4].type === "king", "Kings are not on e-file.");
    assert(hasMove(getLegalMoves(game, 6, 4), 5, 4), "White pawn should move one square from the start.");
    assert(hasMove(getLegalMoves(game, 6, 4), 4, 4), "White pawn should move two squares from the start.");
    results.push("initial-setup");
  }

  {
    const game = createTestGame([
      { row: 7, col: 4, type: "king", side: "white" },
      { row: 6, col: 4, type: "rook", side: "white", moved: true },
      { row: 0, col: 4, type: "rook", side: "black", moved: true },
      { row: 0, col: 0, type: "king", side: "black" },
    ]);
    assert(hasMove(getPseudoMoves(game, 6, 4), 6, 5), "Pinned rook should have a sideways pseudo move.");
    assert(!hasMove(getLegalMoves(game, 6, 4), 6, 5), "Pinned rook must not expose its king.");
    results.push("king-safety");
  }

  {
    const castleGame = createTestGame([
      { row: 7, col: 4, type: "king", side: "white" },
      { row: 7, col: 7, type: "rook", side: "white" },
      { row: 0, col: 4, type: "king", side: "black" },
    ]);
    assert(
      getLegalMoves(castleGame, 7, 4).some((move) => move.castle && move.col === 6),
      "Kingside castling should be legal on a clear board."
    );

    const blockedCastleGame = createTestGame([
      { row: 7, col: 4, type: "king", side: "white" },
      { row: 7, col: 7, type: "rook", side: "white" },
      { row: 5, col: 5, type: "rook", side: "black", moved: true },
      { row: 0, col: 4, type: "king", side: "black" },
    ]);
    assert(
      !getLegalMoves(blockedCastleGame, 7, 4).some((move) => move.castle),
      "Castling through an attacked square must be illegal."
    );
    results.push("castling");
  }

  {
    const game = createTestGame(
      [
        { row: 3, col: 4, type: "pawn", side: "white", moved: true },
        { row: 3, col: 3, type: "pawn", side: "black", moved: true },
        { row: 7, col: 4, type: "king", side: "white" },
        { row: 0, col: 4, type: "king", side: "black" },
      ],
      "white",
      {
        lastMove: {
          from: { row: 1, col: 3 },
          to: { row: 3, col: 3 },
        },
        enPassantTarget: {
          row: 2,
          col: 3,
          pawnRow: 3,
          pawnCol: 3,
          side: "black",
        },
      }
    );
    const move = getLegalMoves(game, 3, 4).find((candidate) => candidate.enPassant);
    assert(move, "En passant capture should be generated.");
    const outcome = evaluateMoveOutcome(game, { row: 3, col: 4 }, move);
    assert(outcome.game.board[2][3] && outcome.game.board[2][3].side === "white", "En passant should move the capturing pawn.");
    assert(!outcome.game.board[3][3], "En passant should remove the captured pawn.");
    results.push("en-passant");
  }

  {
    const game = createTestGame([
      { row: 7, col: 0, type: "king", side: "white" },
      { row: 5, col: 2, type: "king", side: "black" },
      { row: 6, col: 1, type: "queen", side: "black", moved: true },
    ]);
    assert(isInCheck(game, "white"), "White king should be in check.");
    assert(getAllLegalMoves(game, "white").length === 0, "This position should be checkmate.");
    results.push("checkmate");
  }

  {
    const game = createTestGame([
      { row: 1, col: 0, type: "pawn", side: "white", moved: true },
      { row: 7, col: 4, type: "king", side: "white" },
      { row: 0, col: 7, type: "king", side: "black" },
    ]);
    const move = getLegalMoves(game, 1, 0).find((candidate) => candidate.promotion === "queen");
    assert(move, "Pawn promotion move should be generated.");
    const outcome = evaluateMoveOutcome(game, { row: 1, col: 0 }, move);
    assert(outcome.game.board[0][0].type === "queen", "Pawn should auto-promote to a queen.");
    results.push("promotion");
  }

  {
    const game = createTestGame([
      { row: 7, col: 4, type: "king", side: "white" },
      { row: 0, col: 4, type: "king", side: "black" },
      { row: 0, col: 0, type: "rook", side: "black", moved: true },
    ], "black", { halfmoveClock: 99 });
    const move = getLegalMoves(game, 0, 0).find((candidate) => candidate.row === 0 && candidate.col === 1);
    assert(move, "Rook should have a quiet move for the 50-move test.");
    const outcome = evaluateMoveOutcome(game, { row: 0, col: 0 }, move);
    assert(outcome.game.halfmoveClock === 100, "Quiet non-pawn moves should advance the halfmove clock.");
    assert(outcome.fiftyMoveDraw, "100 halfmoves should trigger the 50-move draw rule.");
    results.push("fifty-move-rule");
  }

  return results;
}

if (DOM_AVAILABLE) {
  restartButtonElement.addEventListener("click", resetGame);
  pauseButtonElement.addEventListener("click", pauseGame);
  continueButtonElement.addEventListener("click", continueGame);
  saveButtonElement.addEventListener("click", () => saveGame(false));
  loadButtonElement.addEventListener("click", loadGame);
  if (undoButtonElement) {
    undoButtonElement.addEventListener("click", undoMove);
  }
  if (historyToggleElement) {
    historyToggleElement.addEventListener("click", toggleMoveHistory);
  }
  window.addEventListener("beforeunload", () => saveGame(true));
  Array.from(modeInputElements).forEach((input) => {
    input.addEventListener("change", () => {
      if (input.checked) {
        setGameMode(input.value);
      }
    });
  });
  Array.from(difficultyInputElements).forEach((input) => {
    input.addEventListener("change", () => {
      if (input.checked) {
        setAIDifficulty(input.value);
      }
    });
  });

  if (!loadGame()) {
    resetGame();
  }
}

if (typeof globalThis !== "undefined") {
  globalThis.setAIDifficulty = setAIDifficulty;
  globalThis.ZchessEngine = {
    createInitialBoard,
    createTestGame,
    getPseudoMoves,
    getLegalMoves,
    getAllLegalMoves,
    isInCheck,
    evaluateMoveOutcome,
    undoMove,
    setAIDifficulty,
    AI_DIFFICULTY_LEVELS,
    runSelfTests,
  };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    createInitialBoard,
    createTestGame,
    getPseudoMoves,
    getLegalMoves,
    getAllLegalMoves,
    isInCheck,
    evaluateMoveOutcome,
    undoMove,
    setAIDifficulty,
    AI_DIFFICULTY_LEVELS,
    runSelfTests,
  };
}
