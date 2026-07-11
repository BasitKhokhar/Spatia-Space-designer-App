import { useRef, useState } from 'react';
import { View, Pressable, ScrollView, Alert } from 'react-native';

import Screen from '@/components/ui/Screen';
import Text from '@/components/ui/Text';
import Button from '@/components/ui/Button';
import HeaderBar from '@/components/ui/HeaderBar';
import CreditPill from '@/components/ui/CreditPill';
import Icon from '@/components/icons/Icon';
import RoomPreview from '@/components/graphics/RoomPreview';
import { useTheme } from '@/theme/useTheme';
import { useProjectsStore } from '@/store/useProjectsStore';
import { useCreditsStore } from '@/store/useCreditsStore';
import { CREDITS } from '@/constants/config';
import { exportPng, exportPdf, exportObj } from '@/services/export/exporters';
import { ROUTES } from '@/navigation/routes';

const OPTIONS = [
  { id: 'png', icon: 'image', title: 'High-Res Image', sub: 'PNG · 1920×1080', cost: CREDITS.costs.png, group: '2D' },
  { id: 'pdf', icon: 'file', title: 'Dimensioned PDF', sub: 'Print-ready floor plan', cost: CREDITS.costs.pdf, group: '2D' },
  { id: 'obj', icon: 'cube', title: '3D Model File', sub: '.OBJ + textures', cost: CREDITS.costs.obj, group: '3D' },
];

export default function ExportScreen({ navigation }) {
  const { colors, radius } = useTheme();
  const project = useProjectsStore((s) => s.getActive());
  const incrementExports = useProjectsStore((s) => s.incrementExports);
  const balance = useCreditsStore((s) => s.balance);
  const spend = useCreditsStore((s) => s.spend);
  const [selected, setSelected] = useState('obj');
  const [busy, setBusy] = useState(false);
  const previewRef = useRef(null);

  const option = OPTIONS.find((o) => o.id === selected);

  const runExport = async () => {
    if (!project) return;
    if (balance < option.cost) {
      navigation.navigate(ROUTES.paywall, { needed: option.cost, have: balance });
      return;
    }
    setBusy(true);
    try {
      if (selected === 'png') await exportPng(previewRef, project.name);
      else if (selected === 'pdf') await exportPdf(project);
      else await exportObj(project);
      spend(option.cost);
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
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 160 }}>
        <View style={{ paddingHorizontal: 24 }}>
          <Text variant="body" color="ink2" style={{ marginTop: 8 }}>
            {project?.name || 'Project'}
          </Text>

          {/* offscreen-capturable preview */}
          <View
            ref={previewRef}
            collapsable={false}
            style={{ borderRadius: radius.lg, overflow: 'hidden', marginTop: 16 }}
          >
            <RoomPreview plan={project?.plan} width={330} />
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

      <View style={{ position: 'absolute', bottom: 34, left: 24, right: 24 }}>
        <Pressable
          onPress={() => navigation.navigate(ROUTES.earnCredits)}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 12 }}
        >
          <Icon name="play" size={16} color={colors.accent} />
          <Text variant="bodySm" color="accent" style={{ fontWeight: '700' }}>
            Watch ad to earn credits
          </Text>
        </Pressable>
        <Button title={`Export Selected · ${option.cost} credits`} variant="dark" onPress={runExport} loading={busy} />
      </View>
    </Screen>
  );
}
