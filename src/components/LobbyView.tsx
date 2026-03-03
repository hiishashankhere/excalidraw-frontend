import AddIcon from "@mui/icons-material/Add";
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { Room } from "../types";

interface LobbyViewProps {
  newRoomName: string;
  setNewRoomName: (value: string) => void;
  displayName: string;
  setDisplayName: (value: string) => void;
  busy: boolean;
  onCreateRoom: () => void;
  roomsLoading: boolean;
  rooms: Room[];
  onRefresh: () => void;
  onOpenRoom: (roomId: string) => void;
}

export function LobbyView({
  newRoomName,
  setNewRoomName,
  displayName,
  setDisplayName,
  busy,
  onCreateRoom,
  roomsLoading,
  rooms,
  onRefresh,
  onOpenRoom,
}: LobbyViewProps) {
  return (
    <Box className="grid gap-4 md:grid-cols-[340px_1fr]">
      <Card sx={{ bgcolor: "rgba(20,24,33,0.85)", border: "1px solid rgba(255,255,255,0.1)" }}>
        <CardContent>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            Create Room
          </Typography>
          <Stack spacing={2}>
            <TextField
              label="Room name"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              fullWidth
            />
            <TextField
              label="Display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              fullWidth
            />
            <Button variant="contained" onClick={onCreateRoom} startIcon={<AddIcon />} disabled={busy}>
              New Drawing Room
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ bgcolor: "rgba(20,24,33,0.85)", border: "1px solid rgba(255,255,255,0.1)" }}>
        <CardContent>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography variant="h6" fontWeight={700}>
              Available Rooms
            </Typography>
            <Button size="small" onClick={onRefresh} disabled={roomsLoading}>
              Refresh
            </Button>
          </Stack>
          <Divider sx={{ mb: 1.5 }} />
          {roomsLoading ? (
            <Box className="py-8 text-center">
              <CircularProgress size={24} />
            </Box>
          ) : (
            <List>
              {rooms.map((room) => (
                <ListItem
                  key={room.id}
                  secondaryAction={
                    <Button size="small" variant="outlined" onClick={() => onOpenRoom(room.id)}>
                      Open
                    </Button>
                  }
                  className="rounded-xl"
                  sx={{
                    mb: 1,
                    border: "1px solid rgba(255,255,255,0.08)",
                    backgroundColor: "rgba(255,255,255,0.02)",
                  }}
                >
                  <ListItemText primary={room.name} secondary={`Room ID: ${room.id.slice(0, 8)}...`} />
                </ListItem>
              ))}
              {rooms.length === 0 ? (
                <Typography color="text.secondary" sx={{ py: 3 }}>
                  No rooms yet. Create one to start drawing.
                </Typography>
              ) : null}
            </List>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
