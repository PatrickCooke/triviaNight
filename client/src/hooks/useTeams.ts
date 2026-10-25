import { useApi } from './useApi';
import { Team } from '../types';

export function useTeams(eventId: number) {
  const { data, loading, error, refetch } = useApi<Team[]>(`/api/events/${eventId}/teams`);

  const addTeam = async (name: string) => {
    const res = await fetch(`/api/events/${eventId}/teams`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      await refetch();
    }
    return res;
  };

  const deleteTeam = async (id: number) => {
    const res = await fetch(`/api/teams/${id}`, { method: 'DELETE' });
    if (res.ok) {
      await refetch();
    }
    return res;
  };

  return {
    teams: data || [],
    loading,
    error,
    addTeam,
    deleteTeam,
    refetchTeams: refetch
  };
}
