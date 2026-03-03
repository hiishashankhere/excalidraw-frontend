import CropSquareIcon from "@mui/icons-material/CropSquare";
import LogoutIcon from "@mui/icons-material/Logout";
import {
  AppBar,
  Avatar,
  IconButton,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import type { User } from "../types";

interface HeaderBarProps {
  user: User | null;
  onLogout: () => void;
}

export function HeaderBar({ user, onLogout }: HeaderBarProps) {
  return (
    <AppBar position="static" color="transparent" elevation={0} className="border-b border-white/10">
      <Toolbar className="flex gap-3">
        <CropSquareIcon sx={{ color: "#57d3ff" }} />
        <Typography variant="h6" fontWeight={700} sx={{ letterSpacing: 0.6, flexGrow: 1 }}>
          Excalidraw Clone Workspace
        </Typography>
        {user ? (
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Avatar sx={{ width: 32, height: 32, bgcolor: "#2a3347", fontSize: 14 }}>
              {user.name.slice(0, 1).toUpperCase()}
            </Avatar>
            <Typography variant="body2">{user.name}</Typography>
            <Tooltip title="Logout">
              <IconButton color="inherit" onClick={onLogout}>
                <LogoutIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        ) : null}
      </Toolbar>
    </AppBar>
  );
}
