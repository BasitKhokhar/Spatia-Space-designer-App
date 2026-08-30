import { forwardRef, useMemo, useState } from 'react';
import { View, Pressable, TextInput } from 'react-native';
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';

import Text from '@/components/ui/Text';
import Button from '@/components/ui/Button';
import Icon from '@/components/icons/Icon';
import { useTheme } from '@/theme/useTheme';
import { reportsApi, REPORT_REASONS } from '@/services/api/reportsApi';
import { isRemote } from '@/services/api/client';

// ---------------------------------------------------------------------------
// Reporting an AI-generated design.
//
// Play's AI-Generated Content policy requires this path to exist inside the app
// — a user who finds AI output offensive must be able to flag it without going
// to a website or an email client.
//
// It is deliberately three taps and forgiving: pick a reason, optionally say
// more, send. Nothing is mandatory beyond the reason, because a reporting flow
// that interrogates the reporter is one people abandon.
// ---------------------------------------------------------------------------
const MAX_DETAILS = 1000;

const ReportContentSheet = forwardRef(function ReportContentSheet({ project, onClose }, ref) {
  const { colors, radius } = useTheme();
  const snapPoints = useMemo(() => ['78%'], []);

  const [reason, setReason] = useState(null);
  const [details, setDetails] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(null); // the report id once accepted
  const [error, setError] = useState(null);

  const reset = () => {
    setReason(null);
    setDetails('');
    setSending(false);
    setSent(null);
    setError(null);
  };

  const dismiss = () => {
    ref?.current?.dismiss();
    onClose?.();
    // Cleared after dismissal so the sheet doesn't visibly reset while it is
    // still animating away.
    setTimeout(reset, 250);
  };

  const submit = async () => {
    if (!reason || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await reportsApi.submit({
        // A project created offline has no server id yet; the backend still
        // accepts the report against the generation when one is known.
        projectId: typeof project?.serverId === 'number' ? project.serverId
          : typeof project?.id === 'number' ? project.id
          : undefined,
        aiJobId: project?.aiJobId,
        reason,
        details: details.trim() || undefined,
      });
      setSent(res?.id ?? true);
    } catch (e) {
      setError(
        e?.code === 'NO_BACKEND'
          ? 'Reporting needs an internet connection. Please try again when you are online.'
          : e?.message || 'That report could not be sent. Please try again.'
      );
    } finally {
      setSending(false);
    }
  };

  const sheet = (children) => (
    <BottomSheetModal
      ref={ref}
      snapPoints={snapPoints}
      onDismiss={onClose}
      backgroundStyle={{ backgroundColor: colors.surface }}
      handleIndicatorStyle={{ backgroundColor: colors.line }}
    >
      {children}
    </BottomSheetModal>
  );

  // ── Confirmation ─────────────────────────────────────────────────────────
  if (sent) {
    return sheet(
      <View style={{ flex: 1, paddingHorizontal: 22, paddingTop: 20, alignItems: 'center' }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: colors.accentSoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="check" size={28} color={colors.accent} strokeWidth={2.2} />
        </View>
        <Text variant="title" align="center" style={{ marginTop: 18 }}>
          Report sent
        </Text>
        <Text variant="bodySm" color="ink2" align="center" style={{ marginTop: 10, lineHeight: 20 }}>
          Thanks — our team will review this design. We use reports like yours to improve what the
          AI is allowed to generate.
        </Text>
        {typeof sent === 'number' ? (
          <Text variant="label" color="ink3" style={{ marginTop: 12 }}>
            REFERENCE #{sent}
          </Text>
        ) : null}
        <Button title="Done" onPress={dismiss} style={{ marginTop: 26, width: '100%' }} />
      </View>
    );
  }

  // ── Form ─────────────────────────────────────────────────────────────────
  return sheet(
    <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 34 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: radius.md,
            backgroundColor: colors.accentSoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="warning" size={20} color={colors.accent} strokeWidth={2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="title">Report this design</Text>
          <Text variant="bodySm" color="ink2" style={{ marginTop: 2 }} numberOfLines={1}>
            {project?.name || 'AI-generated design'}
          </Text>
        </View>
      </View>

      <Text variant="label" color="ink3" style={{ marginTop: 22, marginBottom: 10 }}>
        WHAT IS WRONG WITH IT?
      </Text>

      <View style={{ gap: 8 }}>
        {REPORT_REASONS.map((r) => {
          const active = reason === r.key;
          return (
            <Pressable
              key={r.key}
              onPress={() => setReason(r.key)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingVertical: 14,
                paddingHorizontal: 15,
                borderRadius: radius.md,
                backgroundColor: active ? colors.accentTintBg : colors.surface2,
                borderWidth: active ? 1.5 : 1,
                borderColor: active ? colors.accent : colors.lineSoft,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  borderWidth: active ? 6 : 1.5,
                  borderColor: active ? colors.accent : colors.line,
                }}
              />
              <Text variant="bodySm" style={{ flex: 1, fontWeight: active ? '700' : '400' }}>
                {r.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text variant="label" color="ink3" style={{ marginTop: 22, marginBottom: 10 }}>
        ANYTHING ELSE? (OPTIONAL)
      </Text>
      <TextInput
        value={details}
        onChangeText={(t) => setDetails(t.slice(0, MAX_DETAILS))}
        placeholder="Tell us what you saw…"
        placeholderTextColor={colors.ink3}
        multiline
        style={{
          minHeight: 92,
          textAlignVertical: 'top',
          padding: 14,
          borderRadius: radius.md,
          backgroundColor: colors.surface2,
          borderWidth: 1,
          borderColor: colors.lineSoft,
          color: colors.ink,
          fontSize: 14,
        }}
      />

      {error ? (
        <Text variant="bodySm" color="accent" style={{ marginTop: 12 }}>
          {error}
        </Text>
      ) : null}

      {!isRemote() ? (
        <Text variant="bodySm" color="ink3" style={{ marginTop: 12 }}>
          You need to be signed in and online to send a report.
        </Text>
      ) : null}

      <View style={{ gap: 10, marginTop: 24 }}>
        <Button
          title={sending ? 'Sending…' : 'Send report'}
          onPress={submit}
          disabled={!reason || sending}
        />
        <Button title="Cancel" variant="ghost" onPress={dismiss} />
      </View>
    </BottomSheetScrollView>
  );
});

export default ReportContentSheet;
