import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';

import Screen from '@/components/ui/Screen';
import Text from '@/components/ui/Text';
import Button from '@/components/ui/Button';
import HeaderBar from '@/components/ui/HeaderBar';
import Icon from '@/components/icons/Icon';
import EmptyState from '@/components/feedback/EmptyState';
import NotEnoughCreditsModal from '@/components/feedback/NotEnoughCreditsModal';
import PolicyViolationModal from '@/components/feedback/PolicyViolationModal';
import { useTheme } from '@/theme/useTheme';
import { useAiBriefStore } from '@/store/useAiBriefStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { aiApi } from '@/services/api/aiApi';
import { describeModerationError } from '@/utils/moderationErrors';
import { notifySessionExpired } from '@/services/api/session';
import { ROUTES } from '@/navigation/routes';
import WizardShell from './components/WizardShell';
import {
  SpaceTypeStep, PlotStep, LevelsStep, OrientationStep, FloorStep,
  FurnishingStep, StyleStep, RequirementsStep, ReviewStep,
} from './steps';

// ---------------------------------------------------------------------------
// The AI design brief.
//
// One screen with internal steps rather than a stack of nine routes, because the
// step COUNT is dynamic — a four-storey plaza asks four per-floor questions, a
// bungalow asks one. Driving that from a single index keeps back/forward, the
// progress bar and "jump back to edit" trivial, where a route stack would have
// to be rebuilt whenever the user changes the floor count.
//
// Everything is written straight to the persisted brief store as it's answered,
// so closing the app mid-way loses nothing.
// ---------------------------------------------------------------------------

const STEP = { SPACE: 0, PLOT: 1, LEVELS: 2, ORIENTATION: 3, FLOORS: 4 };

export default function AiWizardScreen({ navigation }) {
  const { colors } = useTheme();
  const brief = useAiBriefStore();
  const unit = useSettingsStore((s) => s.measurementUnit);
  const setUnit = useSettingsStore((s) => s.setMeasurementUnit);

  const [config, setConfig] = useState(null);
  const [error, setError] = useState(null);
  const [starting, setStarting] = useState(false);
  const [step, setStep] = useState(0);
  // null | 'entry' | 'submit' — the wallet is checked when the wizard opens and
  // again if the server refuses the charge. Which one it was decides where
  // dismissing the dialog leaves the user.
  const [shortOnCredits, setShortOnCredits] = useState(null);
  // A refusal from the AI safety gate: a blocked brief, a locked account, or a
  // moderation check that could not run. Held as a presentation object rather
  // than a raw error so the modal never has to know about API codes.
  const [refusal, setRefusal] = useState(null);

  // The wizard is driven entirely by the server's config, so new space types and
  // room vocabularies appear without an app release.
  const load = useCallback(() => {
    setError(null);
    setConfig(null);
    let alive = true;
    aiApi
      .config()
      .then((c) => {
        if (!alive) return;
        setConfig(c);
        // Gate up front rather than after nine questions — being told the price
        // only at the end is the worst possible moment to hear it.
        if (!c.freeGenerationAvailable && (c.balance ?? 0) < (c.cost ?? 0)) setShortOnCredits('entry');
      })
      .catch((e) => alive && setError(e));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => load(), [load]);

  // Coming back from the paywall / earn-credits screen with a bigger balance
  // must clear the dialog by itself — making the user close and reopen the
  // wizard to be believed would be absurd.
  useEffect(() => {
    if (shortOnCredits === null) return undefined;
    return navigation.addListener('focus', () => {
      aiApi
        .config()
        .then((c) => {
          setConfig(c);
          if (c.freeGenerationAvailable || (c.balance ?? 0) >= (c.cost ?? 0)) setShortOnCredits(null);
        })
        .catch(() => {}); // keep showing the dialog on a failed re-check
    });
  }, [navigation, shortOnCredits]);

  const spaceType = useMemo(
    () => config?.spaceTypes?.find((s) => s.key === brief.spaceType) || null,
    [config, brief.spaceType]
  );

  const floorCount = brief.floors.length;
  const steps = useMemo(() => {
    // SPACE, PLOT, LEVELS, ORIENTATION, one per floor, FURNISHING, STYLE, REQS, REVIEW
    const ids = ['space', 'plot', 'levels', 'orientation'];
    for (let i = 0; i < floorCount; i++) ids.push(`floor:${i}`);
    ids.push('furnishing', 'style', 'requirements', 'review');
    return ids;
  }, [floorCount]);

  const total = steps.length;
  const current = steps[Math.min(step, total - 1)];

  const back = () => (step === 0 ? navigation.goBack() : setStep((s) => s - 1));
  const next = () => setStep((s) => Math.min(total - 1, s + 1));

  // ── Start generation ──────────────────────────────────────────────────────
  const startGeneration = async () => {
    setStarting(true);
    try {
      const payload = brief.buildBrief(spaceType);
      const requestId = brief.newRequestId();
      const job = await aiApi.start(requestId, payload);
      brief.setJob(job.jobId);
      // replace, not navigate: the brief is submitted, so going "back" into it
      // from the generating screen would be meaningless.
      navigation.replace(ROUTES.aiGenerating, { jobId: job.jobId });
    } catch (e) {
      // The balance can move between opening the wizard and submitting it (an
      // export on another screen, a second device). A refused charge is not a
      // dead end — show the same top-up dialog, keeping the brief intact.
      if (e.status === 402 || e.code === 'INSUFFICIENT_CREDITS') {
        setShortOnCredits('submit');
        return;
      }
      // A brief the safety gate refused is not a broken wizard — the answers
      // are still good and mostly still usable, so this stays on the step and
      // explains what to change instead of falling through to the full-screen
      // error state (which would strand the user with no way back to editing).
      const moderation = describeModerationError(e);
      if (moderation.type !== 'passthrough') {
        setRefusal(moderation);
        return;
      }
      setError(e);
    } finally {
      setStarting(false);
    }
  };

  // ── Loading / unavailable ────────────────────────────────────────────────
  if (!config && !error) {
    return (
      <Screen>
        <HeaderBar title="Design with AI" onBack={() => navigation.goBack()} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.accent} />
          <Text variant="bodySm" color="ink2" style={{ marginTop: 14 }}>
            Getting things ready…
          </Text>
        </View>
      </Screen>
    );
  }

  if (error || config?.available === false) {
    const failure = describeFailure(error, config);
    return (
      <Screen>
        <HeaderBar title="Design with AI" onBack={() => navigation.goBack()} />
        <View style={{ flex: 1, paddingHorizontal: 24, justifyContent: 'center' }}>
          <EmptyState
            illustration={<Icon name={failure.icon} size={72} color={colors.line} strokeWidth={1.4} />}
            title={failure.title}
            message={failure.message}
          />
          <View style={{ gap: 10, marginTop: 24 }}>
            {failure.retry ? <Button title="Try again" icon="redo" iconPosition="left" onPress={load} /> : null}
            {failure.signIn ? (
              // Only drops the dead tokens — RootNavigator swaps to Login when
              // isAuthenticated flips. Never logout(), which also wipes projects.
              <Button title="Sign in again" icon="user" iconPosition="left" onPress={notifySessionExpired} />
            ) : null}
            <Button
              title="Draw one myself"
              variant="secondary"
              onPress={() => navigation.replace(ROUTES.newProject)}
            />
          </View>
        </View>
      </Screen>
    );
  }

  // ── Steps ─────────────────────────────────────────────────────────────────
  // The credit dialog belongs to the frame rather than to any one step, so it
  // can sit over whichever question is showing and dismissing it puts the user
  // back exactly where they were.
  const shell = (props) => (
    <>
      <WizardShell step={step} total={total} onBack={back} onNext={next} {...props} />
      <NotEnoughCreditsModal
        visible={shortOnCredits !== null}
        cost={config.cost ?? 0}
        balance={config.balance ?? 0}
        onGetCredits={() => navigation.navigate(ROUTES.paywall)}
        onEarnCredits={() => navigation.navigate(ROUTES.earnCredits)}
        // Blocked on the way in there is nothing to come back to, so bow out of
        // the wizard entirely; blocked at submit, the brief is worth keeping.
        onClose={() => {
          const reason = shortOnCredits;
          setShortOnCredits(null);
          if (reason === 'entry') navigation.goBack();
        }}
      />
      <PolicyViolationModal
        visible={refusal !== null}
        presentation={refusal}
        // Both roads lead back to the brief; "Edit" just closes onto the step
        // the user was already on, with every answer intact.
        onEdit={() => setRefusal(null)}
        onRetry={() => {
          setRefusal(null);
          startGeneration();
        }}
        onClose={() => setRefusal(null)}
      />
    </>
  );

  if (current === 'space') {
    return shell({
      title: 'What are you designing?',
      subtitle: 'Pick the closest match — you can describe it yourself instead.',
      nextDisabled: !brief.spaceType && !brief.spaceTypeCustom,
      children: (
        <SpaceTypeStep
          spaceTypes={config.spaceTypes}
          value={brief.spaceType}
          custom={brief.spaceTypeCustom}
          onSelect={(t) => {
            // Adopting the type's default plot size means the next step already
            // shows something sensible rather than an arbitrary rectangle.
            brief.set({
              spaceType: t.key,
              spaceTypeCustom: '',
              width: t.defaultSize?.width ?? brief.width,
              length: t.defaultSize?.length ?? brief.length,
            });
          }}
          onCustom={(v) => brief.set({ spaceTypeCustom: v, spaceType: brief.spaceType || 'house' })}
        />
      ),
    });
  }

  if (current === 'plot') {
    return shell({
      title: 'How big is the plot?',
      subtitle: 'The full outer boundary — we design everything inside it.',
      children: (
        <PlotStep
          width={brief.width}
          length={brief.length}
          unit={unit}
          onUnit={setUnit}
          onWidth={(v) => brief.set({ width: v })}
          onLength={(v) => brief.set({ length: v })}
        />
      ),
    });
  }

  if (current === 'levels') {
    return shell({
      title: 'How many levels?',
      subtitle: 'Each one gets its own set of questions.',
      onNext: () => {
        brief.syncFloors();
        next();
      },
      children: (
        <LevelsStep
          floorCount={brief.floorCount}
          hasBasement={brief.hasBasement}
          hasRoof={brief.hasRoof}
          maxFloors={config.maxFloors || 5}
          onChange={(patch) => brief.set(patch)}
        />
      ),
    });
  }

  if (current === 'orientation') {
    return shell({
      title: 'Which way does it face?',
      subtitle: 'This decides where the entrance and the windows go.',
      children: (
        <OrientationStep
          entranceSide={brief.entranceSide}
          roadSide={brief.roadSide}
          cornerPlot={brief.cornerPlot}
          onChange={(patch) => brief.set(patch)}
        />
      ),
    });
  }

  if (current.startsWith('floor:')) {
    const index = Number(current.split(':')[1]);
    const floor = brief.floors[index];
    if (!floor) {
      // Floor count changed underneath us (user went back and edited levels).
      return shell({ title: 'One moment…', children: null, onNext: () => setStep(STEP.LEVELS) });
    }

    const hasSomething =
      Object.values(floor.rooms).some((c) => c > 0) || floor.customSpaces.length > 0;

    return shell({
      title: floor.name,
      subtitle: `What goes on this level? (${index + 1} of ${floorCount})`,
      nextDisabled: !hasSomething,
      children: (
        <FloorStep
          floor={floor}
          index={index}
          spaceType={spaceType}
          previousName={index > 0 ? brief.floors[index - 1].name : null}
          onCopyPrevious={() => brief.copyFloorFrom(index - 1, index)}
          onPurpose={(p) => brief.setFloor(index, { purpose: p })}
          onRoom={(type, count) => brief.setRoomCount(index, type, count)}
          onAddCustom={(v) => brief.addCustomSpace(index, v)}
          onRemoveCustom={(at) => brief.removeCustomSpace(index, at)}
          onNotes={(v) => brief.setFloor(index, { notes: v })}
        />
      ),
    });
  }

  if (current === 'furnishing') {
    return shell({
      title: 'How furnished?',
      subtitle: 'We place real furniture from the catalog — you can change any of it after.',
      children: (
        <FurnishingStep
          levels={config.furnishingLevels}
          value={brief.furnishing}
          onChange={(v) => brief.set({ furnishing: v })}
        />
      ),
    });
  }

  if (current === 'style') {
    return shell({
      title: 'Pick a style',
      subtitle: 'Sets the floor finish, wall colour and the kind of furniture chosen.',
      children: (
        <StyleStep styles={config.styles} value={brief.style} onChange={(v) => brief.set({ style: v })} />
      ),
    });
  }

  if (current === 'requirements') {
    return shell({
      title: 'Anything specific?',
      subtitle: 'Optional — but the more you tell us, the closer it lands.',
      nextTitle: 'Review',
      children: (
        <RequirementsStep
          chips={config.requirements}
          selected={brief.requirements}
          extras={brief.extras}
          notes={brief.notes}
          onToggle={brief.toggleRequirement}
          onAddExtra={(v) => brief.set({ extras: [...brief.extras, v] })}
          onRemoveExtra={(at) => brief.set({ extras: brief.extras.filter((_, i) => i !== at) })}
          onNotes={(v) => brief.set({ notes: v })}
        />
      ),
    });
  }

  // Review
  const rows = buildReviewRows({ brief, spaceType, config, unit, steps });
  return shell({
    title: 'Ready to design',
    subtitle: 'Check it over — tap anything to change it.',
    nextTitle: config.freeGenerationAvailable ? 'Generate my design — free' : `Generate my design`,
    nextLoading: starting,
    onNext: startGeneration,
    children: (
      <ReviewStep
        rows={rows}
        cost={config.cost}
        isFree={config.freeGenerationAvailable}
        balance={config.balance}
        onJump={setStep}
      />
    ),
  });
}

// Why the wizard couldn't open. Every one of these used to be reported as "no
// connection", which sent people to reset a router that was working fine — a
// missing API URL, a dead session and a 500 all arrive here looking similar, so
// they have to be told apart deliberately.
function describeFailure(error, config) {
  if (error?.code === 'NO_BACKEND') {
    return {
      icon: 'warning',
      title: 'AI design isn’t set up',
      message:
        'This build has no design service configured, so AI generation can’t run. Everything else works as usual.',
      retry: false,
    };
  }

  const status = error?.status;

  // No HTTP status at all means the request never reached a server.
  if (error && status == null) {
    return {
      icon: 'wifi-off',
      title: 'No connection',
      message:
        'Designing with AI needs an internet connection. You can still draw a plan yourself.',
      retry: true,
    };
  }

  if (status === 401 || status === 403) {
    return {
      icon: 'lock',
      title: 'Sign in to design with AI',
      message:
        'Your session has ended, so we can’t check your credits. Sign in again to keep designing with AI.',
      retry: false,
      signIn: true,
    };
  }

  if (status === 429) {
    return {
      icon: 'warning',
      title: 'Slow down a moment',
      message: error.message || 'You’ve started a lot of designs recently. Please try again shortly.',
      retry: true,
    };
  }

  // Reachable server, but it said no — including config.available === false.
  return {
    icon: 'warning',
    title: 'AI design is unavailable',
    message:
      (config?.available === false ? null : error?.message) ||
      'This feature isn’t switched on right now. Please try again later.',
    retry: true,
  };
}

// Flatten the brief into a scannable list, each row remembering which step it
// came from so tapping it jumps straight back to that question.
function buildReviewRows({ brief, spaceType, config, unit, steps }) {
  const suffix = unit === 'feet' ? 'ft' : 'm';
  const conv = (v) => (unit === 'feet' ? Math.round(v * 3.281) : v);
  const rows = [];

  rows.push({
    label: 'Designing',
    value: spaceType?.label || brief.spaceTypeCustom || '—',
    step: 0,
  });
  if (brief.spaceTypeCustom) rows.push({ label: 'Your words', value: brief.spaceTypeCustom, step: 0 });

  rows.push({ label: 'Plot', value: `${conv(brief.width)} × ${conv(brief.length)} ${suffix}`, step: 1 });
  rows.push({ label: 'Levels', value: brief.floors.map((f) => f.name).join(', '), step: 2 });
  rows.push({ label: 'Entrance', value: `${brief.entranceSide} side${brief.cornerPlot ? ' · corner plot' : ''}`, step: 3 });

  brief.floors.forEach((f, i) => {
    const counts = Object.entries(f.rooms).filter(([, c]) => c > 0);
    const labelFor = (type) => spaceType?.rooms?.find((r) => r.type === type)?.label || type;
    const summary = [
      ...counts.map(([type, c]) => `${c}× ${labelFor(type)}`),
      ...f.customSpaces,
    ].join(', ');
    rows.push({
      label: f.name,
      value: summary || 'nothing selected',
      step: steps.indexOf(`floor:${i}`),
    });
  });

  const furnishingStep = steps.indexOf('furnishing');
  rows.push({
    label: 'Furnishing',
    value: config.furnishingLevels?.find((l) => l.key === brief.furnishing)?.label || brief.furnishing,
    step: furnishingStep,
  });
  rows.push({
    label: 'Style',
    value: config.styles?.find((s) => s.key === brief.style)?.label || brief.style,
    step: steps.indexOf('style'),
  });

  const reqStep = steps.indexOf('requirements');
  const reqLabels = brief.requirements
    .map((k) => config.requirements?.find((c) => c.key === k)?.label)
    .filter(Boolean);
  if (reqLabels.length || brief.extras.length) {
    rows.push({ label: 'Requirements', value: [...reqLabels, ...brief.extras].join(', '), step: reqStep });
  }
  if (brief.notes) rows.push({ label: 'Your notes', value: brief.notes, step: reqStep });

  return rows;
}
