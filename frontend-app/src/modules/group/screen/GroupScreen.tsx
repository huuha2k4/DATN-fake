import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export interface GroupItem {
  id: string;
  name: string;
  type: 'FAMILY' | 'ROOMMATE' | 'TRAVEL' | 'PROJECT' | 'COUPLE' | 'OTHER';
  description: string;
  memberCount: number;
  totalBalance: number;
  myBalance: number; // > 0: được nhận lại, < 0: cần trả
  currency: string;
}

const MOCK_GROUPS: GroupItem[] = [
  {
    id: 'g-1',
    name: 'Gia đình nhỏ Finora',
    type: 'FAMILY',
    description: 'Quỹ chi tiêu sinh hoạt, tiền chợ và học phí',
    memberCount: 4,
    totalBalance: 15400000,
    myBalance: 0,
    currency: '₫',
  },
  {
    id: 'g-2',
    name: 'Phòng 402 - KTX ĐHQG',
    type: 'ROOMMATE',
    description: 'Tiền phòng, điện nước và nhu yếu phẩm chung',
    memberCount: 3,
    totalBalance: 3200000,
    myBalance: -350000,
    currency: '₫',
  },
  {
    id: 'g-3',
    name: 'Du lịch Đà Lạt 2026',
    type: 'TRAVEL',
    description: 'Homestay, thuê xe và ăn uống chuyến đi',
    memberCount: 6,
    totalBalance: 8650000,
    myBalance: 620000,
    currency: '₫',
  },
];

const GROUP_TYPE_MAP = {
  FAMILY: { label: 'Gia đình', icon: '🏠', color: '#006747', bg: '#EAF8F1' },
  ROOMMATE: { label: 'Bạn cùng phòng', icon: '🏢', color: '#2563EB', bg: '#EFF6FF' },
  TRAVEL: { label: 'Du lịch', icon: '✈️', color: '#D97706', bg: '#FEF3C7' },
  PROJECT: { label: 'Dự án / Quỹ chung', icon: '💼', color: '#7C3AED', bg: '#F3E8FF' },
  COUPLE: { label: 'Cặp đôi', icon: '❤️', color: '#E11D48', bg: '#FFE4E6' },
  OTHER: { label: 'Nhóm khác', icon: '👥', color: '#475569', bg: '#F1F5F9' },
};

function formatCurrency(amount: number) {
  return amount.toLocaleString('vi-VN');
}

export function GroupScreen() {
  const [groups, setGroups] = useState<GroupItem[]>(MOCK_GROUPS);
  const [refreshing, setRefreshing] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupType, setNewGroupType] = useState<GroupItem['type']>('FAMILY');
  const [newGroupDesc, setNewGroupDesc] = useState('');

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 800);
  };

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) return;
    const newGroup: GroupItem = {
      id: `g-${Date.now()}`,
      name: newGroupName.trim(),
      type: newGroupType,
      description: newGroupDesc.trim() || 'Nhóm tài chính chung',
      memberCount: 1,
      totalBalance: 0,
      myBalance: 0,
      currency: '₫',
    };
    setGroups([newGroup, ...groups]);
    setNewGroupName('');
    setNewGroupDesc('');
    setCreateModalVisible(false);
  };

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Nhóm & Quỹ chung</Text>
          <Text style={styles.headerSubtitle}>
            Quản lý chi tiêu gia đình, bạn cùng phòng & chuyến đi
          </Text>
        </View>
        <Pressable
          onPress={() => setCreateModalVisible(true)}
          style={({ pressed }) => [styles.createBtn, pressed && styles.pressed]}
        >
          <Text style={styles.createBtnText}>+ Tạo nhóm</Text>
        </Pressable>
      </View>

      {/* Feature Highlight banner */}
      <View style={styles.highlightBanner}>
        <View style={styles.highlightIconBox}>
          <Text style={styles.highlightIcon}>✨</Text>
        </View>
        <View style={styles.highlightTextWrap}>
          <Text style={styles.highlightTitle}>Finora Group Smart Share</Text>
          <Text style={styles.highlightDesc}>
            Tự động tính toán chia đều hóa đơn, cấn trừ công nợ và quản lý ví con trẻ (Child Wallet).
          </Text>
        </View>
      </View>

      {/* Group List */}
      <FlatList
        data={groups}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#006747']} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const typeInfo = GROUP_TYPE_MAP[item.type] || GROUP_TYPE_MAP.OTHER;
          return (
            <Pressable style={({ pressed }) => [styles.groupCard, pressed && styles.pressed]}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleWrap}>
                  <View style={[styles.typeIconBox, { backgroundColor: typeInfo.bg }]}>
                    <Text style={styles.typeIconText}>{typeInfo.icon}</Text>
                  </View>
                  <View style={styles.cardTitleTexts}>
                    <Text style={styles.groupName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <View style={styles.typeBadgeRow}>
                      <View style={[styles.typeBadge, { backgroundColor: typeInfo.bg }]}>
                        <Text style={[styles.typeBadgeText, { color: typeInfo.color }]}>
                          {typeInfo.label}
                        </Text>
                      </View>
                      <Text style={styles.memberCountText}>👥 {item.memberCount} thành viên</Text>
                    </View>
                  </View>
                </View>
                <Text style={styles.cardChevron}>›</Text>
              </View>

              {item.description ? (
                <Text style={styles.groupDesc} numberOfLines={1}>
                  {item.description}
                </Text>
              ) : null}

              <View style={styles.cardDivider} />

              <View style={styles.cardFooter}>
                <View>
                  <Text style={styles.footerLabel}>Tổng quỹ nhóm</Text>
                  <Text style={styles.totalBalanceText}>
                    {formatCurrency(item.totalBalance)} {item.currency}
                  </Text>
                </View>

                <View style={styles.myBalanceBlock}>
                  <Text style={styles.footerLabel}>Trạng thái của bạn</Text>
                  {item.myBalance === 0 ? (
                    <Text style={styles.balanceSettled}>Đã cân bằng</Text>
                  ) : item.myBalance > 0 ? (
                    <Text style={styles.balancePositive}>
                      Được nhận: +{formatCurrency(item.myBalance)} {item.currency}
                    </Text>
                  ) : (
                    <Text style={styles.balanceNegative}>
                      Cần trả: {formatCurrency(Math.abs(item.myBalance))} {item.currency}
                    </Text>
                  )}
                </View>
              </View>
            </Pressable>
          );
        }}
      />

      {/* Modal Tạo nhóm mới */}
      <Modal visible={createModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tạo nhóm tài chính mới</Text>
              <Pressable onPress={() => setCreateModalVisible(false)} hitSlop={10}>
                <Text style={styles.modalCloseText}>✕</Text>
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Tên nhóm *</Text>
              <TextInput
                value={newGroupName}
                onChangeText={setNewGroupName}
                placeholder="VD: Gia đình thân yêu, Chuyến đi Đà Nẵng..."
                placeholderTextColor="#9ca3af"
                style={styles.input}
              />

              <Text style={styles.inputLabel}>Loại nhóm *</Text>
              <View style={styles.typeSelectorRow}>
                {(Object.keys(GROUP_TYPE_MAP) as GroupItem['type'][]).map((typeKey) => {
                  const info = GROUP_TYPE_MAP[typeKey];
                  const isSelected = newGroupType === typeKey;
                  return (
                    <Pressable
                      key={typeKey}
                      onPress={() => setNewGroupType(typeKey)}
                      style={[
                        styles.typeSelectBtn,
                        isSelected && { borderColor: '#006747', backgroundColor: '#EAF8F1' },
                      ]}
                    >
                      <Text style={styles.typeSelectIcon}>{info.icon}</Text>
                      <Text
                        style={[
                          styles.typeSelectText,
                          isSelected && { color: '#006747', fontWeight: '700' },
                        ]}
                      >
                        {info.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.inputLabel}>Mô tả (tùy chọn)</Text>
              <TextInput
                value={newGroupDesc}
                onChangeText={setNewGroupDesc}
                placeholder="Mục đích thu chi của nhóm..."
                placeholderTextColor="#9ca3af"
                style={[styles.input, { height: 70, textAlignVertical: 'top', paddingTop: 10 }]}
                multiline
              />

              <Pressable
                onPress={handleCreateGroup}
                style={({ pressed }) => [
                  styles.submitBtn,
                  !newGroupName.trim() && { opacity: 0.6 },
                  pressed && styles.pressed,
                ]}
                disabled={!newGroupName.trim()}
              >
                <Text style={styles.submitBtnText}>Hoàn tất tạo nhóm</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FAFCFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f3f2',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#12251f',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#69756f',
    marginTop: 2,
  },
  createBtn: {
    backgroundColor: '#006747',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#004c3b',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  createBtnText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '700',
  },
  highlightBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAF8F1',
    borderWidth: 1,
    borderColor: '#C7E8D8',
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 6,
    padding: 12,
    gap: 10,
  },
  highlightIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlightIcon: {
    fontSize: 18,
  },
  highlightTextWrap: {
    flex: 1,
  },
  highlightTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#006747',
  },
  highlightDesc: {
    fontSize: 11,
    color: '#476359',
    marginTop: 2,
    lineHeight: 15,
  },
  listContent: {
    padding: 16,
    paddingBottom: 90,
    gap: 12,
  },
  groupCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e8ecea',
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  typeIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeIconText: {
    fontSize: 22,
  },
  cardTitleTexts: {
    flex: 1,
  },
  groupName: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#12251f',
  },
  typeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  memberCountText: {
    fontSize: 11,
    color: '#69756f',
  },
  cardChevron: {
    fontSize: 22,
    color: '#9ca3af',
    fontWeight: '400',
    marginLeft: 8,
  },
  groupDesc: {
    fontSize: 12,
    color: '#69756f',
    marginTop: 10,
    lineHeight: 16,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#f1f5f3',
    marginVertical: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLabel: {
    fontSize: 11,
    color: '#8b9691',
    fontWeight: '500',
  },
  totalBalanceText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#12251f',
    marginTop: 2,
  },
  myBalanceBlock: {
    alignItems: 'flex-end',
  },
  balanceSettled: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#059669',
    marginTop: 2,
  },
  balancePositive: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#006747',
    marginTop: 2,
  },
  balanceNegative: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#D93025',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#12251f',
  },
  modalCloseText: {
    fontSize: 18,
    color: '#69756f',
    fontWeight: '700',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#12251f',
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#12251f',
  },
  typeSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeSelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    backgroundColor: '#ffffff',
  },
  typeSelectIcon: {
    fontSize: 14,
  },
  typeSelectText: {
    fontSize: 12,
    color: '#4b5563',
  },
  submitBtn: {
    backgroundColor: '#006747',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
    marginBottom: 10,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
});

