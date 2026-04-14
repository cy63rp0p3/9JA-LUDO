import type { GameState, Player, PlayerState, TokenState } from "@ludo/shared";

const TOKENS_PER_PLAYER = 4;
const TRACK_LENGTH = 52;
const HOME_LANE_LENGTH = 6;

export function createInitialGameState(roomCode: string, players: Player[]): GameState {
  const playerStates: Record<string, PlayerState> = {};
  for (const player of players) {
    playerStates[player.id] = {
      playerId: player.id,
      finishedTokens: 0,
      tokens: Array.from({ length: TOKENS_PER_PLAYER }, (_, index) => ({
        id: `${player.id}-token-${index + 1}`,
        position: -1,
        isHome: false
      }))
    };
  }

  return {
    roomCode,
    started: true,
    winnerId: null,
    currentTurnPlayerId: players[0]?.id ?? null,
    players,
    playerStates,
    lastDiceRoll: null,
    statusMessage: "Game started"
  };
}

export function getMovableTokens(state: GameState, playerId: string, diceRoll: number): TokenState[] {
  const current = state.playerStates[playerId];
  if (!current) return [];

  return current.tokens.filter((token) => {
    if (token.isHome) return false;
    if (token.position === -1) return diceRoll === 6;
    return token.position + diceRoll <= TRACK_LENGTH + HOME_LANE_LENGTH - 1;
  });
}

export function applyMove(state: GameState, playerId: string, tokenId: string, diceRoll: number): GameState {
  if (state.winnerId) return state;
  if (state.currentTurnPlayerId !== playerId) return state;

  const movable = getMovableTokens(state, playerId, diceRoll);
  const token = movable.find((entry) => entry.id === tokenId);
  if (!token) return state;

  const next = structuredClone(state);
  next.lastDiceRoll = diceRoll;
  const playerState = next.playerStates[playerId];
  const targetToken = playerState.tokens.find((entry) => entry.id === tokenId);
  if (!targetToken) return state;

  if (targetToken.position === -1 && diceRoll === 6) {
    targetToken.position = 0;
  } else {
    targetToken.position += diceRoll;
  }

  const reachedHomePosition = TRACK_LENGTH + HOME_LANE_LENGTH - 1;
  if (targetToken.position === reachedHomePosition) {
    targetToken.isHome = true;
    playerState.finishedTokens += 1;
    next.statusMessage = `${playerId} moved a token home`;
  } else {
    next.statusMessage = `${playerId} moved ${diceRoll} steps`;
  }

  const captureTriggered = applyCaptureRule(next, playerId, targetToken);
  if (captureTriggered) {
    next.statusMessage = `${playerId} captured and sent one token home`;
  }

  if (playerState.finishedTokens >= TOKENS_PER_PLAYER) {
    next.winnerId = playerId;
    next.statusMessage = `${playerId} won the match`;
    return next;
  }

  if (diceRoll !== 6 && !captureTriggered) {
    next.currentTurnPlayerId = nextPlayer(next.players, playerId);
  }

  return next;
}

function applyCaptureRule(state: GameState, actingPlayerId: string, movedToken: TokenState): boolean {
  if (movedToken.position < 0 || movedToken.position >= TRACK_LENGTH) return false;
  for (const [playerId, playerState] of Object.entries(state.playerStates)) {
    if (playerId === actingPlayerId) continue;
    for (const token of playerState.tokens) {
      if (token.isHome || token.position === -1) continue;
      if (token.position === movedToken.position) {
        token.position = -1;
        movedToken.position = TRACK_LENGTH + HOME_LANE_LENGTH - 1;
        movedToken.isHome = true;
        state.playerStates[actingPlayerId].finishedTokens += 1;
        return true;
      }
    }
  }
  return false;
}

function nextPlayer(players: Player[], currentPlayerId: string): string | null {
  if (!players.length) return null;
  const index = players.findIndex((entry) => entry.id === currentPlayerId);
  if (index < 0) return players[0].id;
  return players[(index + 1) % players.length].id;
}
