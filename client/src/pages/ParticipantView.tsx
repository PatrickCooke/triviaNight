import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Box, 
  Typography, 
  Stack, 
  Fade, 
  Paper, 
  Grid, 
  CircularProgress, 
  Container, 
  Button, 
  useMediaQuery, 
  useTheme,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  LinearProgress,
  IconButton
} from '@mui/material';
import { Trophy, Users, Clock, ChevronUp, ChevronDown, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { useSocket } from '../hooks/useSocket';
import { Event, Slide, Team } from '../types';
import QuestionResultsDisplay from '../components/presentation/QuestionResultsDisplay';

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

  const [event, setEvent] = useState<Event | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [teams, setTeams] = useState<any[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [multipliers, setMultipliers] = useState<Record<string, number>>({});
  const [questionRoundMap, setQuestionRoundMap] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);

  // Digital / Speed game play states
  const [role, setRole] = useState<'captain' | 'spectator' | 'speed_player' | null>(null);
  const [teamId, setTeamId] = useState<number | null>(null);
  const [teamName, setTeamName] = useState<string>('');
  const [sessionToken, setSessionToken] = useState<string>('');
  const [roleSelection, setRoleSelection] = useState<'captain' | null>(null);
  const [inputTeamName, setInputTeamName] = useState('');
  const [joinError, setJoinError] = useState('');

  // Raw answers to dynamically calculate submission status per questionId
  const [rawAnswers, setRawAnswers] = useState<any[]>([]);
  // Local cache of submitted question IDs (useful for instant UI response or Speed timer buffer)
  const [locallySubmittedQIds, setLocallySubmittedQIds] = useState<Set<number>>(new Set());
  // Draft answers indexed by questionId
  const [drafts, setDrafts] = useState<Record<number, any>>({});

  // Speed round state
  const [speedTimer, setSpeedTimer] = useState<{ active: boolean; duration: number; timeLeft: number; startTime: number } | null>(null);

  const { emit, on } = useSocket(eventId);

  const fetchData = useCallback(async () => {
    try {
      const eRes = await fetch('/api/events');
      const events = await eRes.json();
      const currentEvent = events.find((e: any) => e.id === eventId);
      if (!currentEvent) return;
      setEvent(currentEvent);

      // Force spectator if Pub mode digital input toggle is off
      const isPubAndAnalog = currentEvent.game_mode === 'pub' && !currentEvent.digital_input;
      if (isPubAndAnalog || currentEvent.game_mode === 'analog') {
        setRole('spectator');
      }

      const slideList: Slide[] = [];
      const qRoundMap: Record<number, number> = {};
      slideList.push({ type: 'event_title', title: currentEvent.title });

      const setsRes = await fetch(`/api/events/${eventId}/sets`);
      const sets = await setsRes.json();

      const isDigitalOrSpeed = currentEvent.game_mode === 'speed' || currentEvent.game_mode === 'digital' || (currentEvent.game_mode === 'pub' && !!currentEvent.digital_input);

      for (const set of sets) {
        slideList.push({ type: 'set_title', title: set.name });
        const qRes = await fetch(`/api/sets/${set.id}/questions`);
        const questions = await qRes.json();
        for (const q of questions) {
          slideList.push({ type: 'question', data: q });
          if (isDigitalOrSpeed) {
            slideList.push({ type: 'question_results', data: q });
          }
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
    
    setRawAnswers(answerData);

    const scoresMap: Record<string, number> = {};
    answerData.forEach((a: any) => {
      scoresMap[`${a.team_id}-${a.question_id}-${a.answer_index}`] = Number(a.is_correct);
    });

    const multipliersMap: Record<string, number> = {};
    multiplierData.forEach((m: any) => {
      multipliersMap[`${m.team_id}-${m.set_id}`] = m.multiplier;
    });
    
    setTeams(teamData);
    setScores(scoresMap);
    setMultipliers(multipliersMap);
  }, [eventId]);

  // Session verification on mount
  useEffect(() => {
    const verifySession = async () => {
      const savedRole = localStorage.getItem('role') as any;
      const savedTeamId = localStorage.getItem('team_id');
      const savedToken = localStorage.getItem('session_token');
      const savedName = localStorage.getItem('team_name');

      if (savedRole && savedToken && (savedRole === 'spectator' || savedTeamId)) {
        if (savedRole === 'spectator') {
          setRole('spectator');
          return;
        }
        try {
          const res = await fetch('/api/teams/verify-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ team_id: parseInt(savedTeamId!, 10), session_token: savedToken })
          });
          if (res.ok) {
            setRole(savedRole);
            setTeamId(parseInt(savedTeamId!, 10));
            setTeamName(savedName || '');
            setSessionToken(savedToken);
          } else {
            localStorage.removeItem('role');
            localStorage.removeItem('team_id');
            localStorage.removeItem('session_token');
            localStorage.removeItem('team_name');
          }
        } catch (e) {
          console.error('Session verify error:', e);
        }
      }
    };
    verifySession();
  }, []);

  useEffect(() => { 
    fetchData();
    fetchScores();

    const cleanupSlide = on('slide_changed', (index: number) => {
      setCurrentIndex(index);
    });
    const cleanupLeaderboard = on('leaderboard_toggled', (visible: boolean) => {
      if (visible) fetchScores();
      setShowLeaderboard(visible);
    });
    const cleanupAnswers = on('answers_updated', () => {
      fetchScores();
    });

    // Speed timer socket listeners
    const cleanupTimerStart = on('speed_timer_started', ({ questionId, duration, startTime }) => {
      console.log('Speed timer started:', duration, startTime);
      setSpeedTimer({ active: true, duration, timeLeft: duration - (Date.now() - startTime), startTime });
    });
    const cleanupTimerEnd = on('speed_timer_ended', () => {
      console.log('Speed timer ended');
      setSpeedTimer(null);
    });

    return () => {
      cleanupSlide();
      cleanupLeaderboard();
      cleanupAnswers();
      cleanupTimerStart();
      cleanupTimerEnd();
    };
  }, [fetchData, fetchScores, on]);

  // Join role room when role is established
  useEffect(() => {
    if (role && eventId) {
      emit('join_role', { eventId, role });
    }
  }, [role, eventId, emit]);

  // Speed round countdown interval
  useEffect(() => {
    if (!speedTimer || !speedTimer.active) return;
    const interval = setInterval(() => {
      const elapsed = Date.now() - speedTimer.startTime;
      const remaining = Math.max(0, speedTimer.duration - elapsed);
      setSpeedTimer(prev => prev ? { ...prev, timeLeft: remaining } : null);
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [speedTimer]);

  const handleClaimTeam = async (chosenRole: 'captain' | 'speed_player') => {
    if (!inputTeamName.trim()) return;
    const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
    try {
      const res = await fetch('/api/teams/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: eventId,
          name: inputTeamName.trim(),
          session_token: token
        })
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('role', chosenRole);
        localStorage.setItem('team_id', String(data.team_id));
        localStorage.setItem('team_name', data.name);
        localStorage.setItem('session_token', token);
        
        setRole(chosenRole);
        setTeamId(data.team_id);
        setTeamName(data.name);
        setSessionToken(token);
        setJoinError('');
      } else {
        const err = await res.json();
        setJoinError(err.error || 'Failed to join game.');
      }
    } catch (e) {
      setJoinError('Connection error.');
    }
  };

  const handleJoinSpectator = () => {
    localStorage.setItem('role', 'spectator');
    setRole('spectator');
  };

  const handleInteractiveSubmit = async (answersList: Array<{ index: number; value: string }>) => {
    if (!teamId) return;
    const currentSlide = slides[currentIndex];
    if (!currentSlide || currentSlide.type !== 'question') return;

    const qId = currentSlide.data.id;

    if (event?.game_mode === 'speed') {
      answersList.forEach(ans => {
        emit('submit_speed_answer', {
          eventId,
          teamId,
          questionId: qId,
          answerIndex: ans.index,
          submittedValue: ans.value
        });
      });
      setLocallySubmittedQIds(prev => {
        const next = new Set(prev);
        next.add(qId);
        return next;
      });
    } else {
      try {
        const res = await fetch('/api/answers/submit-digital', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            team_id: teamId,
            session_token: sessionToken,
            question_id: qId,
            answers: answersList
          })
        });
        if (res.ok) {
          setLocallySubmittedQIds(prev => {
            const next = new Set(prev);
            next.add(qId);
            return next;
          });
        } else {
          alert('Submission failed.');
        }
      } catch (err) {
        alert('Connection error.');
      }
    }
  };

  if (loading) return (
    <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#000' }}>
      <CircularProgress />
    </Box>
  );

  // Standings score calculator with float scores
  const calculateLeaderboard = () => {
    return teams.map(team => {
      let total = 0;
      const roundScores: Record<number, number> = {};
      Object.entries(scores).forEach(([key, val]) => {
        if (!key.startsWith(`${team.id}-`) || !val) return;
        const [_, qId] = key.split('-').map(Number);
        const roundId = questionRoundMap[qId];
        if (roundId) {
          roundScores[roundId] = (roundScores[roundId] || 0) + val;
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

  // Join Game / Create Team Selector
  const isDigitalMode = event?.game_mode === 'digital' || (event?.game_mode === 'pub' && !!event.digital_input);
  if (!role) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#000', color: '#fff', p: 3 }}>
        <Container maxWidth="xs">
          <Paper sx={{ p: 4, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 4, border: '1px solid #222', textAlign: 'center' }}>
            <Typography variant="h3" color="primary" sx={{ fontWeight: 800, mb: 2 }}>
              TriviaNight
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 4 }}>
              {event?.title}
            </Typography>
            
            {isDigitalMode && !roleSelection && (
              <Stack spacing={2}>
                <Button variant="contained" size="large" fullWidth onClick={() => setRoleSelection('captain')} sx={{ py: 2, fontWeight: 'bold' }}>
                  Team Captain
                </Button>
                <Button variant="outlined" size="large" fullWidth color="inherit" onClick={handleJoinSpectator} sx={{ py: 2 }}>
                  Spectator (Read-Only)
                </Button>
                <Button 
                  variant="text" 
                  color="inherit" 
                  onClick={() => {
                    localStorage.removeItem('activeEventId');
                    window.location.href = '/';
                  }}
                  sx={{ mt: 1, opacity: 0.5 }}
                >
                  Exit to Welcome Screen
                </Button>
              </Stack>
            )}

            {isDigitalMode && roleSelection === 'captain' && (
              <Stack spacing={3}>
                <Typography variant="h6">Enter Team Name</Typography>
                <TextField
                  fullWidth
                  label="Team Name"
                  variant="outlined"
                  value={inputTeamName}
                  onChange={(e) => setInputTeamName(e.target.value)}
                  placeholder="e.g. Brainiacs"
                />
                {joinError && <Typography color="error" variant="caption">{joinError}</Typography>}
                <Stack direction="row" spacing={2}>
                  <Button variant="outlined" fullWidth onClick={() => setRoleSelection(null)}>
                    Back
                  </Button>
                  <Button variant="contained" fullWidth onClick={() => handleClaimTeam('captain')} disabled={!inputTeamName.trim()}>
                    Register
                  </Button>
                </Stack>
              </Stack>
            )}

            {event?.game_mode === 'speed' && (
              <Stack spacing={3}>
                <Typography variant="h6">Register Speed Player</Typography>
                <TextField
                  fullWidth
                  label="Player Name"
                  variant="outlined"
                  value={inputTeamName}
                  onChange={(e) => setInputTeamName(e.target.value)}
                  placeholder="e.g. SpeedDemon"
                />
                {joinError && <Typography color="error" variant="caption">{joinError}</Typography>}
                <Button variant="contained" color="warning" size="large" fullWidth onClick={() => handleClaimTeam('speed_player')} disabled={!inputTeamName.trim()} sx={{ py: 2, fontWeight: 'bold' }}>
                  Join Speed Game
                </Button>
                <Button 
                  variant="text" 
                  color="inherit" 
                  onClick={() => {
                    localStorage.removeItem('activeEventId');
                    window.location.href = '/';
                  }}
                  sx={{ mt: 1, opacity: 0.5 }}
                >
                  Exit to Welcome Screen
                </Button>
              </Stack>
            )}
          </Paper>
        </Container>
      </Box>
    );
  }

  // Active Screens
  const isInteractivePlayer = role === 'captain' || role === 'speed_player';
  const isQuestionSubmitted = currentSlide && currentSlide.type === 'question' && (
    locallySubmittedQIds.has(currentSlide.data.id) ||
    rawAnswers.some(a => a.team_id === teamId && a.question_id === currentSlide.data.id)
  );

  return (
    <Box sx={{ height: '100vh', bgcolor: '#000', color: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Box sx={{ 
        flexGrow: 1, 
        overflowY: 'auto', 
        p: isLargeScreen ? 4 : 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Fade key={currentIndex} in timeout={500}>
          <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            {currentSlide.type === 'event_title' && (
              <Box sx={{ textAlign: 'center', p: 4 }}>
                <Typography variant={isLargeScreen ? "h1" : "h3"} color="primary" sx={{ fontWeight: 'bold' }}>{currentSlide.title}</Typography>
                <Typography variant={isLargeScreen ? "h4" : "h6"} sx={{ mt: 4, opacity: 0.7 }}>Welcome to the Game!</Typography>
                {isInteractivePlayer && (
                  <Paper sx={{ mt: 4, p: 2, bgcolor: 'rgba(144, 202, 249, 0.05)', border: '1px dashed #90caf9' }}>
                    <Typography color="primary" variant="h6">Registered: {teamName}</Typography>
                    <Typography variant="caption" color="text.secondary">Waiting for host to start the first round...</Typography>
                  </Paper>
                )}
              </Box>
            )}
            {currentSlide.type === 'set_title' && (
              <Box sx={{ textAlign: 'center', p: 4 }}>
                <Typography variant={isLargeScreen ? "h2" : "h4"} color="secondary" sx={{ fontWeight: 'bold' }}>{currentSlide.title}</Typography>
                <Typography variant={isLargeScreen ? "h4" : "h6"} sx={{ mt: 4, opacity: 0.7 }}>Get Ready!</Typography>
              </Box>
            )}
            {currentSlide.type === 'intermission' && (
              <Box sx={{ textAlign: 'center', p: 4 }}>
                <Typography variant={isLargeScreen ? "h2" : "h4"} sx={{ fontWeight: 'bold' }}>Intermission</Typography>
                <Typography variant={isLargeScreen ? "h4" : "h6"} sx={{ mt: 4, opacity: 0.7 }}>Tallying scores...</Typography>
              </Box>
            )}
            {currentSlide.type === 'event_end' && (
              <Box sx={{ textAlign: 'center', p: 4 }}>
                <Typography variant={isLargeScreen ? "h2" : "h4"} color="primary" sx={{ fontWeight: 'bold' }}>Thanks for Playing!</Typography>
              </Box>
            )}
            {currentSlide.type === 'question' && (
              isInteractivePlayer ? (
                <InteractiveQuestionDisplay 
                  question={currentSlide.data} 
                  onSubmit={handleInteractiveSubmit} 
                  submitted={isQuestionSubmitted}
                  speedTimer={speedTimer}
                  draft={drafts[currentSlide.data.id]}
                  setDraft={(val: any) => setDrafts(prev => ({ ...prev, [currentSlide.data.id]: val }))}
                  gameMode={event?.game_mode}
                />
              ) : (
                <ParticipantQuestionDisplay question={currentSlide.data} />
              )
            )}
            {currentSlide.type === 'question_results' && (
              <QuestionResultsDisplay question={currentSlide.data} eventId={eventId} />
            )}
          </Box>
        </Fade>
      </Box>
      
      {/* Footer Info */}
      <Box sx={{ p: isLargeScreen ? 2 : 1.5, textAlign: 'center', borderTop: '1px solid #222', bgcolor: '#050505', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
        <Typography variant={isLargeScreen ? "h6" : "caption"} sx={{ opacity: 0.5 }}>
          {event?.title} • {isInteractivePlayer ? `Captain: ${teamName}` : 'Spectator'} • Slide {currentIndex + 1} of {slides.length}
        </Typography>
        <Button 
            size={isLargeScreen ? "medium" : "small"}
            color="inherit" 
            variant="outlined" 
            sx={{ fontSize: isLargeScreen ? '0.8rem' : '0.6rem', py: 0, opacity: 0.5 }}
            onClick={() => {
                localStorage.removeItem('role');
                localStorage.removeItem('team_id');
                localStorage.removeItem('team_name');
                localStorage.removeItem('session_token');
                localStorage.removeItem('activeEventId');
                window.location.href = '/';
            }}
        >
            Leave
        </Button>
      </Box>
    </Box>
  );
}

// Interactive Input Form for Captains/Speed Players
function InteractiveQuestionDisplay({ 
  question, 
  onSubmit, 
  submitted, 
  speedTimer,
  draft,
  setDraft,
  gameMode
}: { 
  question: any; 
  onSubmit: (answers: Array<{ index: number; value: string }>) => void; 
  submitted: boolean;
  speedTimer: any;
  draft: any;
  setDraft: (val: any) => void;
  gameMode: string | undefined;
}) {
  const theme = useTheme();
  const isLargeScreen = useMediaQuery(theme.breakpoints.up('md'));

  // Shuffles & local states cached in drafts/memos
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

  const shuffledSequence = useMemo(() => {
    if (question.type !== 'sequencing') return [];
    return shuffle(question.content.items || []);
  }, [question]);

  const parts = useMemo(() => {
    return question.content?.parts || (question.content?.answers || []).map((a: string) => ({ text: a }));
  }, [question]);

  const matches = draft?.matches || {};
  const sequenceList = draft?.sequenceList || shuffledSequence;
  const partAnswers = draft?.partAnswers || {};

  const setMatches = (newMatches: any) => {
    setDraft({ ...draft, matches: newMatches, sequenceList, partAnswers });
  };

  const setSequenceList = (newList: any) => {
    setDraft({ ...draft, matches, sequenceList: newList, partAnswers });
  };

  const setPartAnswers = (newPartAnswers: any) => {
    setDraft({ ...draft, matches, sequenceList, partAnswers: newPartAnswers });
  };

  const handleSequenceMove = (index: number, direction: 'up' | 'down') => {
    const newList = [...sequenceList];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newList.length) return;
    const temp = newList[index];
    newList[index] = newList[targetIndex];
    newList[targetIndex] = temp;
    setSequenceList(newList);
  };

  const isTimerExpired = speedTimer && speedTimer.active && speedTimer.timeLeft <= 0;
  const showTimer = speedTimer && speedTimer.active;

  const handleMultiPartSubmit = () => {
    const answers = parts.map((_: any, idx: number) => ({ index: idx, value: partAnswers[idx] || '' }));
    onSubmit(answers);
  };

  const handleKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextInput = document.getElementById(`part-input-${idx + 1}`);
      if (nextInput) {
        nextInput.focus();
      } else {
        handleMultiPartSubmit();
      }
    }
  };

  if (submitted) {
    return (
      <Paper sx={{ p: 4, width: '100%', maxWidth: 500, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid #333', textAlign: 'center', borderRadius: 4 }}>
        <CheckCircle2 size={64} color="gold" style={{ margin: '0 auto 16px auto' }} />
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>Answer Submitted!</Typography>
        <Typography variant="body2" color="text.secondary">
          Waiting for the host to display correct answers or advance the slide.
        </Typography>
      </Paper>
    );
  }

  if (gameMode === 'speed' && !showTimer) {
    return (
      <Box sx={{ mt: 4, textAlign: 'center', py: 4, width: '100%', maxWidth: 500 }}>
        <Typography variant="h5" sx={{ color: '#90caf9', fontWeight: 'bold', mb: 2, textAlign: 'center', textTransform: 'uppercase' }}>
          {question.title || 'Question'}
        </Typography>
        {question.media_url && (
          <Box sx={{ width: '100%', mb: 2, display: 'flex', justifyContent: 'center' }}>
            <img src={question.media_url} alt="media" style={{ maxWidth: '100%', maxHeight: '25vh', borderRadius: 8 }} />
          </Box>
        )}
        <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 4, textAlign: 'center', lineHeight: 1.3 }}>
          {question.prompt}
        </Typography>
        <Paper sx={{ p: 4, bgcolor: 'rgba(255,255,255,0.03)', border: '1px dashed #ff9800', textAlign: 'center', borderRadius: 4 }}>
          <Clock size={48} color="#ff9800" style={{ margin: '0 auto 16px auto' }} />
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', color: '#ff9800' }}>
            Waiting for host to start the round...
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Get ready! Once the timer starts, you will see the answer choices and point values will begin to decay.
          </Typography>
        </Paper>
      </Box>
    );
  }

  if (isTimerExpired) {
    return (
      <Paper sx={{ p: 4, width: '100%', maxWidth: 500, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid #cc3333', textAlign: 'center', borderRadius: 4 }}>
        <AlertCircle size={64} color="red" style={{ margin: '0 auto 16px auto' }} />
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', color: '#ff4444' }}>Time is Up!</Typography>
        <Typography variant="body2" color="text.secondary">
          Your response window has closed. Answers are now locked.
        </Typography>
      </Paper>
    );
  }

  const progressValue = showTimer ? (speedTimer.timeLeft / speedTimer.duration) * 100 : 100;

  return (
    <Container maxWidth="sm" sx={{ py: 2 }}>
      {showTimer && (
        <Box sx={{ width: '100%', mb: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="body2" color="warning.main" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 'bold' }}>
              <Clock size={16} /> SPEED ROUND TIMER
            </Typography>
            <Typography variant="body2" color="warning.main" sx={{ fontWeight: 'bold' }}>
              {(speedTimer.timeLeft / 1000).toFixed(1)}s
            </Typography>
          </Stack>
          <LinearProgress 
            variant="determinate" 
            value={progressValue} 
            color={progressValue < 30 ? 'error' : progressValue < 60 ? 'warning' : 'success'} 
            sx={{ height: 10, borderRadius: 5, bgcolor: 'rgba(255,255,255,0.05)' }}
          />
        </Box>
      )}

      <Typography variant="h5" sx={{ color: '#90caf9', fontWeight: 'bold', mb: 2, textAlign: 'center', textTransform: 'uppercase' }}>
        {question.title || 'Question'}
      </Typography>
      
      {question.media_url && (
        <Box sx={{ width: '100%', mb: 2, display: 'flex', justifyContent: 'center' }}>
          <img src={question.media_url} alt="media" style={{ maxWidth: '100%', maxHeight: '25vh', borderRadius: 8 }} />
        </Box>
      )}

      <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 4, textAlign: 'center', lineHeight: 1.3 }}>
        {question.prompt}
      </Typography>

      {/* MULTIPLE CHOICE */}
      {question.type === 'multiple_choice' && (
        <Stack spacing={2}>
          {mcOptions.map((opt: string, i: number) => (
            <Button
              key={i}
              variant="outlined"
              size="large"
              sx={{
                py: 2,
                fontSize: '1.1rem',
                textTransform: 'none',
                borderColor: '#333',
                color: '#fff',
                bgcolor: 'rgba(255,255,255,0.02)',
                '&:hover': { borderColor: '#90caf9', bgcolor: 'rgba(144,202,249,0.08)' }
              }}
              onClick={() => onSubmit([{ index: 0, value: opt }])}
            >
              {opt}
            </Button>
          ))}
        </Stack>
      )}

      {/* MATCHING */}
      {question.type === 'matching' && matchingData && (
        <Stack spacing={3}>
          {matchingData.left.map((left: string, idx: number) => (
            <Stack key={idx} direction="row" spacing={2} alignItems="center" justifyContent="space-between">
              <Typography variant="body1" sx={{ fontWeight: 'bold', color: '#90caf9' }}>{left}</Typography>
              <FormControl sx={{ minWidth: 150 }} size="small">
                <InputLabel>Match</InputLabel>
                <Select
                  label="Match"
                  value={matches[idx] || ''}
                  onChange={(e) => setMatches({ ...matches, [idx]: e.target.value })}
                >
                  {matchingData.right.map((r: string, rIdx: number) => (
                    <MenuItem key={rIdx} value={r}>{r}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          ))}
          <Button
            variant="contained"
            color="primary"
            size="large"
            fullWidth
            disabled={Object.keys(matches).length < matchingData.left.length}
            onClick={() => {
              const answers = matchingData.left.map((left, idx) => {
                const correctPairIndex = question.content.pairs.findIndex((p: any) => p.left === left);
                return { index: correctPairIndex, value: matches[idx] };
              });
              onSubmit(answers);
            }}
            sx={{ mt: 2, py: 1.5, fontWeight: 'bold' }}
          >
            Submit Matches
          </Button>
        </Stack>
      )}

      {/* SEQUENCING */}
      {question.type === 'sequencing' && (
        <Stack spacing={2}>
          <Typography variant="caption" sx={{ display: 'block', mb: 1, textAlign: 'center', opacity: 0.6 }}>
            Use arrows to arrange in correct chronological/logical order:
          </Typography>
          {sequenceList.map((item: string, idx: number) => (
            <Paper key={idx} sx={{ p: 1.5, bgcolor: '#111', border: '1px solid #333', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="body1">{item}</Typography>
              <Stack direction="row" spacing={0.5}>
                <IconButton size="small" onClick={() => handleSequenceMove(idx, 'up')} disabled={idx === 0} sx={{ color: '#90caf9' }}>
                  <ChevronUp size={18} />
                </IconButton>
                <IconButton size="small" onClick={() => handleSequenceMove(idx, 'down')} disabled={idx === sequenceList.length - 1} sx={{ color: '#90caf9' }}>
                  <ChevronDown size={18} />
                </IconButton>
              </Stack>
            </Paper>
          ))}
          <Button
            variant="contained"
            color="primary"
            size="large"
            fullWidth
            onClick={() => {
              const answers = sequenceList.map((item, idx) => ({ index: idx, value: item }));
              onSubmit(answers);
            }}
            sx={{ mt: 2, py: 1.5, fontWeight: 'bold' }}
          >
            Submit Order
          </Button>
        </Stack>
      )}

      {/* MULTI PART */}
      {question.type === 'multi_part' && (
        <Stack spacing={3}>
          {parts.map((part: any, idx: number) => (
            <Box key={idx} sx={{ p: 2, border: '1px solid #222', borderRadius: 2, bgcolor: 'rgba(255,255,255,0.01)' }}>
              <Typography variant="body2" gutterBottom sx={{ color: '#90caf9', fontWeight: 'bold' }}>
                Part {idx + 1}: {part.subPrompt || `Sub-Question ${idx + 1}`}
              </Typography>
              <TextField
                id={`part-input-${idx}`}
                fullWidth
                size="small"
                type={part.type === 'number' ? 'number' : 'text'}
                placeholder="Enter answer"
                value={partAnswers[idx] || ''}
                onChange={(e) => setPartAnswers({ ...partAnswers, [idx]: e.target.value })}
                onKeyDown={(e) => handleKeyDown(e, idx)}
              />
            </Box>
          ))}
          <Button
            variant="contained"
            color="primary"
            size="large"
            fullWidth
            onClick={handleMultiPartSubmit}
            sx={{ mt: 2, py: 1.5, fontWeight: 'bold' }}
          >
            Submit Answers
          </Button>
        </Stack>
      )}
    </Container>
  );
}

// Static Read-only mirroring for Spectators
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

      <Typography variant={isLargeScreen ? "h3" : "h5"} sx={{ fontWeight: 'bold', mb: isLargeScreen ? 6 : 2, textAlign: 'center', lineHeight: 1.2 }}>
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
        <Stack spacing={2} sx={{ width: '100%', maxWidth: '800px', margin: '0 auto', textAlign: 'left' }}>
          {(question.content?.parts || (question.content?.answers || []).map((a: string) => ({ text: a }))).map((part: any, i: number) => {
            const blanksCount = part.hintBlanks ? parseInt(part.hintBlanks, 10) : 15;
            const underscores = '_'.repeat(blanksCount);
            return (
              <Paper key={i} sx={{ p: isLargeScreen ? 3 : 1.5, bgcolor: '#111', border: '1px solid #333' }}>
                <Typography variant={isLargeScreen ? "h4" : "body1"}>
                  <span style={{ color: '#90caf9', fontWeight: 'bold' }}>{i + 1}. </span>
                  {part.subPrompt ? `${part.subPrompt} ` : ''}
                  <span style={{ fontFamily: 'monospace', letterSpacing: 2, color: 'rgba(255,255,255,0.5)' }}>{underscores}</span>
                </Typography>
              </Paper>
            );
          })}
        </Stack>
      )}
    </Container>
  );
}
