import React, { useState, useEffect } from 'react';
import { 
  Box, 
  CssBaseline, 
  Drawer, 
  AppBar, 
  Toolbar, 
  List, 
  Typography, 
  Divider, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText,
  ThemeProvider,
  createTheme,
  IconButton,
  useMediaQuery,
  Stack,
  Paper,
  Button
} from '@mui/material';
import { 
  CalendarDays, 
  Layers, 
  Settings, 
  MonitorPlay,
  Database,
  BarChart3,
  Menu as MenuIcon
} from 'lucide-react';
import EventsPage from './pages/EventsPage';
import SetsPage from './pages/SetsPage';
import AllQuestionsPage from './pages/AllQuestionsPage';
import PresentationPage from './pages/PresentationPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ParticipantView from './pages/ParticipantView';

const drawerWidth = 240;

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#90caf9' },
    secondary: { main: '#f48fb1' },
  },
});

export default function App() {
  const [activeTab, setActiveTab] = useState('events');
  const [isPresenting, setIsPresenting] = useState(false);
  const [playEventId, setPlayEventId] = useState<number | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  
  // New States
  const [gameCode, setGameCode] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');

  const isMobile = useMediaQuery(darkTheme.breakpoints.down('sm'));

  useEffect(() => {
    // 1. Check for ?play parameter (direct link/QR)
    const params = new URLSearchParams(window.location.search);
    const playId = params.get('play');
    if (playId) {
      setPlayEventId(parseInt(playId, 10));
      return;
    }

    // 2. Check LocalStorage for participant session
    const savedEventId = localStorage.getItem('activeEventId');
    if (savedEventId) {
        setPlayEventId(parseInt(savedEventId, 10));
    }

    // 3. Check SessionStorage for Admin session (Reset on close, persist on reload)
    if (sessionStorage.getItem('admin_session') === 'true') {
        setIsAdmin(true);
    }
  }, []);

  const handleJoinGame = async () => {
    if (gameCode.length !== 6) return;
    try {
        const res = await fetch(`/api/events/verify/${gameCode.toUpperCase()}`);
        if (res.ok) {
            const event = await res.json();
            localStorage.setItem('activeEventId', event.id);
            setPlayEventId(event.id);
        } else {
            alert('That game is not available');
        }
    } catch (err) {
        alert('Connection error. Please try again.');
    }
  };

  const handleAdminLogin = () => {
    if (adminPassword === 'trivia123') {
        sessionStorage.setItem('admin_session', 'true');
        setIsAdmin(true);
        setShowAdminLogin(false);
    } else {
        alert('Invalid password');
    }
  };

  const handleAdminLogout = () => {
    sessionStorage.removeItem('admin_session');
    setIsAdmin(false);
    setActiveTab('events');
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (isMobile) setMobileOpen(false);
  };

  // --- PARTICIPANT VIEW ---
  if (playEventId) {
    return (
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <ParticipantView eventId={playEventId} />
      </ThemeProvider>
    );
  }

  // --- WELCOME SCREEN (NO SESSION) ---
  if (!isAdmin && !isPresenting) {
    return (
        <ThemeProvider theme={darkTheme}>
            <CssBaseline />
            <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
                <AppBar position="static" sx={{ bgcolor: '#000', borderBottom: '1px solid #222' }} elevation={0}>
                    <Toolbar />
                </AppBar>
                <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
                    <Stack spacing={4} alignItems="center" sx={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>
                        <Typography variant="h3" sx={{ fontWeight: 800, color: '#90caf9' }}>TriviaNight</Typography>
                        
                        {!showAdminLogin ? (
                            <Paper sx={{ p: 4, width: '100%', bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 4 }}>
                                <Typography variant="h6" gutterBottom>Join a Game</Typography>
                                <Stack spacing={3}>
                                    <Box>
                                        <Typography variant="caption" sx={{ display: 'block', mb: 1, opacity: 0.7, textTransform: 'uppercase' }}>Game Code</Typography>
                                        <input 
                                            value={gameCode}
                                            onChange={(e) => setGameCode(e.target.value.toUpperCase().slice(0, 6))}
                                            placeholder="E.G. AB1234"
                                            style={{
                                                width: '100%',
                                                background: '#1a1a1a',
                                                border: '2px solid #333',
                                                color: '#fff',
                                                fontSize: '2rem',
                                                textAlign: 'center',
                                                padding: '12px',
                                                borderRadius: '8px',
                                                textTransform: 'uppercase',
                                                fontWeight: 'bold'
                                            }}
                                        />
                                    </Box>
                                    <Button 
                                        variant="contained" 
                                        size="large" 
                                        fullWidth 
                                        disabled={gameCode.length !== 6}
                                        onClick={handleJoinGame}
                                        sx={{ py: 2, fontSize: '1.2rem', fontWeight: 'bold' }}
                                    >
                                        Join Round
                                    </Button>
                                    <Button variant="text" size="small" sx={{ opacity: 0.3 }} onClick={() => setShowAdminLogin(true)}>Admin Management</Button>
                                </Stack>
                            </Paper>
                        ) : (
                            <Paper sx={{ p: 4, width: '100%', bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 4 }}>
                                <Typography variant="h6" gutterBottom>Admin Entry</Typography>
                                <Stack spacing={3}>
                                    <input 
                                        type="password"
                                        value={adminPassword}
                                        onChange={(e) => setAdminPassword(e.target.value)}
                                        placeholder="Password"
                                        style={{
                                            width: '100%',
                                            background: '#1a1a1a',
                                            border: '2px solid #333',
                                            color: '#fff',
                                            fontSize: '1.2rem',
                                            padding: '12px',
                                            borderRadius: '8px'
                                        }}
                                    />
                                    <Button variant="contained" fullWidth onClick={handleAdminLogin}>Unlock Dashboard</Button>
                                    <Button variant="text" onClick={() => setShowAdminLogin(false)}>Back to Join</Button>
                                </Stack>
                            </Paper>
                        )}
                    </Stack>
                </Box>
            </Box>
        </ThemeProvider>
    );
  }

  // --- PRESENTATION VIEW ---
  if (isPresenting) {
    return (
      <ThemeProvider theme={darkTheme}>
        <PresentationPage onExit={() => setIsPresenting(false)} onOpen={() => {}} onClose={() => {}} />
      </ThemeProvider>
    );
  }

  // --- ADMIN DASHBOARD ---

  const drawerContent = (
    <Box>
      <Toolbar />
      <Box sx={{ overflow: 'auto' }}>
        <List>
          <ListItem disablePadding>
            <ListItemButton selected={activeTab === 'events'} onClick={() => handleTabChange('events')}>
              <ListItemIcon><CalendarDays /></ListItemIcon>
              <ListItemText primary="Events" />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton selected={activeTab === 'sets'} onClick={() => handleTabChange('sets')}>
              <ListItemIcon><Layers /></ListItemIcon>
              <ListItemText primary="Sets" />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton selected={activeTab === 'all-questions'} onClick={() => handleTabChange('all-questions')}>
              <ListItemIcon><Database /></ListItemIcon>
              <ListItemText primary="Question Bank" />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton selected={activeTab === 'analytics'} onClick={() => handleTabChange('analytics')}>
              <ListItemIcon><BarChart3 /></ListItemIcon>
              <ListItemText primary="Analytics" />
            </ListItemButton>
          </ListItem>
        </List>
        <Divider />
        <List>
          <ListItem disablePadding>
            <ListItemButton onClick={() => setIsPresenting(true)}>
              <ListItemIcon><MonitorPlay color="#90caf9" /></ListItemIcon>
              <ListItemText primary="Launch Presentation" primaryTypographyProps={{ color: '#90caf9' }} />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton onClick={handleAdminLogout}>
              <ListItemIcon><Settings /></ListItemIcon>
              <ListItemText primary="Logout Admin" />
            </ListItemButton>
          </ListItem>
        </List>
      </Box>
    </Box>
  );

  return (
    <ThemeProvider theme={darkTheme}>
      <Box sx={{ display: 'flex' }}>
        <CssBaseline />
        <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
          <Toolbar>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { sm: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" noWrap component="div">
              TriviaNight
            </Typography>
          </Toolbar>
        </AppBar>
        
        <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
          {/* Mobile Drawer */}
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{ keepMounted: true }}
            sx={{
              display: { xs: 'block', sm: 'none' },
              '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
            }}
          >
            {drawerContent}
          </Drawer>
          
          {/* Desktop Drawer */}
          <Drawer
            variant="permanent"
            sx={{
              display: { xs: 'none', sm: 'block' },
              '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
            }}
            open
          >
            {drawerContent}
          </Drawer>
        </Box>

        <Box component="main" sx={{ flexGrow: 1, p: { xs: 1, sm: 3 }, width: { sm: `calc(100% - ${drawerWidth}px)` } }}>
          <Toolbar />
          {activeTab === 'events' && <EventsPage />}
          {activeTab === 'sets' && <SetsPage />}
          {activeTab === 'all-questions' && <AllQuestionsPage />}
          {activeTab === 'analytics' && <AnalyticsPage />}
        </Box>
      </Box>
    </ThemeProvider>
  );
}
