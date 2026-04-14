import { describe, expect, it } from "vitest";
import { applyMove, createInitialGameState } from "../src/game/engine.js";

const players = [
  { id: "p1", name: "A", color: "red", connected: true },
  { id: "p2", name: "B", color: "green", connected: true }
] as const;

describe("ludo engine", () => {
  it("keeps token in base until six", () => {
    const game = createInitialGameState("ROOM01", [...players]);
    const token = game.playerStates.p1.tokens[0];
    const moved = applyMove(game, "p1", token.id, 4);
    expect(moved.playerStates.p1.tokens[0].position).toBe(-1);
  });

  it("moves token out with six", () => {
    const game = createInitialGameState("ROOM01", [...players]);
    const token = game.playerStates.p1.tokens[0];
    const moved = applyMove(game, "p1", token.id, 6);
    expect(moved.playerStates.p1.tokens[0].position).toBe(0);
  });

  it("capture sends enemy to base and own token home", () => {
    const game = createInitialGameState("ROOM01", [...players]);
    game.playerStates.p1.tokens[0].position = 4;
    game.playerStates.p2.tokens[0].position = 5;
    const moved = applyMove(game, "p1", game.playerStates.p1.tokens[0].id, 1);
    expect(moved.playerStates.p2.tokens[0].position).toBe(-1);
    expect(moved.playerStates.p1.tokens[0].isHome).toBe(true);
    expect(moved.playerStates.p1.finishedTokens).toBe(1);
  });

  it("declares winner after fourth token reaches home", () => {
    const game = createInitialGameState("ROOM01", [...players]);
    game.playerStates.p1.finishedTokens = 3;
    game.playerStates.p1.tokens[0].position = 56;
    const moved = applyMove(game, "p1", game.playerStates.p1.tokens[0].id, 1);
    expect(moved.playerStates.p1.finishedTokens).toBe(4);
    expect(moved.winnerId).toBe("p1");
  });
});
