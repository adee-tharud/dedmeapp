import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontWeights, spacing } from '../../theme/tokens';

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
    backgroundColor: '#CC0000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: fontWeights.bold,
    color: '#fff',
  },
});

export default function TabsLayout() {
  // TODO phase 2: query the DB to determine which tabs to show based on role.
  // For now all tabs are visible for UI review purposes.
  // isMember = user has rows where user_id = me
  // isCaregiver = user has rows where caregiver_user_id = me

  return (
    <Tabs
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
