import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ThemeColors } from '../theme/theme';

interface HeaderProps {
  title: string;
  subtitle?: string;
  colors: ThemeColors;
  rightAction?: React.ReactNode;
  leftAction?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  colors,
  rightAction,
  leftAction,
}) => {
  return (
    <View style={[styles.headerContainer, { borderBottomColor: colors.divider }]}>
      <View style={styles.leftRow}>
        {leftAction}
        <View style={styles.textCol}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>
          ) : null}
        </View>
      </View>
      {rightAction && <View style={styles.rightAction}>{rightAction}</View>}
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  textCol: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  rightAction: {
    marginLeft: 12,
  },
});

