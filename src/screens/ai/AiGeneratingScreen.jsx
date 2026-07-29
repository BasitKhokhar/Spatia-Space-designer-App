import { useEffect, useRef, useState } from 'react';
import { View, Animated, Easing, BackHandler } from 'react-native';
import Svg, { Rect, Line, Circle, Defs, Pattern } from 'react-native-svg';

import Screen from '@/components/ui/Screen';
import Text from '@/components/ui/Text';
import Button from '@/components/ui/Button';
import Icon from '@/components/icons/Icon';
import { useTheme } from '@/theme/useTheme';
import { useAiBriefStore } from '@/store/useAiBriefStore';
import { useProjectsStore } from '@/store/useProjectsStore';
import { useCreditsStore } from '@/store/useCreditsStore';
import { aiApi } from '@/services/api/aiApi';
import { ROUTES } from '@/navigation/routes';

const POLL_MS = 1500;

// ---------------------------------------------------------------------------
// The wait.
//
// Generation runs on the server (a model call per floor, 25-60s each), so this
// polls the job and shows the real stage it reports rather than a spinner —
// "Furnishing the ground floor" makes a two-minute wait feel like progress
// instead of a hang.
//
// The job id is persisted, so leaving the app and coming back resumes the same
// generation instead of losing work the user has already paid for.
//
// On success it does NOT stop to show a result screen: the plan goes straight
// into the editor, drawn and ready to edit.
// ---------------------------------------------------------------------------

export default function AiGeneratingScreen({ navigation, route }) {
  const { colors, radius } = useTheme();
  const jobId = route.params?.jobId ?? useAiBriefStore.getState().jobId;

  const createProject = useProjectsStore((s) => s.createProject);
  const refreshCredits = useCreditsStore((s) => s.refresh);
  const clearJob = useAiBriefStore((s) => s.clearJob);

  const [job, setJob] = useState(null);
  const [failed, setFailed] = useState(null);
  const handedOff = useRef(false);

  // Progress only ever moves forward. A poll that briefly returns a stale row
  // would otherwise make the bar jump backwards, which reads as a fault.
  const progress = useRef(new Animated.Value(0)).current;
  const highest = useRef(0);

  useEffect(() => {
    if (!jobId) {
      setFailed({ message: 'That design could not be found.' });
      return undefined;
    }

    let alive = true;
    let timer = null;

    const poll = async () => {
      try {
        const next = await aiApi.job(jobId);
        if (!alive) return;
        setJob(next);

        if (next.progress > highest.current) {
          highest.current = next.progress;
          Animated.timing(progress, {
            toValue: next.progress / 100,
            duration: 600,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          }).start();
        }

        if (next.status === 'succeeded') return finish(next);
        if (next.status === 'failed' || next.status === 'cancelled') {
          setFailed({ message: next.errorMessage || 'Generation did not finish.', refunded: next.refunded });
          return undefined;
        }
        timer = setTimeout(poll, POLL_MS);
      } catch (e) {
        if (!alive) return;
        // A dropped poll is usually a blip, not a failure — the job keeps
        // running on the server, so back off and try again rather than
        // abandoning a generation the user paid for.
        timer = setTimeout(poll, POLL_MS * 2);
      }
      return undefined;
    };

    poll();
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [jobId]);

  // Straight into the editor with the finished plan.
  const finish = (next) => {
    if (handedOff.current || !next.project) return;
    handedOff.current = true;

    // The same path a premade design takes — createProject rebuilds the floor
    // records locally, so from here it is an ordinary project: editable, 3D,
    // and exportable exactly like one the user drew.
    createProject({
      name: next.project.name,
      roomType: next.project.roomType,
      template: { plan: next.project.plan, name: next.project.name, rooms: next.project.rooms },
    });

    // The generation charge happened server-side, so pull the real balance.
    refreshCredits?.();
    clearJob();

    // reset, not navigate: the wizard and this screen are spent, so Back from
    // the editor should go home rather than into a submitted brief.
    navigation.reset({
      index: 1,
      routes: [{ name: ROUTES.tabs }, { name: ROUTES.editor, params: { aiSummary: next.summary } }],
    });
  };

  // Leaving mid-generation shouldn't kill the job — it keeps running and the
  // user can come back to it.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  const onCancel = async () => {
    try {
      await aiApi.cancel(jobId);
    } catch {
      // Cancelling is best-effort; the server refunds either way.
    }
    clearJob();
    navigation.reset({ index: 0, routes: [{ name: ROUTES.tabs }] });
  };

  if (failed) {
    return (
      <Screen>
        <View style={{ flex: 1, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center' }}>
          <View
            style={{
              width: 72, height: 72, borderRadius: 36, backgroundColor: colors.accentSoft,
              alignItems: 'center', justifyContent: 'center', marginBottom: 20,
            }}
          >
            <Icon name="warning" size={30} color={colors.accent} />
          </View>
          <Text variant="h2" align="center">That didn't work</Text>
          <Text variant="body" color="ink2" align="center" style={{ marginTop: 10 }}>
            {failed.message}
          </Text>
          {failed.refunded ? (
            <Text variant="bodySm" color="accent" align="center" style={{ marginTop: 10 }}>
              Your credits have been returned.
            </Text>
          ) : null}

          <View style={{ width: '100%', gap: 10, marginTop: 30 }}>
            <Button
              title="Try again"
              onPress={() => {
                clearJob();
                navigation.replace(ROUTES.aiWizard);
              }}
            />
            <Button
              title="Back home"
              variant="secondary"
              onPress={() => navigation.reset({ index: 0, routes: [{ name: ROUTES.tabs }] })}
            />
          </View>
        </View>
      </Screen>
    );
  }

  const width = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <Screen>
      <View style={{ flex: 1, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center' }}>
        <DraftingAnimation />

        <Text variant="h2" align="center" style={{ marginTop: 34 }}>
          Designing your space
        </Text>
        <Text variant="body" color="ink2" align="center" style={{ marginTop: 10, minHeight: 44 }}>
          {job?.stage || 'Getting started…'}
        </Text>

        <View
          style={{
            width: '100%', height: 6, borderRadius: 3,
            backgroundColor: colors.lineSoft, marginTop: 22, overflow: 'hidden',
          }}
        >
          <Animated.View style={{ width, height: 6, borderRadius: 3, backgroundColor: colors.accent }} />
        </View>

        <Text variant="label" color="ink3" style={{ marginTop: 12 }}>
          {job?.progress ?? 0}%
        </Text>

        <View
          style={{
            marginTop: 34, padding: 16, borderRadius: radius.lg,
            backgroundColor: colors.surface2, flexDirection: 'row', gap: 12, alignItems: 'flex-start',
          }}
        >
          <Icon name="help" size={18} color={colors.accent} />
          <Text variant="bodySm" color="ink2" style={{ flex: 1 }}>
            This takes a minute or two. You can leave the app — we'll keep going and your design will be waiting.
          </Text>
        </View>
      </View>

      <View style={{ paddingHorizontal: 24, paddingBottom: 30 }}>
        <Button title="Cancel" variant="ghost" onPress={onCancel} />
      </View>
    </Screen>
  );
}

// A plan drawing itself: walls sweep in, then a door and a window settle. Pure
// decoration, but it's what makes the wait feel like craft rather than lag.
function DraftingAnimation() {
  const { colors, isDark } = useTheme();
  const sweep = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sweep, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(sweep, { toValue: 0, duration: 400, easing: Easing.in(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [sweep]);

  const translateX = sweep.interpolate({ inputRange: [0, 1], outputRange: [-150, 150] });
  const dotColor = isDark ? '#3A342C' : '#CBB39F';

  return (
    <View style={{ width: 200, height: 150, overflow: 'hidden' }}>
      <Svg width="200" height="150">
        <Defs>
          <Pattern id="gendots" width="16" height="16" patternUnits="userSpaceOnUse">
            <Circle cx="1" cy="1" r="1" fill={dotColor} />
          </Pattern>
        </Defs>
        <Rect width="200" height="150" fill="url(#gendots)" />

        {/* Outline */}
        <Rect x="14" y="14" width="172" height="122" rx="3" fill="none" stroke={colors.accent} strokeWidth={3} />
        {/* Partitions */}
        <Line x1="14" y1="78" x2="186" y2="78" stroke={colors.accent} strokeWidth={2.5} />
        <Line x1="92" y1="14" x2="92" y2="78" stroke={colors.accent} strokeWidth={2.5} />
        <Line x1="136" y1="78" x2="136" y2="136" stroke={colors.accent} strokeWidth={2.5} />
        {/* Door + window */}
        <Line x1="46" y1="78" x2="70" y2="78" stroke={colors.bg} strokeWidth={4} />
        <Line x1="120" y1="14" x2="150" y2="14" stroke={colors.bg} strokeWidth={4} />
        <Circle cx="58" cy="78" r="3" fill={colors.accent} />
      </Svg>

      {/* The scanning highlight passing over the drawing. */}
      <Animated.View
        style={{
          position: 'absolute', top: 0, bottom: 0, width: 56,
          backgroundColor: colors.accent, opacity: 0.16,
          transform: [{ translateX }, { skewX: '-12deg' }],
        }}
      />
    </View>
  );
}
