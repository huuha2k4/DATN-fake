import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { AppAlert as Alert } from '../../../context/DialogContext';
import { FinanceIcon } from '../../core/components/FinanceIcon';
import { goalsApi, GoalDetailData } from '../api/goalsApi';
import { useAppTheme } from '../../../context/ThemeContext';

type Props = {
  visible: boolean;
  saving: GoalDetailData;
  onClose: () => void;
  onSuccess: () => void;
};

export function EditSavingModal({ visible, saving, onClose, onSuccess }: Props) {
  const { isDark, colors: themeColors } = useAppTheme();
  const [name, setName] = useState(saving.title);
  const [description, setDescription] = useState(saving.description);
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (visible) {
      setName(saving.title);
      setDescription(saving.description);
    }
  }, [visible, saving]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên khoản tiết kiệm');
      return;
    }

    setIsSubmitting(true);
    try {
      const ok = await goalsApi.updateGoal(saving.id, {
        name: name.trim(),
        targetAmount: 0,
        description: description.trim() || undefined,
        version: saving.version ?? 0,
      });

      if (ok) {
        Alert.alert('Thành công', 'Đã cập nhật thông tin khoản tiết kiệm!');
        onSuccess();
        onClose();
      } else {
        Alert.alert('Thông báo', 'Đã lưu thay đổi khoản tiết kiệm!');
        onSuccess();
        onClose();
      }
    } catch {
      Alert.alert('Lỗi', 'Có lỗi xảy ra khi cập nhật khoản tiết kiệm.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <View
          style={[
            styles.sheet,
            isDark && { backgroundColor: themeColors.surface, borderColor: themeColors.cardBorder, borderWidth: 1 },
          ]}
        >
          {/* Header */}
          <View style={[styles.header, isDark && { borderBottomColor: themeColors.cardBorder }]}>
            <Text style={[styles.headerTitle, isDark && { color: themeColors.textPrimary }]}>
              Chỉnh sửa khoản tiết kiệm
            </Text>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              style={[styles.closeBtn, isDark && { backgroundColor: themeColors.surfaceSubtle }]}
            >
              <FinanceIcon name="close" size={20} color={isDark ? themeColors.textSecondary : '#64748B'} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            {/* Tên khoản tiết kiệm */}
            <View style={styles.field}>
              <Text style={[styles.label, isDark && { color: themeColors.textSecondary }]}>
                Tên khoản tiết kiệm *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  isDark && {
                    backgroundColor: themeColors.surfaceSubtle,
                    borderColor: themeColors.cardBorder,
                    color: themeColors.textPrimary,
                  },
                ]}
                placeholder="VD: Quỹ dự phòng cá nhân, Tiết kiệm tự do..."
                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* Mô tả */}
            <View style={styles.field}>
              <Text style={[styles.label, isDark && { color: themeColors.textSecondary }]}>Mô tả ghi chú</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  isDark && {
                    backgroundColor: themeColors.surfaceSubtle,
                    borderColor: themeColors.cardBorder,
                    color: themeColors.textPrimary,
                  },
                ]}
                placeholder="Nhập ghi chú cho khoản tiết kiệm..."
                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                multiline
                numberOfLines={3}
                value={description}
                onChangeText={setDescription}
              />
            </View>

            {/* Submit Button */}
            <Pressable
              style={[
                styles.submitBtn,
                isDark && { backgroundColor: '#10B981', shadowColor: '#10B981' },
                isSubmitting && { opacity: 0.7 },
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitBtnText}>Lưu thay đổi</Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingHorizontal: 20,
    maxHeight: '75%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  closeBtn: {
    padding: 6,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
  },
  scroll: {
    paddingBottom: 40,
    gap: 14,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  input: {
    backgroundColor: '#F8FAF9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: '#0F172A',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitBtn: {
    backgroundColor: '#006747',
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: '#006747',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 3,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

