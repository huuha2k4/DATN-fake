import React from 'react';
import { View, Text, Image, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { FinanceIcon } from '../../core/components/FinanceIcon';
import {
  findBankOrWalletPreset,
  type BankOrWalletPreset,
} from '../constants/banksData';
import { type AccountItem, type AccountTypeCode } from '../api/accountApi';

export function getAccountTypeMeta(type?: AccountTypeCode, item?: { name?: string }) {
  const isDebit = item?.name ? /ghi nợ|debit|atm/i.test(item.name) : false;
  switch (type) {
    case 'CASH':
      return { label: 'Tiền mặt', icon: 'wallet', color: '#059669', bg: '#E8F8F0' };
    case 'BANK_ACCOUNT': {
      if (isDebit) {
        return { label: 'Thẻ ghi nợ', icon: 'bank', color: '#0891B2', bg: '#ECFEFF' };
      }
      return { label: 'Ngân hàng', icon: 'bank', color: '#0284C7', bg: '#E0F2FE' };
    }
    case 'E_WALLET':
      return { label: 'Ví điện tử', icon: 'credit-card', color: '#D97706', bg: '#FEF3C7' };
    case 'CREDIT_CARD':
      return { label: 'Thẻ tín dụng', icon: 'credit-card', color: '#E11D48', bg: '#FEE2E2' };
    case 'SAVINGS':
      return { label: 'Tiết kiệm', icon: 'piggy-bank', color: '#7C3AED', bg: '#F3E8FF' };
    case 'INVESTMENT':
      return { label: 'Đầu tư', icon: 'trending-up', color: '#2563EB', bg: '#DBEAFE' };
    case 'CRYPTO':
      return { label: 'Tiền mã hóa', icon: 'spark', color: '#F59E0B', bg: '#FEF3C7' };
    default:
      return { label: 'Khác', icon: 'wallet', color: '#64748B', bg: '#F1F5F9' };
  }
}

type AccountBadgeProps = {
  account?: AccountItem | { name?: string; accountType?: AccountTypeCode } | null;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

export function AccountBadge({ account, size = 36, style }: AccountBadgeProps) {
  if (!account) {
    return (
      <View
        style={[
          styles.container,
          { width: size, height: size, borderRadius: size * 0.28, backgroundColor: '#E8F8F0' },
          style,
        ]}
      >
        <FinanceIcon name="wallet" size={size * 0.48} color="#059669" />
      </View>
    );
  }

  const brandPreset: BankOrWalletPreset | undefined = findBankOrWalletPreset(account.name);
  const meta = getAccountTypeMeta(account.accountType, account);

  if (brandPreset?.logoUrl) {
    return (
      <View
        style={[
          styles.container,
          styles.brandLogoBox,
          { width: size, height: size, borderRadius: size * 0.28 },
          style,
        ]}
      >
        <Image
          source={{ uri: brandPreset.logoUrl }}
          style={{ width: size * 0.75, height: size * 0.75 }}
          resizeMode="contain"
        />
      </View>
    );
  }

  if (brandPreset) {
    return (
      <View
        style={[
          styles.container,
          {
            width: size,
            height: size,
            borderRadius: size * 0.28,
            backgroundColor: brandPreset.bgColor || '#F1F5F9',
          },
          style,
        ]}
      >
        <Text
          style={[
            styles.brandText,
            { color: brandPreset.textColor || '#0F172A', fontSize: size * 0.32 },
          ]}
          numberOfLines={1}
        >
          {brandPreset.shortName ? brandPreset.shortName.slice(0, 3) : 'VÍ'}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { width: size, height: size, borderRadius: size * 0.28, backgroundColor: meta.bg },
        style,
      ]}
    >
      <FinanceIcon name={meta.icon as any} size={size * 0.48} color={meta.color} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  brandLogoBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  brandText: {
    fontWeight: '800',
    textAlign: 'center',
  },
});

