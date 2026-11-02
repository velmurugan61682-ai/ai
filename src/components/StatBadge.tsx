import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface StatBadgeProps {
  label: string;
  value: string | number;
  bg?: string;
  textColor?: string;
}

export const StatBadge: React.FC<StatBadgeProps> = ({
  label,
  value,
  bg = '#EEF0FD',
  textColor = '#4D44E1',
}) => {
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>
      <Text style={[styles.value, { color: textColor }]}>{value}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    opacity: 0.85,
  },
  value: {
    fontSize: 12,
    fontWeight: '700',
  },
});

