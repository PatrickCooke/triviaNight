import React, { useEffect, useState, useMemo } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Stack, 
  Chip, 
  CircularProgress, 
  Tabs, 
  Tab, 
  useTheme, 
  useMediaQuery 
} from '@mui/material';
import { BarChart3, Cloud, Users } from 'lucide-react';
import WordCloud from 'wordcloud';
import { useSocket } from '../../hooks/useSocket';

interface QuestionResultsDisplayProps {
  question: any;
  eventId: number;
  isPresentation?: boolean;
}

interface SummaryData {
  questionId: number;
  type: string;
  prompt: string;
  bins?: Array<{
    label: string;
    clue?: string;
    count: number;
    percentage: number;
    correctPosition?: number;
  }>;
  parts?: Array<{
    partIndex: number;
    prompt: string;
    words: Array<{ text: string; count: number }>;
    totalResponses: number;
  }>;
  totalResponses?: number;
  totalTeams?: number;
}

const CLOUD_COLORS = [
  '#90caf9', '#f48fb1', '#80cbc4', '#ffb74d', 
  '#ce93d8', '#aed581', '#ffab91', '#81d4fa',
  '#ffd54f', '#4dd0e1', '#b39ddb', '#e57373'
];

export default function QuestionResultsDisplay({ question, eventId, isPresentation = false }: QuestionResultsDisplayProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePartIndex, setActivePartIndex] = useState(0);

  const { on } = useSocket(eventId);

  const fetchSummary = async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/questions/${question.id}/results-summary`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error('Failed to fetch results summary:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchSummary();

    const cleanup = on('answers_updated', () => {
      fetchSummary();
    });

    return () => {
      cleanup();
    };
  }, [question.id, eventId]);

  if (loading && !data) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 6 }}>
        <CircularProgress size={48} sx={{ color: '#90caf9', mb: 2 }} />
        <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.7)' }}>
          Loading crowd results...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      width: '100%', 
      maxWidth: isPresentation ? 1300 : 900, 
      mx: 'auto', 
      px: { xs: 2, sm: 3 },
      py: { xs: 2, sm: 4 },
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: isPresentation ? '75vh' : 'auto'
    }}>
      {/* Title & Prompt */}
      <Box sx={{ textAlign: 'center', mb: { xs: 3, sm: 4 }, width: '100%' }}>
        <Typography 
          variant={isPresentation ? "h5" : "overline"} 
          sx={{ 
            color: '#90caf9', 
            fontWeight: 800, 
            letterSpacing: 3, 
            textTransform: 'uppercase', 
            display: 'block',
            mb: 1 
          }}
        >
          {question.title ? `${question.title} • Crowd Results` : 'Crowd Results'}
        </Typography>
        <Typography 
          variant={isPresentation ? "h3" : "h5"} 
          sx={{ 
            fontWeight: 700, 
            lineHeight: 1.25, 
            color: '#fff',
            maxWidth: 1000,
            mx: 'auto'
          }}
        >
          {question.prompt}
        </Typography>
      </Box>

      {/* Summary Content based on type */}
      {data?.type === 'multi_part' ? (
        <WordCloudSection 
          parts={data.parts || []} 
          activePartIndex={activePartIndex} 
          onPartChange={setActivePartIndex} 
          isPresentation={isPresentation}
          isMobile={isMobile}
        />
      ) : (
        <HistogramSection 
          type={data?.type || question.type} 
          bins={data?.bins || []} 
          totalResponses={data?.totalResponses || 0}
          isPresentation={isPresentation}
          isMobile={isMobile}
        />
      )}

      {/* Summary Footer Meta */}
      <Box sx={{ mt: { xs: 3, sm: 4 }, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Chip 
          icon={<Users size={16} />} 
          label={`${data?.totalResponses || 0} ${data?.totalResponses === 1 ? 'Response' : 'Responses'} Received`} 
          variant="outlined" 
          sx={{ 
            borderColor: 'rgba(255,255,255,0.2)', 
            color: 'rgba(255,255,255,0.7)',
            fontSize: isPresentation ? '1.1rem' : '0.85rem',
            py: isPresentation ? 2 : 1
          }} 
        />
      </Box>
    </Box>
  );
}

// ----------------------------------------------------
// HISTOGRAM VIEW (Multiple Choice, Sequencing, Matching)
// ----------------------------------------------------
function HistogramSection({ 
  type, 
  bins, 
  totalResponses, 
  isPresentation, 
  isMobile 
}: { 
  type: string; 
  bins: Array<{ label: string; clue?: string; count: number; percentage: number; correctPosition?: number }>; 
  totalResponses: number; 
  isPresentation: boolean; 
  isMobile: boolean; 
}) {
  const maxCount = useMemo(() => {
    return Math.max(1, ...bins.map(b => b.count));
  }, [bins]);

  const subtitle = useMemo(() => {
    if (type === 'multiple_choice') return 'Number of respondents per answer choice';
    if (type === 'sequencing') return 'Correct placements by option';
    if (type === 'matching') return 'Correct matches by answer option';
    return 'Summary of crowd answers';
  }, [type]);

  const chartHeight = isPresentation ? 320 : isMobile ? 180 : 240;

  return (
    <Paper sx={{ 
      width: '100%', 
      p: { xs: 2, sm: 4 }, 
      bgcolor: 'rgba(255, 255, 255, 0.03)', 
      border: '1px solid rgba(255, 255, 255, 0.1)', 
      borderRadius: 3 
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant={isPresentation ? "h5" : "subtitle1"} sx={{ color: 'rgba(255,255,255,0.8)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
          <BarChart3 size={isPresentation ? 24 : 18} color="#90caf9" /> {subtitle}
        </Typography>
      </Box>

      {/* Histogram Chart Canvas */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'flex-end', 
        justifyContent: 'space-around', 
        height: chartHeight, 
        pt: 4, 
        pb: 1, 
        borderBottom: '2px solid rgba(255,255,255,0.2)',
        gap: { xs: 1, sm: 2 }
      }}>
        {bins.map((bin, idx) => {
          const heightPercent = maxCount > 0 ? (bin.count / maxCount) * 100 : 0;
          return (
            <Box 
              key={idx} 
              sx={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                height: '100%', 
                justifyContent: 'flex-end',
                maxWidth: isPresentation ? 180 : 120
              }}
            >
              {/* Count on top of bar */}
              <Typography 
                variant={isPresentation ? "h4" : isMobile ? "caption" : "body1"} 
                sx={{ 
                  fontWeight: 800, 
                  color: bin.count > 0 ? '#90caf9' : 'rgba(255,255,255,0.3)', 
                  mb: 0.5,
                  transition: 'all 0.3s ease'
                }}
              >
                {bin.count}
              </Typography>

              {/* Bar */}
              <Box 
                sx={{ 
                  width: '100%', 
                  height: `${Math.max(6, heightPercent)}%`, 
                  background: bin.count > 0 
                    ? 'linear-gradient(180deg, #90caf9 0%, #1e88e5 100%)' 
                    : 'rgba(255, 255, 255, 0.05)', 
                  borderTopLeftRadius: 6, 
                  borderTopRightRadius: 6,
                  border: '1px solid rgba(144, 202, 249, 0.3)',
                  borderBottom: 'none',
                  boxShadow: bin.count > 0 ? '0 0 15px rgba(144, 202, 249, 0.2)' : 'none',
                  transition: 'height 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                }} 
              />
            </Box>
          );
        })}
      </Box>

      {/* Bin Labels below the baseline */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-around', 
        mt: 2, 
        gap: { xs: 1, sm: 2 }
      }}>
        {bins.map((bin, idx) => (
          <Box 
            key={idx} 
            sx={{ 
              flex: 1, 
              textAlign: 'center', 
              maxWidth: isPresentation ? 180 : 120,
              overflow: 'hidden'
            }}
          >
            {bin.clue && (
              <Typography 
                variant="caption" 
                sx={{ 
                  display: 'block', 
                  color: 'rgba(255,255,255,0.5)', 
                  fontSize: isPresentation ? '0.9rem' : '0.65rem',
                  lineHeight: 1.1,
                  mb: 0.2
                }}
              >
                {bin.clue}
              </Typography>
            )}
            <Typography 
              variant={isPresentation ? "h6" : "body2"} 
              sx={{ 
                fontWeight: 700, 
                color: '#fff', 
                wordBreak: 'break-word',
                lineHeight: 1.2
              }}
            >
              {bin.label}
            </Typography>
          </Box>
        ))}
      </Box>
    </Paper>
  );
}

// ----------------------------------------------------
// WORD CLOUD VIEW (Multi-Part using wordcloud2.js)
// ----------------------------------------------------
function WordCloudSection({ 
  parts, 
  activePartIndex, 
  onPartChange, 
  isPresentation, 
  isMobile 
}: { 
  parts: Array<{ partIndex: number; prompt: string; words: Array<{ text: string; count: number }>; totalResponses: number }>; 
  activePartIndex: number; 
  onPartChange: (idx: number) => void; 
  isPresentation: boolean; 
  isMobile: boolean; 
}) {
  const currentPart = parts[activePartIndex] || parts[0];
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  const { minCount, maxCount } = useMemo(() => {
    if (!currentPart || !currentPart.words || currentPart.words.length === 0) {
      return { minCount: 1, maxCount: 1 };
    }
    const counts = currentPart.words.map(w => w.count);
    return {
      minCount: Math.min(...counts),
      maxCount: Math.max(...counts)
    };
  }, [currentPart]);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current || !currentPart?.words?.length) return;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const width = container.clientWidth || (isPresentation ? 1000 : 600);
    const height = isPresentation ? 420 : isMobile ? 240 : 320;

    canvas.width = width;
    canvas.height = height;

    const list: [string, number][] = currentPart.words.map(w => [w.text, w.count]);

    try {
      WordCloud(canvas, {
        list,
        gridSize: Math.max(4, Math.round(8 * width / 1024)),
        weightFactor: (weight: number) => {
          const minFont = isPresentation ? 28 : isMobile ? 16 : 20;
          const maxFont = isPresentation ? 80 : isMobile ? 38 : 52;
          const spread = maxCount - minCount || 1;
          return minFont + ((weight - minCount) / spread) * (maxFont - minFont);
        },
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontWeight: 'bold',
        color: () => CLOUD_COLORS[Math.floor(Math.random() * CLOUD_COLORS.length)],
        rotateRatio: 0.25,
        rotationSteps: 2,
        backgroundColor: 'transparent',
        shrinkToFit: true,
        drawOutOfBound: false,
      });
    } catch (err) {
      console.error('WordCloud error:', err);
    }

    return () => {
      try {
        if (typeof WordCloud.stop === 'function') {
          WordCloud.stop();
        }
      } catch (e) {
        // ignore
      }
    };
  }, [currentPart, isPresentation, isMobile, minCount, maxCount]);

  return (
    <Paper sx={{ 
      width: '100%', 
      p: { xs: 2, sm: 4 }, 
      bgcolor: 'rgba(255, 255, 255, 0.03)', 
      border: '1px solid rgba(255, 255, 255, 0.1)', 
      borderRadius: 3 
    }}>
      {/* Tabs for Multiple Parts */}
      {parts.length > 1 && (
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs 
            value={activePartIndex} 
            onChange={(_, val) => onPartChange(val)} 
            textColor="secondary" 
            indicatorColor="secondary"
            variant="scrollable"
            scrollButtons="auto"
          >
            {parts.map((p, idx) => (
              <Tab 
                key={idx} 
                label={`Part ${idx + 1}: ${p.prompt}`} 
                sx={{ 
                  color: 'rgba(255,255,255,0.7)', 
                  fontWeight: 600,
                  fontSize: isPresentation ? '1.1rem' : '0.85rem' 
                }} 
              />
            ))}
          </Tabs>
        </Box>
      )}

      {/* Part Subtitle */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Cloud size={isPresentation ? 24 : 18} color="#ce93d8" />
        <Typography variant={isPresentation ? "h5" : "subtitle1"} sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>
          {currentPart?.prompt || `Part ${activePartIndex + 1}`} Word Cloud
        </Typography>
      </Box>

      {/* Word Cloud Canvas Container */}
      <Box 
        ref={containerRef}
        sx={{ 
          width: '100%',
          minHeight: isPresentation ? 420 : isMobile ? 240 : 320, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          bgcolor: 'rgba(0,0,0,0.25)',
          borderRadius: 2,
          border: '1px dashed rgba(255,255,255,0.1)',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        {(!currentPart || !currentPart.words || currentPart.words.length === 0) ? (
          <Typography variant={isPresentation ? "h5" : "body1"} sx={{ color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', p: 4, textAlign: 'center' }}>
            No crowd responses recorded for this part yet.
          </Typography>
        ) : (
          <canvas 
            ref={canvasRef} 
            style={{ 
              display: 'block', 
              maxWidth: '100%'
            }} 
          />
        )}
      </Box>

      {/* Response Frequency Summary Chips */}
      {currentPart?.words && currentPart.words.length > 0 && (
        <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block', mb: 1 }}>
            Top Submitted Responses ({currentPart.words.length} distinct answers):
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {currentPart.words.slice(0, 15).map((w, idx) => (
              <Chip 
                key={idx}
                label={`${w.text} (${w.count})`}
                size="small"
                variant="outlined"
                sx={{ 
                  color: CLOUD_COLORS[idx % CLOUD_COLORS.length],
                  borderColor: `${CLOUD_COLORS[idx % CLOUD_COLORS.length]}50`,
                  bgcolor: `${CLOUD_COLORS[idx % CLOUD_COLORS.length]}10`,
                  fontWeight: 600,
                  fontSize: isPresentation ? '0.9rem' : '0.75rem'
                }}
              />
            ))}
          </Box>
        </Box>
      )}
    </Paper>
  );
}
