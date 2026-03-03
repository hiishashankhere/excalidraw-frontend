import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Box, Container, ThemeProvider, createTheme } from "@mui/material";
import { io, type Socket } from "socket.io-client";
import { API_BASE, api } from "./api";
import { AuthView } from "./components/AuthView";
import { HeaderBar } from "./components/HeaderBar";
import { LobbyView } from "./components/LobbyView";
import { RoomView } from "./components/RoomView";
import type { Participant, Room, StrokeElement, User } from "./types";

type View = "auth" | "lobby" | "room";
type Tool = "draw" | "eraser";

const APP_STATE = { theme: "dark", viewBackgroundColor: "#0f1117" };

const theme = createTheme({
  palette: {
    mode: "dark",
    background: {
      default: "#080a0f",
      paper: "#141821",
    },
  },
  shape: {
    borderRadius: 14,
  },
  typography: {
    fontFamily: '"Poppins", "Segoe UI", sans-serif',
  },
});

function getInitialRoomId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("room") ?? "";
}

function setRoomParam(roomId: string | null) {
  const params = new URLSearchParams(window.location.search);
  if (roomId) {
    params.set("room", roomId);
  } else {
    params.delete("room");
  }
  const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
  window.history.replaceState({}, "", next);
}

function App() {
  const [view, setView] = useState<View>("auth");
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("auth_token"));
  const [user, setUser] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [authTab, setAuthTab] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");

  const [roomId, setRoomId] = useState<string>(getInitialRoomId());
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [displayName, setDisplayName] = useState("");

  const [elements, setElements] = useState<StrokeElement[]>([]);
  const [activeTool, setActiveTool] = useState<Tool>("draw");
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [dirty, setDirty] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const roomIdRef = useRef(roomId);
  const suppressSocketBroadcastRef = useRef(false);
  const joinedSocketRoomKeyRef = useRef("");

  const boardReady = view === "room" && Boolean(roomId);

  const refreshRooms = useCallback(async () => {
    setRoomsLoading(true);
    try {
      const data = await api.listRooms();
      setRooms(data.rooms);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load rooms");
    } finally {
      setRoomsLoading(false);
    }
  }, []);

  useEffect(() => {
    roomIdRef.current = roomId;
  }, [roomId]);

  const tryJoinSocketRoom = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || !socket.connected) return;
    if (!boardReady || !displayName.trim()) return;

    const joinKey = `${socket.id}:${roomId}:${displayName.trim()}:${user?.id ?? "guest"}`;
    if (joinedSocketRoomKeyRef.current === joinKey) return;
    joinedSocketRoomKeyRef.current = joinKey;

    socket.emit("join-room", {
      roomId,
      userId: user?.id,
      displayName: displayName.trim(),
    });
  }, [boardReady, displayName, roomId, user?.id]);

  useEffect(() => {
    const socket = io(API_BASE, { transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      joinedSocketRoomKeyRef.current = "";
      tryJoinSocketRoom();
    });

    socket.on("receive-draw", (payload: { roomId: string; elements: StrokeElement[] }) => {
      if (payload.roomId !== roomIdRef.current) return;
      suppressSocketBroadcastRef.current = true;
      setElements(Array.isArray(payload.elements) ? payload.elements : []);
      setDirty(false);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [tryJoinSocketRoom]);

  useEffect(() => {
    if (!token) {
      setView("auth");
      return;
    }

    let alive = true;
    const boot = async () => {
      try {
        const me = await api.getMe(token);
        if (!alive) return;
        setUser(me.user);
        setDisplayName(me.user.name);
        setView(roomId ? "room" : "lobby");
      } catch {
        localStorage.removeItem("auth_token");
        if (!alive) return;
        setToken(null);
        setUser(null);
        setView("auth");
      }
    };

    void boot();
    return () => {
      alive = false;
    };
  }, [roomId, token]);

  useEffect(() => {
    if (view === "lobby") {
      void refreshRooms();
    }
  }, [refreshRooms, view]);

  useEffect(() => {
    if (!boardReady) return;
    let alive = true;

    const loadRoom = async () => {
      try {
        const roomState = await api.getRoomState(roomId);
        if (!alive) return;
        setActiveRoom(roomState.room);
        setParticipants(roomState.participants);
        setElements(Array.isArray(roomState.snapshot?.elements) ? roomState.snapshot.elements : []);
        setDirty(false);
      } catch (error) {
        if (!alive) return;
        setMessage(error instanceof Error ? error.message : "Failed to fetch room state");
      }
    };

    void loadRoom();

    return () => {
      alive = false;
    };
  }, [boardReady, roomId]);

  useEffect(() => {
    tryJoinSocketRoom();
  }, [tryJoinSocketRoom]);

  useEffect(() => {
    if (!boardReady) return;
    const socket = socketRef.current;
    if (!socket || !socket.connected) return;
    if (suppressSocketBroadcastRef.current) {
      suppressSocketBroadcastRef.current = false;
      return;
    }
    socket.emit("draw", { roomId, elements, appState: APP_STATE });
  }, [boardReady, elements, roomId]);

  useEffect(() => {
    if (!boardReady || !dirty || !token) return;

    const intervalId = window.setInterval(() => {
      void api
        .saveSnapshot(roomId, { elements, appState: APP_STATE }, token)
        .then(() => setDirty(false))
        .catch(() => {
          setMessage("Autosave failed. You can retry with Save.");
        });
    }, 8000);

    return () => window.clearInterval(intervalId);
  }, [boardReady, dirty, elements, roomId, token]);

  const handleAuthSubmit = async () => {
    setBusy(true);
    setMessage(null);
    try {
      if (authTab === "register") {
        if (!name.trim()) {
          setMessage("Name is required");
          return;
        }

        const response = await api.register({
          name: name.trim(),
          email: email.trim(),
          password,
        });

        localStorage.setItem("auth_token", response.token);
        setToken(response.token);
        setUser(response.user);
        setDisplayName(response.user.name);
      } else {
        const response = await api.login({ email: email.trim(), password });
        localStorage.setItem("auth_token", response.token);
        setToken(response.token);
        setUser(response.user);
        setDisplayName(response.user.name);
      }
      setView(roomId ? "room" : "lobby");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  const handleCreateRoom = async () => {
    if (!token) {
      setMessage("Login required to create a room");
      return;
    }
    if (!newRoomName.trim()) {
      setMessage("Room name is required");
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const response = await api.createRoom(token, {
        name: newRoomName.trim(),
        isPrivate: false,
      });
      setNewRoomName("");
      await refreshRooms();
      setRoomId(response.room.id);
      setRoomParam(response.room.id);
      setView("room");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to create room");
    } finally {
      setBusy(false);
    }
  };

  const handleOpenRoom = (id: string) => {
    setRoomId(id);
    setRoomParam(id);
    setView("room");
  };

  const handleLeaveRoom = () => {
    const socket = socketRef.current;
    if (socket?.connected && roomId) {
      socket.emit("leave-room", roomId);
    }
    joinedSocketRoomKeyRef.current = "";
    setRoomId("");
    setActiveRoom(null);
    setParticipants([]);
    setElements([]);
    setDirty(false);
    setRoomParam(null);
    setView("lobby");
  };

  const handleSaveNow = async () => {
    if (!token || !roomId) {
      setMessage("Login required to save board state");
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      await api.saveSnapshot(roomId, { elements, appState: APP_STATE }, token);
      setDirty(false);
      setMessage("Snapshot saved");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to save snapshot");
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = () => {
    joinedSocketRoomKeyRef.current = "";
    localStorage.removeItem("auth_token");
    setToken(null);
    setUser(null);
    setRoomId("");
    setRoomParam(null);
    setView("auth");
  };

  return (
    <ThemeProvider theme={theme}>
      <Box className="min-h-screen excalidraw-bg" sx={{ color: "#e6edf7" }}>
        <HeaderBar user={user} onLogout={handleLogout} />

        <Container maxWidth="xl" sx={{ py: { xs: 2, md: 3 } }}>
          {message ? (
            <Alert
              severity={message === "Snapshot saved" ? "success" : "info"}
              onClose={() => setMessage(null)}
              sx={{ mb: 2, border: "1px solid rgba(255,255,255,0.12)" }}
            >
              {message}
            </Alert>
          ) : null}

          {view === "auth" ? (
            <AuthView
              authTab={authTab}
              setAuthTab={setAuthTab}
              name={name}
              setName={setName}
              email={email}
              setEmail={setEmail}
              password={password}
              setPassword={setPassword}
              busy={busy}
              onSubmit={handleAuthSubmit}
            />
          ) : null}

          {view === "lobby" ? (
            <LobbyView
              newRoomName={newRoomName}
              setNewRoomName={setNewRoomName}
              displayName={displayName}
              setDisplayName={setDisplayName}
              busy={busy}
              onCreateRoom={handleCreateRoom}
              roomsLoading={roomsLoading}
              rooms={rooms}
              onRefresh={() => void refreshRooms()}
              onOpenRoom={handleOpenRoom}
            />
          ) : null}

          {view === "room" ? (
            <RoomView
              roomId={roomId}
              activeRoom={activeRoom}
              participants={participants}
              displayName={displayName}
              setDisplayName={setDisplayName}
              elements={elements}
              setElements={setElements}
              dirty={dirty}
              setDirty={setDirty}
              activeTool={activeTool}
              setActiveTool={setActiveTool}
              strokeWidth={strokeWidth}
              setStrokeWidth={setStrokeWidth}
              onLeaveRoom={handleLeaveRoom}
              onSaveNow={() => void handleSaveNow()}
            />
          ) : null}
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;
