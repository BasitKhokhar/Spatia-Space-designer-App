import { View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';

import Screen from '@/components/ui/Screen';
import Text from '@/components/ui/Text';
import Button from '@/components/ui/Button';
import HeaderBar from '@/components/ui/HeaderBar';
import { useTheme } from '@/theme/useTheme';

// Every wizard step wears the same frame: a thin progress bar under the header,
// a title/subtitle, a scrolling body, and one pinned action. Keeping the chrome
// identical is what makes a nine-step form feel like one flow instead of nine
// screens.
export default function WizardShell({
  title,
  subtitle,
  step,
  total,
  onBack,
  onNext,
  nextTitle = 'Continue',
  nextDisabled = false,
  nextLoading = false,
  footer,
  children,
}) {
  const { colors } = useTheme();
  const pct = total > 0 ? Math.min(1, (step + 1) / total) : 0;

  return (
    <Screen>
      <HeaderBar title={`Step ${step + 1} of ${total}`} onBack={onBack} />

      <View style={{ height: 4, backgroundColor: colors.lineSoft, marginHorizontal: 24, borderRadius: 2 }}>
        <View
          style={{
            width: `${pct * 100}%`,
            height: 4,
            backgroundColor: colors.accent,
            borderRadius: 2,
          }}
        />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={12}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 18, paddingBottom: 24 }}
        >
          <Text variant="h2">{title}</Text>
          {subtitle ? (
            <Text variant="body" color="ink2" style={{ marginTop: 8 }}>
              {subtitle}
            </Text>
          ) : null}

          <View style={{ marginTop: 22 }}>{children}</View>
        </ScrollView>

        <View
          style={{
            paddingHorizontal: 24,
            paddingTop: 12,
            paddingBottom: 28,
            borderTopWidth: 1,
            borderTopColor: colors.lineSoft,
            backgroundColor: colors.bg,
          }}
        >
          {footer}
          <Button
            title={nextTitle}
            onPress={onNext}
            disabled={nextDisabled}
            loading={nextLoading}
            icon="arrow-right"
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
