import { useState } from 'react';
import { View, Pressable, ScrollView } from 'react-native';

import Screen from '@/components/ui/Screen';
import Text from '@/components/ui/Text';
import Button from '@/components/ui/Button';
import HeaderBar from '@/components/ui/HeaderBar';
import Icon from '@/components/icons/Icon';
import PlanThumbnail from '@/components/graphics/PlanThumbnail';
import { useTheme } from '@/theme/useTheme';
import { TEMPLATES } from '@/data/templates';
import { useProjectsStore } from '@/store/useProjectsStore';
import { ROUTES } from '@/navigation/routes';

function ChoiceRow({ selected, icon, iconFill, title, subtitle, onPress }) {
  const { colors, radius } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        borderWidth: 1.5,
        borderColor: selected ? colors.accent : colors.line,
        backgroundColor: selected ? colors.accentTintBg : colors.surface,
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
        <Text variant="titleSm">{title}</Text>
        <Text variant="bodySm" color="ink2" style={{ marginTop: 3 }}>
          {subtitle}
        </Text>
      </View>
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          borderWidth: selected ? 0 : 1.5,
          borderColor: colors.line,
          backgroundColor: selected ? colors.accent : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {selected ? <Icon name="check" size={14} color={colors.onAccent} strokeWidth={2.6} /> : null}
      </View>
    </Pressable>
  );
}

export default function NewProjectStartScreen({ navigation }) {
  const { colors } = useTheme();
  const createProject = useProjectsStore((s) => s.createProject);
  const [mode, setMode] = useState('blank');
  const [templateId, setTemplateId] = useState(TEMPLATES[0].id);

  const onContinue = () => {
    if (mode === 'blank') {
      navigation.navigate(ROUTES.roomType);
    } else {
      const t = TEMPLATES.find((x) => x.id === templateId) || TEMPLATES[0];
      createProject({
        name: t.name,
        roomType: 'living',
        width: t.dimensions.width,
        length: t.dimensions.length,
        variant: t.variant,
      });
      navigation.navigate(ROUTES.editor);
    }
  };

  return (
    <Screen>
      <HeaderBar title="New Project" onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={{ paddingHorizontal: 24, marginTop: 20 }}>
          <Text variant="h2">How do you want{'\n'}to start?</Text>

          <View style={{ gap: 14, marginTop: 24 }}>
            <ChoiceRow
              selected={mode === 'blank'}
              onPress={() => setMode('blank')}
              iconFill={colors.accent}
              icon={<Icon name="plus" size={28} color="#fff" strokeWidth={2} />}
              title="Start Blank"
              subtitle="Draw your plan from scratch."
            />
            <ChoiceRow
              selected={mode === 'template'}
              onPress={() => setMode('template')}
              iconFill={colors.accentSoft}
              icon={<Icon name="grid" size={28} color={colors.accent} strokeWidth={2} />}
              title="Use a Template"
              subtitle="Start from a ready layout."
            />
          </View>

          <Text variant="titleSm" style={{ marginTop: 28, marginBottom: 14 }}>
            Popular templates
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24, gap: 12 }}
        >
          {TEMPLATES.map((t) => {
            const selected = mode === 'template' && templateId === t.id;
            return (
              <Pressable
                key={t.id}
                onPress={() => {
                  setMode('template');
                  setTemplateId(t.id);
                }}
                style={{ width: 130 }}
              >
                <PlanThumbnail
                  variant={t.variant}
                  height={100}
                  style={{
                    borderRadius: 16,
                    borderWidth: selected ? 2 : 0,
                    borderColor: colors.accent,
                  }}
                />
                <Text variant="label" color="ink" style={{ marginTop: 8 }}>
                  {t.name}
                </Text>
                <Text variant="bodySm" color="ink3">
                  {t.rooms} rooms
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </ScrollView>

      <View style={{ position: 'absolute', bottom: 34, left: 24, right: 24 }}>
        <Button title="Continue" icon="arrow-right" onPress={onContinue} />
      </View>
    </Screen>
  );
}
