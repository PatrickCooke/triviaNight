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
    
    // 1. Event Title Slide
    slideList.push({ type: 'event_title', title: event.title });

    // 2. Fetch Sets for this Event
    const setsRes = await fetch(`/api/events/${event.id}/sets`);
    const sets = await setsRes.json();

    for (const set of sets) {
      // 3. Set Title Slide (Round Start)
      slideList.push({ type: 'set_title', title: set.name });

      // 4. Fetch Questions for this Set
      const qRes = await fetch(`/api/sets/${set.id}/questions`);
      const questions = await qRes.json();

      for (const q of questions) {
        slideList.push({ type: 'question', data: q });
      }
    }

    // 5. End Slide
    slideList.push({ type: 'event_end', title: 'End of Round' });

    setSlides(slideList);
  }, [event]);

  useEffect(() => { buildSlides(); }, [buildSlides]);

  const handleNext = useCallback(() => {
    if (currentIndex < slides.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else if (currentIndex === slides.length - 1) {
      onExit(); // Close presentation when clicking on the final slide
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
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden', // Prevent scrollbars
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 9999
      }}
    >
      <Fade key={currentIndex} in timeout={500}>
        <Box sx={{ 
          width: '90vw', 
          height: '85vh', 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center' 
        }}>
          {currentSlide.type === 'event_title' && (
            <Stack spacing={4}>
              <Typography variant="h1" sx={{ fontWeight: 800, fontSize: '6rem', color: '#90caf9' }}>{currentSlide.title}</Typography>
              <Typography variant="h3" sx={{ opacity: 0.7 }}>Welcome to Trivia Night</Typography>
            </Stack>
          )}

          {currentSlide.type === 'set_title' && (
            <Stack spacing={4}>
              <Typography variant="h4" sx={{ textTransform: 'uppercase', letterSpacing: 8, color: '#f48fb1' }}>Next Up</Typography>
              <Typography variant="h1" sx={{ fontWeight: 800, fontSize: '5rem' }}>{currentSlide.title}</Typography>
            </Stack>
          )}

          {currentSlide.type === 'question' && (
            <QuestionDisplay question={currentSlide.data} />
          )}

          {currentSlide.type === 'event_end' && (
            <Stack spacing={4}>
              <Typography variant="h1" sx={{ fontWeight: 800, fontSize: '6rem', color: '#90caf9' }}>{currentSlide.title}</Typography>
              <Typography variant="h3" sx={{ opacity: 0.7 }}>Click to finish</Typography>
            </Stack>
          )}
        </Box>
      </Fade>

      {/* Progress Indicator */}
      <Box sx={{ position: 'absolute', bottom: 30, width: '60%', height: 6, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 3 }}>
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

  return (
    <Stack spacing={4} sx={{ width: '100%', height: '100%', justifyContent: 'center' }}>
      {question.media_url && (
        <Box sx={{ flexShrink: 1, maxHeight: '35vh', display: 'flex', justifyContent: 'center', mb: 2 }}>
          <img 
            src={question.media_url} 
            alt="media" 
            style={{ maxHeight: '100%', maxWidth: '100%', borderRadius: 16, border: '4px solid #333', objectFit: 'contain' }} 
          />
        </Box>
      )}
      
      <Typography variant="h2" sx={{ 
        fontWeight: 700, 
        fontSize: question.prompt.length > 100 ? '2.5rem' : '3.5rem',
        lineHeight: 1.2,
        maxWidth: '100%',
        wordWrap: 'break-word'
      }}>
        {question.prompt}
      </Typography>

      {question.type === 'multiple_choice' && (
        <Grid container spacing={3} sx={{ mt: 2, flexGrow: 0 }}>
          {mcOptions.map((opt, i) => (
            <Grid item xs={6} key={i}>
              <Paper 
                sx={{ 
                  p: 3, 
                  bgcolor: '#1a1a1a', 
                  color: '#fff', 
                  textAlign: 'center',
                  border: '3px solid #333',
                  height: '100%',
                  minHeight: '120px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  <span style={{ color: '#90caf9' }}>{String.fromCharCode(65 + i)}.</span> {opt}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      {question.type === 'matching' && matchingData && (
        <Grid container spacing={8} justifyContent="center" sx={{ mt: 2 }}>
          <Grid item xs={5}>
            <Stack spacing={2}>
              {matchingData.left.map((item: any, i: number) => (
                <Paper key={i} sx={{ p: 2, bgcolor: '#111', color: '#90caf9', border: '2px solid #333' }}>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>{item}</Typography>
                </Paper>
              ))}
            </Stack>
          </Grid>
          <Grid item xs={5}>
            <Stack spacing={2}>
              {matchingData.right.map((item: any, i: number) => (
                <Paper key={i} sx={{ p: 2, bgcolor: '#111', color: '#f48fb1', border: '2px solid #333' }}>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>{item}</Typography>
                </Paper>
              ))}
            </Stack>
          </Grid>
        </Grid>
      )}

      {question.type === 'multi_part' && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h4" color="rgba(255,255,255,0.4)" sx={{ fontStyle: 'italic', letterSpacing: 2 }}>
            (Ready for next question)
          </Typography>
        </Box>
      )}
    </Stack>
  );
}
