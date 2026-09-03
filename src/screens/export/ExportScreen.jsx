import { useRef, useState } from 'react';
import { View, Pressable, ScrollView, Alert } from 'react-native';

import Screen from '@/components/ui/Screen';
import Text from '@/components/ui/Text';
import Button from '@/components/ui/Button';
import HeaderBar from '@/components/ui/HeaderBar';
import CreditPill from '@/components/ui/CreditPill';
import Icon from '@/components/icons/Icon';
import PlanRenderer from '@/components/editor/PlanRenderer';
import { useTheme } from '@/theme/useTheme';
import { useProjectsStore, useActiveProject } from '@/store/useProjectsStore';
import { useCreditsStore } from '@/store/useCreditsStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { CREDITS } from '@/constants/config';
import { exportPng, exportPdf, exportObj } from '@/services/export/exporters';
import { ROUTES } from '@/navigation/routes';
import { useRewardedFlow } from '@/hooks/useRewardedFlow';

const OPTIONS = [
  { id: 'png', icon: 'image', title: 'High-Res Image', sub: 'PNG · 1920×1080', cost: CREDITS.costs.png, group: '2D' },
  { id: 'pdf', icon: 'file', title: 'Dimensioned PDF', sub: 'Print-ready floor plan', cost: CREDITS.costs.pdf, group: '2D' },
  { id: 'obj', icon: 'cube', title: '3D Model File', sub: '.OBJ + textures', cost: CREDITS.costs.obj, group: '3D' },
];

// Sizes a render frame to the plan's own aspect ratio (capped to maxW×maxH)
// instead of a fixed box, so a tall narrow plan gets a tall narrow frame — the
// plan fills it edge to edge with no wasted letterboxing, which is also what
// keeps wall segments long enough on screen to hold their dimension labels.
function fitBox(plan, maxW, maxH) {
  const pw = Math.max(plan?.width || 1, 0.1);
  const pl = Math.max(plan?.length || 1, 0.1);
  const aspect = pw / pl;
  let width = maxW;
  let height = width / aspect;
  if (height > maxH) {
    height = maxH;
    width = height * aspect;
  }
  return { width: Math.round(width), height: Math.round(height) };
}

export default function ExportScreen({ navigation }) {
  const { colors, radius, shadows, isDark } = useTheme();
  const project = useActiveProject();
  const incrementExports = useProjectsStore((s) => s.incrementExports);
  const balance = useCreditsStore((s) => s.balance);
  const spend = useCreditsStore((s) => s.spend);
  // Premium (or the legacy isUnlimited flag) downloads without spending credits.
  // The tier vocabulary is free | basic | premium — an earlier 'pro' check here
  // matched nothing, so Premium subscribers were charged for every export.
  const unlimited = useCreditsStore((s) => s.tier === 'premium' || s.isUnlimited);
  const { busy: adBusy, canWatch, perAd, adsDisabled, watch } = useRewardedFlow();
  const unit = useSettingsStore((s) => s.measurementUnit);
  const [selected, setSelected] = useState('obj');
  const [busy, setBusy] = useState(false);
  // Offscreen, high-res instance of every floor stacked in one column, each
  // labeled by name — captured whole for the "all floors in one image" PNG,
  // and captured floor-by-floor (via floorRef below) for one PDF page per
  // floor. Same mounted views serve both, so nothing renders twice.
  const combinedCaptureRef = useRef(null);
  const floorRefsMap = useRef({});
  const getFloorRef = (id) => {
    if (!floorRefsMap.current[id]) floorRefsMap.current[id] = { current: null };
    return floorRefsMap.current[id];
  };
  // Measured height of the sticky footer, so the scroll content always gets
  // exactly enough bottom padding to clear it — no magic-number gap that
  // breaks the moment the ad-row copy wraps to a second line.
  const [footerH, setFooterH] = useState(160);

  const option = OPTIONS.find((o) => o.id === selected);
  const shortBy = unlimited ? 0 : Math.max(0, option.cost - balance);
  const previewBox = fitBox(project?.plan, 330, 420);
  const floors = project?.floors?.length ? project.floors : project ? [{ id: 'main', name: project.name, plan: project.plan }] : [];
  const multiFloor = floors.length > 1;
  const stackBg = isDark ? '#161310' : '#F0EBE2';

  const runExport = async () => {
    if (!project) return;
    // Premium skips the credit gate entirely; everyone else must cover the cost.
    if (!unlimited && balance < option.cost) {
      navigation.navigate(ROUTES.paywall, { needed: option.cost, have: balance });
      return;
    }
    setBusy(true);
    try {
      if (selected === 'png') await exportPng(combinedCaptureRef, project.name);
      else if (selected === 'pdf') {
        const pdfFloors = floors.map((f, i) => ({ name: f.name, plan: f.plan, index: i, ref: getFloorRef(f.id) }));
        await exportPdf(project, pdfFloors);
      } else await exportObj(project);
      if (!unlimited) await spend(option.cost, selected);
      incrementExports();
      Alert.alert('Export complete', `${option.title} exported successfully.`);
    } catch (e) {
      Alert.alert('Export failed', e.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  const renderOption = (o) => {
    const active = o.id === selected;
    return (
      <Pressable
        key={o.id}
        onPress={() => setSelected(o.id)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          backgroundColor: active ? colors.accentTintBg : colors.surface,
          borderWidth: active ? 1.5 : 1,
          borderColor: active ? colors.accent : colors.lineSoft,
          borderRadius: radius.lg,
          padding: 16,
        }}
      >
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: radius.md,
            backgroundColor: active ? colors.accent : colors.accentSoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={o.icon} size={22} color={active ? '#fff' : colors.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="titleSm">{o.title}</Text>
          <Text variant="bodySm" color="ink3" style={{ marginTop: 2 }}>
            {o.sub}
          </Text>
        </View>
        <View
          style={{
            backgroundColor: active ? colors.accent : colors.surface2,
            borderRadius: radius.sm,
            paddingHorizontal: 12,
            paddingVertical: 7,
          }}
        >
          <Text variant="bodySm" color={active ? 'onAccent' : 'ink'} style={{ fontWeight: '700' }}>
            {o.cost} credits
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <Screen>
      <HeaderBar
        title="Export"
        onBack={() => navigation.goBack()}
        right={<CreditPill count={balance} onPress={() => navigation.navigate(ROUTES.earnCredits)} />}
      />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: footerH + 16 }}>
        <View style={{ paddingHorizontal: 24 }}>
          <Text variant="body" color="ink2" style={{ marginTop: 8 }}>
            {project?.name || 'Project'}
          </Text>

          {/* on-screen preview — the same renderer the 2D editor uses, sized to
              the plan's own aspect ratio so it fills the frame edge to edge;
              exactly what the PNG/PDF export will look like, just smaller */}
          <View
            style={{
              borderRadius: radius.lg,
              overflow: 'hidden',
              marginTop: 16,
              alignSelf: 'center',
              borderWidth: 1,
              borderColor: colors.lineSoft,
              ...shadows.e1,
            }}
          >
            <PlanRenderer plan={project?.plan} width={previewBox.width} height={previewBox.height} unit={unit} />
          </View>
          {multiFloor ? (
            <Text variant="bodySm" color="ink3" style={{ marginTop: 10, textAlign: 'center' }}>
              {`Exports include all ${floors.length} floors, each clearly labeled`}
            </Text>
          ) : null}

          {/* hidden high-res render of every floor, stacked + labeled — captured
              whole for the combined PNG, and per-floor (via each floor's own
              ref) for the PDF's one-page-per-floor layout */}
          <View
            ref={combinedCaptureRef}
            collapsable={false}
            style={{ position: 'absolute', top: 0, left: 0, opacity: 0 }}
            pointerEvents="none"
          >
            <View style={{ backgroundColor: stackBg, padding: 32, gap: 32 }}>
              {floors.map((floor, i) => {
                // Capped a bit below the single-floor capture size (1400) since a
                // multi-floor project keeps every floor's canvas mounted at once.
                const box = fitBox(floor.plan, 1200, 1200);
                return (
                  <View key={floor.id} ref={getFloorRef(floor.id)} collapsable={false}>
                    {multiFloor ? (
                      <Text variant="titleSm" color="ink" style={{ marginBottom: 10 }}>
                        {`Floor ${i + 1} — ${floor.name}`}
                      </Text>
                    ) : null}
                    <PlanRenderer plan={floor.plan} width={box.width} height={box.height} unit={unit} />
                  </View>
                );
              })}
            </View>
          </View>

          <Text variant="titleSm" color="ink2" style={{ marginTop: 20, marginBottom: 12 }}>
            2D Exports
          </Text>
          <View style={{ gap: 12 }}>{OPTIONS.filter((o) => o.group === '2D').map(renderOption)}</View>

          <Text variant="titleSm" color="ink2" style={{ marginTop: 24, marginBottom: 12 }}>
            3D Exports
          </Text>
          <View style={{ gap: 12 }}>{OPTIONS.filter((o) => o.group === '3D').map(renderOption)}</View>
        </View>
      </ScrollView>

      {/* Sticky footer: a solid, full-bleed panel (not a floating overlay) so it
          reads as a fixed action bar rather than something that can visually
          collide with the card scrolled up underneath it. */}
      <View
        onLayout={(e) => setFooterH(e.nativeEvent.layout.height)}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: colors.bg,
          borderTopWidth: 1,
          borderTopColor: colors.lineSoft,
          paddingHorizontal: 24,
          paddingTop: 14,
          // Screen's SafeAreaView already insets for the home indicator, so this
          // only needs a comfortable fixed gap below the button, not insets.bottom
          // again (that would double the safe-area padding).
          paddingBottom: 20,
        }}
      >
        {/* Hidden for anyone whose plan removed ads. Note this is the one place
            the two entitlements differ: Basic has no ads but still spends
            credits per download, so it keeps the credit gate without this row. */}
        {!unlimited && !adsDisabled && canWatch ? (
          <Pressable
            onPress={watch}
            disabled={adBusy}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12, opacity: adBusy ? 0.6 : 1 }}
          >
            <Icon name="play" size={15} color={colors.accent} />
            <Text variant="bodySm" color="accent" numberOfLines={1} style={{ fontWeight: '700', flexShrink: 1 }}>
              {adBusy
                ? 'Loading ad…'
                : shortBy > 0
                  ? `Watch ad for +${perAd} — need ${shortBy} more`
                  : `Watch ad to earn +${perAd} credit${perAd === 1 ? '' : 's'}`}
            </Text>
          </Pressable>
        ) : null}
        <Button
          title={unlimited ? 'Export Selected · Free' : `Export Selected · ${option.cost} credits`}
          variant="dark"
          onPress={runExport}
          loading={busy}
        />
      </View>
    </Screen>
  );
}
