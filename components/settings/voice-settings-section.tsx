import { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as Speech from 'expo-speech';
import { Ionicons } from '@expo/vector-icons';
import { useVoiceSettings } from '@/contexts/voice-settings-context';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';
import { LoadingIndicator } from '@/components/ui/loading-indicator';
import * as Sentry from '@sentry/react-native';

interface Voice {
  identifier: string;
  name: string;
  language: string;
  quality: string;
}

// Curated list of best human-sounding voices
const ALLOWED_VOICES = ['Samantha', 'Karen', 'Daniel', 'Moira', 'Tessa', 'Rishi'];

// Sample names to preview voice
const SAMPLE_NAMES = ['Emma', 'Oliver', 'Sophia', 'Liam', 'Charlotte'];

function getRandomSampleName(): string {
  return SAMPLE_NAMES[Math.floor(Math.random() * SAMPLE_NAMES.length)];
}

// Format language code to friendly name
function formatLanguage(code: string): string {
  const regions: Record<string, string> = {
    'en-US': 'American',
    'en-GB': 'British',
    'en-AU': 'Australian',
    'en-IE': 'Irish',
    'en-ZA': 'South African',
    'en-IN': 'Indian',
  };
  return regions[code] || code;
}

export function VoiceSettingsSection() {
  const { colors } = useTheme();
  const { voiceIdentifier, setVoiceIdentifier, isLoading: settingsLoading } = useVoiceSettings();
  const [voices, setVoices] = useState<Voice[]>([]);
  const [isLoadingVoices, setIsLoadingVoices] = useState(true);
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useFocusEffect(useCallback(() => {
    return () => setIsExpanded(false);
  }, []));

  // Fetch available voices on mount
  useEffect(() => {
    async function loadVoices() {
      try {
        const availableVoices = await Speech.getAvailableVoicesAsync();

        // Filter to only the allowed voices
        const filteredVoices = availableVoices
          .filter((v) => ALLOWED_VOICES.includes(v.name))
          .sort((a, b) => {
            // Sort by allowed order
            return ALLOWED_VOICES.indexOf(a.name) - ALLOWED_VOICES.indexOf(b.name);
          })
          .map((v) => ({
            identifier: v.identifier,
            name: v.name,
            language: v.language,
            quality: v.quality || 'Default',
          }));

        setVoices(filteredVoices);
      } catch (error) {
        Sentry.captureException(error);
      } finally {
        setIsLoadingVoices(false);
      }
    }
    loadVoices();
  }, []);

  const handleSelectVoice = useCallback(
    async (identifier: string | null) => {
      await setVoiceIdentifier(identifier);
      setIsExpanded(false);
    },
    [setVoiceIdentifier],
  );

  // Get display name for current selection
  const currentVoiceName = voiceIdentifier
    ? voices.find((v) => v.identifier === voiceIdentifier)?.name || 'Selected'
    : 'System Default';

  const handlePreviewVoice = useCallback(async (identifier: string | null) => {
    try {
      // Stop any current speech
      const isSpeaking = await Speech.isSpeakingAsync();
      if (isSpeaking) {
        await Speech.stop();
        setPreviewingVoice(null);
        return;
      }

      const voiceId = identifier || undefined;
      const sampleName = getRandomSampleName();

      setPreviewingVoice(identifier);
      Speech.speak(sampleName, {
        voice: voiceId,
        rate: 0.9,
        pitch: 1.0,
        onDone: () => setPreviewingVoice(null),
        onStopped: () => setPreviewingVoice(null),
        onError: () => setPreviewingVoice(null),
      });
    } catch (error) {
      Sentry.captureException(error);
      setPreviewingVoice(null);
    }
  }, []);

  const isLoading = settingsLoading || isLoadingVoices;

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingTitle}>Voice for Name Pronunciation</Text>
        <View style={styles.loadingContainer}>
          <LoadingIndicator size="small" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header row - tappable to expand/collapse */}
      <Pressable style={styles.headerRow} onPress={() => setIsExpanded(!isExpanded)}>
        <Ionicons name="volume-medium-outline" size={22} color="#6B5B7B" style={{ marginRight: 12 }} />
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Voice</Text>
          <Text style={styles.headerSubtitle}>{currentVoiceName}</Text>
        </View>
        <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={22} color="#A89BB5" />
      </Pressable>

      {/* Expandable voice list */}
      {isExpanded && (
        <>
          <View style={styles.voiceList}>
            {/* Auto option */}
            <VoiceOption
              label="System Default"
              isSelected={voiceIdentifier === null}
              isPreviewing={previewingVoice === null && previewingVoice !== undefined}
              onSelect={() => handleSelectVoice(null)}
              onPreview={() => handlePreviewVoice(null)}
            />

            {/* Available voices */}
            {voices.map((voice) => (
              <VoiceOption
                key={voice.identifier}
                label={voice.name}
                sublabel={formatLanguage(voice.language)}
                isSelected={voiceIdentifier === voice.identifier}
                isPreviewing={previewingVoice === voice.identifier}
                onSelect={() => handleSelectVoice(voice.identifier)}
                onPreview={() => handlePreviewVoice(voice.identifier)}
              />
            ))}
          </View>

          {/* Info note */}
          <View style={[styles.infoNote, { backgroundColor: colors.surfaceSubtle }]}>
            <Ionicons name="information-circle" size={20} color="#FFB86C" />
            <Text style={styles.infoNoteText}>
              If you cannot hear the voice, make sure your device is not on silent mode.
            </Text>
          </View>
        </>
      )}
    </View>
  );
}

interface VoiceOptionProps {
  label: string;
  sublabel?: string;
  isSelected: boolean;
  isPreviewing: boolean;
  onSelect: () => void;
  onPreview: () => void;
}

function VoiceOption({
  label,
  sublabel,
  isSelected,
  isPreviewing,
  onSelect,
  onPreview,
}: VoiceOptionProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      style={[
        styles.voiceOption,
        { borderColor: colors.border, backgroundColor: colors.surfaceSubtle },
        isSelected && { borderColor: colors.primary, backgroundColor: `${colors.primary}0D` },
      ]}
      onPress={onSelect}
    >
      <View style={styles.voiceOptionContent}>
        <View
          style={[
            styles.radioOuter,
            { borderColor: colors.border },
            isSelected && { borderColor: colors.primary, backgroundColor: colors.primary },
          ]}
        >
          {isSelected && <View style={styles.radioInner} />}
        </View>
        <View style={styles.voiceOptionTextContainer}>
          <Text style={[styles.voiceOptionLabel, isSelected && { color: colors.primary }]}>
            {label}
          </Text>
          {sublabel && <Text style={styles.voiceOptionSublabel}>{sublabel}</Text>}
        </View>
      </View>

      <Pressable
        style={styles.previewButton}
        onPress={onPreview}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons
          name={isPreviewing ? 'volume-high' : 'volume-medium-outline'}
          size={20}
          color={isPreviewing ? colors.primary : '#6B5B7B'}
        />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  loadingTitle: {
    fontSize: 18,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
    color: '#2D1B4E',
    marginBottom: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
    marginTop: 4,
  },
  voiceList: {
    marginTop: 16,
    gap: 8,
  },
  infoNote: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 8,
  },
  infoNoteText: {
    flex: 1,
    fontSize: 14,
    fontFamily: Fonts?.sans,
    color: '#6B5B7B',
  },
  voiceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 8,
    borderWidth: 2,
    padding: 12,
  },
  voiceOptionContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff',
  },
  voiceOptionTextContainer: {
    flex: 1,
  },
  voiceOptionLabel: {
    fontSize: 15,
    fontFamily: Fonts?.sans,
    fontWeight: '500',
    color: '#2D1B4E',
  },
  voiceOptionSublabel: {
    fontSize: 13,
    fontFamily: Fonts?.sans,
    color: '#6B5B7B',
  },
  previewButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
