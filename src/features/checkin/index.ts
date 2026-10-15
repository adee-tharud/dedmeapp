// Check-in feature — barrel export
// Consumers: import { useLatestCheckIn, useRecordCheckIn, isCheckedInToday } from '@/features/checkin'

export {
  fetchLatestCheckIn,
  recordCheckIn,
  checkInKeys,
  saveCachedCheckIn,
  getCachedCheckIn,
} from './checkin.service';

export {
  useLatestCheckIn,
  useRecordCheckIn,
} from './checkin.hooks';

export { isCheckedInToday, nextCheckInDue } from './checkin.utils';
