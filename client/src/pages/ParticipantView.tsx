import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Box, Typography, Stack, Fade, Paper, Grid, CircularProgress, Container, Button } from '@mui/material';
import { Trophy, Users } from 'lucide-react';
import { io } from 'socket.io-client';

const socket = io();

interface Slide {
  type: 'event_title' | 'set_title' | 'question' | 'intermission' | 'event_end';
  title?: string;
  data?: any;
}

function shuffle<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

export default function ParticipantView({ eventId }: { eventId: number }) {
  console.log('>>> [PARTICIPANT] Rendering for eventId:', eventId);
  const [event, setEvent] = useState<any>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [teams, setTeams] = useState<any[]>([]);
  const [scores, setScores] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const eRes = await fetch('/api/events');
      const events = await eRes.json();
      const currentEvent = events.find((e: any) => e.id === eventId);
      if (!currentEvent) return;
      setEvent(currentEvent);

      const slideList: Slide[] = [];
      slideList.push({ type: 'event_title', title: currentEvent.title });

      const setsRes = await fetch(`/api/events/${eventId}/sets`);
      const sets = await setsRes.json();

      for (const set of sets) {
        slideList.push({ type: 'set_title', title: set.name });
        const qRes = await fetch(`/api/sets/${set.id}/questions`);
        const questions = await qRes.json();
        for (const q of questions) {
          slideList.push({ type: 'question', data: q });
        }
        slideList.push({ type: 'intermission', title: `${set.name} Complete` });
      }

      slideList.push({ type: 'event_end', title: 'Trivia Night Complete' });
      setSlides(slideList);
      setCurrentIndex(currentEvent.current_slide_index || 0);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching participant data:', err);
    }
  }, [eventId]);

  const fetchScores = useCallback(async () => {
    const [tRes, aRes] = await Promise.all([
      fetch(`/api/events/${eventId}/teams`),
      fetch(`/api/events/${eventId}/answers`)
    ]);
    const teamData = await tRes.json();
    const answerData = await aRes.json();
    
    const scoresMap: Record<string, boolean> = {};
    answerData.forEach((a: any) => {
      scoresMap[`${a.team_id}-${a.question_id}-${a.answer_index}`] = !!a.is_correct;
    });
    
    setTeams(teamData);
    setScores(scoresMap);
  }, [eventId]);

  useEffect(() => { 
    fetchData();
    fetchScores();

    socket.emit('join_event', eventId);

    socket.on('slide_changed', (index: number) => setCurrentIndex(index));
    socket.on('leaderboard_toggled', (visible: boolean) => {
        if (visible) fetchScores();
        setShowLeaderboard(visible);
    });

    return () => {
        socket.off('slide_changed');
        socket.off('leaderboard_toggled');
    };
  }, [fetchData, fetchScores, eventId]);

  if (loading) return (
    <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#000' }}>
      <CircularProgress />
    </Box>
  );

  const calculateLeaderboard = () => {
    return teams.map(team => {
      const total = Object.keys(scores).filter(k => k.startsWith(`${team.id}-`) && scores[k]).length;
      return { ...team, score: total };
    }).sort((a, b) => b.score - a.score);
  };

  const currentSlide = slides[currentIndex];

  if (showLeaderboard) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#000', color: '#fff', p: 2 }}>
        <Typography variant="h5" sx={{ mb: 3, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
          <Trophy size={24} color="#fbc02d" /> Standings
        </Typography>
        <Stack spacing={1}>
          {calculateLeaderboard().map((t, i) => (
            <Paper key={t.id} sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center' }}>
              <Typography variant="h6" sx={{ mr: 2, color: i < 3 ? '#90caf9' : 'text.secondary', width: 25 }}>{i + 1}</Typography>
              <Typography sx={{ flexGrow: 1, fontWeight: i === 0 ? 'bold' : 'normal' }}>{t.name}</Typography>
              <Typography sx={{ fontWeight: 'bold', color: '#90caf9' }}>{t.score}</Typography>
            </Paper>
          ))}
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100vh', bgcolor: '#000', color: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
        <Fade key={currentIndex} in timeout={500}>
          <Box>
            {currentSlide.type === 'event_title' && (
              <Box sx={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                <Typography variant="h3" color="primary" sx={{ fontWeight: 'bold' }}>{currentSlide.title}</Typography>
                <Typography variant="h6" sx={{ mt: 2, opacity: 0.7 }}>Welcome to the Game!</Typography>
              </Box>
            )}
            {currentSlide.type === 'set_title' && (
              <Box sx={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                <Typography variant="h4" color="secondary" sx={{ fontWeight: 'bold' }}>{currentSlide.title}</Typography>
                <Typography variant="h6" sx={{ mt: 2, opacity: 0.7 }}>Get Ready!</Typography>
              </Box>
            )}
            {currentSlide.type === 'intermission' && (
              <Box sx={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>Intermission</Typography>
                <Typography variant="h6" sx={{ mt: 2, opacity: 0.7 }}>Tallying scores...</Typography>
              </Box>
            )}
            {currentSlide.type === 'event_end' && (
              <Box sx={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                <Typography variant="h4" color="primary" sx={{ fontWeight: 'bold' }}>Thanks for Playing!</Typography>
              </Box>
            )}
            {currentSlide.type === 'question' && <ParticipantQuestionDisplay question={currentSlide.data} />}
          </Box>
        </Fade>
      </Box>
      
      {/* Footer Info */}
      <Box sx={{ p: 1.5, textAlign: 'center', borderTop: '1px solid #222', bgcolor: '#050505', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
        <Typography variant="caption" sx={{ opacity: 0.5 }}>
          {event?.title} • Slide {currentIndex + 1} of {slides.length}
        </Typography>
        <Button 
            size="small" 
            color="inherit" 
            variant="outlined" 
            sx={{ fontSize: '0.6rem', py: 0, opacity: 0.5 }}
            onClick={() => {
                localStorage.removeItem('activeEventId');
                window.location.reload();
            }}
        >
            Leave
        </Button>
      </Box>
    </Box>
  );
}

function ParticipantQuestionDisplay({ question }: { question: any }) {
  const mcOptions = useMemo(() => {
    if (question.type !== 'multiple_choice') return [];
    return shuffle([question.content.correct, ...question.content.distractors]);
  }, [question]);

  const matchingData = useMemo(() => {
    if (question.type !== 'matching') return null;
    return {
      left: shuffle(question.content.pairs.map((p: any) => p.left)),
      right: shuffle(question.content.pairs.map((p: any) => p.right))
    };
  }, [question]);

  const sequenceData = useMemo(() => {
    if (question.type !== 'sequencing') return null;
    return shuffle(question.content.items || []);
  }, [question]);

  return (
    <Container maxWidth="sm" sx={{ py: 2 }}>
      <Typography variant="h6" sx={{ color: '#90caf9', fontWeight: 'bold', mb: 1, textAlign: 'center', textTransform: 'uppercase' }}>
        {question.title || 'Question'}
      </Typography>
      
      {question.media_url && (
        <Box sx={{ width: '100%', mb: 2, display: 'flex', justifyContent: 'center' }}>
          <img src={question.media_url} alt="media" style={{ maxWidth: '100%', maxHeight: '30vh', borderRadius: 8 }} />
        </Box>
      )}

      <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 4, textAlign: 'center', lineHeight: 1.2 }}>
        {question.prompt}
      </Typography>

      {question.type === 'multiple_choice' && (
        <Stack spacing={2}>
          {mcOptions.map((opt, i) => (
            <Paper key={i} sx={{ p: 2, bgcolor: '#161616', border: '1px solid #333', textAlign: 'center' }}>
              <Typography variant="h6">
                <Box component="span" sx={{ color: '#90caf9', fontWeight: 'bold', mr: 1 }}>{String.fromCharCode(65 + i)}.</Box>
                {opt}
              </Typography>
            </Paper>
          ))}
        </Stack>
      )}

      {question.type === 'matching' && matchingData && (
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Typography variant="overline" sx={{ display: 'block', mb: 1, textAlign: 'center', opacity: 0.7 }}>Items</Typography>
            <Stack spacing={1}>
              {matchingData.left.map((item: any, i: number) => (
                <Paper key={i} sx={{ p: 1, bgcolor: '#111', color: '#90caf9', border: '1px solid #333', textAlign: 'center' }}>
                  <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{item}</Typography>
                </Paper>
              ))}
            </Stack>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="overline" sx={{ display: 'block', mb: 1, textAlign: 'center', opacity: 0.7 }}>Matches</Typography>
            <Stack spacing={1}>
              {matchingData.right.map((item: any, i: number) => (
                <Paper key={i} sx={{ p: 1, bgcolor: '#111', color: '#f48fb1', border: '1px solid #333', textAlign: 'center' }}>
                  <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{item}</Typography>
                </Paper>
              ))}
            </Stack>
          </Grid>
        </Grid>
      )}

      {question.type === 'sequencing' && sequenceData && (
        <Box>
          <Typography variant="overline" sx={{ display: 'block', mb: 1, textAlign: 'center', opacity: 0.7 }}>Order these items</Typography>
          <Stack spacing={1}>
            {sequenceData.map((item: any, i: number) => (
              <Paper key={i} sx={{ p: 1.5, bgcolor: '#111', border: '1px solid #333', textAlign: 'center' }}>
                <Typography variant="h6">{item}</Typography>
              </Paper>
            ))}
          </Stack>
        </Box>
      )}
      
      {question.type === 'multi_part' && (
        <Box sx={{ textAlign: 'center', p: 4, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 2 }}>
            <Users size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
            <Typography variant="body1" sx={{ opacity: 0.7 }}>
                Listen to the host for details!
            </Typography>
        </Box>
      )}
    </Container>
  );
}
