import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, PointerEvent, SetStateAction } from "react";
import BrushIcon from "@mui/icons-material/Brush";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import GroupsIcon from "@mui/icons-material/Groups";
import HomeIcon from "@mui/icons-material/Home";
import SaveIcon from "@mui/icons-material/Save";
import {
  Box,
  Chip,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Paper,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import type { Participant, Room, StrokeElement } from "../types";

type Tool = "draw" | "eraser";

const DRAW_COLOR = "#f8fafc";
const ERASER_COLOR = "#0f1117";

interface RoomViewProps {
  roomId: string;
  activeRoom: Room | null;
  participants: Participant[];
  displayName: string;
  setDisplayName: (value: string) => void;
  elements: StrokeElement[];
  setElements: Dispatch<SetStateAction<StrokeElement[]>>;
  dirty: boolean;
  setDirty: (value: boolean) => void;
  activeTool: Tool;
  setActiveTool: (tool: Tool) => void;
  strokeWidth: number;
  setStrokeWidth: (value: number) => void;
  onLeaveRoom: () => void;
  onSaveNow: () => void;
}

export function RoomView({
  roomId,
  activeRoom,
  participants,
  displayName,
  setDisplayName,
  elements,
  setElements,
  dirty,
  setDirty,
  activeTool,
  setActiveTool,
  strokeWidth,
  setStrokeWidth,
  onLeaveRoom,
  onSaveNow,
}: RoomViewProps) {
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentStrokeRef = useRef<StrokeElement | null>(null);
  const pointerActiveRef = useRef(false);

  useEffect(() => {
    const host = canvasHostRef.current;
    if (!host) return;

    const update = () => {
      const rect = host.getBoundingClientRect();
      const styles = window.getComputedStyle(host);
      const paddingX = parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
      const paddingY = parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom);
      setCanvasSize({
        width: Math.max(360, Math.floor(rect.width - paddingX)),
        height: Math.max(420, Math.floor(rect.height - paddingY)),
      });
    };

    const observer = new ResizeObserver(update);
    observer.observe(host);
    update();

    return () => observer.disconnect();
  }, []);

  const drawAll = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasSize.width * dpr;
    canvas.height = canvasSize.height * dpr;
    canvas.style.width = `${canvasSize.width}px`;
    canvas.style.height = `${canvasSize.height}px`;

    context.scale(dpr, dpr);
    context.fillStyle = "#0f1117";
    context.fillRect(0, 0, canvasSize.width, canvasSize.height);

    context.strokeStyle = "#1a2232";
    context.lineWidth = 1;
    for (let x = 0; x < canvasSize.width; x += 24) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, canvasSize.height);
      context.stroke();
    }
    for (let y = 0; y < canvasSize.height; y += 24) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(canvasSize.width, y);
      context.stroke();
    }

    const drawStroke = (stroke: StrokeElement) => {
      if (stroke.points.length < 2) return;
      context.beginPath();
      context.lineJoin = "round";
      context.lineCap = "round";
      context.lineWidth = stroke.width;
      context.strokeStyle = stroke.tool === "eraser" ? ERASER_COLOR : stroke.color;
      context.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i += 1) {
        context.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      context.stroke();
    };

    elements.forEach(drawStroke);

    const draft = currentStrokeRef.current;
    if (draft) drawStroke(draft);
  }, [canvasSize.height, canvasSize.width, elements]);

  useEffect(() => {
    drawAll();
  }, [drawAll]);

  const mapPoint = (event: PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const onPointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    pointerActiveRef.current = true;
    const point = mapPoint(event);
    currentStrokeRef.current = {
      id: crypto.randomUUID(),
      tool: activeTool,
      color: DRAW_COLOR,
      width: strokeWidth,
      points: [point],
    };
    drawAll();
  };

  const onPointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!pointerActiveRef.current || !currentStrokeRef.current) return;
    currentStrokeRef.current.points.push(mapPoint(event));
    drawAll();
  };

  const endStroke = () => {
    pointerActiveRef.current = false;
    const stroke = currentStrokeRef.current;
    if (!stroke) return;
    currentStrokeRef.current = null;

    if (stroke.points.length > 1) {
      setElements((prev) => [...prev, stroke]);
      setDirty(true);
    }
  };

  const toolbarTools = useMemo(
    () => [
      { key: "draw" as const, icon: <BrushIcon />, label: "Draw" },
      { key: "eraser" as const, icon: <DeleteSweepIcon />, label: "Eraser" },
    ],
    []
  );

  return (
    <Box className="grid gap-3 lg:grid-cols-[76px_minmax(0,1fr)_320px]">
      <Paper
        className="flex lg:flex-col lg:items-center lg:py-3 overflow-x-auto"
        sx={{ p: 1, gap: 1, bgcolor: "rgba(20,24,33,0.9)", border: "1px solid rgba(255,255,255,0.1)" }}
      >
        <Tooltip title="Back to rooms">
          <IconButton color="inherit" onClick={onLeaveRoom}>
            <HomeIcon />
          </IconButton>
        </Tooltip>

        {toolbarTools.map((tool) => (
          <Tooltip title={tool.label} key={tool.key}>
            <IconButton color={activeTool === tool.key ? "primary" : "default"} onClick={() => setActiveTool(tool.key)}>
              {tool.icon}
            </IconButton>
          </Tooltip>
        ))}

        <Tooltip title="Clear board">
          <IconButton
            onClick={() => {
              setElements([]);
              setDirty(true);
            }}
          >
            <DeleteSweepIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title="Save snapshot">
          <IconButton onClick={onSaveNow}>
            <SaveIcon />
          </IconButton>
        </Tooltip>

        <TextField
          label="Width"
          size="small"
          type="number"
          value={strokeWidth}
          onChange={(e) => setStrokeWidth(Math.max(1, Math.min(24, Number(e.target.value) || 1)))}
          sx={{ width: 64, mt: { xs: 0, lg: 1 } }}
          inputProps={{ min: 1, max: 24 }}
        />
      </Paper>

      <Paper
        ref={canvasHostRef}
        className="relative h-[55vh] md:h-[68vh]"
        sx={{ p: 1, bgcolor: "rgba(20,24,33,0.7)", border: "1px solid rgba(255,255,255,0.12)" }}
      >
        <Box className="absolute left-3 top-3 z-10 flex items-center gap-2">
          <Chip label={activeRoom ? activeRoom.name : `Room ${roomId.slice(0, 8)}`} sx={{ bgcolor: "rgba(14,18,26,0.9)" }} />
          <Chip label={dirty ? "Unsaved" : "Saved"} color={dirty ? "warning" : "success"} variant="outlined" />
        </Box>

        <canvas
          ref={canvasRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endStroke}
          onPointerLeave={endStroke}
          className="block h-full w-full rounded-xl border border-white/10 cursor-crosshair"
        />
      </Paper>

      <Paper sx={{ p: 2, bgcolor: "rgba(20,24,33,0.9)", border: "1px solid rgba(255,255,255,0.1)" }}>
        <Typography variant="h6" fontWeight={700} className="flex items-center gap-2">
          <GroupsIcon fontSize="small" /> Collaborators
        </Typography>
        <TextField
          label="Display name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          size="small"
          fullWidth
          sx={{ mt: 1.5, mb: 1.5 }}
        />
        <List dense>
          {participants.map((participant) => (
            <ListItem key={participant.id} sx={{ px: 0 }}>
              <ListItemText primary={participant.displayName} secondary={participant.role.toUpperCase()} />
            </ListItem>
          ))}
          {participants.length === 0 ? (
            <Typography color="text.secondary">No active participants yet.</Typography>
          ) : null}
        </List>
        <Divider sx={{ my: 1.5 }} />
        <Typography variant="caption" color="text.secondary">
          REST-integrated board: room state is loaded from backend and snapshots are saved with autosave + manual save.
        </Typography>
      </Paper>
    </Box>
  );
}
