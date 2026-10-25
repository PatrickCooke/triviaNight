import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  InputAdornment,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Paper,
  Box,
  Typography,
} from '@mui/material';
import { Search, X } from 'lucide-react';

export interface ColumnDef<T> {
  id: string;
  header: string;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  render: (item: T) => React.ReactNode;
}

export interface ItemSelectionDialogProps<T> {
  open: boolean;
  onClose: () => void;
  title: string;
  items: T[];
  selectedIds: (number | string)[];
  getItemId: (item: T) => number | string;
  columns: ColumnDef<T>[];
  onToggle: (item: T, isChecked: boolean) => Promise<void> | void;
  filterPredicate?: (item: T, filterText: string) => boolean;
  filterPlaceholder?: string;
  emptyText?: string;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  closeButtonText?: string;
}

export function ItemSelectionDialog<T>({
  open,
  onClose,
  title,
  items,
  selectedIds,
  getItemId,
  columns,
  onToggle,
  filterPredicate,
  filterPlaceholder = 'Filter items...',
  emptyText = 'No items found.',
  maxWidth = 'md',
  closeButtonText = 'Close',
}: ItemSelectionDialogProps<T>) {
  const [filterText, setFilterText] = useState('');
  const [localSelectedIds, setLocalSelectedIds] = useState<Set<number | string>>(new Set());
  const [orderedIds, setOrderedIds] = useState<(number | string)[]>([]);

  // Item map for quick lookup
  const itemsMap = useMemo(() => {
    const map = new Map<number | string, T>();
    items.forEach((item) => {
      map.set(getItemId(item), item);
    });
    return map;
  }, [items, getItemId]);

  // Synchronize local selected IDs when selectedIds prop changes
  useEffect(() => {
    setLocalSelectedIds(new Set(selectedIds));
  }, [selectedIds]);

  // When dialog opens, initialize order: checked items on top, unchecked items below
  useEffect(() => {
    if (open) {
      setFilterText('');
      const selectedSet = new Set(selectedIds);
      const checked: (number | string)[] = [];
      const unchecked: (number | string)[] = [];

      items.forEach((item) => {
        const id = getItemId(item);
        if (selectedSet.has(id)) {
          checked.push(id);
        } else {
          unchecked.push(id);
        }
      });

      setOrderedIds([...checked, ...unchecked]);
    }
  }, [open]);

  // Handle checking / unchecking
  const handleToggle = (item: T, willBeChecked: boolean) => {
    const id = getItemId(item);

    // Optimistically update selection set
    setLocalSelectedIds((prev) => {
      const next = new Set(prev);
      if (willBeChecked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });

    // Reorder: when a box is checked, row jumps to the very top (index 0)
    setOrderedIds((prev) => {
      const withoutCurrent = prev.filter((existingId) => existingId !== id);
      if (willBeChecked) {
        return [id, ...withoutCurrent];
      } else {
        // Move to the beginning of the unchecked section (right after checked items)
        const currentChecked = withoutCurrent.filter((existingId) =>
          localSelectedIds.has(existingId) && existingId !== id
        );
        const currentUnchecked = withoutCurrent.filter((existingId) =>
          !localSelectedIds.has(existingId) || existingId === id
        );
        return [...currentChecked, id, ...currentUnchecked];
      }
    });

    onToggle(item, willBeChecked);
  };

  // Reconstruct ordered items based on orderedIds, plus any new items not yet in orderedIds
  const orderedItems = useMemo(() => {
    const seen = new Set<(number | string)>();
    const list: T[] = [];

    orderedIds.forEach((id) => {
      const item = itemsMap.get(id);
      if (item) {
        list.push(item);
        seen.add(id);
      }
    });

    // In case items array contains items not yet in orderedIds
    items.forEach((item) => {
      const id = getItemId(item);
      if (!seen.has(id)) {
        list.push(item);
      }
    });

    return list;
  }, [orderedIds, itemsMap, items, getItemId]);

  // Default filter predicate checks all string fields of the item
  const defaultFilterPredicate = (item: T, search: string) => {
    const query = search.toLowerCase();
    return Object.values(item as Record<string, any>).some((val) => {
      if (typeof val === 'string') {
        return val.toLowerCase().includes(query);
      }
      if (typeof val === 'number') {
        return val.toString().includes(query);
      }
      return false;
    });
  };

  const filteredItems = useMemo(() => {
    const trimmed = filterText.trim();
    if (!trimmed) return orderedItems;

    const predicate = filterPredicate || defaultFilterPredicate;
    return orderedItems.filter((item) => predicate(item, trimmed));
  }, [orderedItems, filterText, filterPredicate]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth={maxWidth}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Box sx={{ mt: 1, mb: 2 }}>
          <TextField
            fullWidth
            size="small"
            placeholder={filterPlaceholder}
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={18} />
                </InputAdornment>
              ),
              endAdornment: filterText ? (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => setFilterText('')}
                    edge="end"
                    aria-label="clear filter"
                  >
                    <X size={16} />
                  </IconButton>
                </InputAdornment>
              ) : null,
            }}
          />
        </Box>

        <TableContainer
          component={Paper}
          variant="outlined"
          sx={{ maxHeight: 420, overflowY: 'auto' }}
        >
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" sx={{ width: 48 }} />
                {columns.map((col) => (
                  <TableCell
                    key={col.id}
                    align={col.align}
                    sx={{ width: col.width, fontWeight: 600 }}
                  >
                    {col.header}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredItems.map((item) => {
                const id = getItemId(item);
                const isChecked = localSelectedIds.has(id);

                return (
                  <TableRow
                    key={id}
                    hover
                    selected={isChecked}
                    onClick={() => handleToggle(item, !isChecked)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={isChecked}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleToggle(item, e.target.checked);
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </TableCell>
                    {columns.map((col) => (
                      <TableCell key={col.id} align={col.align}>
                        {col.render(item)}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}

              {filteredItems.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={columns.length + 1}
                    align="center"
                    sx={{ py: 4, color: 'text.secondary' }}
                  >
                    <Typography variant="body2">{emptyText}</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="contained">
          {closeButtonText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
