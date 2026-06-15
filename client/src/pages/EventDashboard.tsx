import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Paper, 
  Stack, 
  IconButton, 
  TextField, 
  List, 
  ListItem, 
  ListItemText, 
  Divider,
  Grid,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  RadioGroup,
  FormControlLabel,
  Radio
} from '@mui/material';
import { ArrowLeft, Plus, Trash2, Trophy, PlayCircle, Printer } from 'lucide-react';
import LiveScorer from './LiveScorer';

interface Team {
  id: number;
  name: string;
}

interface Set {
  id: number;
  name: string;
  category: string;
}

interface Props {
  event: any;
  onBack: () => void;
}

export default function EventDashboard({ event, onBack }: Props) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [sets, setSets] = useState<Set[]>([]);
  const [newTeamName, setNewTeamName] = useState('');
  const [isScoring, setIsScoring] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [printMode, setPrintMode] = useState('questions');

  const fetchData = async () => {
    try {
      const [tRes, sRes] = await Promise.all([
        fetch(`/api/events/${event.id}/teams`),
        fetch(`/api/events/${event.id}/sets`)
      ]);
      setTeams(await tRes.json());
      setSets(await sRes.json());
    } catch (err) {
      console.error('>>> [DASHBOARD] Fetch Error:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [event.id]);

  const handleAddTeam = async () => {
    if (!newTeamName.trim()) return;
    await fetch(`/api/events/${event.id}/teams`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newTeamName }),
    });
    setNewTeamName('');
    fetchData();
  };

  const handleDeleteTeam = async (id: number) => {
    await fetch(`/api/teams/${id}`, { method: 'DELETE' });
    fetchData();
  };

  const handlePrint = () => {
    if (printMode === 'scoresheets') {
      window.open(`/api/events/${event.id}/scoresheet`, '_blank');
    } else {
      window.open(`/api/events/${event.id}/printout?mode=${printMode}`, '_blank');
    }
    setPrintOpen(false);
  };

  if (isScoring) {
    return <LiveScorer event={event} teams={teams} sets={sets} onExit={() => setIsScoring(false)} />;
  }

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 4 }}>
        <IconButton onClick={onBack}><ArrowLeft /></IconButton>
        <Box>
          <Typography variant="h4">{event.title}</Typography>
          <Typography color="text.secondary">{new Date(event.date).toLocaleDateString()} | {event.location}</Typography>
        </Box>
        <Box sx={{ flexGrow: 1 }} />
        <Stack direction="row" spacing={2}>
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
        </Stack>
      </Stack>

      <Grid container spacing={4}>
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
                    No teams registered yet.
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

      {/* Print Options Dialog */}
      <Dialog open={printOpen} onClose={() => setPrintOpen(false)}>
        <DialogTitle>Print Options</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }} color="text.secondary">
            Choose the type of document you want to generate.
          </Typography>
          <FormControl component="fieldset">
            <RadioGroup value={printMode} onChange={(e) => setPrintMode(e.target.value)}>
              <FormControlLabel value="questions" control={<Radio />} label="Questions Only" />
              <FormControlLabel value="answers" control={<Radio />} label="Questions + Correct Answers" />
              <FormControlLabel value="full" control={<Radio />} label="Full Take-Home (Include Distractors)" />
              <Divider sx={{ my: 1 }} />
              <FormControlLabel value="scoresheets" control={<Radio />} label="Participant Score Sheets (Half-Page)" />
            </RadioGroup>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPrintOpen(false)}>Cancel</Button>
          <Button onClick={handlePrint} variant="contained" startIcon={<Printer />}>
            Generate PDF
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
