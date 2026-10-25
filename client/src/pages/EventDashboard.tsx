import React, { useEffect, useState, useCallback } from 'react';
import { 
  Box, 
  Paper, 
  Stack, 
  IconButton, 
  TextField, 
  List, 
  ListItem, 
  ListItemText, 
  Grid,
  Card,
  CardContent,
  Chip,
  Button,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  Switch,
  FormControlLabel,
  Tooltip
} from '@mui/material';
import { ArrowLeft, Plus, Trash2, Trophy, PlayCircle, Printer, QrCode, X } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import LiveScorer from './LiveScorer';
import { Event, Team, Set } from '../types';
import { useTeams } from '../hooks/useTeams';
import { useSocket } from '../hooks/useSocket';
import { PageHeader } from '../components/layout/PageHeader';
import { PrintOptionsDialog } from '../components/events/PrintOptionsDialog';

interface Props {
  event: Event;
  onBack: () => void;
}

export default function EventDashboard({ event: initialEvent, onBack }: Props) {
  // Local copy so we can toggle digital_input live
  const [event, setEvent] = useState<Event>(initialEvent);
  const { teams, addTeam, deleteTeam, refetchTeams } = useTeams(event.id);
  const [sets, setSets] = useState<Set[]>([]);
  const [newTeamName, setNewTeamName] = useState('');
  const [isScoring, setIsScoring] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const { on, emit } = useSocket(event.id);

  const playUrl = `${window.location.origin}/?play=${event.id}`;

  const fetchData = async () => {
    try {
      const sRes = await fetch(`/api/events/${event.id}/sets`);
      setSets(await sRes.json());
    } catch (err) {
      console.error('>>> [DASHBOARD] Fetch Error:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [event.id]);

  // Live team updates via socket
  useEffect(() => {
    const cleanup = on('team_joined', () => {
      refetchTeams();
    });
    return cleanup;
  }, [on, refetchTeams]);

  const handleAddTeam = async () => {
    if (!newTeamName.trim()) return;
    await addTeam(newTeamName);
    setNewTeamName('');
  };

  const handleDeleteTeam = async (id: number) => {
    await deleteTeam(id);
  };

  const handlePrint = (printMode: string) => {
    if (printMode === 'scoresheets') {
      window.open(`/api/events/${event.id}/scoresheet`, '_blank');
    } else {
      window.open(`/api/events/${event.id}/printout?mode=${printMode}`, '_blank');
    }
    setPrintOpen(false);
  };

  const handleToggleDigital = async (enabled: boolean) => {
    const updated = { ...event, digital_input: enabled };
    setEvent(updated);
    await fetch(`/api/events/${event.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    });
  };

  if (isScoring) {
    return <LiveScorer event={event} teams={teams} sets={sets} onExit={() => setIsScoring(false)} />;
  }

  return (
    <Box>
      <PageHeader 
        title={event.title}
        subtitle={`${new Date(event.date).toLocaleDateString()} | ${event.location}`}
        icon={<IconButton onClick={onBack} sx={{ ml: -1 }}><ArrowLeft /></IconButton>}
        actions={
          <>
            <Button 
              variant="outlined" 
              startIcon={<Printer />}
              disabled={sets.length === 0}
              onClick={() => setPrintOpen(true)}
            >
              Print
            </Button>
            <Button 
              variant="contained" 
              color="success" 
              size="large" 
              startIcon={<PlayCircle />}
              disabled={teams.length === 0 || sets.length === 0}
              onClick={() => setIsScoring(true)}
            >
              Start Live Scoring
            </Button>
          </>
        }
      />

      <Grid container spacing={4}>
        {/* Game Info Card */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2, bgcolor: 'rgba(144,202,249,0.04)', border: '1px solid rgba(144,202,249,0.15)' }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between" flexWrap="wrap">
              <Stack direction="row" spacing={2} alignItems="center">
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 'bold' }}>Game Code</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#90caf9', letterSpacing: 4, fontFamily: 'monospace' }}>
                    {event.game_code || '—'}
                  </Typography>
                </Box>
                <Tooltip title="Show QR Code">
                  <IconButton color="primary" size="large" onClick={() => setQrOpen(true)} sx={{ border: '1px solid rgba(144,202,249,0.3)', borderRadius: 2 }}>
                    <QrCode />
                  </IconButton>
                </Tooltip>
              </Stack>

              {event.game_mode !== 'speed' && (
                <FormControlLabel
                  control={
                    <Switch
                      checked={!!event.digital_input}
                      onChange={(e) => handleToggleDigital(e.target.checked)}
                      color="secondary"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Digital Input</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {event.digital_input ? 'Players submit answers from their phones' : 'Analog scoring — paper/verbal only'}
                      </Typography>
                    </Box>
                  }
                />
              )}

              <Chip
                label={event.game_mode === 'speed' ? 'Speed Round' : event.digital_input ? 'Pub (Digital)' : 'Pub Mode'}
                color={event.game_mode === 'speed' ? 'warning' : event.digital_input ? 'secondary' : 'primary'}
                sx={{ fontWeight: 'bold' }}
              />
            </Stack>
          </Paper>
        </Grid>

        {/* Teams Management */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Trophy size={20} /> Teams
                </Typography>
                <Chip label={`${teams.length} Registered`} color="primary" size="small" />
              </Stack>
              
              <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
                <TextField 
                  fullWidth 
                  size="small" 
                  placeholder="Team Name" 
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTeam()}
                />
                <Button 
                  variant="outlined" 
                  startIcon={<Plus />} 
                  onClick={handleAddTeam}
                  disabled={!newTeamName.trim()}
                >
                  Add
                </Button>
              </Stack>

              <List sx={{ bgcolor: 'background.paper', borderRadius: 1 }}>
                {teams.map((team) => (
                  <ListItem key={team.id} secondaryAction={
                    <IconButton edge="end" color="error" onClick={() => handleDeleteTeam(team.id)}>
                      <Trash2 size={18} />
                    </IconButton>
                  }>
                    <ListItemText primary={team.name} />
                  </ListItem>
                ))}
                {teams.length === 0 && (
                  <Typography variant="body2" sx={{ p: 2, textAlign: 'center', fontStyle: 'italic' }} color="text.secondary">
                    {event.digital_input ? 'Waiting for teams to join via QR code...' : 'No teams registered yet.'}
                  </Typography>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Rounds Preview */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Event Rounds</Typography>
              <Stack spacing={2}>
                {sets.map((set, i) => (
                  <Paper key={set.id} sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.05)' }}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography>Round {i + 1}: <b>{set.name}</b></Typography>
                      {set.category && <Chip label={set.category} size="small" variant="outlined" />}
                    </Stack>
                  </Paper>
                ))}
                {sets.length === 0 && (
                  <Typography variant="body2" color="error" sx={{ fontStyle: 'italic' }}>
                    No sets assigned to this event. Link them in the Events list.
                  </Typography>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <PrintOptionsDialog 
        open={printOpen}
        onClose={() => setPrintOpen(false)}
        onPrint={handlePrint}
      />

      {/* QR Code Dialog */}
      <Dialog open={qrOpen} onClose={() => setQrOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Join Trivia Night
          <IconButton onClick={() => setQrOpen(false)}><X /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', py: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Typography variant="h6" gutterBottom color="text.secondary">Scan to Play</Typography>
          <Box sx={{ p: 2, bgcolor: '#fff', borderRadius: 4, display: 'inline-block', boxShadow: 3 }}>
            <QRCodeCanvas value={playUrl} size={300} />
          </Box>
          <Typography variant="h4" sx={{ mt: 3, fontWeight: 'bold', fontFamily: 'monospace', color: '#90caf9', letterSpacing: 4 }}>
            {event.game_code}
          </Typography>
          <Typography variant="body2" sx={{ mt: 1, opacity: 0.5, wordBreak: 'break-all', maxWidth: 320 }}>
            {playUrl}
          </Typography>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
