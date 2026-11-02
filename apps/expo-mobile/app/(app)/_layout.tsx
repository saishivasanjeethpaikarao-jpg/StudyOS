import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';

/**
 * Tab icon component
 */
function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    index: 'Today',
    plan: 'Plan',
    assignments: 'Learn',
    focus: 'Focus',
    settings: 'More',
  };
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View style={styles.iconContainer}>
      <Text style={[styles.icon, isDark && styles.iconDark, focused && (isDark ? styles.iconFocusedDark : styles.iconFocused)]}>
        {icons[name] || '•'}
      </Text>
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
        tabBarActiveTintColor: isDark ? '#818cf8' : '#6366f1',
        tabBarInactiveTintColor: isDark ? '#6b7280' : '#9ca3af',
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
    borderTopColor: '#e5e7eb',
    borderTopWidth: 1,
    height: 84,
    paddingTop: 8,
    paddingBottom: 28,
  },
  tabBarDark: {
    backgroundColor: '#111827',
    borderTopColor: '#374151',
    borderTopWidth: 1,
    height: 84,
    paddingTop: 8,
    paddingBottom: 28,
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  tabBarLabelDark: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9ca3af',
  },
  header: {
    backgroundColor: '#ffffff',
  },
  headerDark: {
    backgroundColor: '#111827',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  headerTitleDark: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f9fafb',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
  },
  icon: {
    fontSize: 20,
    color: '#9ca3af',
  },
  iconDark: {
    color: '#6b7280',
  },
  iconFocused: {
    color: '#6366f1',
  },
  iconFocusedDark: {
    color: '#818cf8',
  },
});
