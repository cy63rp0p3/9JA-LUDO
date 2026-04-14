"use client";

import { useEffect, useMemo, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { RoomSnapshot } from "@ludo/shared";

const serverUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000";
type UiStep = "landing" | "create" | "join" | "lobby" | "game";

export function LudoClient() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [name, setName] = useState("");
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [room, setRoom] = useState<RoomSnapshot | null>(null);
  const [error, setError] = useState("");
  const [uiStep, setUiStep] = useState<UiStep>("landing");

  useEffect(() => {
    const client = io(serverUrl);
    client.on("room:update", (payload: RoomSnapshot) => {
      setRoom(payload);
      setError("");
      setUiStep(payload.gameState ? "game" : "lobby");
    });
    client.on("room:error", (message: string) => setError(message));
    setSocket(client);
    return () => {
      client.close();
    };
  }, []);

  const me = useMemo(() => room?.players.find((player) => player.id === socket?.id), [room, socket?.id]);
  const game = room?.gameState;
  const myTokens = me && game ? game.playerStates[me.id].tokens : [];
  const isConnected = Boolean(socket);

  const openCreate = () => {
    setError("");
    setUiStep("create");
  };

  const openJoin = () => {
    setError("");
    setUiStep("join");
  };

  const goHome = () => {
    setError("");
    setUiStep("landing");
  };

  const createRoom = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Please enter your guest name.");
      return;
    }
    socket?.emit("room:create", { name: trimmedName });
  };

  const joinRoom = () => {
    const trimmedName = name.trim();
    const normalizedCode = roomCodeInput.trim().toUpperCase();
    if (!trimmedName) {
      setError("Please enter your guest name.");
      return;
    }
    if (!normalizedCode) {
      setError("Please enter a room code.");
      return;
    }
    socket?.emit("room:join", { roomCode: normalizedCode, name: trimmedName });
  };

  return (
    <main className="page">
      <section className="card hero">
        <h1>Naija Ludo Online</h1>
        <p>Create a private room or join your friends instantly. Up to 4 players.</p>
        {!isConnected ? <p className="error">Connecting to server...</p> : null}
      </section>

      {uiStep === "landing" ? (
        <section className="card action-grid">
          <button className="action-button" onClick={openCreate} disabled={!isConnected}>
            Create Game
          </button>
          <button className="action-button secondary" onClick={openJoin} disabled={!isConnected}>
            Join Game
          </button>
        </section>
      ) : null}

      {uiStep === "create" ? (
        <section className="card">
          <h2>Create Game</h2>
          <p>Choose a guest name. A room code will be generated for your friends.</p>
          <div className="row">
            <input placeholder="Your guest name" value={name} onChange={(event) => setName(event.target.value)} />
            <button onClick={createRoom} disabled={!isConnected}>
              Create Room
            </button>
          </div>
          <button className="link-button" onClick={goHome}>
            Back
          </button>
          {error ? <p className="error">{error}</p> : null}
        </section>
      ) : null}

      {uiStep === "join" ? (
        <section className="card">
          <h2>Join Game</h2>
          <p>Enter your guest name and the room code shared by your friend.</p>
          <div className="row">
            <input placeholder="Your guest name" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            <input placeholder="Room code" value={roomCodeInput} onChange={(event) => setRoomCodeInput(event.target.value.toUpperCase())} />
            <button onClick={joinRoom} disabled={!isConnected}>
              Join Room
            </button>
          </div>
          <button className="link-button" onClick={goHome}>
            Back
          </button>
          {error ? <p className="error">{error}</p> : null}
        </section>
      ) : null}

      {room && (uiStep === "lobby" || uiStep === "game") ? (
        <section className="card">
          <h2>{uiStep === "lobby" ? "Game Lobby" : "In Game"} - Room: {room.roomCode}</h2>
          <p>Players: {room.players.map((player) => `${player.name} (${player.color})`).join(", ")}</p>
          {!room.gameState ? (
            <>
              <p>Waiting for at least 2 players to start.</p>
              <button onClick={() => socket?.emit("game:start", { roomCode: room.roomCode })} disabled={room.players.length < 2 || !isConnected}>
                Start Game
              </button>
            </>
          ) : (
            <>
              <p>{game?.statusMessage}</p>
              <p>Current turn: {game?.players.find((player) => player.id === game.currentTurnPlayerId)?.name ?? "-"}</p>
              <div className="row">
                <button onClick={() => socket?.emit("game:roll", { roomCode: room.roomCode })} disabled={game?.currentTurnPlayerId !== socket?.id}>
                  Roll Dice
                </button>
                <span>Last roll: {game?.lastDiceRoll ?? "-"}</span>
              </div>
              <div className="row" style={{ marginTop: 10 }}>
                {myTokens.map((token) => (
                  <button
                    key={token.id}
                    onClick={() => socket?.emit("game:move", { roomCode: room.roomCode, tokenId: token.id })}
                    disabled={!game?.lastDiceRoll || game.currentTurnPlayerId !== socket?.id || token.isHome}
                  >
                    {token.id.split("-").slice(-1)[0]}: {token.isHome ? "HOME" : token.position}
                  </button>
                ))}
              </div>
              <Board room={room} />
            </>
          )}
          {error ? <p className="error">{error}</p> : null}
        </section>
      ) : null}
    </main>
  );
}

function Board({ room }: { room: RoomSnapshot }) {
  const game = room.gameState;
  const tokens =
    game?.players.flatMap((player) =>
      game.playerStates[player.id].tokens.map((token) => ({
        ...token,
        color: player.color
      }))
    ) ?? [];

  return (
    <div className="board" style={{ marginTop: 16 }}>
      {Array.from({ length: 52 }, (_, index) => {
        const token = tokens.find((entry) => entry.position === index && !entry.isHome);
        return (
          <div key={index} className="cell">
            {token ? <div className="token" style={{ background: token.color }} /> : null}
          </div>
        );
      })}
    </div>
  );
}
