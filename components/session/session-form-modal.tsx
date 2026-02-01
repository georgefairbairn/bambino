import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/constants/theme';
import { GenderFilterSelector } from './gender-filter-selector';
import { OriginPicker } from './origin-picker';

type GenderFilter = 'boy' | 'girl' | 'both';

interface SessionData {
  name: string;
  genderFilter: GenderFilter;
  originFilter: string[];
}

interface Session {
  _id: string;
  name: string;
  genderFilter: GenderFilter;
  originFilter?: string[];
  role: 'owner' | 'partner';
}

interface SessionFormModalProps {
  visible: boolean;
  session?: Session | null;
  onClose: () => void;
  onSubmit: (data: SessionData) => void;
  onDelete?: () => void;
  isSubmitting?: boolean;
}

export function SessionFormModal({
  visible,
  session,
  onClose,
  onSubmit,
  onDelete,
  isSubmitting,
}: SessionFormModalProps) {
  const [name, setName] = useState('');
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('both');
  const [originFilter, setOriginFilter] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const isEditMode = !!session;
  const canDelete = isEditMode && session?.role === 'owner';

  // Reset form when modal opens/closes or session changes
  useEffect(() => {
    if (visible) {
      if (session) {
        setName(session.name);
        setGenderFilter(session.genderFilter);
        setOriginFilter(session.originFilter ?? []);
      } else {
        setName('');
        setGenderFilter('both');
        setOriginFilter([]);
      }
      setError(null);
    }
  }, [visible, session]);

  const handleSubmit = () => {
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }
    setError(null);
    onSubmit({ name: trimmedName, genderFilter, originFilter });
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Session',
      'Are you sure you want to delete this session? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: onDelete,
        },
      ],
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          {/* Handle bar */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{isEditMode ? 'Edit Session' : 'New Session'}</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </Pressable>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Form */}
            <View style={styles.form}>
              {/* Name input */}
              <View style={styles.field}>
                <Text style={styles.label}>Session Name</Text>
                <TextInput
                  style={[styles.input, error && styles.inputError]}
                  value={name}
                  onChangeText={(text) => {
                    setName(text);
                    setError(null);
                  }}
                  placeholder="e.g., Baby Boy Names"
                  placeholderTextColor="#9ca3af"
                  autoFocus={!isEditMode}
                  maxLength={50}
                />
                {error && <Text style={styles.errorText}>{error}</Text>}
              </View>

              {/* Gender filter */}
              <View style={styles.field}>
                <Text style={styles.label}>Show Names For</Text>
                <GenderFilterSelector value={genderFilter} onChange={setGenderFilter} />
              </View>

              {/* Origin filter */}
              <View style={styles.field}>
                <Text style={styles.label}>Name Origins</Text>
                <OriginPicker value={originFilter} onChange={setOriginFilter} />
              </View>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <Pressable
                style={[styles.submitButton, isSubmitting && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                <Text style={styles.submitButtonText}>
                  {isEditMode ? 'Save Changes' : 'Create Session'}
                </Text>
              </Pressable>

              {canDelete && (
                <Pressable
                  style={[styles.deleteButton, isSubmitting && styles.buttonDisabled]}
                  onPress={handleDelete}
                  disabled={isSubmitting}
                >
                  <Ionicons name="trash-outline" size={18} color="#dc2626" />
                  <Text style={styles.deleteButtonText}>Delete Session</Text>
                </Pressable>
              )}
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
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
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#d1d5db',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontFamily: Fonts?.display || 'AlfaSlabOne_400Regular',
    color: '#1a1a1a',
  },
  closeButton: {
    padding: 4,
  },
  form: {
    gap: 20,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontFamily: Fonts?.serif || 'Sanchez_400Regular',
    color: '#4b5563',
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: Fonts?.serif || 'Sanchez_400Regular',
    color: '#1a1a1a',
  },
  inputError: {
    borderColor: '#dc2626',
  },
  errorText: {
    fontSize: 12,
    color: '#dc2626',
    fontFamily: Fonts?.serif || 'Sanchez_400Regular',
  },
  actions: {
    marginTop: 32,
    gap: 12,
  },
  submitButton: {
    backgroundColor: '#0a7ea4',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: Fonts?.serif || 'Sanchez_400Regular',
    color: '#ffffff',
    fontWeight: '600',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  deleteButtonText: {
    fontSize: 14,
    fontFamily: Fonts?.serif || 'Sanchez_400Regular',
    color: '#dc2626',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
