import React, { useEffect, useState, useMemo } from 'react';
import { Chip, Typography } from '@mui/material';
import { Event, Set } from '../../types';
import { ItemSelectionDialog, ColumnDef } from '../ItemSelectionDialog';

interface ManageSetsDialogProps {
  open: boolean;
  onClose: () => void;
  event: Event | null;
  allSets: Set[];
}

export const ManageSetsDialog: React.FC<ManageSetsDialogProps> = ({ 
  open, 
  onClose, 
  event, 
  allSets 
}) => {
  const [eventSets, setEventSets] = useState<Set[]>([]);

  const fetchEventSets = async () => {
    if (!event) return;
    const res = await fetch(`/api/events/${event.id}/sets`);
    setEventSets(await res.json());
  };

  useEffect(() => {
    if (open && event) {
      fetchEventSets();
    }
  }, [open, event]);

  const handleToggle = async (set: Set, isChecked: boolean) => {
    if (!event) return;
    if (isChecked) {
      await fetch(`/api/events/${event.id}/sets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ set_id: set.id }),
      });
    } else {
      await fetch(`/api/events/${event.id}/sets/${set.id}`, {
        method: 'DELETE',
      });
    }
    fetchEventSets();
  };

  const columns: ColumnDef<Set>[] = useMemo(() => [
    {
      id: 'name',
      header: 'Set Name',
      render: (s) => (
        <Typography variant="body2" fontWeight={600}>
          {s.name}
        </Typography>
      ),
    },
    {
      id: 'category',
      header: 'Category',
      width: 160,
      render: (s) => s.category ? (
        <Chip label={s.category} size="small" variant="outlined" />
      ) : (
        <Typography variant="body2" color="text.secondary">-</Typography>
      ),
    },
    {
      id: 'description',
      header: 'Description',
      render: (s) => (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            maxWidth: 300,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {s.description || '-'}
        </Typography>
      ),
    },
  ], []);

  const selectedIds = useMemo(() => eventSets.map((s) => s.id), [eventSets]);

  return (
    <ItemSelectionDialog<Set>
      open={open}
      onClose={onClose}
      title={`Manage Sets for: ${event?.title || ''}`}
      items={allSets}
      selectedIds={selectedIds}
      getItemId={(s) => s.id}
      columns={columns}
      onToggle={handleToggle}
      filterPlaceholder="Filter sets by name, category, or description..."
      filterPredicate={(s, search) => {
        const query = search.toLowerCase();
        return (
          (s.name && s.name.toLowerCase().includes(query)) ||
          (s.category && s.category.toLowerCase().includes(query)) ||
          (s.description && s.description.toLowerCase().includes(query)) ||
          false
        );
      }}
      emptyText="No sets found."
      maxWidth="md"
    />
  );
};
