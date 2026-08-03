import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import TabBar from './TabBar';
import { ROUTES } from './routes';
import HomeScreen from '@/screens/home/HomeScreen';
import ExploreScreen from '@/screens/explore/ExploreScreen';
import ProjectsScreen from '@/screens/projects/ProjectsScreen';
import SettingsScreen from '@/screens/settings/SettingsScreen';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <TabBar {...props} />}
    >
      <Tab.Screen name={ROUTES.home} component={HomeScreen} />
      <Tab.Screen name={ROUTES.explore} component={ExploreScreen} />
      <Tab.Screen name={ROUTES.projects} component={ProjectsScreen} />
      <Tab.Screen name={ROUTES.settingsTab} component={SettingsScreen} />
    </Tab.Navigator>
  );
}
