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
  Switch,
  FormControlLabel,
  Dialog,
  DialogContent,
  DialogTitle,
  useMediaQuery,
  useTheme,
  TextField,
  Badge,
  LinearProgress,
  Tooltip,
  Chip
} from '@mui/material';
import { X, ChevronLeft, ChevronRight, Trophy, QrCode, ClipboardList, Clock, CheckCircle2, Play, CheckCheck } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import TeamScorer from './TeamScorer';
import { useSocket } from '../hooks/useSocket';
import { Slide } from '../types';
import { ScoringCheckbox } from '../components/scoring/ScoringCheckbox';
import QuestionResultsDisplay from '../components/presentation/QuestionResultsDisplay';

interface Props {
  event: any;
  teams: any[];
  sets: any[];
  onExit: () => void;
}

export default function LiveScorer({ event, teams: initialTeams, sets, onExit }: Props) {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentIndex, setCurrentIndex] = useState(event.current_slide_index || 0);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [audienceLeaderboard, setAudienceLeaderboard] = useState(false);
  const [massScoringOpen, setMassScoringOpen] = useState(false);
  // Live team list (updates via socket)
  const [teams, setTeams] = useState<any[]>(initialTeams);
  const { emit, on } = useSocket(event.id);

  // Digital mode review queue state
  const [reviewQueueOpen, setReviewQueueOpen] = useState(false);
  const [reviewQueue, setReviewQueue] = useState<any[]>([]);

  // Submission status: which teams have submitted for the current question
  const [submissionStatus, setSubmissionStatus] = useState<Array<{ team_id: number; team_name: string; submitted: boolean }>>([]);

  // Speed round control states
  const [speedDuration, setSpeedDuration] = useState<number>(10);
  const [speedUseMultiplier, setSpeedUseMultiplier] = useState<boolean>(true);
  const [speedTimerActive, setSpeedTimerActive] = useState<boolean>(false);
  const [speedTimerStartTime, setSpeedTimerStartTime] = useState<number>(0);
  const [speedTimerDuration, setSpeedTimerDuration] = useState<number>(10000);
  const [speedTimerTimeLeft, setSpeedTimerTimeLeft] = useState<number>(0);

  const isDigital = !!(event.digital_input || event.game_mode === 'digital');

  // Fetch Review Queue
  const fetchReviewQueue = useCallback(async () => {
    if (!isDigital) return;
    try {
      const res = await fetch(`/api/events/${event.id}/review-queue`);
      if (res.ok) {
        setReviewQueue(await res.json());
      }
    } catch (e) {
      console.error('>>> [HOST] Review Queue Fetch Error:', e);
    }
  }, [event.id, isDigital]);

  const fetchScores = useCallback(async () => {
    const aRes = await fetch(`/api/events/${event.id}/answers`);
    const answerData = await aRes.json();
    const scoresMap: Record<string, number> = {};
    answerData.forEach((a: any) => {
      scoresMap[`${a.team_id}-${a.question_id}-${a.answer_index}`] = Number(a.is_correct);
    });
    setScores(scoresMap);
  }, [event.id]);

  const fetchSubmissionStatus = useCallback(async (questionId: number) => {
    if (!isDigital || !questionId) return;
    try {
      const res = await fetch(`/api/events/${event.id}/submission-status/${questionId}`);
      if (res.ok) setSubmissionStatus(await res.json());
    } catch (e) { /* silent */ }
  }, [event.id, isDigital]);

  // 1. Build Shared Slide List
  useEffect(() => {
    const init = async () => {
      const slideList: Slide[] = [];
      slideList.push({ type: 'event_title', title: event.title, roundNumber: 0, questionNumber: 0 });

      const isDigitalOrSpeed = event.game_mode === 'speed' || event.game_mode === 'digital' || (event.game_mode === 'pub' && !!event.digital_input);

      let currentRound = 0;
      for (const set of sets) {
        currentRound++;
        slideList.push({ type: 'set_title', title: set.name, roundNumber: currentRound, questionNumber: 0 });
        const res = await fetch(`/api/sets/${set.id}/questions`);
        const questions = await res.json();
        let currentQuestion = 0;
        for (const q of questions) {
          currentQuestion++;
          slideList.push({ 
            type: 'question', 
            data: { ...q, setName: set.name },
            roundNumber: currentRound,
            questionNumber: currentQuestion
          });
          if (isDigitalOrSpeed) {
            slideList.push({ 
              type: 'question_results', 
              data: { ...q, setName: set.name },
              roundNumber: currentRound,
              questionNumber: currentQuestion
            });
          }
        }
        slideList.push({ type: 'intermission', title: `${set.name} Complete`, roundNumber: currentRound, questionNumber: 0 });
      }

      slideList.push({ type: 'event_end', title: 'Trivia Night Complete', roundNumber: 0, questionNumber: 0 });
      setSlides(slideList);

      fetchScores();
      fetchReviewQueue();
    };
    init();
  }, [event, sets, fetchScores, fetchReviewQueue]);

  // When slide changes, fetch submission status for new question
  useEffect(() => {
    if (slides.length === 0) return;
    const slide = slides[currentIndex];
    if (slide?.type === 'question') {
      fetchSubmissionStatus(slide.data.id);
    } else {
      setSubmissionStatus([]);
    }
    if (slide?.type === 'question_results') {
      fetchScores();
    }
  }, [currentIndex, slides, fetchSubmissionStatus, fetchScores]);

  // 2. Sync with Audience
  const syncSlide = useCallback((index: number) => {
    setCurrentIndex(index);
    emit('set_slide', { eventId: event.id, index });
  }, [event.id, emit]);

  const toggleAudienceLeaderboard = (visible: boolean) => {
    setAudienceLeaderboard(visible);
    emit('toggle_leaderboard', { eventId: event.id, visible });
  };

  const handleToggleScore = async (teamId: number, qId: number, ansIdx: number, currentPoints: number) => {
    const nextPoints = currentPoints > 0 ? 0.0 : 1.0;
    const key = `${teamId}-${qId}-${ansIdx}`;
    setScores(prev => ({ ...prev, [key]: nextPoints }));

    await fetch('/api/answers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ team_id: teamId, question_id: qId, answer_index: ansIdx, is_correct: nextPoints > 0 })
    });
  };

  const handleGradeQueueItem = async (answerId: number, isCorrect: boolean) => {
    try {
      const res = await fetch(`/api/answers/${answerId}/grade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_correct: isCorrect })
      });
      if (res.ok) {
        setReviewQueue(prev => prev.filter(item => item.answer_id !== answerId));
        fetchScores();
        // Refresh submission status
        const slide = slides[currentIndex];
        if (slide?.type === 'question') fetchSubmissionStatus(slide.data.id);
      }
    } catch (e) {
      console.error('Grade queue error:', e);
    }
  };

  // Speed Round Timer Control
  const startSpeedTimer = () => {
    const currentSlide = slides[currentIndex];
    if (!currentSlide || currentSlide.type !== 'question') return;
    emit('start_speed_timer', {
      eventId: event.id,
      questionId: currentSlide.data.id,
      duration: speedDuration * 1000,
      useMultiplier: speedUseMultiplier
    });
  };

  const stopSpeedTimer = () => {
    emit('stop_speed_timer', { eventId: event.id });
  };

  useEffect(() => {
    const cleanupAnswers = on('answers_updated', () => {
      fetchScores();
      fetchReviewQueue();
      const slide = slides[currentIndex];
      if (slide?.type === 'question') fetchSubmissionStatus(slide.data.id);
    });
    const cleanupTeamJoined = on('team_joined', (newTeam: any) => {
      setTeams(prev => {
        if (prev.find(t => t.id === newTeam.id)) return prev;
        return [...prev, newTeam];
      });
    });
    const cleanupSpeedStart = on('speed_timer_started', ({ questionId, duration, startTime }) => {
      setSpeedTimerActive(true);
      setSpeedTimerStartTime(startTime);
      setSpeedTimerDuration(duration);
      setSpeedTimerTimeLeft(duration - (Date.now() - startTime));
    });
    const cleanupSpeedEnd = on('speed_timer_ended', () => {
      setSpeedTimerActive(false);
      fetchScores();
    });

    return () => {
      cleanupAnswers();
      cleanupTeamJoined();
      cleanupSpeedStart();
      cleanupSpeedEnd();
    };
  }, [on, fetchScores, fetchReviewQueue, slides, currentIndex, fetchSubmissionStatus]);

  // Speed round timer countdown
  useEffect(() => {
    if (!speedTimerActive) return;
    const interval = setInterval(() => {
      const elapsed = Date.now() - speedTimerStartTime;
      const remaining = Math.max(0, speedTimerDuration - elapsed);
      setSpeedTimerTimeLeft(remaining);
      if (remaining <= 0) {
        setSpeedTimerActive(false);
        clearInterval(interval);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [speedTimerActive, speedTimerStartTime, speedTimerDuration]);

  const [qrOpen, setQrOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const playUrl = `${window.location.origin}/?play=${event.id}`;

  if (slides.length === 0) return <Box sx={{ p: 4 }}>Initializing Remote Control...</Box>;

  const currentSlide = slides[currentIndex];

  // Leaderboard sorter
  const calculateLeaderboard = () => {
    return teams.map(team => {
      let total = 0;
      Object.entries(scores).forEach(([key, val]) => {
        if (key.startsWith(`${team.id}-`) && val) {
          total += Number(val);
        }
      });
      return { ...team, score: total };
    }).sort((a, b) => b.score - a.score);
  };

  // How many teams have submitted for the current question
  const submittedCount = submissionStatus.filter(s => s.submitted).length;
  const totalTeams = submissionStatus.length;

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      {/* Top Header */}
      <Paper sx={{ p: { xs: 1, sm: 2 }, mb: { xs: 1, sm: 2 }, borderRadius: 0, borderBottom: '1px solid #333' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box sx={{ maxWidth: '40%' }}>
            <Typography variant="caption" color="primary" sx={{ textTransform: 'uppercase', fontWeight: 'bold', display: { xs: 'none', sm: 'block' } }}>Remote Control</Typography>
            <Typography variant={isMobile ? "subtitle1" : "h5"} noWrap>{event.title}</Typography>
            {event.game_code && (
                <Typography variant="caption" sx={{ bgcolor: 'rgba(144, 202, 249, 0.1)', color: '#90caf9', px: 1, borderRadius: 1, fontWeight: 'bold', border: '1px solid rgba(144, 202, 249, 0.3)' }}>
                    CODE: {event.game_code}
                </Typography>
            )}
          </Box>
          <Stack direction="row" spacing={{ xs: 0, sm: 1 }} alignItems="center">
            {/* Always show mass scoring (Blue) */}
            <Tooltip title="Manual Scoring (All Teams)">
              <IconButton onClick={() => setMassScoringOpen(true)} color="primary" title="Mass Scoring">
                <ClipboardList />
              </IconButton>
            </Tooltip>

            {/* Show review queue (Red) only when digital input is on */}
            {isDigital && (
              <Tooltip title="Digital Review Queue">
                <IconButton onClick={() => setReviewQueueOpen(true)} color="error" title="Review Queue">
                  <Badge badgeContent={reviewQueue.length} color="error">
                    <CheckCheck />
                  </Badge>
                </IconButton>
              </Tooltip>
            )}

            {/* Submission status pill — digital only, on question slides */}
            {isDigital && currentSlide.type === 'question' && totalTeams > 0 && (
              <Tooltip title={submissionStatus.map(s => `${s.team_name}: ${s.submitted ? '✓' : '—'}`).join('\n')}>
                <Chip
                  label={`${submittedCount}/${totalTeams} submitted`}
                  size="small"
                  color={submittedCount === totalTeams ? 'success' : submittedCount > 0 ? 'warning' : 'default'}
                  icon={<CheckCircle2 size={14} />}
                  sx={{ cursor: 'default', fontWeight: 'bold' }}
                />
              </Tooltip>
            )}

            <IconButton onClick={() => setQrOpen(true)} color="primary">
              <QrCode />
            </IconButton>
            
            <Dialog 
                open={qrOpen} 
                onClose={() => setQrOpen(false)}
                fullScreen={isMobile}
                maxWidth="md"
            >
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    Join Trivia Night
                    <IconButton onClick={() => setQrOpen(false)}><X /></IconButton>
                </DialogTitle>
                <DialogContent sx={{ textAlign: 'center', py: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography variant="h6" gutterBottom color="text.secondary">Scan to Play</Typography>
                    <Box sx={{ p: 2, bgcolor: '#fff', borderRadius: 4, display: 'inline-block', boxShadow: 3 }}>
                        <QRCodeCanvas value={playUrl} size={isMobile ? 280 : 400} />
                    </Box>
                    <Typography variant="body2" sx={{ mt: 3, opacity: 0.7, maxWidth: 300, wordBreak: 'break-all' }}>
                        {playUrl}
                    </Typography>
                </DialogContent>
            </Dialog>

            <FormControlLabel
                control={<Switch checked={audienceLeaderboard} onChange={(e) => toggleAudienceLeaderboard(e.target.checked)} color="secondary" size={isMobile ? "small" : "medium"} />}
                label={isMobile ? "" : "Push Leaderboard"}
                sx={{ ml: { xs: 0, sm: 1 } }}
            />
            <IconButton onClick={onExit}><X /></IconButton>
          </Stack>
        </Stack>
      </Paper>

      {/* Slide Status */}
      <Box sx={{ p: 2, textAlign: 'center', bgcolor: 'rgba(255,255,255,0.02)', mb: 2 }}>
        <Typography variant="h6" color="secondary">
            {currentSlide.type === 'question' 
              ? `QUESTION: ${currentSlide.data.setName}` 
              : currentSlide.type === 'question_results' 
                ? `RESULTS: ${currentSlide.data.setName}` 
                : currentSlide.type.replace('_', ' ').toUpperCase()}
        </Typography>

        {(currentSlide.roundNumber ?? 0) > 0 && (
            <Typography variant="subtitle2" sx={{ color: '#90caf9', fontWeight: 'bold', mb: 0.5 }}>
                Round: {currentSlide.roundNumber} {currentSlide.questionNumber ? `- Question: ${currentSlide.questionNumber}` : ''}
            </Typography>
        )}

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

            {/* SPEED ROUND HOST CONTROLS */}
            {event.game_mode === 'speed' && (
              <Paper sx={{ p: 3, mb: 3, border: '1px solid #ff9800', bgcolor: 'rgba(255, 152, 0, 0.03)' }}>
                <Typography variant="h6" color="warning.main" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 'bold' }}>
                  <Clock /> Speed Round Controls
                </Typography>
                
                {!speedTimerActive ? (
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" sx={{ mt: 2 }}>
                    <TextField
                      size="small"
                      type="number"
                      label="Time Limit (seconds)"
                      value={speedDuration}
                      onChange={(e) => setSpeedDuration(Math.max(1, parseInt(e.target.value, 10) || 10))}
                      sx={{ width: 180 }}
                    />
                    <FormControlLabel
                      control={<Switch checked={speedUseMultiplier} onChange={(e) => setSpeedUseMultiplier(e.target.checked)} color="warning" />}
                      label="Time Degradation Multiplier"
                    />
                    <Button variant="contained" color="warning" startIcon={<Play />} onClick={startSpeedTimer}>
                      Start Speed Window
                    </Button>
                  </Stack>
                ) : (
                  <Stack spacing={2} sx={{ mt: 2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                        Speed submissions active! Time Left: <span style={{ color: '#ff9800' }}>{(speedTimerTimeLeft / 1000).toFixed(1)}s</span>
                      </Typography>
                      <Button variant="contained" color="error" onClick={stopSpeedTimer}>
                        Stop Timer & Lock Answers
                      </Button>
                    </Stack>
                    <LinearProgress 
                      variant="determinate" 
                      value={(speedTimerTimeLeft / speedTimerDuration) * 100} 
                      color="warning"
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Stack>
                )}
              </Paper>
            )}

            {/* SCORING VIEWS */}
            {event.game_mode === 'speed' ? (
              <Box>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 3 }}>
                  <Trophy size={20} /> Player Standings (Speed)
                </Typography>
                <Stack spacing={1} sx={{ maxHeight: '40vh', overflowY: 'auto', pr: 1 }}>
                  {calculateLeaderboard().map((t, i) => (
                    <Paper key={t.id} sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body1" sx={{ fontWeight: i === 0 ? 'bold' : 'normal' }}>
                        {i + 1}. {t.name}
                      </Typography>
                      <Typography variant="h6" sx={{ color: '#90caf9', fontWeight: 'bold' }}>
                        {t.score.toFixed(1).replace('.0', '')} pts
                      </Typography>
                    </Paper>
                  ))}
                  {teams.length === 0 && (
                    <Typography variant="body2" sx={{ fontStyle: 'italic', textAlign: 'center', py: 4 }} color="text.secondary">
                      No players registered yet.
                    </Typography>
                  )}
                </Stack>
              </Box>
            ) : (
              <TableContainer component={Paper}>
                  <Table size="small">
                      <TableHead>
                          <TableRow>
                              <TableCell sx={{ fontWeight: 'bold' }}>Answer Part</TableCell>
                              {teams.map(t => {
                                const teamStatus = submissionStatus.find(s => s.team_id === t.id);
                                return (
                                  <TableCell key={t.id} align="center" sx={{ fontWeight: 'bold' }}>
                                    {t.name}
                                    {isDigital && teamStatus && (
                                      <Box component="span" sx={{ ml: 0.5 }}>
                                        {teamStatus.submitted
                                          ? <CheckCircle2 size={12} color="#4caf50" style={{ verticalAlign: 'middle' }} />
                                          : <Box component="span" sx={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', bgcolor: '#555', verticalAlign: 'middle', ml: 0.5 }} />
                                        }
                                      </Box>
                                    )}
                                  </TableCell>
                                );
                              })}
                          </TableRow>
                      </TableHead>
                      <TableBody>
                          {getAnswerRows(currentSlide.data).map((ans, idx) => (
                              <TableRow key={idx}>
                                  <TableCell sx={{ fontSize: '0.8rem' }}>{ans}</TableCell>
                                  {teams.map(t => {
                                      const currentPoints = scores[`${t.id}-${currentSlide.data.id}-${idx}`] || 0.0;
                                      return (
                                          <TableCell key={t.id} align="center">
                                              <ScoringCheckbox 
                                                  checked={currentPoints > 0}
                                                  onChange={() => handleToggleScore(t.id, currentSlide.data.id, idx, currentPoints)}
                                              />
                                          </TableCell>
                                      );
                                  })}
                              </TableRow>
                          ))}
                      </TableBody>
                  </Table>
              </TableContainer>
            )}
          </Box>
        ) : currentSlide.type === 'question_results' ? (
          <Box sx={{ width: '100%', py: 2 }}>
            <QuestionResultsDisplay question={currentSlide.data} eventId={event.id} />
          </Box>
        ) : (
          <Box sx={{ height: '30vh', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <Box>
                <Typography variant="h4" gutterBottom>{currentSlide.title || 'Slide'}</Typography>
                {event.game_mode === 'speed' ? (
                  <Box sx={{ width: 400, mt: 3 }}>
                    <Typography variant="h6" color="text.secondary" gutterBottom>Standings Leaderboard</Typography>
                    <Stack spacing={1} sx={{ maxHeight: '25vh', overflowY: 'auto' }}>
                      {calculateLeaderboard().map((t, i) => (
                        <Box key={t.id} sx={{ display: 'flex', justifyContent: 'space-between', p: 1, borderBottom: '1px solid #222' }}>
                          <Typography>{i + 1}. {t.name}</Typography>
                          <Typography color="primary" sx={{ fontWeight: 'bold' }}>{t.score.toFixed(1).replace('.0', '')}</Typography>
                        </Box>
                      ))}
                    </Stack>
                  </Box>
                ) : (
                  <Typography color="text.secondary">This is a title slide. No scoring available.</Typography>
                )}
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
                disabled={currentIndex === slides.length - 1 || speedTimerActive}
                onClick={() => syncSlide(currentIndex + 1)}
            >
                Next
            </Button>
        </Stack>
      </Paper>

      {/* Mass Scoring Modal */}
      <Dialog 
        open={massScoringOpen} 
        onClose={() => setMassScoringOpen(false)}
        fullScreen
      >
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 2, bgcolor: 'background.paper', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">Mass Scoring - {event.title}</Typography>
                <IconButton onClick={() => setMassScoringOpen(false)}><X /></IconButton>
            </Box>
            <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
                <TeamScorer event={event} onBack={() => setMassScoringOpen(false)} />
            </Box>
        </Box>
      </Dialog>

      {/* Digital Mode Review Queue Dialog */}
      <Dialog
        open={reviewQueueOpen}
        onClose={() => setReviewQueueOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Host Review Queue
          <IconButton onClick={() => setReviewQueueOpen(false)}><X /></IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ maxHeight: '70vh' }}>
          {reviewQueue.length === 0 ? (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <CheckCircle2 size={48} color="green" style={{ margin: '0 auto 16px auto', opacity: 0.5 }} />
              <Typography color="text.secondary">Review queue is empty! No answers need grading.</Typography>
            </Box>
          ) : (
            <Stack spacing={2}>
              {reviewQueue.map((item) => (
                <Paper key={item.answer_id} sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid #333' }}>
                  <Typography variant="subtitle1" sx={{ color: '#90caf9', fontWeight: 'bold' }}>
                    Team: {item.team_name}
                  </Typography>
                  <Typography variant="body2" sx={{ fontStyle: 'italic', my: 1 }}>
                    Question: {item.question_prompt}
                  </Typography>
                  {item.question_content?.parts?.[item.answer_index]?.subPrompt && (
                    <Typography variant="caption" display="block" color="text.secondary" sx={{ mb: 1 }}>
                      Part Question: {item.question_content.parts[item.answer_index].subPrompt}
                    </Typography>
                  )}
                  <Typography variant="h6" sx={{ my: 1, fontWeight: 'bold', borderLeft: '3px solid #f48fb1', pl: 1.5 }}>
                    Submitted Answer: {item.submitted_value}
                  </Typography>
                  <Typography variant="body2" color="success.main" sx={{ mb: 2 }}>
                    Expected Answer: {item.question_content?.parts?.[item.answer_index]?.text || item.question_content?.answers?.[item.answer_index] || 'Unknown'}
                  </Typography>
                  <Stack direction="row" spacing={2}>
                    <Button variant="contained" color="success" size="small" onClick={() => handleGradeQueueItem(item.answer_id, true)}>
                      Correct
                    </Button>
                    <Button variant="contained" color="error" size="small" onClick={() => handleGradeQueueItem(item.answer_id, false)}>
                      Incorrect
                    </Button>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}
        </DialogContent>
      </Dialog>
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
        parts.forEach((p: any, i: number) => {
            const prefix = p.subPrompt ? `Part ${i+1} (${p.subPrompt}): ` : `Part ${i+1}: `;
            rows.push(`${prefix}${p.text || ''}${p.range ? ` ± ${p.range}` : ''}`);
        });
    } else if (q.type === 'matching') {
        const pairs = q.content.pairs || [];
        pairs.forEach((p: any) => rows.push(`${p.left || ''}: ${p.right || ''}`));
    } else if (q.type === 'sequencing') {
        const items = q.content.items || [];
        items.forEach((it: string, i: number) => rows.push(`${i+1}. ${it}`));
    }
    return rows;
}
