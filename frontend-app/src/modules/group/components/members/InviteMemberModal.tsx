import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FinanceIcon } from '../../../core/components/FinanceIcon';
import { userProfileApi } from '../../../profile/api/userProfileApi';
import { UserSearchResult } from '../../api/groupApi';

export interface InviteMemberModalProps {
  visible: boolean;
  onClose: () => void;
  searchQuery: string;
  onChangeSearchQuery: (text: string) => void;
  searchResults: UserSearchResult[];
  searching: boolean;
  onInviteUser: (user: UserSearchResult) => void;
  existingMemberUserIds?: string[];
}

export const InviteMemberModal: React.FC<InviteMemberModalProps> = ({
  visible,
  onClose,
  searchQuery,
  onChangeSearchQuery,
  searchResults,
  searching,
  onInviteUser,
  existingMemberUserIds = [],
}) => {
  const insets = useSafeAreaInsets();
  const trimmed = searchQuery.trim();
  const hasAtSymbol = trimmed.includes('@');

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Mời thành viên vào nhóm</Text>
              <Text style={styles.modalSubtitle}>Nhập email người bạn muốn mời</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <FinanceIcon name="close" size={16} color="#64748B" />
            </Pressable>
          </View>

          {/* Ô tìm kiếm email */}
          <View style={styles.searchBar}>
            <FinanceIcon name="search" size={18} color="#94A3B8" />
            <TextInput
              value={searchQuery}
              onChangeText={onChangeSearchQuery}
              placeholder="Nhập email (VD: user@...)"
              placeholderTextColor="#94A3B8"
              style={styles.searchInput}
              autoCapitalize="none"
              keyboardType="email-address"
              autoFocus
            />
            {!!searchQuery && (
              <Pressable onPress={() => onChangeSearchQuery('')} hitSlop={8}>
                <FinanceIcon name="close" size={14} color="#94A3B8" />
              </Pressable>
            )}
          </View>

          {/* Nội dung kết quả tìm kiếm */}
          <View style={styles.contentBox}>
            {searching ? (
              <View style={styles.centerBox}>
                <ActivityIndicator color="#059669" size="small" />
                <Text style={styles.statusText}>Đang tìm kiếm tài khoản...</Text>
              </View>
            ) : searchResults.length > 0 ? (
              <FlatList
                data={searchResults}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={true}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => {
                  const isAlreadyMember = existingMemberUserIds.includes(item.id);
                  const avatarUri = item.avatarUrl ? userProfileApi.formatAvatarUrl(item.avatarUrl) : null;
                  const letter = (item.fullName || item.username || item.email || 'U').slice(0, 1).toUpperCase();

                  return (
                    <View style={styles.userRow}>
                      {/* Avatar */}
                      <View style={styles.avatarWrap}>
                        {avatarUri ? (
                          <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
                        ) : (
                          <View style={styles.avatarPlaceholder}>
                            <Text style={styles.avatarText}>{letter}</Text>
                          </View>
                        )}
                      </View>

                      {/* Info */}
                      <View style={styles.userInfoCol}>
                        <Text style={styles.userName} numberOfLines={1}>
                          {item.fullName || item.username || 'Người dùng Finora'}
                        </Text>
                        <Text style={styles.userEmail} numberOfLines={1}>
                          {item.email}
                        </Text>
                      </View>

                      {/* Nút thao tác */}
                      {isAlreadyMember ? (
                        <View style={styles.alreadyBadge}>
                          <Text style={styles.alreadyBadgeText}>Đã tham gia</Text>
                        </View>
                      ) : (
                        <Pressable
                          style={({ pressed }) => [
                            styles.inviteActionBtn,
                            pressed && { opacity: 0.8 },
                          ]}
                          onPress={() => onInviteUser(item)}
                        >
                          <FinanceIcon name="plus" size={13} color="#FFFFFF" />
                          <Text style={styles.inviteActionBtnText}>Mời</Text>
                        </Pressable>
                      )}
                    </View>
                  );
                }}
              />
            ) : hasAtSymbol ? (
              <View style={styles.centerBox}>
                <Text style={styles.statusText}>Không tìm thấy tài khoản phù hợp</Text>
                <Text style={styles.hintSubText}>Hãy kiểm tra lại chính xác địa chỉ email của người nhận</Text>
              </View>
            ) : (
              <View style={styles.centerBox}>
                <FinanceIcon name="shield" size={32} color="#10B981" />
                <Text style={[styles.hintSubText, { fontWeight: '600', color: '#475569' }]}>
                  Bảo mật danh sách người dùng
                </Text>
                <Text style={styles.hintSubText}>
                  Gõ email đến ký tự @ (ví dụ: name@...) để bắt đầu tìm kiếm
                </Text>
              </View>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: 0,
  },
  contentBox: {
    marginTop: 14,
    height: 240,
  },
  centerBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    gap: 8,
  },
  statusText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#64748B',
  },
  hintSubText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 18,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
    gap: 12,
  },
  avatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  userInfoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  userName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  userEmail: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  inviteActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#059669',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
  },
  inviteActionBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  alreadyBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  alreadyBadgeText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#94A3B8',
  },
});

export default InviteMemberModal;
