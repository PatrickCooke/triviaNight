import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemText, 
  Paper,
  IconButton,
  Stack
} from '@mui/material';
import { X, ChevronRight, Play } from 'lucide-react';
import SlideController from '../components/presentation/SlideController';

interface Event {
  id: number;
  title: string;
  date: string;
}

export default function PresentationPage({ onExit }: { onClose: () => void; onExit: () => void }) {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    fetch('/api/events')
      .then(res => res.json())
      .then(data => setEvents(data));
  }, []);

  if (selectedEvent) {
    return <SlideController event={selectedEvent} onExit={() => setSelectedEvent(null)} />;
  }

  return (
    <Box sx={{ 
      height: '100vh', 
      width: '100vw', 
      bgcolor: '#000', 
      color: '#fff', 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      p: 4
    }}>
      <IconButton 
        onClick={onExit}
        sx={{ position: 'absolute', top: 20, right: 20, color: '#fff' }}
      >
        <X size={32} />
      </IconButton>

      <Typography variant="h2" gutterBottom sx={{ fontWeight: 'bold', mb: 6 }}>
        Launch Presentation
      </Typography>

      <Paper sx={{ 
        width: '100%', 
        maxWidth: 600, 
        bgcolor: '#1a1a1a', 
        color: '#fff',
        maxHeight: '60vh',
        overflow: 'auto'
      }}>
        <List>
          {events.map((event) => (
            <ListItem key={event.id} disablePadding divider>
              <ListItemButton onClick={() => setSelectedEvent(event)} sx={{ py: 3 }}>
                <ListItemText 
                  primary={event.title} 
                  secondary={new Date(event.date).toLocaleDateString()}
                  primaryTypographyProps={{ variant: 'h5' }}
                  secondaryTypographyProps={{ sx: { color: 'rgba(255,255,255,0.5)' } }}
                />
                <Play />
              </ListItemButton>
            </ListItem>
          ))}
          {events.length === 0 && (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="rgba(255,255,255,0.5)">No events found. Go to Management to create one.</Typography>
            </Box>
          )}
        </List>
      </Paper>
    </Box>
  );
}
