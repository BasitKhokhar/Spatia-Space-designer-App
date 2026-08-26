import { View, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Rect, Line, G } from 'react-native-svg';

import Text from '@/components/ui/Text';
import Icon from '@/components/icons/Icon';
import { useTheme } from '@/theme/useTheme';
import { accent } from '@/theme/colors';

// Second hero-carousel page, alongside AiSpotlight. Same blueprint/gradient
// language and padding as AiSpotlight so the two pages read as one set while
// swiping, but carries its own "start from your own design" identity.
export default function NewProjectPromo({ onPress, style }) {
  const { radius, shadows } = useTheme();

  return (
    <View style={style}>
      <LinearGradient
        colors={[accent.a400, accent.a500, accent.a700]}
        locations={[0, 0.45, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          {
            borderRadius: radius.xxl,
            padding: 22,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.16)',
          },
          shadows.accent,
        ]}
      >
        <Svg
          viewBox="0 0 340 240"
          preserveAspectRatio="xMidYMid slice"
          style={StyleSheet.absoluteFill}
        >
          <G opacity={0.22}>
            <Rect x="232" y="120" width="112" height="86" rx="5" stroke="#fff" strokeWidth={1.6} fill="none" />
            <Line x1="232" y1="166" x2="288" y2="166" stroke="#fff" strokeWidth={1.6} />
            <Line x1="288" y1="166" x2="288" y2="206" stroke="#fff" strokeWidth={1.6} />
            <Line x1="300" y1="120" x2="300" y2="138" stroke="#fff" strokeWidth={1.6} />
          </G>
        </Svg>

        <View
          style={{
            width: 46,
            height: 46,
            borderRadius: radius.md,
            backgroundColor: 'rgba(255,255,255,0.16)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="plus" size={22} color="#fff" strokeWidth={2.4} />
        </View>

        <Text style={{ color: '#fff', fontFamily: 'Sora_700Bold', fontSize: 22, marginTop: 14 }}>
          Start a New Project
        </Text>
        <Text variant="bodySm" style={{ color: '#FBE6DD', marginTop: 4, maxWidth: 230 }}>
          Create from scratch or use a template to bring your ideas to life.
        </Text>

        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          hitSlop={8}
          style={({ pressed }) => ({
            marginTop: 18,
            alignSelf: 'flex-start',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: pressed ? '#F0E4DE' : '#fff',
            paddingHorizontal: 18,
            paddingVertical: 12,
            borderRadius: radius.pill,
          })}
        >
          <Text style={{ color: accent.a500, fontFamily: 'Manrope_700Bold', fontSize: 14 }}>Create New</Text>
          <Icon name="plus" size={15} color={accent.a500} strokeWidth={2.6} />
        </Pressable>
      </LinearGradient>
    </View>
  );
}
