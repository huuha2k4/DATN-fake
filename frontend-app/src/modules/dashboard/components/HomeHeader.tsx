import React, { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { themeTokens } from '../themeTokens';
import { authStorage } from '../../auth/api/authApi';
import { userProfileApi } from '../../profile/api/userProfileApi';

type Props = {
  onNotifications?: () => void;
  onProfile?: () => void;
};

// Avatar mặc định sạch đẹp
const defaultAvatar = require('../../../assets/default-avatar.png');

function getGreetingByHour(hours: number): string {
  if (hours >= 5 && hours < 11) return 'Chào buổi sáng';
  if (hours >= 11 && hours < 14) return 'Chào buổi trưa';
  if (hours >= 14 && hours < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

export function HomeHeader({ onNotifications, onProfile }: Props) {
  const [greeting, setGreeting] = useState(() => getGreetingByHour(new Date().getHours()));
  const [userProfile, setUserProfile] = useState(() => authStorage.getUser());

  // Tự động gọi API lấy thông tin người dùng và avatar mới nhất
  useEffect(() => {
    let isMounted = true;
    userProfileApi.getProfile().then((fresh) => {
      if (isMounted && fresh) {
        setUserProfile((prev) => ({
          ...prev,
          id: fresh.id,
          email: fresh.email,
          fullName: fresh.fullName,
          avatarUrl: fresh.avatarUrl,
          phone: fresh.phone,
          subscriptionTier: fresh.subscriptionTier,
          emailVerified: true,
        }));
      }
    });

    const updateGreeting = () => {
      setGreeting(getGreetingByHour(new Date().getHours()));
    };
    const timer = setInterval(updateGreeting, 60000);

    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, []);

  const displayName = userProfile?.fullName || authStorage.getUser()?.fullName || 'bạn';
  const fullAvatarUrl = userProfileApi.formatAvatarUrl(userProfile?.avatarUrl || authStorage.getUser()?.avatarUrl);

  return (
    <View style={styles.container}>
      {/* Cụm trái: Avatar thật của User + Lời chào + Tên */}
      <Pressable
        onPress={onProfile}
        style={({ pressed }) => [styles.userProfileRow, pressed && styles.pressed]}
        hitSlop={6}
        accessibilityLabel="Xem thông tin cá nhân"
      >
        <View style={styles.avatarWrap}>
          {fullAvatarUrl ? (
            <Image
              source={{ uri: fullAvatarUrl }}
              style={styles.avatarImg}
              resizeMode="cover"
            />
          ) : (
            <Image
              source={defaultAvatar}
              style={styles.avatarImg}
              resizeMode="cover"
            />
          )}
        </View>

        <View style={styles.greetingCol}>
          <Text style={styles.greetingText}>{greeting} 👋</Text>
          <Text style={styles.userNameText} numberOfLines={1}>
            {displayName}
          </Text>
        </View>
      </Pressable>

      {/* Cụm phải: Chuông thông báo xanh bo tròn với chấm đỏ */}
      <View style={styles.rightActions}>
        <Pressable
          onPress={onNotifications}
          style={({ pressed }) => [styles.bellButton, pressed && styles.pressed]}
          hitSlop={8}
          accessibilityLabel="Thông báo"
        >
          {/* Icon chuông vector trắng phẳng đơn giản */}
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="#FFFFFF">
            <Path d="M12 2a5 5 0 0 0-5 5v3.17c0 .6-.24 1.17-.66 1.58L4.6 13.48A2 2 0 0 0 6 17h12a2 2 0 0 0 1.4-3.52l-1.74-1.73a2.23 2.23 0 0 1-.66-1.58V7a5 5 0 0 0-5-5Zm0 20a3 3 0 0 0 2.82-2H9.18A3 3 0 0 0 12 22Z" />
          </Svg>

          {/* Chấm đỏ thông báo viền xanh */}
          <View style={styles.badgeDot} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: themeTokens.spacing.md,
    paddingHorizontal: 2,
  },
  userProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
    gap: 12,
  },
  avatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.45)',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F765E',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  avatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  onlineStatusDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: '#10B981',
    borderWidth: 2.2,
    borderColor: '#054738',
  },
  greetingCol: {
    justifyContent: 'center',
    flexShrink: 1,
  },
  greetingText: {
    fontSize: 12,
    color: '#A8EBCA',
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  userNameText: {
    fontSize: 16.5,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bellButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#0F765E',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  badgeDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#0F765E',
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.96 }],
  },
});
