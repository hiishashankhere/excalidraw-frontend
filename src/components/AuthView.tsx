import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";

interface AuthViewProps {
  authTab: "login" | "register";
  setAuthTab: (tab: "login" | "register") => void;
  name: string;
  setName: (value: string) => void;
  email: string;
  setEmail: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  busy: boolean;
  onSubmit: () => void;
}

export function AuthView({
  authTab,
  setAuthTab,
  name,
  setName,
  email,
  setEmail,
  password,
  setPassword,
  busy,
  onSubmit,
}: AuthViewProps) {
  return (
    <Box className="mx-auto w-full max-w-[480px]">
      <Card sx={{ bgcolor: "rgba(20,24,33,0.9)", border: "1px solid rgba(255,255,255,0.1)" }}>
        <CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            Enter Workspace
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Authenticate to create rooms and save snapshots.
          </Typography>

          <Tabs
            value={authTab}
            onChange={(_, v) => setAuthTab(v)}
            textColor="inherit"
            indicatorColor="primary"
            sx={{ mb: 2 }}
          >
            <Tab value="login" label="Login" />
            <Tab value="register" label="Register" />
          </Tabs>

          <Stack spacing={2}>
            {authTab === "register" ? (
              <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} fullWidth />
            ) : null}
            <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
            />
            <Button
              onClick={onSubmit}
              variant="contained"
              size="large"
              disabled={busy}
              startIcon={busy ? <CircularProgress color="inherit" size={16} /> : null}
            >
              {authTab === "register" ? "Create Account" : "Login"}
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
