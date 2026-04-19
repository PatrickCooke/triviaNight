import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Box, Typography, Stack, Fade, Paper, Grid } from '@mui/material';

interface Slide {
  type: 'event_title' | 'set_title' | 'question' | 'event_end';
  title?: string;
  data?: any;
}

/**
 * Fisher-Yates Shuffle
 */
function shuffle<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

export default function SlideController({ event, onExit }: { event: any; onExit: () => void }) {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const buildSlides = useCallback(async () => {
    const slideList: Slide[] = [];
    slideList.push({ type: 'event_title', title: event.title });
    const setsRes = await fetch(`/api/events/${event.id}/sets`);
    const sets = await setsRes.json();
    for (const set of sets) {
      slideList.push({ type: 'set_title', title: set.name });
      const qRes = await fetch(`/api/sets/${set.id}/questions`);
      const questions = await qRes.json();
      for (const q of questions) {
        slideList.push({ type: 'question', data: q });
      }
    }
    slideList.push({ type: 'event_end', title: 'End of Round' });
    setSlides(slideList);
  }, [event]);

  useEffect(() => { buildSlides(); }, [buildSlides]);

  const handleNext = useCallback(() => {
    if (currentIndex < slides.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else if (currentIndex === slides.length - 1) {
      onExit();
    }
  }, [currentIndex, slides.length, onExit]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') handleNext();
      if (e.key === 'ArrowLeft' && currentIndex > 0) setCurrentIndex(prev => prev - 1);
      if (e.key === 'Escape') onExit();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, currentIndex, onExit]);

  if (slides.length === 0) return null;

  const currentSlide = slides[currentIndex];

  const renderCenteredSlide = (title: string, subtitle: string, color: string) => (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <Stack spacing={4} sx={{ textAlign: 'center' }}>
        <Typography variant="h1" sx={{ fontWeight: 800, fontSize: '6rem', color: color }}>{title}</Typography>
        <Typography variant="h3" sx={{ opacity: 0.7 }}>{subtitle}</Typography>
      </Stack>
    </Box>
  );

  return (
    <Box 
      onClick={handleNext}
      sx={{ 
        height: '100vh', 
        width: '100vw', 
        bgcolor: '#000', 
        color: '#fff', 
        cursor: 'pointer',
        userSelect: 'none',
        overflow: 'hidden',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 9999
      }}
    >
      <Fade key={currentIndex} in timeout={500}>
        <Box sx={{ width: '100%', height: '100%' }}>
          {currentSlide.type === 'event_title' && renderCenteredSlide(currentSlide.title || '', 'Welcome to Trivia Night', '#90caf9')}
          {currentSlide.type === 'set_title' && renderCenteredSlide(currentSlide.title || '', 'Starting Round', '#f48fb1')}
          {currentSlide.type === 'event_end' && renderCenteredSlide(currentSlide.title || '', 'Click to finish', '#90caf9')}
          {currentSlide.type === 'question' && <QuestionDisplay question={currentSlide.data} />}
        </Box>
      </Fade>
      <Box sx={{ position: 'absolute', bottom: 30, left: '20%', width: '60%', height: 6, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 3 }}>
        <Box sx={{ 
          width: `${((currentIndex + 1) / slides.length) * 100}%`, 
          height: '100%', 
          bgcolor: '#90caf9',
          borderRadius: 3,
          transition: 'width 0.3s ease'
        }} />
      </Box>
    </Box>
  );
}

function QuestionDisplay({ question }: { question: any }) {
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
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Box sx={{ height: '20vh' }} />
      <Typography variant="h4" sx={{ fontWeight: 700, color: '#90caf9', textTransform: 'uppercase', letterSpacing: 6, minHeight: '2em', textAlign: 'center' }}>
        {question.title || ' '}
      </Typography>
      <Box sx={{ flexGrow: 1, width: '90vw', display: 'flex', flexDirection: 'column', justifyContent: question.type === 'multi_part' ? 'center' : 'flex-start', alignItems: 'center', pb: 10 }}>
        {question.media_url && (
          <Box sx={{ flexShrink: 1, maxHeight: '25vh', display: 'flex', justifyContent: 'center', mb: 2 }}>
            <img src={question.media_url} alt="media" style={{ maxHeight: '100%', maxWidth: '100%', borderRadius: 12, border: '4px solid #222', objectFit: 'contain' }} />
          </Box>
        )}
        <Typography variant="h2" sx={{ fontWeight: 700, fontSize: question.prompt.length > 100 ? '2.5rem' : '3.5rem', lineHeight: 1.1, textAlign: 'center', maxWidth: '100%', mb: 4 }}>
          {question.prompt}
        </Typography>

        {question.type === 'multiple_choice' && (
          <Grid container spacing={3} sx={{ maxWidth: '1200px' }}>
            {mcOptions.map((opt, i) => (
              <Grid item xs={6} key={i}>
                <Paper sx={{ p: 2, bgcolor: '#161616', color: '#fff', textAlign: 'center', border: '3px solid #333', minHeight: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    <span style={{ color: '#90caf9' }}>{String.fromCharCode(65 + i)}.</span> {opt}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}

        {question.type === 'matching' && matchingData && (
          <Grid container spacing={6} justifyContent="center" sx={{ maxWidth: '1200px' }}>
            <Grid item xs={5}><Stack spacing={1.5}>{matchingData.left.map((item: any, i: number) => (<Paper key={i} sx={{ p: 1.5, bgcolor: '#111', color: '#90caf9', border: '2px solid #333', textAlign: 'center' }}><Typography variant="h5" sx={{ fontWeight: 700 }}>{item}</Typography></Paper>))}</Stack></Grid>
            <Grid item xs={5}><Stack spacing={1.5}>{matchingData.right.map((item: any, i: number) => (<Paper key={i} sx={{ p: 1.5, bgcolor: '#111', color: '#f48fb1', border: '2px solid #333', textAlign: 'center' }}><Typography variant="h5" sx={{ fontWeight: 700 }}>{item}</Typography></Paper>))}</Stack></Grid>
          </Grid>
        )}

        {question.type === 'sequencing' && sequenceData && (
          <Stack spacing={2} sx={{ width: '100%', maxWidth: '800px' }}>
            {sequenceData.map((item: any, i: number) => (
              <Paper key={i} sx={{ p: 2, bgcolor: '#111', color: '#fff', border: '3px solid #333', textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>{item}</Typography>
              </Paper>
            ))}
          </Stack>
        )}
      </Box>
    </Box>
  );
}
