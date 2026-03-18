import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/theme-context';
import { THEME_META, type ThemeKey } from '@/constants/theme';
import { Fonts } from '@/constants/theme';

export function ThemePickerSection() {
  const { themeKey, setTheme, colors } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);

  const currentMeta = THEME_META.find((t) => t.key === themeKey)!;

  const handleSelect = async (key: ThemeKey) => {
    await setTheme(key);
    setIsExpanded(false);
  };

  return (
    <View style={styles.container}>
      <Pressable style={styles.headerRow} onPress={() => setIsExpanded(!isExpanded)}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Theme</Text>
          <Text style={styles.headerSubtitle}>
            {currentMeta.emoji} {currentMeta.name}
          </Text>
        </View>
        <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={24} color="#6B5B7B" />
      </Pressable>

      {isExpanded && (
        <View style={styles.themeList}>
          {THEME_META.map((meta) => {
            const isSelected = meta.key === themeKey;
            return (
              <Pressable
                key={meta.key}
                style={[
                  styles.themeOption,
                  isSelected && {
                    borderColor: colors.primary,
                    backgroundColor: `${colors.primary}08`,
                  },
                ]}
                onPress={() => handleSelect(meta.key)}
              >
                <View style={styles.themeOptionContent}>
                  <LinearGradient
                    colors={[...meta.previewColors]}
                    style={styles.colorSwatch}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  />
                  <View style={styles.themeOptionTextContainer}>
                    <Text
                      style={[styles.themeOptionLabel, isSelected && { color: colors.primary }]}
                    >
                      {meta.emoji} {meta.name}
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.radioOuter,
                    isSelected && { borderColor: colors.primary, backgroundColor: colors.primary },
                  ]}
                >
                  {isSelected && <View style={styles.radioInner} />}
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
    color: '#2D1B4E',
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: Fonts?.sans,
    color: '#6B5B7B',
  },
  themeList: {
    marginTop: 16,
    gap: 8,
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    padding: 12,
  },
  themeOptionContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  themeOptionTextContainer: {
    flex: 1,
  },
  themeOptionLabel: {
    fontSize: 15,
    fontFamily: Fonts?.sans,
    fontWeight: '500',
    color: '#2D1B4E',
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff',
  },
});
