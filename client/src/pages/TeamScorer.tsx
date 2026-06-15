import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Stack, 
  IconButton, 
  Paper, 
  Button,
  Grid,
  Checkbox,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Chip,
  TextField
} from '@mui/material';
import { X, ArrowLeft, CheckSquare, Trophy, ChevronRight } from 'lucide-react';

interface Props {
  event: any;
  onBack: () => void;
}

export default function TeamScorer({ event, onBack }: Props) {
  const [teams, setTeams] = useState<any[]>([]);
  const [rounds, setRounds] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [scores, setScores] = useState<Record<string, boolean>>({}); // "teamId-qId-ansIdx"
  const [multipliers, setMultipliers] = useState<Record<string, number>>({}); // "teamId-setId"

  const fetchData = async () => {
    const [tRes, sRes, aRes, mRes] = await Promise.all([
      fetch(`/api/events/${event.id}/teams`),
      fetch(`/api/events/${event.id}/sets`),
      fetch(`/api/events/${event.id}/answers`),
      fetch(`/api/events/${event.id}/multipliers`)
    ]);
    
    const teamData = await tRes.json();
    const setData = await sRes.json();
    const answerData = await aRes.json();
    const multiplierData = await mRes.json();

    // Fetch questions for all sets
    const roundsWithQuestions = await Promise.all(setData.map(async (set: any) => {
      const qRes = await fetch(`/api/sets/${set.id}/questions`);
      return { ...set, questions: await qRes.json() };
    }));

    // Build scores map
    const scoresMap: Record<string, boolean> = {};
    answerData.forEach((a: any) => {
      scoresMap[`${a.team_id}-${a.question_id}-${a.answer_index}`] = !!a.is_correct;
    });

    // Build multipliers map
    const multipliersMap: Record<string, number> = {};
    multiplierData.forEach((m: any) => {
      multipliersMap[`${m.team_id}-${m.set_id}`] = m.multiplier;
    });

    setTeams(teamData);
    setRounds(roundsWithQuestions);
    setScores(scoresMap);
    setMultipliers(multipliersMap);
    if (teamData.length > 0 && !selectedTeam) setSelectedTeam(teamData[0]);
  };

  useEffect(() => {
    fetchData();
  }, [event.id]);

  const handleToggle = async (teamId: number, qId: number, ansIdx: number, current: boolean) => {
    const next = !current;
    const key = `${teamId}-${qId}-${ansIdx}`;
    setScores(prev => ({ ...prev, [key]: next }));

    await fetch('/api/answers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ team_id: teamId, question_id: qId, answer_index: ansIdx, is_correct: next })
    });
  };

  const handleMultiplierChange = async (teamId: number, setId: number, val: string) => {
    const multiplier = parseFloat(val) || 1.0;
    const key = `${teamId}-${setId}`;
    setMultipliers(prev => ({ ...prev, [key]: multiplier }));

    await fetch('/api/multipliers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ team_id: teamId, set_id: setId, multiplier })
    });
  };

  const getTeamScore = (teamId: number) => {
    let total = 0;
    rounds.forEach(round => {
        let roundScore = 0;
        round.questions.forEach((q: any) => {
            const answerParts = getAnswerRows(q);
            answerParts.forEach((_, aIdx) => {
                if (scores[`${teamId}-${q.id}-${aIdx}`]) roundScore++;
            });
        });
        const multiplier = multipliers[`${teamId}-${round.id}`] ?? 1.0;
        total += roundScore * multiplier;
    });
    return total;
  };

  if (teams.length === 0) return <Box sx={{ p: 4 }}><Typography>No teams registered. Go to Dashboard first.</Typography><Button onClick={onBack}>Back</Button></Box>;

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 120px)', mt: -2 }}>
      {/* Sidebar - Team Selection */}
      <Paper sx={{ width: 280, mr: 3, display: 'flex', flexDirection: 'column', bgcolor: 'rgba(255,255,255,0.02)' }}>
        <Box sx={{ p: 2, borderBottom: '1px solid #333' }}>
          <Typography variant="h6">Teams</Typography>
        </Box>
        <List sx={{ flexGrow: 1, overflow: 'auto' }}>
          {teams.map((t) => (
            <ListItemButton 
              key={t.id} 
              selected={selectedTeam?.id === t.id}
              onClick={() => setSelectedTeam(t)}
              sx={{ py: 2 }}
            >
              <ListItemText 
                primary={t.name} 
                secondary={`${getTeamScore(t.id)} points`}
                primaryTypographyProps={{ fontWeight: selectedTeam?.id === t.id ? 'bold' : 'normal' }}
              />
              <ChevronRight size={16} style={{ opacity: 0.5 }} />
            </ListItemButton>
          ))}
        </List>
        <Box sx={{ p: 2, borderTop: '1px solid #333' }}>
          <Button fullWidth startIcon={<ArrowLeft />} onClick={onBack}>Back to Events</Button>
        </Box>
      </Paper>

      {/* Main Content - Questions for Selected Team */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', pr: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          <Box>
            <Typography variant="h4">{selectedTeam?.name}</Typography>
            <Typography color="text.secondary">Score Sheet Entry | {event.title}</Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="h3" sx={{ fontWeight: 800, color: 'primary.main' }}>{getTeamScore(selectedTeam?.id).toFixed(1).replace('.0', '')}</Typography>
            <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>Total Points</Typography>
          </Box>
        </Stack>

        {rounds.map((round, rIdx) => (
          <Box key={round.id} sx={{ mb: 6 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h5" color="secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    Round {rIdx + 1}: {round.name}
                </Typography>
                <Stack direction="row" alignItems="center" spacing={2}>
                    <Typography variant="body2" color="text.secondary">Round Multiplier:</Typography>
                    <TextField 
                        size="small"
                        type="number"
                        inputProps={{ step: 0.5, min: 1 }}
                        sx={{ width: 80 }}
                        value={multipliers[`${selectedTeam.id}-${round.id}`] ?? 1.0}
                        onChange={(e) => handleMultiplierChange(selectedTeam.id, round.id, e.target.value)}
                    />
                </Stack>
            </Stack>
            <Divider sx={{ mb: 3 }} />
            
            <Stack spacing={3}>
              {round.questions.map((q: any) => {
                const answerParts = getAnswerRows(q);

                return (
                  <Paper key={q.id} sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.01)', border: '1px solid #222' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                      {q.title || 'Question'} <Typography component="span" color="text.secondary" variant="body2" sx={{ ml: 1 }}>— {q.prompt}</Typography>
                    </Typography>
                    
                    <Grid container spacing={1}>
                      {answerParts.map((ans, aIdx) => {
                        const isCorrect = !!scores[`${selectedTeam.id}-${q.id}-${aIdx}`];
                        return (
                          <Grid item xs={12} sm={6} md={4} key={aIdx}>
                            <Box 
                              onClick={() => handleToggle(selectedTeam.id, q.id, aIdx, isCorrect)}
                              sx={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                p: 1, 
                                cursor: 'pointer',
                                borderRadius: 1,
                                border: '1px solid',
                                borderColor: isCorrect ? 'success.main' : '#333',
                                bgcolor: isCorrect ? 'rgba(76, 175, 80, 0.05)' : 'transparent',
                                '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' }
                              }}
                            >
                              <Checkbox 
                                size="small"
                                checked={isCorrect}
                                checkedIcon={<CheckSquare color="#4caf50" />}
                                icon={<CheckSquare color="#444" />}
                              />
                              <Typography variant="body2" noWrap sx={{ ml: 1, color: isCorrect ? 'success.light' : 'text.primary' }}>
                                {ans}
                              </Typography>
                            </Box>
                          </Grid>
                        );
                      })}
                    </Grid>
                  </Paper>
                );
              })}
            </Stack>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

function getAnswerRows(q: any): string[] {
    const rows: string[] = [];
    if (!q || !q.content) return rows;

    if (q.type === 'multiple_choice') {
        if (q.content.correct) rows.push(q.content.correct);
    } else if (q.type === 'multi_part') {
        const parts = q.content.parts || (q.content.answers || []).map((a: string) => ({ text: a }));
        parts.forEach((p: any) => rows.push(`${p.text || ''} ${p.range ? `± ${p.range}` : ''}`));
    } else if (q.type === 'matching') {
        const pairs = q.content.pairs || [];
        pairs.forEach((p: any) => rows.push(`${p.left || ''}: ${p.right || ''}`));
    } else if (q.type === 'sequencing') {
        const items = q.content.items || [];
        items.forEach((it: string, i: number) => rows.push(`${i+1}. ${it}`));
    }
    return rows;
}
