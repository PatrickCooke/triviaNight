import React, { useState, useEffect } from 'react';
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
  Avatar,
  Divider
} from '@mui/material';
import { X, ChevronLeft, ChevronRight, Trophy, CheckSquare } from 'lucide-react';

interface Props {
  event: any;
  teams: any[];
  sets: any[];
  onExit: () => void;
}

export default function LiveScorer({ event, teams, sets, onExit }: Props) {
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scores, setScores] = useState<Record<string, boolean>>({}); // Key: "teamId-questionId-ansIdx"
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  useEffect(() => {
    const init = async () => {
      let allQ: any[] = [];
      for (const set of sets) {
        const res = await fetch(`/api/sets/${set.id}/questions`);
        const data = await res.json();
        allQ = [...allQ, ...data.map((q: any) => ({ ...q, setName: set.name }))];
      }
      setQuestions(allQ);
    };
    init();
  }, [sets]);

  const handleToggle = async (teamId: number, questionId: number, ansIdx: number, current: boolean) => {
    const next = !current;
    const key = `${teamId}-${questionId}-${ansIdx}`;
    setScores(prev => ({ ...prev, [key]: next }));

    await fetch('/api/answers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ team_id: teamId, question_id: questionId, answer_index: ansIdx, is_correct: next })
    });
  };

  const calculateLeaderboard = () => {
    return teams.map(team => {
      const total = Object.keys(scores).filter(k => k.startsWith(`${team.id}-`) && scores[k]).length;
      return { ...team, score: total };
    }).sort((a, b) => b.score - a.score);
  };

  if (questions.length === 0) return <Box sx={{ p: 4 }}>Loading...</Box>;

  if (showLeaderboard) {
    const ranked = calculateLeaderboard();
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
        <Typography variant="h3" gutterBottom><Trophy size={40} color="#fbc02d" /> Final Results</Typography>
        <Paper sx={{ width: '100%', maxWidth: 600, mt: 4 }}>
          {ranked.map((t, i) => (
            <Box key={t.id} sx={{ p: 3, display: 'flex', alignItems: 'center', borderBottom: '1px solid #333' }}>
              <Avatar sx={{ mr: 2, bgcolor: i === 0 ? 'gold' : 'grey' }}>{i + 1}</Avatar>
              <Typography variant="h5" sx={{ flexGrow: 1 }}>{t.name}</Typography>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>{t.score} pts</Typography>
            </Box>
          ))}
        </Paper>
        <Button variant="contained" sx={{ mt: 4 }} onClick={onExit}>Exit</Button>
      </Box>
    );
  }

  const currentQ = questions[currentIndex];
  
  const answerRows: string[] = [];
  if (currentQ.type === 'multiple_choice') {
    answerRows.push(currentQ.content.correct);
  } else if (currentQ.type === 'multi_part') {
    currentQ.content.parts.forEach((p: any) => {
      if (p.type === 'number' && p.range) {
        const val = parseFloat(p.text);
        const r = parseFloat(p.range);
        if (!isNaN(val) && !isNaN(r)) {
          answerRows.push(`${p.text} ± ${p.range} [${val - r} to ${val + r}]`);
        } else {
          answerRows.push(p.text);
        }
      } else {
        answerRows.push(p.text);
      }
    });
  } else if (currentQ.type === 'matching') {
    currentQ.content.pairs.forEach((p: any) => answerRows.push(`${p.left}: ${p.right}`));
  } else if (currentQ.type === 'sequencing') {
    currentQ.content.items.forEach((item: string, i: number) => answerRows.push(`${i + 1}. ${item}`));
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h6" color="primary">{currentQ.setName}</Typography>
          <Typography variant="h4">{currentQ.title || 'Question'}</Typography>
        </Box>
        <IconButton onClick={onExit}><X /></IconButton>
      </Stack>

      <Paper sx={{ p: 2, mb: 3, bgcolor: 'rgba(255,255,255,0.02)' }}>
        <Typography variant="h6" color="text.secondary">Prompt:</Typography>
        <Typography variant="h5" sx={{ mb: 1 }}>{currentQ.prompt}</Typography>
      </Paper>

      <TableContainer component={Paper} sx={{ flexGrow: 1, maxHeight: '60vh' }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ bgcolor: '#1a1a1a', fontWeight: 'bold', width: '30%' }}>Answer Part</TableCell>
              {teams.map(team => (
                <TableCell key={team.id} align="center" sx={{ bgcolor: '#1a1a1a', fontWeight: 'bold' }}>
                  {team.name}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {answerRows.map((ans, ansIdx) => (
              <TableRow key={ansIdx} hover>
                <TableCell sx={{ borderRight: '1px solid #333' }}>
                  <Typography variant="body1">{ans}</Typography>
                </TableCell>
                {teams.map(team => {
                  const isCorrect = !!scores[`${team.id}-${currentQ.id}-${ansIdx}`];
                  return (
                    <TableCell key={team.id} align="center">
                      <Checkbox 
                        checked={isCorrect}
                        onChange={() => handleToggle(team.id, currentQ.id, ansIdx, isCorrect)}
                        icon={<CheckSquare color="#555" />}
                        checkedIcon={<CheckSquare color="#4caf50" />}
                        sx={{ '& .MuiSvgIcon-root': { fontSize: 32 } }}
                      />
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ position: 'fixed', bottom: 20, right: 20, display: 'flex', gap: 2, bgcolor: 'background.paper', p: 1, borderRadius: 2, boxShadow: 6 }}>
        <Button variant="outlined" startIcon={<ChevronLeft />} disabled={currentIndex === 0} onClick={() => setCurrentIndex(prev => prev - 1)}>Prev</Button>
        <Typography variant="h6" sx={{ alignSelf: 'center', px: 2 }}>{currentIndex + 1} / {questions.length}</Typography>
        {currentIndex < questions.length - 1 ? (
          <Button variant="contained" endIcon={<ChevronRight />} onClick={() => setCurrentIndex(prev => prev + 1)}>Next</Button>
        ) : (
          <Button variant="contained" color="secondary" endIcon={<Trophy />} onClick={() => setShowLeaderboard(true)}>Leaderboard</Button>
        )}
      </Box>
    </Box>
  );
}
