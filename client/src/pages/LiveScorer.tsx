import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Typography, 
  Stack, 
  IconButton, 
  Paper, 
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Divider,
  Switch,
  FormControlLabel
} from '@mui/material';
import { X, ChevronLeft, ChevronRight, Trophy, CheckSquare, Eye, EyeOff } from 'lucide-react';
import { io } from 'socket.io-client';

const socket = io();

interface Slide {
  type: 'event_title' | 'set_title' | 'question' | 'intermission' | 'event_end';
  title?: string;
  data?: any;
}

interface Props {
  event: any;
  teams: any[];
  sets: any[];
  onExit: () => void;
}

export default function LiveScorer({ event, teams, sets, onExit }: Props) {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scores, setScores] = useState<Record<string, boolean>>({});
  const [audienceLeaderboard, setAudienceLeaderboard] = useState(false);

  // 1. Build Shared Slide List
  useEffect(() => {
    const init = async () => {
      const slideList: Slide[] = [];
      slideList.push({ type: 'event_title', title: event.title });

      for (const set of sets) {
        slideList.push({ type: 'set_title', title: set.name });
        const res = await fetch(`/api/sets/${set.id}/questions`);
        const questions = await res.json();
        for (const q of questions) {
          slideList.push({ type: 'question', data: { ...q, setName: set.name } });
        }
        slideList.push({ type: 'intermission', title: `${set.name} Complete` });
      }

      slideList.push({ type: 'event_end', title: 'Trivia Night Complete' });
      setSlides(slideList);

      // Join Room
      socket.emit('join_event', event.id);

      // Load existing scores
      const aRes = await fetch(`/api/events/${event.id}/answers`);
      const answerData = await aRes.json();
      const scoresMap: Record<string, boolean> = {};
      answerData.forEach((a: any) => {
        scoresMap[`${a.team_id}-${a.question_id}-${a.answer_index}`] = !!a.is_correct;
      });
      setScores(scoresMap);
    };
    init();
  }, [event, sets]);

  // 2. Sync with Audience
  const syncSlide = useCallback((index: number) => {
    setCurrentIndex(index);
    socket.emit('set_slide', { eventId: event.id, index });
  }, [event.id]);

  const toggleAudienceLeaderboard = (visible: boolean) => {
    setAudienceLeaderboard(visible);
    socket.emit('toggle_leaderboard', { eventId: event.id, visible });
  };

  const handleToggleScore = async (teamId: number, qId: number, ansIdx: number, current: boolean) => {
    const next = !current;
    const key = `${teamId}-${qId}-${ansIdx}`;
    setScores(prev => ({ ...prev, [key]: next }));

    await fetch('/api/answers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ team_id: teamId, question_id: qId, answer_index: ansIdx, is_correct: next })
    });
  };

  if (slides.length === 0) return <Box sx={{ p: 4 }}>Initializing Remote Control...</Box>;

  const currentSlide = slides[currentIndex];

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      {/* Top Header */}
      <Paper sx={{ p: 2, mb: 2, borderRadius: 0, borderBottom: '1px solid #333' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="caption" color="primary" sx={{ textTransform: 'uppercase', fontWeight: 'bold' }}>Remote Control</Typography>
            <Typography variant="h5">{event.title}</Typography>
          </Box>
          <Stack direction="row" spacing={2} alignItems="center">
            <FormControlLabel
                control={<Switch checked={audienceLeaderboard} onChange={(e) => toggleAudienceLeaderboard(e.target.checked)} color="secondary" />}
                label={audienceLeaderboard ? "Leaderboard Public" : "Push Leaderboard"}
            />
            <IconButton onClick={onExit}><X /></IconButton>
          </Stack>
        </Stack>
      </Paper>

      {/* Slide Status */}
      <Box sx={{ p: 2, textAlign: 'center', bgcolor: 'rgba(255,255,255,0.02)', mb: 2 }}>
        <Typography variant="h6" color="secondary">
            {currentSlide.type === 'question' ? `QUESTION: ${currentSlide.data.setName}` : currentSlide.type.replace('_', ' ').toUpperCase()}
        </Typography>
        <Typography variant="body2" color="text.secondary">Audience is seeing this slide</Typography>
      </Box>

      {/* Main Content Area */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', px: 2, pb: 12 }}>
        {currentSlide.type === 'question' ? (
          <Box>
            <Paper sx={{ p: 2, mb: 3, borderLeft: '4px solid #90caf9' }}>
                <Typography variant="subtitle2" color="text.secondary">Prompt</Typography>
                <Typography variant="h6">{currentSlide.data.prompt}</Typography>
            </Paper>

            <TableContainer component={Paper}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold' }}>Answer Part</TableCell>
                            {teams.map(t => <TableCell key={t.id} align="center" sx={{ fontWeight: 'bold' }}>{t.name}</TableCell>)}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {getAnswerRows(currentSlide.data).map((ans, idx) => (
                            <TableRow key={idx}>
                                <TableCell sx={{ fontSize: '0.8rem' }}>{ans}</TableCell>
                                {teams.map(t => {
                                    const isCorrect = !!scores[`${t.id}-${currentSlide.data.id}-${idx}`];
                                    return (
                                        <TableCell key={t.id} align="center">
                                            <Checkbox 
                                                size="small"
                                                checked={isCorrect}
                                                onChange={() => handleToggleScore(t.id, currentSlide.data.id, idx, isCorrect)}
                                                checkedIcon={<CheckSquare color="#4caf50" />}
                                                icon={<CheckSquare color="#444" />}
                                            />
                                        </TableCell>
                                    );
                                })}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
          </Box>
        ) : (
          <Box sx={{ height: '30vh', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <Box>
                <Typography variant="h4" gutterBottom>{currentSlide.title || 'Slide'}</Typography>
                <Typography color="text.secondary">This is a title slide. No scoring available.</Typography>
            </Box>
          </Box>
        )}
      </Box>

      {/* Persistent Navigation Footer */}
      <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, p: 2, bgcolor: 'background.paper', borderTop: '2px solid #333' }}>
        <Stack direction="row" spacing={2} justifyContent="center" alignItems="center">
            <Button 
                variant="outlined" 
                size="large"
                startIcon={<ChevronLeft />} 
                disabled={currentIndex === 0}
                onClick={() => syncSlide(currentIndex - 1)}
            >
                Back
            </Button>
            <Box sx={{ textAlign: 'center', minWidth: 120 }}>
                <Typography variant="h6">{currentIndex + 1} / {slides.length}</Typography>
                <Typography variant="caption" color="text.secondary">Slide Sequence</Typography>
            </Box>
            <Button 
                variant="contained" 
                size="large"
                endIcon={<ChevronRight />} 
                disabled={currentIndex === slides.length - 1}
                onClick={() => syncSlide(currentIndex + 1)}
            >
                Next
            </Button>
        </Stack>
      </Paper>
    </Box>
  );
}

function getAnswerRows(q: any): string[] {
    const rows: string[] = [];
    if (q.type === 'multiple_choice') rows.push(q.content.correct);
    else if (q.type === 'multi_part') q.content.parts.forEach((p: any) => rows.push(`${p.text} ${p.range ? `± ${p.range}` : ''}`));
    else if (q.type === 'matching') q.content.pairs.forEach((p: any) => rows.push(`${p.left}: ${p.right}`));
    else if (q.type === 'sequencing') q.content.items.forEach((it: string, i: number) => rows.push(`${i+1}. ${it}`));
    return rows;
}
