// Notifications feature — barrel export
// Consumers: import { useRegisterPushToken } from '@/features/notifications'

export { useRegisterPushToken } from './notifications.hooks';
export {
  registerPushToken,
  unregisterPushToken,
  setupAndroidNotificationChannel,
} from './notifications.service';
