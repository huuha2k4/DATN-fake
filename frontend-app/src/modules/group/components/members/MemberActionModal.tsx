import React from 'react';
import { Modal, View, Text, StyleSheet, Pressable } from 'react-native';
import { FinanceIcon } from '../../../core/components/FinanceIcon';
import { GroupMemberResponse } from '../../api/groupApi';
import { useAppTheme } from '../../../../context/ThemeContext';

export interface MemberActionModalProps {
  visible: boolean;
  member: GroupMemberResponse | null;
  canManage: boolean;
  onClose: () => void;
  onUpdateRole: (member: GroupMemberResponse, newRole: 'ADMIN' | 'MEMBER') => void;
  onRemoveMember: (member: GroupMemberResponse) => void;
}

export const MemberActionModal: React.FC<MemberActionModalProps> = ({
  visible,
  member,
  canManage,
  onClose,
  onUpdateRole,
  onRemoveMember,
}) => {
  const { isDark, colors: themeColors } = useAppTheme();
  if (!member) return null;

  const displayName =
    member.user?.fullName ||
    member.nickname ||
    member.fullName ||
    member.user?.displayName ||
    member.username ||
    'Thành viên';
  const email = member.user?.email || member.email || '';
  const isOwner = member.role === 'OWNER';
  const isAdmin = member.role === 'ADMIN';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            isDark && {
              backgroundColor: themeColors.surface,
              borderColor: themeColors.cardBorder,
              borderWidth: 1,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.title,
                  isDark && { color: themeColors.textPrimary },
                ]}
                numberOfLines={1}
              >
                {displayName}
              </Text>
              {!!email && (
                <Text
                  style={[
                    styles.subtitle,
                    isDark && { color: themeColors.textMuted },
                  ]}
                  numberOfLines={1}
                >
                  {email}
                </Text>
              )}
            </View>
            <View
              style={[
                styles.roleBadge,
                isOwner
                  ? (isDark ? { backgroundColor: 'rgba(245, 158, 11, 0.2)' } : styles.ownerBadge)
                  : isAdmin
                  ? (isDark ? { backgroundColor: 'rgba(99, 102, 241, 0.2)' } : styles.adminBadge)
                  : (isDark ? { backgroundColor: 'rgba(56, 189, 248, 0.2)' } : styles.memberBadge),
              ]}
            >
              <Text
                style={[
                  styles.roleBadgeText,
                  isOwner
                    ? (isDark ? { color: '#FBBF24' } : styles.ownerBadgeText)
                    : isAdmin
                    ? (isDark ? { color: '#818CF8' } : styles.adminBadgeText)
                    : (isDark ? { color: '#38BDF8' } : styles.memberBadgeText),
                ]}
              >
                {isOwner ? 'Trưởng nhóm' : isAdmin ? 'Quản trị' : 'Thành viên'}
              </Text>
            </View>
          </View>

          <View style={[styles.divider, isDark && { backgroundColor: themeColors.divider }]} />

          {/* Các nút thao tác */}
          {canManage && !isOwner ? (
            <View style={styles.actionList}>
              {/* Phân quyền / Đổi vai trò */}
              {isAdmin ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.actionItem,
                    isDark && { backgroundColor: themeColors.surfaceSubtle },
                    pressed && { opacity: 0.75 },
                  ]}
                  onPress={() => {
                    onClose();
                    onUpdateRole(member, 'MEMBER');
                  }}
                >
                  <View
                    style={[
                      styles.iconWrap,
                      isDark ? { backgroundColor: 'rgba(255, 255, 255, 0.08)' } : { backgroundColor: '#F1F5F9' },
                    ]}
                  >
                    <FinanceIcon name="shield" size={18} color={isDark ? themeColors.textSecondary : '#64748B'} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.actionTitle, isDark && { color: themeColors.textPrimary }]}>
                      Chuyển thành Thành viên
                    </Text>
                    <Text style={[styles.actionDesc, isDark && { color: themeColors.textMuted }]}>
                      Hạ quyền quản trị viên của người này
                    </Text>
                  </View>
                </Pressable>
              ) : (
                <Pressable
                  style={({ pressed }) => [
                    styles.actionItem,
                    isDark && { backgroundColor: themeColors.surfaceSubtle },
                    pressed && { opacity: 0.75 },
                  ]}
                  onPress={() => {
                    onClose();
                    onUpdateRole(member, 'ADMIN');
                  }}
                >
                  <View
                    style={[
                      styles.iconWrap,
                      isDark ? { backgroundColor: 'rgba(99, 102, 241, 0.2)' } : { backgroundColor: '#EEF2FF' },
                    ]}
                  >
                    <FinanceIcon name="shield" size={18} color={isDark ? '#818CF8' : '#6366F1'} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.actionTitle, isDark && { color: themeColors.textPrimary }]}>
                      Thăng quyền Quản trị viên
                    </Text>
                    <Text style={[styles.actionDesc, isDark && { color: themeColors.textMuted }]}>
                      Cho phép quản lý thành viên và duyệt chi tiêu
                    </Text>
                  </View>
                </Pressable>
              )}

              {/* Nút Xóa khỏi nhóm */}
              <Pressable
                style={({ pressed }) => [
                  styles.actionItem,
                  isDark
                    ? { backgroundColor: 'rgba(239, 68, 68, 0.12)' }
                    : { backgroundColor: '#FEF2F2' },
                  pressed && { opacity: 0.75 },
                ]}
                onPress={() => {
                  onClose();
                  onRemoveMember(member);
                }}
              >
                <View
                  style={[
                    styles.iconWrap,
                    isDark ? { backgroundColor: 'rgba(239, 68, 68, 0.2)' } : { backgroundColor: '#FEE2E2' },
                  ]}
                >
                  <FinanceIcon name="trash" size={18} color="#EF4444" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.actionTitle, { color: '#EF4444' }]}>Xóa khỏi nhóm</Text>
                  <Text style={[styles.actionDesc, isDark && { color: themeColors.textMuted }]}>
                    Loại thành viên này ra khỏi danh sách nhóm
                  </Text>
                </View>
              </Pressable>
            </View>
          ) : (
            <View style={[styles.noPermBox, isDark && { backgroundColor: themeColors.surfaceSubtle }]}>
              <Text style={[styles.noPermText, isDark && { color: themeColors.textMuted }]}>
                {isOwner
                  ? 'Đây là Trưởng nhóm sáng lập, không thể chỉnh sửa hoặc xóa.'
                  : 'Bạn không có quyền quản trị để thao tác với thành viên này.'}
              </Text>
            </View>
          )}

          {/* Nút Đóng */}
          <Pressable
            style={[
              styles.closeBtn,
              isDark && { backgroundColor: themeColors.surfaceSubtle },
            ]}
            onPress={onClose}
          >
            <Text style={[styles.closeBtnText, isDark && { color: themeColors.textPrimary }]}>Đóng</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 2,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 14,
  },
  ownerBadge: { backgroundColor: '#FEF3C7' },
  ownerBadgeText: { color: '#D97706', fontSize: 11.5, fontWeight: '700' },
  adminBadge: { backgroundColor: '#EEF2FF' },
  adminBadgeText: { color: '#6366F1', fontSize: 11.5, fontWeight: '700' },
  memberBadge: { backgroundColor: '#F1F5F9' },
  memberBadgeText: { color: '#64748B', fontSize: 11.5, fontWeight: '700' },
  roleBadgeText: { fontSize: 11.5 },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 16,
  },
  actionList: {
    gap: 10,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    gap: 14,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  actionDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  noPermBox: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  noPermText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  closeBtn: {
    marginTop: 16,
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
});

export default MemberActionModal;

