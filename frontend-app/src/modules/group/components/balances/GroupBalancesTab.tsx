import React from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { FinanceIcon } from '../../../core/components/FinanceIcon';
import { userProfileApi } from '../../../profile/api/userProfileApi';
import {
  GroupBalanceResponse,
  GroupMemberResponse,
  GroupResponse,
  SimplifiedDebt,
} from '../../api/groupApi';
import { useAppTheme } from '../../../../context/ThemeContext';

export interface GroupBalancesTabProps {
  balanceData: GroupBalanceResponse | null;
  members: GroupMemberResponse[];
  currentUser: { id?: string; fullName?: string; username?: string; email?: string } | null;
  onSettleDebt: (debt: { toUserId: string; toUserName: string; amount: number }) => void;
  onRemindDebt?: (debt: { fromUserId: string; fromUserName: string; amount: number }) => void;
}

function formatVND(val: number) {
  return new Intl.NumberFormat('vi-VN').format(val || 0);
}

export const GroupBalancesTab: React.FC<GroupBalancesTabProps> = ({
  balanceData,
  members,
  currentUser,
  onSettleDebt,
  onRemindDebt,
}) => {
  const { isDark, colors: themeColors } = useAppTheme();
  const currentUserIdStr = currentUser?.id ? String(currentUser.id).toLowerCase() : '';

  // Lấy tên hiển thị của thành viên
  const getMemberDisplayName = (userId: string, fallbackName?: string) => {
    if (currentUserIdStr && String(userId).toLowerCase() === currentUserIdStr) {
      return 'Bạn';
    }
    const mem = members.find((m) => String(m.userId).toLowerCase() === String(userId).toLowerCase());
    return (
      mem?.user?.fullName ||
      mem?.nickname ||
      mem?.fullName ||
      fallbackName ||
      'Thành viên'
    );
  };

  // Lấy avatar của thành viên
  const getMemberAvatar = (userId: string, fallbackAvatar?: string) => {
    const mem = members.find((m) => String(m.userId).toLowerCase() === String(userId).toLowerCase());
    const raw = mem?.user?.avatarUrl || mem?.user?.avatarKey || fallbackAvatar;
    return raw ? userProfileApi.formatAvatarUrl(raw) : null;
  };

  // Tính số tiền "Bạn đang nợ" và "Bạn được nhận"
  const simplifiedDebts: SimplifiedDebt[] = balanceData?.simplifiedDebts || [];

  let myTotalDebt = 0; // Số tiền mình đang nợ người khác
  let myTotalReceivable = 0; // Số tiền người khác đang nợ mình

  simplifiedDebts.forEach((debt) => {
    const fromId = String(debt.fromUserId).toLowerCase();
    const toId = String(debt.toUserId).toLowerCase();
    const amt = debt.amount || 0;

    if (fromId === currentUserIdStr) {
      myTotalDebt += amt;
    }
    if (toId === currentUserIdStr) {
      myTotalReceivable += amt;
    }
  });

  // Tìm khoản gợi ý thanh toán đầu tiên (nếu mình đang nợ ai đó)
  const firstDebtOfMine = simplifiedDebts.find(
    (d) => String(d.fromUserId).toLowerCase() === currentUserIdStr
  );

  return (
    <View style={[styles.container, isDark && { backgroundColor: themeColors.background }]}>
      {/* 1. HAI THẺ THỐNG KÊ TỔNG NỢ & ĐƯỢC NHẬN (CHUẨN ẢNH MẪU) */}
      <View style={styles.summaryRow}>
        {/* Thẻ Bạn đang nợ (Nền hồng nhạt #FFF1F2, viền hồng #FFE4E6) */}
        <View
          style={[
            styles.debtBox,
            isDark && {
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              borderColor: 'rgba(239, 68, 68, 0.25)',
            },
          ]}
        >
          <View
            style={[
              styles.debtIconCircle,
              isDark && { backgroundColor: 'rgba(239, 68, 68, 0.2)' },
            ]}
          >
            <FinanceIcon name="borrowing" size={22} color={isDark ? '#F87171' : '#E11D48'} />
          </View>
          <View style={styles.summaryTextCol}>
            <Text style={[styles.debtBoxLabel, isDark && { color: themeColors.textSecondary }]}>Bạn đang nợ</Text>
            <Text
              style={[
                styles.debtBoxAmount,
                isDark && { color: '#F87171' },
              ]}
              numberOfLines={1}
            >
              {formatVND(myTotalDebt)} đ
            </Text>
          </View>
        </View>

        {/* Thẻ Bạn được nhận (Nền xanh nhạt #F0FDF4, viền xanh #DCFCE7) */}
        <View
          style={[
            styles.receiveBox,
            isDark && {
              backgroundColor: 'rgba(52, 211, 153, 0.12)',
              borderColor: 'rgba(52, 211, 153, 0.25)',
            },
          ]}
        >
          <View
            style={[
              styles.receiveIconCircle,
              isDark && { backgroundColor: 'rgba(52, 211, 153, 0.2)' },
            ]}
          >
            <FinanceIcon name="lending" size={22} color={isDark ? themeColors.accentGreen : '#059669'} />
          </View>
          <View style={styles.summaryTextCol}>
            <Text style={[styles.receiveBoxLabel, isDark && { color: themeColors.textSecondary }]}>Bạn được nhận</Text>
            <Text
              style={[
                styles.receiveBoxAmount,
                isDark && { color: themeColors.accentGreen },
              ]}
              numberOfLines={1}
            >
              {formatVND(myTotalReceivable)} đ
            </Text>
          </View>
        </View>
      </View>

      {/* 2. CARD: CÂN ĐỐI GIỮA CÁC THÀNH VIÊN (CHUẨN ẢNH MẪU) */}
      <View
        style={[
          styles.cardContainer,
          isDark && {
            backgroundColor: themeColors.surface,
            borderColor: themeColors.cardBorder,
          },
        ]}
      >
        <Text style={[styles.sectionTitle, isDark && { color: themeColors.textPrimary }]}>Cân đối giữa các thành viên</Text>

        {simplifiedDebts.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              isDark && {
                backgroundColor: themeColors.surfaceSubtle,
                borderColor: themeColors.cardBorder,
              },
            ]}
          >
            <Text style={{ fontSize: 30, marginBottom: 6 }}>⚖️</Text>
            <Text style={[styles.emptyTitle, isDark && { color: themeColors.textPrimary }]}>Tất cả đã cân bằng</Text>
            <Text style={[styles.emptySub, isDark && { color: themeColors.textSecondary }]}>
              Hiện tại không có thành viên nào nợ tiền nhau trong nhóm.
            </Text>
          </View>
        ) : (
          <View style={styles.debtsList}>
            {simplifiedDebts.map((debt, index) => {
              const fromName = getMemberDisplayName(debt.fromUserId, debt.fromUser?.fullName);
              const toName = getMemberDisplayName(debt.toUserId, debt.toUser?.fullName);
              const fromAvatar = getMemberAvatar(debt.fromUserId, debt.fromUser?.avatarKey);

              const isMeBorrower = String(debt.fromUserId).toLowerCase() === currentUserIdStr;
              const isMeLender = String(debt.toUserId).toLowerCase() === currentUserIdStr;

              return (
                <View
                  key={index}
                  style={[
                    styles.debtRowItem,
                    index < simplifiedDebts.length - 1 && [
                      styles.debtRowBorder,
                      isDark && { borderBottomColor: themeColors.divider },
                    ],
                  ]}
                >
                  {/* Avatar người nợ */}
                  <View style={styles.memberAvatarWrap}>
                    {fromAvatar ? (
                      <Image source={{ uri: fromAvatar }} style={styles.memberAvatarImg} />
                    ) : (
                      <View style={styles.memberAvatarFallback}>
                        <Text style={styles.memberAvatarLetter}>
                          {fromName.slice(0, 1).toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Thông tin nợ A -> B (Chiếm trọn không gian, hiển thị tên đầy đủ và rõ ràng) */}
                  <View style={styles.debtInfoCol}>
                    <Text style={styles.debtRelationText}>
                      <Text style={[{ fontWeight: '700', color: '#0F172A' }, isDark && { color: themeColors.textPrimary }]}>{fromName}</Text>
                      <Text style={[{ color: '#94A3B8', fontWeight: '500' }, isDark && { color: themeColors.textMuted }]}> → </Text>
                      <Text style={[{ fontWeight: '700', color: '#0F172A' }, isDark && { color: themeColors.textPrimary }]}>{toName}</Text>
                    </Text>
                  </View>

                  {/* Cột bên phải: Số tiền nợ/nhận nằm Ở TRÊN nút Thanh toán/Nhắc nhở */}
                  <View style={styles.rightActionCol}>
                    {/* Số tiền nợ / nhận */}
                    {isMeBorrower ? (
                      <Text style={styles.amountDebtText}>
                        Nợ {formatVND(debt.amount)} đ
                      </Text>
                    ) : isMeLender ? (
                      <Text style={styles.amountReceiveText}>
                        Nhận {formatVND(debt.amount)} đ
                      </Text>
                    ) : (
                      <Text style={styles.amountNeutralText}>
                        {formatVND(debt.amount)} đ
                      </Text>
                    )}

                    {/* Nút hành động ngay bên dưới số tiền */}
                    {isMeBorrower ? (
                      <Pressable
                        onPress={() =>
                          onSettleDebt({
                            toUserId: debt.toUserId,
                            toUserName: toName,
                            amount: debt.amount,
                          })
                        }
                        style={({ pressed }) => [
                          styles.settleBtn,
                          pressed && { opacity: 0.8 },
                        ]}
                      >
                        <Text style={styles.settleBtnText}>Thanh toán</Text>
                      </Pressable>
                    ) : isMeLender ? (
                      <Pressable
                        onPress={() =>
                          onRemindDebt?.({
                            fromUserId: debt.fromUserId,
                            fromUserName: fromName,
                            amount: debt.amount,
                          })
                        }
                        style={({ pressed }) => [
                          styles.remindBtn,
                          pressed && { opacity: 0.8 },
                        ]}
                      >
                        <Text style={styles.remindBtnText}>Nhắc nhở</Text>
                      </Pressable>
                    ) : (
                      <View style={styles.neutralBtn}>
                        <Text style={styles.neutralBtnText}>Chờ trả</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* 3. CARD: GỢI Ý THANH TOÁN (CHUẨN ẢNH MẪU) */}
      {firstDebtOfMine && (
        <View style={styles.suggestionSection}>
          <Text style={[styles.sectionTitle, isDark && { color: themeColors.textPrimary }]}>Gợi ý thanh toán</Text>
          <Pressable
            onPress={() =>
              onSettleDebt({
                toUserId: firstDebtOfMine.toUserId,
                toUserName: getMemberDisplayName(firstDebtOfMine.toUserId, firstDebtOfMine.toUser?.fullName),
                amount: firstDebtOfMine.amount,
              })
            }
            style={({ pressed }) => [
              styles.suggestionCard,
              isDark && {
                backgroundColor: themeColors.surface,
                borderColor: themeColors.cardBorder,
              },
              pressed && { opacity: 0.85 },
            ]}
          >
            <View style={[styles.suggestionIconBox, isDark && { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
              <FinanceIcon name="coin-stack" size={24} color="#F59E0B" />
            </View>
            <View style={styles.suggestionTextCol}>
              <Text style={[styles.suggestionTitle, isDark && { color: themeColors.textPrimary }]}>
                Thanh toán <Text style={{ color: isDark ? themeColors.accentGreen : '#059669', fontWeight: '800' }}>{formatVND(firstDebtOfMine.amount)} đ</Text> cho{' '}
                {getMemberDisplayName(firstDebtOfMine.toUserId, firstDebtOfMine.toUser?.fullName)}
              </Text>
              <Text style={[styles.suggestionSub, isDark && { color: themeColors.textSecondary }]}>
                để cân bằng công nợ trong nhóm.
              </Text>
            </View>
            <FinanceIcon name="chevron-right" size={18} color={isDark ? themeColors.accentGreen : '#059669'} />
          </Pressable>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 16,
    paddingBottom: 28,
  },
  /* 1. THẺ THỐNG KÊ TỔNG */
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  debtBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FFE4E6',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  debtIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFE4E6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  receiveBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  receiveIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryTextCol: {
    flex: 1,
  },
  debtBoxLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#E11D48',
  },
  debtBoxAmount: {
    fontSize: 16,
    fontWeight: '900',
    color: '#E11D48',
    marginTop: 2,
  },
  receiveBoxLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#059669',
  },
  receiveBoxAmount: {
    fontSize: 16,
    fontWeight: '900',
    color: '#059669',
    marginTop: 2,
  },
  /* 2. CARD CÂN ĐỐI NỢ */
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
  sectionTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  debtsList: {
    flexDirection: 'column',
  },
  debtRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 10,
  },
  debtRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  memberAvatarWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
  },
  memberAvatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },
  memberAvatarFallback: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberAvatarLetter: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  debtInfoCol: {
    flex: 1,
    paddingRight: 8,
    justifyContent: 'center',
  },
  debtRelationText: {
    fontSize: 13.5,
    lineHeight: 19,
  },
  rightActionCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 4,
  },
  amountDebtText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#E11D48',
  },
  amountReceiveText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#059669',
  },
  amountNeutralText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#64748B',
  },
  settleBtn: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  settleBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#059669',
  },
  remindBtn: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  remindBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#16A34A',
  },
  neutralBtn: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  neutralBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  neutralBtnText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#94A3B8',
  },
  /* 3. CARD GỢI Ý THANH TOÁN */
  suggestionSection: {
    gap: 10,
  },
  suggestionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  suggestionIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FEF9C3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestionTextCol: {
    flex: 1,
  },
  suggestionTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  suggestionSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  emptyCard: {
    paddingVertical: 28,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  emptySub: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
  },
});

