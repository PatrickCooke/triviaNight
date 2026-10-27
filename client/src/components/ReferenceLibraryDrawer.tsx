import React, { useState, useCallback, useRef } from 'react';
import {
  Drawer, Box, Typography, TextField, IconButton, CircularProgress,
  Chip, Divider, Button, Tooltip, InputAdornment, Alert
} from '@mui/material';
import { X, Search, BookOpen, ArrowRight } from 'lucide-react';

export interface ReferenceResult {
  id: number;
  category: string;
  answer: string;
  question: string;
  clue_value: number;
  air_date: string;
  round: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** Called when user clicks "Use This" on a result */
  onImport: (item: ReferenceResult) => void;
}

const PAGE_SIZE = 50;

export default function ReferenceLibraryDrawer({ open, onClose, onImport }: Props) {
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState<ReferenceResult[]>([]);
  const [total, setTotal]       = useState(0);
  const [offset, setOffset]     = useState(0);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const doSearch = useCallback(async (q: string, off = 0) => {
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/reference/search?q=${encodeURIComponent(q)}&limit=${PAGE_SIZE}&offset=${off}`
      );
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      setResults(data.results);
      setTotal(data.total);
      setOffset(off);
      setSearched(true);
    } catch (e: any) {
      setError(e.message ?? 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') doSearch(query, 0);
  };

  const handleClose = () => {
    setQuery('');
    setResults([]);
    setTotal(0);
    setOffset(0);
    setSearched(false);
    setError(null);
    onClose();
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={handleClose}
      PaperProps={{ sx: { width: { xs: '100vw', sm: 560 }, display: 'flex', flexDirection: 'column' } }}
    >
      {/* Header */}
      <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 1, borderBottom: 1, borderColor: 'divider' }}>
        <BookOpen size={18} />
        <Typography variant="h6" sx={{ flex: 1, fontWeight: 600 }}>
          Jeopardy Reference Library
        </Typography>
        <IconButton onClick={handleClose} size="small">
          <X size={18} />
        </IconButton>
      </Box>

      {/* Search bar */}
      <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
        <TextField
          inputRef={inputRef}
          fullWidth
          size="small"
          placeholder='Try "space", "presidents", "Shakespeare"…'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => doSearch(query, 0)} disabled={loading} size="small">
                  {loading ? <CircularProgress size={16} /> : <Search size={16} />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        {searched && !loading && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            {total.toLocaleString()} result{total !== 1 ? 's' : ''} (semantic search active)
          </Typography>
        )}
      </Box>

      {/* Results */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: 2, py: 1 }}>
        {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}

        {!searched && !loading && (
          <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
            <BookOpen size={40} style={{ opacity: 0.3 }} />
            <Typography variant="body2" sx={{ mt: 1 }}>
              Search ~544k Jeopardy clues. Semantic expansion included — searching "space" also matches NASA, planets, astronauts, etc.
            </Typography>
          </Box>
        )}

        {results.map((r) => (
          <ResultCard key={r.id} result={r} onImport={onImport} />
        ))}

        {searched && results.length === 0 && !loading && (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            No results found.
          </Typography>
        )}
      </Box>

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ px: 2, py: 1, borderTop: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Button size="small" disabled={currentPage === 1} onClick={() => doSearch(query, offset - PAGE_SIZE)}>
            Previous
          </Button>
          <Typography variant="caption" color="text.secondary">
            Page {currentPage} of {totalPages.toLocaleString()}
          </Typography>
          <Button size="small" disabled={currentPage === totalPages} onClick={() => doSearch(query, offset + PAGE_SIZE)}>
            Next
          </Button>
        </Box>
      )}
    </Drawer>
  );
}

// ---------------------------------------------------------------------------

function ResultCard({ result, onImport }: { result: ReferenceResult; onImport: (r: ReferenceResult) => void }) {
  return (
    <Box
      sx={{
        py: 1.25, borderBottom: 1, borderColor: 'divider',
        '&:last-child': { borderBottom: 0 },
        display: 'flex', flexDirection: 'column', gap: 0.5,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Chip label={result.category} size="small" variant="outlined" sx={{ fontSize: '0.7rem', height: 20 }} />
        {result.clue_value > 0 && (
          <Chip label={`$${result.clue_value}`} size="small" color="success" sx={{ fontSize: '0.7rem', height: 20 }} />
        )}
        <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
          {result.air_date}
        </Typography>
      </Box>

      {/* Jeopardy format: answer is the clue, question is the response */}
      <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
        {result.answer}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        {result.question}
      </Typography>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.25 }}>
        <Tooltip title="Use as a basis for a new question">
          <Button
            size="small"
            variant="text"
            endIcon={<ArrowRight size={14} />}
            onClick={() => onImport(result)}
            sx={{ fontSize: '0.75rem' }}
          >
            Use This
          </Button>
        </Tooltip>
      </Box>
    </Box>
  );
}
