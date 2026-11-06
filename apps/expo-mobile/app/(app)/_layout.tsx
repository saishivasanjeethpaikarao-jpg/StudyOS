import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';

/**
 * Tab icon component with clear Unicode visual glyphs and focused highlights
 */
function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    index: '📅',
    plan: '📋',
    assignments: '🎓',
    focus: '🎯',
    settings: '⚙️',
  };
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View
      style={[
        styles.iconContainer,
        focused && (isDark ? styles.iconFocusedContainerDark : styles.iconFocusedContainer),
      ]}
    >
      <Text style={styles.icon}>{icons[name] || '•'}</Text>
    </View>
  );
}

/**
 * App layout - tab navigator for main screens
 */
export default function AppLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: isDark ? '#a78bfa' : '#6d28d9',
        tabBarInactiveTintColor: isDark ? '#94a3b8' : '#64748b',
        tabBarStyle: isDark ? styles.tabBarDark : styles.tabBar,
        tabBarLabelStyle: isDark ? styles.tabBarLabelDark : styles.tabBarLabel,
        headerStyle: isDark ? styles.headerDark : styles.header,
        headerTitleStyle: isDark ? styles.headerTitleDark : styles.headerTitle,
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ focused }) => <TabIcon name="index" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          title: 'Plan',
          tabBarIcon: ({ focused }) => <TabIcon name="plan" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="assignments"
        options={{
          title: 'Learn',
          tabBarIcon: ({ focused }) => <TabIcon name="assignments" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="focus"
        options={{
          title: 'Focus',
          tabBarIcon: ({ focused }) => <TabIcon name="focus" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'More',
          tabBarIcon: ({ focused }) => <TabIcon name="settings" focused={focused} />,
        }}
      />
      <Tabs.Screen name="calendar" options={{ href: null, title: 'Calendar' }} />
      <Tabs.Screen name="focustube" options={{ href: null, title: 'FocusTube' }} />
      <Tabs.Screen name="assignment/[id]" options={{ href: null, title: 'Assignment' }} />
      <Tabs.Screen name="resources" options={{ href: null, title: 'Resources' }} />
      <Tabs.Screen name="notes" options={{ href: null, title: 'Notes' }} />
      <Tabs.Screen name="quizzes" options={{ href: null, title: 'Knowledge checks' }} />
      <Tabs.Screen name="quiz/[id]" options={{ href: null, title: 'Quiz' }} />
      <Tabs.Screen name="reminders" options={{ href: null, title: 'Reminders' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#ffffff',
    borderTopColor: '#e2e8f0',
    borderTopWidth: 1,
    height: 64,
    paddingTop: 6,
    paddingBottom: 8,
  },
  tabBarDark: {
    backgroundColor: '#0f172a',
    borderTopColor: '#1e293b',
    borderTopWidth: 1,
    height: 64,
    paddingTop: 6,
    paddingBottom: 8,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 0,
  },
  tabBarLabelDark: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 0,
    color: '#94a3b8',
  },
  header: {
    backgroundColor: '#ffffff',
  },
  headerDark: {
    backgroundColor: '#0f172a',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  headerTitleDark: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    borderRadius: 16,
    marginBottom: 2,
  },
  iconFocusedContainer: {
    backgroundColor: '#ede9fe',
  },
  iconFocusedContainerDark: {
    backgroundColor: '#312e81',
  },
  icon: {
    fontSize: 17,
    textAlign: 'center',
  },
});
