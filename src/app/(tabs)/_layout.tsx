import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontWeights, spacing } from '../../theme/tokens';
import { useAuth } from '../../features/auth/AuthContext';
import { useCaregivers, useCaregiverWatch } from '../../features/contacts';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({
  name,
  nameFocused,
  label,
  focused,
  badge,
}: {
  name: IoniconName;
  nameFocused: IoniconName;
  label: string;
  focused: boolean;
  badge?: number;
}) {
  return (
    <View style={tabStyles.wrapper}>
      <View>
        <Ionicons
          name={focused ? nameFocused : name}
          size={24}
          color={focused ? colors.brand[700] : colors.grey[400]}
        />
        {badge != null && badge > 0 && (
          <View style={tabStyles.badge}>
            <Text style={tabStyles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
          </View>
        )}
      </View>
      <Text
        style={[tabStyles.label, focused && tabStyles.labelFocused]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

const tabStyles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingTop: spacing[1],
    minWidth: 60,
  },
  label: {
    fontSize: 10,
    fontWeight: fontWeights.medium,
    color: colors.grey[400],
    textAlign: 'center',
  },
  labelFocused: {
    color: colors.brand[700],
    fontWeight: fontWeights.bold,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.surface.dangerText,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: fontWeights.bold,
    color: colors.white,
  },
});

export default function TabsLayout() {
  const { user, userRole } = useAuth();
  const userId = user?.id ?? '';

  // Derive role from DB — runs reactively after sign-in.
  // We fetch both lists; each is small and fast.
  const { data: caregivers  } = useCaregivers(userId);    // monitored-person view
  const { data: watchedList } = useCaregiverWatch(userId); // caregiver view

  // Roles are derived reactively after sign-in, with userRole providing the immediate
  // synchronous baseline from SecureStore on frame 0 so caregivers never flash the member tab.
  const hasCaregivers = (caregivers?.length ?? 0) > 0;
  const hasWatched    = (watchedList?.length ?? 0) > 0;

  const isCaregiver = userRole === 'caregiver' || hasWatched;
  const isMember    = userRole === 'user' || (hasCaregivers || (!hasWatched && userRole !== 'caregiver'));

  // Helper: hide a tab without removing its route from the stack.
  // tabBarItemStyle: { display: 'none' } is the Expo Router-safe way to do this.
  const hidden = { tabBarItemStyle: { display: 'none' as const } };

  return (
    <Tabs
      initialRouteName={userRole === 'caregiver' ? 'caregiver-home' : 'index'}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.grey[100],
          borderTopWidth: 1,
          height: 84,
          paddingBottom: spacing[5],
          paddingTop: spacing[2],
        },
        tabBarShowLabel: false,
      }}
    >
      {/* ── Home (monitored person check-in dashboard) ──────────────────── */}
      <Tabs.Screen
        name="index"
        options={{
          ...(!isMember ? hidden : {}),
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name="home-outline"
              nameFocused="home"
              label="Home"
              focused={focused}
            />
          ),
        }}
      />

      {/* ── Watching (caregiver dashboard) ─────────────────────────────── */}
      <Tabs.Screen
        name="caregiver-home"
        options={{
          ...(!isCaregiver ? hidden : {}),
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name="eye-outline"
              nameFocused="eye"
              label="Watching"
              focused={focused}
            />
          ),
        }}
      />

      {/* ── Messages ───────────────────────────────────────────────────── */}
      <Tabs.Screen
        name="messages"
        options={{
          ...(!isMember ? hidden : {}),
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name="heart-circle-outline"
              nameFocused="heart-circle"
              label="Messages"
              focused={focused}
            />
          ),
        }}
      />

      {/* ── Circle / Contacts ──────────────────────────────────────────── */}
      <Tabs.Screen
        name="contacts"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name="people-outline"
              nameFocused="people"
              label="Circle"
              focused={focused}
            />
          ),
        }}
      />

      {/* ── Settings ───────────────────────────────────────────────────── */}
      <Tabs.Screen
        name="settings"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name="settings-outline"
              nameFocused="settings"
              label="Settings"
              focused={focused}
            />
          ),
        }}
      />
    </Tabs>
  );
}
