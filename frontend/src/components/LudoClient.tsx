"use client";

import { useEffect, useMemo, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { RoomSnapshot } from "@ludo/shared";

const serverUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000";

export function LudoClient() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [name, setName] = useState("");
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [room, setRoom] = useState<RoomSnapshot | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const client = io(serverUrl);
    client.on("room:update", (payload: RoomSnapshot) => setRoom(payload));
    client.on("room:error", (message: string) => setError(message));
    setSocket(client);
    return () => client.close();
  }, []);

  const me = useMemo(() => room?.players.find((player) => player.id === socket?.id), [room, socket?.id]);

  const game = room?.gameState;
  const myTokens = me && game ? game.playerStates[me.id].tokens : [];

  return (
    <main className="page">
      <section className="card">
        <h1>Naija Ludo Online</h1>
        <p>Private rooms, 4 players max, custom capture-to-home rule enabled.</p>
        <div className="row">
          <input placeholder="Your guest name" value={name} onChange={(event) => setName(event.target.value)} />
          <button onClick={() => socket?.emit("room:create", { name })}>Create Room</button>
        </div>
        <div className="row" style={{ marginTop: 10 }}>
          <input placeholder="Room code" value={roomCodeInput} onChange={(event) => setRoomCodeInput(event.target.value.toUpperCase())} />
          <button onClick={() => socket?.emit("room:join", { roomCode: roomCodeInput, name })}>Join Room</button>
        </div>
        {error ? <p>{error}</p> : null}
      </section>

      {room ? (
        <section className="card">
          <h2>Room: {room.roomCode}</h2>
          <p>Players: {room.players.map((player) => `${player.name} (${player.color})`).join(", ")}</p>
          {!room.gameState ? (
            <button onClick={() => socket?.emit("game:start", { roomCode: room.roomCode })} disabled={room.players.length < 2}>
              Start Game
            </button>
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
