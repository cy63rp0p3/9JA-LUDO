export type PlayerColor = "red" | "green" | "yellow" | "blue";

export interface Player {
  id: string;
  name: string;
  color: PlayerColor;
  connected: boolean;
}

export interface TokenState {
  id: string;
  position: number;
  isHome: boolean;
}

export interface PlayerState {
  playerId: string;
  tokens: TokenState[];
  finishedTokens: number;
}

export interface GameState {
  roomCode: string;
  started: boolean;
  winnerId: string | null;
  currentTurnPlayerId: string | null;
  players: Player[];
  playerStates: Record<string, PlayerState>;
  lastDiceRoll: number | null;
  statusMessage: string;
}

export interface RoomSnapshot {
  roomCode: string;
  players: Player[];
  hostId: string | null;
  gameState: GameState | null;
}
