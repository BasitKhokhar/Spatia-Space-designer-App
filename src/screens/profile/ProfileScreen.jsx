import { View, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import Text from '@/components/ui/Text';
import Icon from '@/components/icons/Icon';
import ListRow, { RowDivider } from '@/components/ui/ListRow';
import { useTheme } from '@/theme/useTheme';
import { useAuthStore } from '@/store/useAuthStore';
import { useCreditsStore } from '@/store/useCreditsStore';
import { useProjectsStore } from '@/store/useProjectsStore';
import { accent } from '@/theme/colors';
import { ROUTES } from '@/navigation/routes';

function Stat({ value, label }) {
  const { colors, radius } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.lineSoft,
        borderRadius: radius.lg,
        padding: 18,
        alignItems: 'center',
      }}
    >
      <Text style={{ fontFamily: 'Sora_800ExtraBold', fontSize: 26, color: colors.ink }}>{value}</Text>
      <Text variant="bodySm" color="ink3" style={{ marginTop: 4 }}>
        {label}
      </Text>
    </View>
  );
}

export default function ProfileScreen({ navigation }) {
  const { colors, radius } = useTheme();
  const user = useAuthStore((s) => s.user);
  const balance = useCreditsStore((s) => s.balance);
  const projects = useProjectsStore((s) => s.projects);
  const exportsMade = useProjectsStore((s) => s.exportsMade);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 24,
            paddingTop: 8,
          }}
        >
          <Text variant="h2">Profile</Text>
          <Pressable
            onPress={() => navigation.navigate(ROUTES.settings)}
            style={{
              width: 40,
              height: 40,
              borderRadius: radius.md,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.line,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="settings" size={18} color={colors.ink} strokeWidth={1.4} />
          </Pressable>
        </View>

        <View style={{ alignItems: 'center', marginTop: 26 }}>
          <LinearGradient
            colors={[accent.a400, accent.a700]}
            style={{ width: 92, height: 92, borderRadius: 28, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ color: '#fff', fontFamily: 'Sora_700Bold', fontSize: 34 }}>{user?.initial || 'A'}</Text>
          </LinearGradient>
          <Text variant="h2" style={{ marginTop: 16 }}>
            {user?.name || 'Designer'}
          </Text>
          <Text variant="bodySm" color="ink3" style={{ marginTop: 4 }}>
            {user?.email}
          </Text>
          <View
            style={{
              marginTop: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 7,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.line,
              borderRadius: 999,
              paddingHorizontal: 16,
              paddingVertical: 9,
            }}
          >
            <Text style={{ fontSize: 12 }}>🪙</Text>
            <Text variant="titleSm">{balance} credits</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 14, paddingHorizontal: 24, marginTop: 24 }}>
          <Stat value={projects.length} label="Projects created" />
          <Stat value={exportsMade} label="Exports made" />
        </View>

        <View
          style={{
            marginHorizontal: 24,
            marginTop: 24,
            backgroundColor: colors.surface,
            borderRadius: radius.xl,
            borderWidth: 1,
            borderColor: colors.lineSoft,
            overflow: 'hidden',
          }}
        >
          <ListRow icon="grid" label="My Projects" onPress={() => navigation.navigate(ROUTES.projects)} />
          <RowDivider />
          <ListRow icon="upload" label="Export History" onPress={() => navigation.navigate(ROUTES.export)} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
