import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Chip,
  Stack
} from '@mui/material';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Team, Question } from '../types';
import { PageHeader } from '../components/layout/PageHeader';
import { StatsCard } from '../components/analytics/StatsCard';

interface QuestionStat extends Question {
    correct_answers: number;
    total_attempts: number;
}

interface TeamStat extends Team {
    event_title: string;
}

export default function AnalyticsPage() {
  const [questionStats, setQuestionStats] = useState<QuestionStat[]>([]);
  const [teamStats, setTeamStats] = useState<TeamStat[]>([]);

  useEffect(() => {
    Promise.all([
      fetch('/api/analytics/questions').then(res => res.json()),
      fetch('/api/analytics/teams').then(res => res.json())
    ]).then(([qData, tData]) => {
      setQuestionStats(qData);
      setTeamStats(tData);
    });
  }, []);

  const getDifficultyLabel = (percent: number) => {
    if (percent >= 90) return { label: 'Too Easy', color: 'error' as const };
    if (percent <= 20) return { label: 'Too Hard', color: 'error' as const };
    if (percent >= 40 && percent <= 60) return { label: 'Balanced', color: 'success' as const };
    return { label: 'Moderate', color: 'warning' as const };
  };

  return (
    <Box>
      <PageHeader title="Analytics & Insights" />

      <Grid container spacing={4}>
        {/* Key Metrics */}
        <Grid item xs={12} md={4}>
          <StatsCard 
            title="Questions Balanced"
            value={questionStats.filter(q => {
                const p = (q.correct_answers / q.total_attempts) * 100;
                return p >= 40 && p <= 60;
            }).length}
            icon={<CheckCircle2 />}
            color="#4caf50"
            description="Score between 40% and 60%"
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <StatsCard 
            title="Needs Review"
            value={questionStats.filter(q => {
                const p = (q.correct_answers / q.total_attempts) * 100;
                return p >= 90 || p <= 20;
            }).length}
            icon={<AlertCircle />}
            color="#f44336"
            description="Score >90% or <20%"
          />
        </Grid>

        {/* Question Difficulty Table */}
        <Grid item xs={12}>
          <Typography variant="h5" gutterBottom sx={{ mt: 2 }}>Question Difficulty Report</Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Prompt</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell align="center">Correct %</TableCell>
                  <TableCell align="center">Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {questionStats.map((q) => {
                  const percent = Math.round((q.correct_answers / q.total_attempts) * 100);
                  const status = getDifficultyLabel(percent);
                  return (
                    <TableRow key={q.id}>
                      <TableCell sx={{ maxWidth: 400 }}>{q.prompt}</TableCell>
                      <TableCell><Chip label={q.category || 'General'} size="small" variant="outlined" /></TableCell>
                      <TableCell align="center">
                        <Typography sx={{ fontWeight: 'bold' }}>{percent}%</Typography>
                        <Typography variant="caption" color="text.secondary">{q.correct_answers}/{q.total_attempts} pts</Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={status.label} color={status.color} size="small" />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>

        {/* Team Leaderboard Analytics */}
        <Grid item xs={12} md={6}>
          <Typography variant="h5" gutterBottom>Team Performance (All-Time)</Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Team Name</TableCell>
                  <TableCell>Latest Event</TableCell>
                  <TableCell align="right">All-Time Score</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {teamStats.map((t, i) => (
                  <TableRow key={i}>
                    <TableCell sx={{ fontWeight: 'bold' }}>{t.name}</TableCell>
                    <TableCell>{t.event_title}</TableCell>
                    <TableCell align="right">{t.score} pts</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      </Grid>
    </Box>
  );
}
