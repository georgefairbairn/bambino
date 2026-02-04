import { View, Text, Pressable, Modal, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Doc } from '@/convex/_generated/dataModel';
import { Fonts } from '@/constants/theme';
import { GenderBadge } from './gender-badge';
import { QuickActionButtons } from './quick-action-buttons';
import { RankBadge, PopularityChart } from '@/components/popularity';

type Context = 'swipe' | 'liked' | 'rejected';

interface NameDetailModalProps {
  visible: boolean;
  name: Doc<'names'> | null;
  context: Context;
  onClose: () => void;
  onLike?: () => void;
  onReject?: () => void;
  onRemove?: () => void;
  onRestore?: () => void;
  onHide?: () => void;
}

export function NameDetailModal({
  visible,
  name,
  context,
  onClose,
  onLike,
  onReject,
  onRemove,
  onRestore,
  onHide,
}: NameDetailModalProps) {
  if (!name) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          {/* Handle bar */}
          <View style={styles.handleBar} />

          {/* Header with close button */}
          <View style={styles.header}>
            <View style={styles.headerSpacer} />
            <Pressable onPress={onClose} style={styles.closeButton} hitSlop={10}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </Pressable>
          </View>

          <ScrollView
            style={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContainer}
          >
            {/* Badges */}
            <View style={styles.badgeContainer}>
              <GenderBadge gender={name.gender as 'boy' | 'girl' | 'unisex'} size="large" />
              <RankBadge rank={name.currentRank} size="large" />
            </View>

            {/* Name */}
            <Text style={styles.name}>{name.name}</Text>

            {/* Info cards */}
            <View style={styles.infoCards}>
              {name.origin && (
                <View style={styles.infoCard}>
                  <Text style={styles.infoLabel}>Origin</Text>
                  <Text style={styles.infoValue}>{name.origin}</Text>
                </View>
              )}

              {name.meaning && (
                <View style={styles.infoCard}>
                  <Text style={styles.infoLabel}>Meaning</Text>
                  <Text style={styles.infoValue}>{name.meaning}</Text>
                </View>
              )}

              {name.phonetic && (
                <View style={styles.infoCard}>
                  <Text style={styles.infoLabel}>Pronunciation</Text>
                  <Text style={styles.infoValue}>{name.phonetic}</Text>
                </View>
              )}
            </View>

            {/* Popularity chart */}
            {name.gender !== 'neutral' && (
              <PopularityChart
                name={name.name}
                gender={name.gender as 'male' | 'female' | 'neutral'}
              />
            )}

            {/* Quick action buttons */}
            <QuickActionButtons
              context={context}
              nameName={name.name}
              onLike={onLike}
              onReject={onReject}
              onRemove={onRemove}
              onRestore={onRestore}
              onHide={onHide}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  scrollContent: {
    flexGrow: 0,
  },
  scrollContainer: {
    paddingBottom: 16,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#d1d5db',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerSpacer: {
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  badgeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  name: {
    fontSize: 48,
    fontFamily: Fonts?.display || 'AlfaSlabOne_400Regular',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 24,
  },
  infoCards: {
    gap: 12,
  },
  infoCard: {
    backgroundColor: '#FFFBF5',
    borderRadius: 12,
    padding: 16,
  },
  infoLabel: {
    fontSize: 12,
    fontFamily: Fonts?.serif || 'Sanchez_400Regular',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontFamily: Fonts?.serif || 'Sanchez_400Regular',
    color: '#1a1a1a',
    lineHeight: 24,
  },
});
