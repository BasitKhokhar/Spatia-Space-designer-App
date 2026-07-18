import { forwardRef, useMemo, useState } from 'react';
import { View, Pressable, ScrollView, TextInput } from 'react-native';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';

import Text from '@/components/ui/Text';
import Icon from '@/components/icons/Icon';
import { useTheme } from '@/theme/useTheme';
import { planArea } from '@/domain/floorplan';

// Floor manager sheet for the editor. Lists a project's floors as a building
// elevation (top floor first), lets you switch by tapping, and exposes the
// full set of actions on the active floor: Add, Rename, Clone, Delete, Up, Down.
const FloorSwitcher = forwardRef(function FloorSwitcher(
  { project, onSwitch, onAdd, onClone, onDelete, onRename, onMove },
  ref
) {
  const { colors, radius, isDark } = useTheme();
  const snapPoints = useMemo(() => ['58%'], []);
  const [editingId, setEditingId] = useState(null);
  const [nameText, setNameText] = useState('');

  const floors = project?.floors || [];
  const activeId = project?.activeFloorId;
  const canDelete = floors.length > 1;
  // Show top floor first (like a building elevation).
  const ordered = floors.map((f, i) => ({ ...f, index: i })).reverse();

  const commitRename = () => {
    if (editingId && nameText.trim()) onRename?.(editingId, nameText.trim());
    setEditingId(null);
  };

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={snapPoints}
      backgroundStyle={{ backgroundColor: colors.surface }}
      handleIndicatorStyle={{ backgroundColor: colors.line }}
    >
      <BottomSheetView style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: 20, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text variant="caption" color="ink3">Building</Text>
            <Text variant="title">Floors</Text>
          </View>
          <Pressable
            onPress={() => onAdd?.()}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 6,
              height: 38, paddingHorizontal: 14, borderRadius: radius.md, backgroundColor: colors.accent,
            }}
          >
            <Icon name="plus" size={16} color="#fff" strokeWidth={2.4} />
            <Text style={{ color: '#fff', fontFamily: 'Manrope_700Bold', fontSize: 14 }}>Add floor</Text>
          </Pressable>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8, gap: 8 }}
        >
          {ordered.map((f) => {
            const active = f.id === activeId;
            const editing = f.id === editingId;
            return (
              <Pressable
                key={f.id}
                onPress={() => onSwitch?.(f.id)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingHorizontal: 14,
                  height: 58,
                  borderRadius: radius.lg,
                  backgroundColor: active ? colors.accentSoft : colors.surface2,
                  borderWidth: active ? 1.5 : 1,
                  borderColor: active ? colors.accent : colors.line,
                }}
              >
                <View
                  style={{
                    width: 34, height: 34, borderRadius: 10,
                    backgroundColor: active ? colors.accent : (isDark ? '#2C2620' : '#EDE6DA'),
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Icon name="layers" size={17} color={active ? '#fff' : colors.ink2} strokeWidth={2} />
                </View>
                <View style={{ flex: 1 }}>
                  {editing ? (
                    <TextInput
                      value={nameText}
                      onChangeText={setNameText}
                      autoFocus
                      onBlur={commitRename}
                      onSubmitEditing={commitRename}
                      placeholder="Floor name"
                      placeholderTextColor={colors.ink3}
                      style={{ color: colors.ink, fontFamily: 'Manrope_700Bold', fontSize: 15, padding: 0 }}
                    />
                  ) : (
                    <Text variant="titleSm" numberOfLines={1} style={{ color: active ? colors.accent : colors.ink }}>
                      {f.name}
                    </Text>
                  )}
                  <Text variant="caption" color="ink3">
                    {`${planArea(f.plan).toFixed(1)} m² · ${f.plan.furniture?.length || 0} items`}
                  </Text>
                </View>
                {active ? <Icon name="check" size={18} color={colors.accent} strokeWidth={2.6} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Action bar — operates on the active floor */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-around',
            paddingVertical: 12,
            paddingHorizontal: 8,
            borderTopWidth: 1,
            borderTopColor: colors.line,
          }}
        >
          <Action icon="pencil" label="Rename" onPress={() => { setNameText(project?.plan ? (floors.find((f) => f.id === activeId)?.name || '') : ''); setEditingId(activeId); }} />
          <Action icon="duplicate" label="Clone" onPress={() => onClone?.(activeId)} />
          <Action icon="chevron-up" label="Up" onPress={() => onMove?.(activeId, 'up')} />
          <Action icon="chevron-down" label="Down" onPress={() => onMove?.(activeId, 'down')} />
          <Action icon="trash" label="Delete" danger disabled={!canDelete} onPress={() => canDelete && onDelete?.(activeId)} />
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

function Action({ icon, label, onPress, danger, disabled }) {
  const { colors } = useTheme();
  const color = disabled ? colors.ink3 : danger ? colors.dangerDark : colors.ink2;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{ alignItems: 'center', justifyContent: 'center', gap: 3, opacity: disabled ? 0.5 : 1, minWidth: 56 }}
    >
      <Icon name={icon} size={19} color={color} strokeWidth={2} />
      <Text style={{ fontSize: 10.5, fontWeight: '700', color }}>{label}</Text>
    </Pressable>
  );
}

export default FloorSwitcher;
