import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { FinanceIcon } from '../../../core/components/FinanceIcon';
import { GroupResponse, GroupType, groupApi } from '../../api/groupApi';

export interface GroupSettingsTabProps {
  group: GroupResponse;
  isOwner: boolean;
  isAdmin: boolean;
  notificationEnabled: boolean;
  onToggleNotification: (enabled: boolean) => void;
  onGroupUpdated: (updatedGroup: GroupResponse) => void;
  onGroupDeleted: () => void;
  onLeaveGroup: () => void;
}

const GROUP_TYPE_OPTIONS: { key: GroupType; label: string; icon: string; desc: string }[] = [
  { key: 'FAMILY', label: 'Gia đình', icon: 'home', desc: 'Có hỗ trợ ví trẻ em & quỹ gia đình' },
  { key: 'ROOMMATE', label: 'Ở ghép', icon: 'users', desc: 'Chia tiền phòng, điện nước hàng tháng' },
  { key: 'TRAVEL', label: 'Du lịch', icon: 'car', desc: 'Quản lý lịch trình & chia đều chuyến đi' },
  { key: 'PROJECT', label: 'Dự án', icon: 'briefcase', desc: 'Theo dõi ngân sách công việc, dự án' },
  { key: 'COUPLE', label: 'Cặp đôi', icon: 'heart', desc: 'Cùng nhau vun đắp tài chính chung' },
  { key: 'OTHER', label: 'Khác', icon: 'grid', desc: 'Hội bạn bè, câu lạc bộ...' },
];

export const GroupSettingsTab: React.FC<GroupSettingsTabProps> = ({
  group,
  isOwner,
  isAdmin,
  notificationEnabled,
  onToggleNotification,
  onGroupUpdated,
  onGroupDeleted,
  onLeaveGroup,
}) => {
  const isLeader = isOwner || isAdmin;

  const [name, setName] = useState(group.name || '');
  const [description, setDescription] = useState(group.description || '');
  const [groupType, setGroupType] = useState<GroupType>(group.groupType || 'FAMILY');
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Cấu hình tính năng
  const [enableChat, setEnableChat] = useState(true);
  const [enableChildWallets, setEnableChildWallets] = useState(group.groupType === 'FAMILY');

  const [isDeleting, setIsDeleting] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    setName(group.name || '');
    setDescription(group.description || '');
    setGroupType(group.groupType || 'FAMILY');
    setEnableChildWallets(group.groupType === 'FAMILY');
  }, [group]);

  const handleSaveInfo = async () => {
    if (!name.trim()) {
      Alert.alert('Lưu ý', 'Tên nhóm không được để trống.');
      return;
    }
    setIsSaving(true);
    try {
      const updated = await groupApi.updateGroup(group.id, {
        name: name.trim(),
        description: description.trim(),
        groupType,
      });
      Alert.alert('Thành công', 'Đã lưu thay đổi thông tin nhóm!');
      onGroupUpdated(updated || { ...group, name: name.trim(), description: description.trim(), groupType });
    } catch (err: any) {
      Alert.alert('Lỗi cập nhật', err?.message || 'Không thể lưu cài đặt nhóm');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDeleteGroup = () => {
    Alert.alert(
      'Giải tán nhóm',
      `Bạn có chắc chắn muốn xóa vĩnh viễn nhóm "${group.name}"? Toàn bộ giao dịch, lịch sử quỹ và tin nhắn sẽ bị xóa.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa nhóm',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await groupApi.deleteGroup(group.id);
              Alert.alert('Đã xóa', 'Nhóm đã được giải tán thành công.');
              onGroupDeleted();
            } catch (err: any) {
              Alert.alert('Không thể xóa', err?.message || 'Vui lòng quyết toán toàn bộ số dư trước khi xóa nhóm.');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const confirmLeaveGroup = () => {
    Alert.alert(
      'Rời nhóm',
      `Bạn có chắc muốn rời khỏi nhóm "${group.name}"?`,
      [
        { text: 'Ở lại', style: 'cancel' },
        {
          text: 'Rời nhóm',
          style: 'destructive',
          onPress: async () => {
            setIsLeaving(true);
            try {
              await groupApi.leaveGroup(group.id);
              Alert.alert('Đã rời nhóm', 'Bạn đã rời khỏi nhóm thành công.');
              onLeaveGroup();
            } catch (err: any) {
              Alert.alert('Không thể rời nhóm', err?.message || 'Bạn còn số dư chưa quyết toán trong nhóm.');
            } finally {
              setIsLeaving(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* 1. THÔNG TIN CHUNG CỦA NHÓM */}
      <View style={styles.cardContainer}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.headerTitleWrap}>
            <View style={styles.iconCircle}>
              <FinanceIcon name="edit" size={16} color="#059669" />
            </View>
            <Text style={styles.sectionTitle}>Thông tin nhóm</Text>
          </View>
          {!isLeader && (
            <View style={styles.readOnlyBadge}>
              <Text style={styles.readOnlyBadgeText}>Chỉ xem</Text>
            </View>
          )}
        </View>

        <View style={styles.formCol}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Tên nhóm *</Text>
            <TextInput
              style={[styles.textInput, !isLeader && styles.textInputDisabled]}
              value={name}
              onChangeText={setName}
              placeholder="Nhập tên nhóm..."
              placeholderTextColor="#94A3B8"
              editable={isLeader}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Mô tả mục đích nhóm</Text>
            <TextInput
              style={[styles.textArea, !isLeader && styles.textInputDisabled]}
              value={description}
              onChangeText={setDescription}
              placeholder="Ví dụ: Cùng nhau chia sẻ tiền trọ và chi tiêu gia đình..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={3}
              editable={isLeader}
            />
          </View>

          {/* Chọn loại nhóm (Dạng Thả Xuống / Dropdown) */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Phân loại nhóm</Text>
            {(() => {
              const currentTypeOpt = GROUP_TYPE_OPTIONS.find((o) => o.key === groupType) || GROUP_TYPE_OPTIONS[0];
              return (
                <View style={styles.dropdownContainer}>
                  {/* Thanh hiển thị loại nhóm hiện tại */}
                  <Pressable
                    disabled={!isLeader}
                    onPress={() => setTypeDropdownOpen(!typeDropdownOpen)}
                    style={({ pressed }) => [
                      styles.dropdownTrigger,
                      typeDropdownOpen && styles.dropdownTriggerActive,
                      !isLeader && styles.dropdownTriggerDisabled,
                      pressed && isLeader && { opacity: 0.85 },
                    ]}
                  >
                    <View style={styles.dropdownSelectedLeft}>
                      <View style={[styles.typeIconCircle, { backgroundColor: '#ECFDF5' }]}>
                        <FinanceIcon name={currentTypeOpt.icon as any} size={18} color="#059669" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.dropdownSelectedLabel}>{currentTypeOpt.label}</Text>
                        <Text style={styles.dropdownSelectedDesc} numberOfLines={1}>
                          {currentTypeOpt.desc}
                        </Text>
                      </View>
                    </View>
                    {isLeader && (
                      <FinanceIcon
                        name={typeDropdownOpen ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color="#64748B"
                      />
                    )}
                  </Pressable>

                  {/* Danh sách thả dọc các lựa chọn khi bấm mở */}
                  {typeDropdownOpen && isLeader && (
                    <View style={styles.dropdownMenu}>
                      {GROUP_TYPE_OPTIONS.map((opt, index) => {
                        const isSelected = groupType === opt.key;
                        return (
                          <Pressable
                            key={opt.key}
                            onPress={() => {
                              setGroupType(opt.key);
                              setTypeDropdownOpen(false);
                            }}
                            style={({ pressed }) => [
                              styles.dropdownMenuItem,
                              index < GROUP_TYPE_OPTIONS.length - 1 && styles.dropdownMenuItemBorder,
                              isSelected && styles.dropdownMenuItemActive,
                              pressed && { backgroundColor: '#F1F5F9' },
                            ]}
                          >
                            <View
                              style={[
                                styles.typeIconCircle,
                                isSelected ? { backgroundColor: '#D1FAE5' } : { backgroundColor: '#F8FAFC' },
                              ]}
                            >
                              <FinanceIcon
                                name={opt.icon as any}
                                size={18}
                                color={isSelected ? '#059669' : '#64748B'}
                              />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text
                                style={[
                                  styles.menuItemLabel,
                                  isSelected && styles.menuItemLabelActive,
                                ]}
                              >
                                {opt.label}
                              </Text>
                              <Text style={styles.menuItemDesc} numberOfLines={1}>
                                {opt.desc}
                              </Text>
                            </View>
                            {isSelected && (
                              <FinanceIcon name="check" size={16} color="#059669" />
                            )}
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })()}
          </View>

          {/* Nút lưu thay đổi thông tin (dành cho Trưởng nhóm/Quản trị) */}
          {isLeader && (
            <Pressable
              onPress={handleSaveInfo}
              disabled={isSaving}
              style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.85 }]}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <FinanceIcon name="check" size={16} color="#FFFFFF" />
                  <Text style={styles.saveBtnText}>Lưu thay đổi</Text>
                </>
              )}
            </Pressable>
          )}
        </View>
      </View>

      {/* 2. CẤU HÌNH THÔNG BÁO & TÍNH NĂNG */}
      <View style={styles.cardContainer}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.headerTitleWrap}>
            <View style={styles.iconCircle}>
              <FinanceIcon name="bell" size={16} color="#059669" />
            </View>
            <Text style={styles.sectionTitle}>Thông báo & Tính năng</Text>
          </View>
        </View>

        <View style={styles.optionsList}>
          {/* Nhận thông báo giao dịch & tin nhắn */}
          <View style={styles.optionRow}>
            <View style={styles.optionInfo}>
              <Text style={styles.optionTitle}>Thông báo nhóm</Text>
              <Text style={styles.optionDesc}>
                Nhận thông báo khi có giao dịch mới, tin nhắn hoặc yêu cầu quỹ
              </Text>
            </View>
            <Switch
              value={notificationEnabled}
              onValueChange={onToggleNotification}
              trackColor={{ false: '#E2E8F0', true: '#10B981' }}
              thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
            />
          </View>

          <View style={styles.optionDivider} />

          {/* Kênh trò chuyện nhóm */}
          <View style={styles.optionRow}>
            <View style={styles.optionInfo}>
              <Text style={styles.optionTitle}>Trò chuyện nội bộ</Text>
              <Text style={styles.optionDesc}>
                Bật phòng chat riêng để các thành viên trao đổi hóa đơn
              </Text>
            </View>
            <Switch
              value={enableChat}
              onValueChange={isLeader ? setEnableChat : undefined}
              disabled={!isLeader}
              trackColor={{ false: '#E2E8F0', true: '#10B981' }}
              thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
            />
          </View>

          {/* Hỗ trợ ví trẻ em */}
          {groupType === 'FAMILY' && (
            <>
              <View style={styles.optionDivider} />
              <View style={styles.optionRow}>
                <View style={styles.optionInfo}>
                  <Text style={styles.optionTitle}>Quản lý ví trẻ em</Text>
                  <Text style={styles.optionDesc}>
                    Cấp tiền tiêu vặt, theo dõi chi tiêu và nhiệm vụ học tập cho bé
                  </Text>
                </View>
                <Switch
                  value={enableChildWallets}
                  onValueChange={isLeader ? setEnableChildWallets : undefined}
                  disabled={!isLeader}
                  trackColor={{ false: '#E2E8F0', true: '#10B981' }}
                  thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
                />
              </View>
            </>
          )}
        </View>
      </View>

      {/* 3. KHU VỰC NGUY HIỂM: RỜI NHÓM HOẶC GIẢI TÁN NHÓM */}
      <View style={[styles.cardContainer, styles.dangerCard]}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.headerTitleWrap}>
            <View style={[styles.iconCircle, { backgroundColor: '#FEE2E2' }]}>
              <FinanceIcon name="alert-circle" size={16} color="#DC2626" />
            </View>
            <Text style={[styles.sectionTitle, { color: '#DC2626' }]}>Vùng nguy hiểm</Text>
          </View>
        </View>

        <View style={styles.dangerActionsCol}>
          {/* Trưởng nhóm: Nút Xóa / Giải tán nhóm */}
          {isOwner ? (
            <View style={styles.dangerActionItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.dangerActionTitle}>Giải tán nhóm này</Text>
                <Text style={styles.dangerActionDesc}>
                  Xóa toàn bộ dữ liệu giao dịch, quỹ và lịch sử chi tiêu của nhóm. Hành động này không thể hoàn tác.
                </Text>
              </View>
              <Pressable
                onPress={confirmDeleteGroup}
                disabled={isDeleting}
                style={({ pressed }) => [styles.deleteGroupBtn, pressed && { opacity: 0.8 }]}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <FinanceIcon name="trash" size={14} color="#FFFFFF" />
                    <Text style={styles.deleteGroupBtnText}>Xóa nhóm</Text>
                  </>
                )}
              </Pressable>
            </View>
          ) : (
            /* Thành viên / Quản trị viên: Nút Rời nhóm */
            <View style={styles.dangerActionItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.dangerActionTitle}>Rời khỏi nhóm</Text>
                <Text style={styles.dangerActionDesc}>
                  Bạn sẽ không còn truy cập được các khoản chi tiêu và quỹ chung của nhóm này nữa.
                </Text>
              </View>
              <Pressable
                onPress={confirmLeaveGroup}
                disabled={isLeaving}
                style={({ pressed }) => [styles.leaveGroupBtn, pressed && { opacity: 0.8 }]}
              >
                {isLeaving ? (
                  <ActivityIndicator size="small" color="#DC2626" />
                ) : (
                  <>
                    <FinanceIcon name="logout" size={14} color="#DC2626" />
                    <Text style={styles.leaveGroupBtnText}>Rời nhóm</Text>
                  </>
                )}
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 16,
    paddingBottom: 32,
  },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  readOnlyBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  readOnlyBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  formCol: {
    gap: 14,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
    minHeight: 72,
    textAlignVertical: 'top',
  },
  textInputDisabled: {
    backgroundColor: '#F1F5F9',
    color: '#64748B',
  },
  dropdownContainer: {
    position: 'relative',
    zIndex: 10,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 12,
  },
  dropdownTriggerActive: {
    borderColor: '#059669',
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
  },
  dropdownTriggerDisabled: {
    backgroundColor: '#F1F5F9',
  },
  dropdownSelectedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  dropdownSelectedLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  dropdownSelectedDesc: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  typeIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownMenu: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    marginTop: 6,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  dropdownMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 12,
    backgroundColor: '#FFFFFF',
  },
  dropdownMenuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dropdownMenuItemActive: {
    backgroundColor: '#F0FDF4',
  },
  menuItemLabel: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#334155',
  },
  menuItemLabelActive: {
    color: '#059669',
  },
  menuItemDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 6,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  optionsList: {
    gap: 12,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  optionDesc: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  optionDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  dangerCard: {
    borderColor: '#FECACA',
    backgroundColor: '#FFFBFB',
  },
  dangerActionsCol: {
    gap: 14,
  },
  dangerActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  dangerActionTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#991B1B',
  },
  dangerActionDesc: {
    fontSize: 11,
    color: '#B91C1C',
    marginTop: 2,
    lineHeight: 15,
  },
  deleteGroupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  deleteGroupBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  leaveGroupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  leaveGroupBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#DC2626',
  },
});

