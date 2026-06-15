import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Box, Typography, Stack, Fade, Paper, Grid, CircularProgress, Container, Button, useMediaQuery, useTheme } from '@mui/material';
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
  const theme = useTheme();
  const isLargeScreen = useMediaQuery(theme.breakpoints.up('md'));

  const [event, setEvent] = useState<any>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [teams, setTeams] = useState<any[]>([]);
  const [scores, setScores] = useState<Record<string, boolean>>({});
  const [multipliers, setMultipliers] = useState<Record<string, number>>({});
  const [questionRoundMap, setQuestionRoundMap] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const eRes = await fetch('/api/events');
      const events = await eRes.json();
      const currentEvent = events.find((e: any) => e.id === eventId);
      if (!currentEvent) return;
      setEvent(currentEvent);

      const slideList: Slide[] = [];
      const qRoundMap: Record<number, number> = {};
      slideList.push({ type: 'event_title', title: currentEvent.title });

      const setsRes = await fetch(`/api/events/${eventId}/sets`);
      const sets = await setsRes.json();

      for (const set of sets) {
        slideList.push({ type: 'set_title', title: set.name });
        const qRes = await fetch(`/api/sets/${set.id}/questions`);
        const questions = await qRes.json();
        for (const q of questions) {
          slideList.push({ type: 'question', data: q });
          qRoundMap[q.id] = set.id;
        }
        slideList.push({ type: 'intermission', title: `${set.name} Complete` });
      }

      slideList.push({ type: 'event_end', title: 'Trivia Night Complete' });
      setSlides(slideList);
      setQuestionRoundMap(qRoundMap);
      setCurrentIndex(currentEvent.current_slide_index || 0);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching participant data:', err);
    }
  }, [eventId]);

  const fetchScores = useCallback(async () => {
    const [tRes, aRes, mRes] = await Promise.all([
      fetch(`/api/events/${eventId}/teams`),
      fetch(`/api/events/${eventId}/answers`),
      fetch(`/api/events/${eventId}/multipliers`)
    ]);
    const teamData = await tRes.json();
    const answerData = await aRes.json();
    const multiplierData = await mRes.json();
    
    const scoresMap: Record<string, boolean> = {};
    answerData.forEach((a: any) => {
      scoresMap[`${a.team_id}-${a.question_id}-${a.answer_index}`] = !!a.is_correct;
    });

    const multipliersMap: Record<string, number> = {};
    multiplierData.forEach((m: any) => {
      multipliersMap[`${m.team_id}-${m.set_id}`] = m.multiplier;
    });
    
    setTeams(teamData);
    setScores(scoresMap);
    setMultipliers(multipliersMap);
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
      let total = 0;
      // Group scores by question, then apply multiplier for that question's round
      const teamScoreKeys = Object.keys(scores).filter(k => k.startsWith(`${team.id}-`) && scores[k]);
      
      const roundScores: Record<number, number> = {};
      teamScoreKeys.forEach(key => {
        const [_, qId] = key.split('-').map(Number);
        const roundId = questionRoundMap[qId];
        if (roundId) {
            roundScores[roundId] = (roundScores[roundId] || 0) + 1;
        }
      });

      Object.entries(roundScores).forEach(([roundId, score]) => {
        const multiplier = multipliers[`${team.id}-${roundId}`] ?? 1.0;
        total += score * multiplier;
      });

      return { ...team, score: total };
    }).sort((a, b) => b.score - a.score);
  };

  const currentSlide = slides[currentIndex];

  if (showLeaderboard) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#000', color: '#fff', p: isLargeScreen ? 6 : 2 }}>
        <Typography variant={isLargeScreen ? "h2" : "h4"} sx={{ mb: isLargeScreen ? 6 : 3, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
          <Trophy size={isLargeScreen ? 48 : 24} color="#fbc02d" /> Standings
        </Typography>
        <Stack spacing={isLargeScreen ? 2 : 1}>
          {calculateLeaderboard().map((t, i) => (
            <Paper key={t.id} sx={{ p: isLargeScreen ? 4 : 2, bgcolor: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center' }}>
              <Typography variant={isLargeScreen ? "h3" : "h5"} sx={{ mr: isLargeScreen ? 4 : 2, color: i < 3 ? '#90caf9' : 'text.secondary', width: isLargeScreen ? 80 : 25 }}>{i + 1}</Typography>
              <Typography variant={isLargeScreen ? "h4" : "body1"} sx={{ flexGrow: 1, fontWeight: i === 0 ? 'bold' : 'normal' }}>{t.name}</Typography>
              <Typography variant={isLargeScreen ? "h3" : "h6"} sx={{ fontWeight: 'bold', color: '#90caf9' }}>{t.score.toFixed(1).replace('.0', '')}</Typography>
            </Paper>
          ))}
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100vh', bgcolor: '#000', color: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Box sx={{ 
        flexGrow: 1, 
        overflowY: isLargeScreen ? 'hidden' : 'auto', 
        p: isLargeScreen ? 0 : 2,
        display: isLargeScreen ? 'flex' : 'block',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Fade key={currentIndex} in timeout={500}>
          <Box sx={{ width: '100%', height: isLargeScreen ? '100%' : 'auto', display: isLargeScreen ? 'flex' : 'block', alignItems: 'center', justifyContent: 'center' }}>
            {currentSlide.type === 'event_title' && (
              <Box sx={{ minHeight: isLargeScreen ? '100%' : '80vh', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', p: 4 }}>
                <Typography variant={isLargeScreen ? "h1" : "h3"} color="primary" sx={{ fontWeight: 'bold' }}>{currentSlide.title}</Typography>
                <Typography variant={isLargeScreen ? "h4" : "h6"} sx={{ mt: 4, opacity: 0.7 }}>Welcome to the Game!</Typography>
              </Box>
            )}
            {currentSlide.type === 'set_title' && (
              <Box sx={{ minHeight: isLargeScreen ? '100%' : '80vh', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', p: 4 }}>
                <Typography variant={isLargeScreen ? "h2" : "h4"} color="secondary" sx={{ fontWeight: 'bold' }}>{currentSlide.title}</Typography>
                <Typography variant={isLargeScreen ? "h4" : "h6"} sx={{ mt: 4, opacity: 0.7 }}>Get Ready!</Typography>
              </Box>
            )}
            {currentSlide.type === 'intermission' && (
              <Box sx={{ minHeight: isLargeScreen ? '100%' : '80vh', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', p: 4 }}>
                <Typography variant={isLargeScreen ? "h2" : "h4"} sx={{ fontWeight: 'bold' }}>Intermission</Typography>
                <Typography variant={isLargeScreen ? "h4" : "h6"} sx={{ mt: 4, opacity: 0.7 }}>Tallying scores...</Typography>
              </Box>
            )}
            {currentSlide.type === 'event_end' && (
              <Box sx={{ minHeight: isLargeScreen ? '100%' : '80vh', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', p: 4 }}>
                <Typography variant={isLargeScreen ? "h2" : "h4"} color="primary" sx={{ fontWeight: 'bold' }}>Thanks for Playing!</Typography>
              </Box>
            )}
            {currentSlide.type === 'question' && <ParticipantQuestionDisplay question={currentSlide.data} />}
          </Box>
        </Fade>
      </Box>
      
      {/* Footer Info */}
      <Box sx={{ p: isLargeScreen ? 2 : 1.5, textAlign: 'center', borderTop: '1px solid #222', bgcolor: '#050505', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
        <Typography variant={isLargeScreen ? "h6" : "caption"} sx={{ opacity: 0.5 }}>
          {event?.title} • Slide {currentIndex + 1} of {slides.length}
        </Typography>
        <Button 
            size={isLargeScreen ? "medium" : "small"}
            color="inherit" 
            variant="outlined" 
            sx={{ fontSize: isLargeScreen ? '0.8rem' : '0.6rem', py: 0, opacity: 0.5 }}
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
  const theme = useTheme();
  const isLargeScreen = useMediaQuery(theme.breakpoints.up('md'));

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
    <Container maxWidth={isLargeScreen ? false : "sm"} sx={{ py: isLargeScreen ? 4 : 2, pb: isLargeScreen ? 12 : 8, height: isLargeScreen ? '100%' : 'auto', display: isLargeScreen ? 'flex' : 'block', flexDirection: 'column', justifyContent: 'center' }}>
      <Typography variant={isLargeScreen ? "h4" : "h6"} sx={{ color: '#90caf9', fontWeight: 'bold', mb: isLargeScreen ? 4 : 1, textAlign: 'center', textTransform: 'uppercase' }}>
        {question.title || 'Question'}
      </Typography>
      
      {question.media_url && (
        <Box sx={{ width: '100%', mb: isLargeScreen ? 4 : 2, display: 'flex', justifyContent: 'center' }}>
          <img src={question.media_url} alt="media" style={{ maxWidth: '100%', maxHeight: isLargeScreen ? '40vh' : '30vh', borderRadius: 8 }} />
        </Box>
      )}

      <Typography variant={isLargeScreen ? "h2" : "h5"} sx={{ fontWeight: 'bold', mb: isLargeScreen ? 6 : 4, textAlign: 'center', lineHeight: 1.2 }}>
        {question.prompt}
      </Typography>

      {question.type === 'multiple_choice' && (
        <Grid container spacing={isLargeScreen ? 4 : 2}>
          {mcOptions.map((opt, i) => (
            <Grid item xs={12} md={6} key={i}>
              <Paper sx={{ p: isLargeScreen ? 4 : 2, height: '100%', bgcolor: '#161616', border: '1px solid #333', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant={isLargeScreen ? "h3" : "h6"} sx={{ width: '100%', wordBreak: 'break-word' }}>
                  {opt}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      {question.type === 'matching' && matchingData && (
        <Grid container spacing={isLargeScreen ? 6 : 2}>
          <Grid item xs={6}>
            <Stack spacing={isLargeScreen ? 3 : 1}>
              {matchingData.left.map((item: any, i: number) => (
                <Paper key={i} sx={{ p: isLargeScreen ? 2 : 1, bgcolor: '#111', color: '#90caf9', border: '1px solid #333', textAlign: 'center' }}>
                  <Typography variant={isLargeScreen ? "h4" : "body1"} sx={{ fontWeight: 'bold' }}>{item}</Typography>
                </Paper>
              ))}
            </Stack>
          </Grid>
          <Grid item xs={6}>
            <Stack spacing={isLargeScreen ? 3 : 1}>
              {matchingData.right.map((item: any, i: number) => (
                <Paper key={i} sx={{ p: isLargeScreen ? 2 : 1, bgcolor: '#111', color: '#f48fb1', border: '1px solid #333', textAlign: 'center' }}>
                  <Typography variant={isLargeScreen ? "h4" : "body1"} sx={{ fontWeight: 'bold' }}>{item}</Typography>
                </Paper>
              ))}
            </Stack>
          </Grid>
        </Grid>
      )}

      {question.type === 'sequencing' && sequenceData && (
        <Box>
          <Typography variant={isLargeScreen ? "h4" : "overline"} sx={{ display: 'block', mb: 2, textAlign: 'center', opacity: 0.7 }}>Order these items</Typography>
          <Stack spacing={isLargeScreen ? 2 : 1}>
            {sequenceData.map((item: any, i: number) => (
              <Paper key={i} sx={{ p: isLargeScreen ? 3 : 1.5, bgcolor: '#111', border: '1px solid #333', textAlign: 'center' }}>
                <Typography variant={isLargeScreen ? "h4" : "h6"}>{item}</Typography>
              </Paper>
            ))}
          </Stack>
        </Box>
      )}
      
      {question.type === 'multi_part' && (
        <Box sx={{ textAlign: 'center', p: isLargeScreen ? 8 : 4, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 2 }}>
            <Users size={isLargeScreen ? 96 : 48} style={{ opacity: 0.2, marginBottom: 16 }} />
            <Typography variant={isLargeScreen ? "h4" : "body1"} sx={{ opacity: 0.7 }}>
                Listen to the host for details!
            </Typography>
        </Box>
      )}
    </Container>
  );
}
