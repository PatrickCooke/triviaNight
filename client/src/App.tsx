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
  useMediaQuery
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
  
  const isMobile = useMediaQuery(darkTheme.breakpoints.down('sm'));

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const playId = params.get('play');
    if (playId) {
      setPlayEventId(parseInt(playId, 10));
    }
  }, []);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (isMobile) setMobileOpen(false);
  };

  if (playEventId) {
    return (
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <ParticipantView eventId={playEventId} />
      </ThemeProvider>
    );
  }

  if (isPresenting) {
    return (
      <ThemeProvider theme={darkTheme}>
        <PresentationPage onExit={() => setIsPresenting(false)} onOpen={() => {}} onClose={() => {}} />
      </ThemeProvider>
    );
  }

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
            <ListItemButton>
              <ListItemIcon><Settings /></ListItemIcon>
              <ListItemText primary="Settings" />
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
