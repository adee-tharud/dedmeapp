// Contacts / Caregivers feature — barrel export
// Consumers: import { useCaregivers, useSaveCaregiver, useCaregiverWatch, useAcceptCaregiverInvite } from '@/features/contacts'

export {
  saveCaregiver,
  getCaregivers,
  acceptCaregiverInvite,
  getCaregiverWatch,
  sendCaregiverInvite,
} from './caregivers.service';

export type {
  SaveCaregiverInput,
  WatchedPersonRow,
} from './caregivers.service';

export {
  useCaregivers,
  useSaveCaregiver,
  useCaregiverWatch,
  useAcceptCaregiverInvite,
  useResendCaregiverInvite,
  caregiverKeys,
} from './caregivers.hooks';
