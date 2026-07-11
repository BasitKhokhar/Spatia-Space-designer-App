import { Text as RNText } from 'react-native';

import { useTheme } from '@/theme/useTheme';

// Themed text. `variant` maps to the type scale; `color` maps to a token key
// (e.g. "ink", "ink2", "accent") or an explicit hex string.
export default function Text({
  variant = 'body',
  color = 'ink',
  align,
  style,
  children,
  numberOfLines,
  ...rest
}) {
  const { type, colors } = useTheme();
  const resolvedColor = colors[color] || color;

  return (
    <RNText
      numberOfLines={numberOfLines}
      style={[type[variant] || type.body, { color: resolvedColor }, align && { textAlign: align }, style]}
      {...rest}
    >
      {children}
    </RNText>
  );
}
