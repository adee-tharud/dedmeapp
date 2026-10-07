/**
 * Settings hooks — React Query wrappers over settings.service.ts.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateSettings } from './settings.service';
import type { UpdateSettingsInput } from './settings.service';
import { profileKeys } from '@/features/auth/auth.hooks';

export function useUpdateSettings(userId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateSettingsInput) => updateSettings(userId, input),
    onSuccess: () => {
      // Invalidate profile cache so the dashboard and settings screen both refresh
      qc.invalidateQueries({ queryKey: profileKeys.byUser(userId) });
    },
  });
}
