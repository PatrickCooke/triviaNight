import React, { useState } from 'react';
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
  createTheme
} from '@mui/material';
import { 
  CalendarDays, 
  Layers, 
  Settings, 
  MonitorPlay 
} from 'lucide-react';
import EventsPage from './pages/EventsPage';
import SetsPage from './pages/SetsPage';

const drawerWidth = 240;

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#90caf9',
    },
    secondary: {
      main: '#f48fb1',
    },
  },
});

export default function App() {
  const [activeTab, setActiveTab] = useState('events');

  return (
    <ThemeProvider theme={darkTheme}>
      <Box sx={{ display: 'flex' }}>
        <CssBaseline />
        <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
          <Toolbar>
            <Typography variant="h6" noWrap component="div">
              TriviaNight Management
            </Typography>
          </Toolbar>
        </AppBar>
        <Drawer
          variant="permanent"
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' },
          }}
        >
          <Toolbar />
          <Box sx={{ overflow: 'auto' }}>
            <List>
              <ListItem disablePadding>
                <ListItemButton selected={activeTab === 'events'} onClick={() => setActiveTab('events')}>
                  <ListItemIcon><CalendarDays /></ListItemIcon>
                  <ListItemText primary="Events" />
                </ListItemButton>
              </ListItem>
              <ListItem disablePadding>
                <ListItemButton selected={activeTab === 'sets'} onClick={() => setActiveTab('sets')}>
                  <ListItemIcon><Layers /></ListItemIcon>
                  <ListItemText primary="Sets" />
                </ListItemButton>
              </ListItem>
            </List>
            <Divider />
            <List>
              <ListItem disablePadding>
                <ListItemButton>
                  <ListItemIcon><MonitorPlay /></ListItemIcon>
                  <ListItemText primary="Launch Presentation" />
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
        </Drawer>
        <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
          <Toolbar />
          {activeTab === 'events' && <EventsPage />}
          {activeTab === 'sets' && <SetsPage />}
        </Box>
      </Box>
    </ThemeProvider>
  );
}
