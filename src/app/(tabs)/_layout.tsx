import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSizes, fontWeights, spacing } from '../../theme/tokens';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({
  name,
  nameFocused,
  label,
  focused,
}: {
  name: IoniconName;
  nameFocused: IoniconName;
  label: string;
  focused: boolean;
}) {
  return (
    <View style={tabStyles.wrapper}>
      <Ionicons
        name={focused ? nameFocused : name}
        size={24}
        color={focused ? colors.brand[700] : colors.grey[400]}
      />
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
});

export default function TabsLayout() {
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
