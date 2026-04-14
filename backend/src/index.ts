import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import type { GameState, Player, RoomSnapshot } from "@ludo/shared";
import { applyMove, createInitialGameState, getMovableTokens } from "./game/engine.js";

interface Room {
  roomCode: string;
  players: Player[];
  hostId: string | null;
  gameState: GameState | null;
}

const app = express();
app.use(cors());
app.get("/health", (_req, res) => res.json({ ok: true }));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" }
});

const rooms = new Map<string, Room>();
const colorPool: Player["color"][] = ["red", "green", "yellow", "blue"];

io.on("connection", (socket) => {
  socket.on("room:create", ({ name }: { name: string }) => {
    const roomCode = createRoomCode();
    const player = createPlayer(socket.id, name, colorPool[0]);
    const room: Room = { roomCode, players: [player], hostId: player.id, gameState: null };
    rooms.set(roomCode, room);
    socket.join(roomCode);
    io.to(roomCode).emit("room:update", snapshot(room));
  });

  socket.on("room:join", ({ roomCode, name }: { roomCode: string; name: string }) => {
    const room = rooms.get(roomCode.toUpperCase());
    if (!room) return socket.emit("room:error", "Room not found");
    if (room.players.length >= 4) return socket.emit("room:error", "Room is full");
    const player = createPlayer(socket.id, name, colorPool[room.players.length]);
    room.players.push(player);
    socket.join(room.roomCode);
    io.to(room.roomCode).emit("room:update", snapshot(room));
  });

  socket.on("game:start", ({ roomCode }: { roomCode: string }) => {
    const room = rooms.get(roomCode.toUpperCase());
    if (!room || room.players.length < 2) return;
    room.gameState = createInitialGameState(room.roomCode, room.players);
    io.to(room.roomCode).emit("room:update", snapshot(room));
  });

  socket.on("game:roll", ({ roomCode }: { roomCode: string }) => {
    const room = rooms.get(roomCode.toUpperCase());
    if (!room?.gameState) return;
    if (room.gameState.currentTurnPlayerId !== socket.id) return;
    const diceRoll = Math.floor(Math.random() * 6) + 1;
    room.gameState.lastDiceRoll = diceRoll;
    room.gameState.statusMessage = `Rolled ${diceRoll}`;
    io.to(room.roomCode).emit("game:rolled", { diceRoll, playerId: socket.id });
    io.to(room.roomCode).emit("room:update", snapshot(room));
  });

  socket.on("game:move", ({ roomCode, tokenId }: { roomCode: string; tokenId: string }) => {
    const room = rooms.get(roomCode.toUpperCase());
    if (!room?.gameState || !room.gameState.lastDiceRoll) return;
    const movable = getMovableTokens(room.gameState, socket.id, room.gameState.lastDiceRoll);
    if (!movable.some((token) => token.id === tokenId)) return;
    room.gameState = applyMove(room.gameState, socket.id, tokenId, room.gameState.lastDiceRoll);
    room.gameState.lastDiceRoll = null;
    io.to(room.roomCode).emit("room:update", snapshot(room));
  });

  socket.on("disconnect", () => {
    for (const room of rooms.values()) {
      const player = room.players.find((entry) => entry.id === socket.id);
      if (!player) continue;
      player.connected = false;
      io.to(room.roomCode).emit("room:update", snapshot(room));
    }
  });
});

const port = Number(process.env.PORT ?? 4000);
httpServer.listen(port, () => {
  console.log(`Ludo backend running on ${port}`);
});

function createRoomCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function createPlayer(id: string, name: string, color: Player["color"]): Player {
  return { id, name: name.trim().slice(0, 24) || "Guest", color, connected: true };
}

function snapshot(room: Room): RoomSnapshot {
  return {
    roomCode: room.roomCode,
    players: room.players,
    hostId: room.hostId,
    gameState: room.gameState
  };
}
