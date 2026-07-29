import { View, Pressable, ScrollView } from 'react-native';

import Screen from '@/components/ui/Screen';
import Text from '@/components/ui/Text';
import HeaderBar from '@/components/ui/HeaderBar';
import Icon from '@/components/icons/Icon';
import { useTheme } from '@/theme/useTheme';
import { useProjectsStore } from '@/store/useProjectsStore';
import { ROUTES } from '@/navigation/routes';

// A tappable choice card. Tapping runs `onPress` directly (no separate Continue).
function ChoiceRow({ icon, iconFill, title, subtitle, onPress, badge }) {
  const { colors, radius } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        borderWidth: 1.5,
        borderColor: colors.line,
        backgroundColor: colors.surface,
        borderRadius: radius.xl,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
      }}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: radius.lg,
          backgroundColor: iconFill,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text variant="titleSm">{title}</Text>
          {badge ? (
            <View
              style={{
                paddingHorizontal: 7,
                paddingVertical: 2,
                borderRadius: 6,
                backgroundColor: colors.accent,
              }}
            >
              <Text variant="label" color="onAccent" style={{ fontSize: 10 }}>
                {badge}
              </Text>
            </View>
          ) : null}
        </View>
        <Text variant="bodySm" color="ink2" style={{ marginTop: 3 }}>
          {subtitle}
        </Text>
      </View>
      <Icon name="arrow-right" size={20} color={colors.ink3} />
    </Pressable>
  );
}

export default function NewProjectStartScreen({ navigation }) {
  const { colors } = useTheme();
  const createProject = useProjectsStore((s) => s.createProject);

  // Start With Blank → make an empty project and jump straight into the editor.
  const startBlank = () => {
    createProject({});
    navigation.navigate(ROUTES.editor);
  };

  // Try Our Creative Designs → pick a category, then a premade design.
  const browseDesigns = () => navigation.navigate(ROUTES.category);

  // Design with AI → answer a short brief, get a furnished plan built for it.
  const designWithAi = () => navigation.navigate(ROUTES.aiWizard);

  return (
    <Screen>
      <HeaderBar title="New Project" onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={{ paddingHorizontal: 24, marginTop: 20 }}>
          <Text variant="h2">How do you want{'\n'}to start?</Text>

          <View style={{ gap: 14, marginTop: 24 }}>
            {/* Listed first: it's the fastest route from nothing to a finished
                plan, and the one most people should try. */}
            <ChoiceRow
              onPress={designWithAi}
              iconFill={colors.ink}
              icon={<Icon name="star" size={26} color="#fff" strokeWidth={2} />}
              title="Design With AI"
              badge="NEW"
              subtitle="Answer a few questions — get a fully furnished plan in a minute."
            />
            <ChoiceRow
              onPress={startBlank}
              iconFill={colors.accentSoft}
              icon={<Icon name="plus" size={28} color={colors.accent} strokeWidth={2} />}
              title="Start With Blank"
              subtitle="Jump straight into an empty canvas and design from scratch."
            />
            <ChoiceRow
              onPress={browseDesigns}
              iconFill={colors.accent}
              icon={<Icon name="grid" size={28} color="#fff" strokeWidth={2} />}
              title="Try Our Creative Designs"
              subtitle="Houses, shops, offices, plazas & more — ready-made layouts."
            />
          </View>

          <View
            style={{
              marginTop: 28,
              padding: 18,
              borderRadius: 16,
              backgroundColor: colors.surface2,
              flexDirection: 'row',
              gap: 12,
              alignItems: 'flex-start',
            }}
          >
            <Icon name="wall" size={20} color={colors.accent} />
            <Text variant="bodySm" color="ink2" style={{ flex: 1 }}>
              Pick any ready-made design and <Text variant="bodySm" color="accent">edit it</Text> —
              adjust rooms, walls and furniture to match your plan.
            </Text>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
