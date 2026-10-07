// Contacts / Caregivers feature — barrel export
// Consumers: import { useCaregivers, useSaveCaregiver } from '@/features/contacts'

export { saveCaregiver, getCaregivers } from './caregivers.service';
export type { SaveCaregiverInput } from './caregivers.service';

export {
  useCaregivers,
  useSaveCaregiver,
  caregiverKeys,
} from './caregivers.hooks';
