import React, { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Bell } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { authStorage } from '../../auth/api/authApi';
import { userProfileApi } from '../../profile/api/userProfileApi';
import { notificationApi } from '../../notifications/api';

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
  const [unreadCount, setUnreadCount] = useState(0);

  // Tự động kiểm tra số lượng thông báo chưa đọc
  useEffect(() => {
    let isMounted = true;
    const fetchUnread = () => {
      notificationApi
        .getUnreadCount()
        .then((count) => {
          if (isMounted) setUnreadCount(count || 0);
        })
        .catch(() => {});
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

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
  const fullAvatarUrl = userProfileApi.formatAvatarUrl(
    userProfile?.avatarUrl || authStorage.getUser()?.avatarUrl
  );

  return (
    <View style={styles.container}>
      {/* Cụm trái: Avatar thật của User + Lời chào + Tên người dùng */}
      <Pressable
        onPress={onProfile}
        style={({ pressed }) => [styles.userProfileRow, pressed && styles.pressed]}
        hitSlop={6}
        accessibilityLabel="Xem thông tin cá nhân"
      >
        <View style={styles.avatarWrap}>
          {fullAvatarUrl ? (
            <Image source={{ uri: fullAvatarUrl }} style={styles.avatarImg} resizeMode="cover" />
          ) : (
            <Image source={defaultAvatar} style={styles.avatarImg} resizeMode="cover" />
          )}
        </View>

        <View style={styles.greetingCol}>
          <Text style={styles.greetingText}>{greeting} 👋</Text>
          <Text style={styles.userNameText} numberOfLines={1}>
            {displayName}
          </Text>
        </View>
      </Pressable>

      {/* Cụm phải: Nút Chuông thông báo tròn nền xanh gradient bóng 3D */}
      <View style={styles.rightActions}>
        <Pressable
          onPress={onNotifications}
          style={({ pressed }) => [styles.settingsBtnOuter, pressed && styles.pressed]}
          hitSlop={8}
          accessibilityLabel="Thông báo"
        >
          <LinearGradient
            colors={['#43D988', '#0D9A5C', '#067346']}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.85, y: 1 }}
            style={styles.settingsBtnGradient}
          >
            <Bell size={21} color="#FFFFFF" strokeWidth={2.3} />
          </LinearGradient>
          {unreadCount > 0 && <View style={styles.unreadDot} />}
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
    marginBottom: 14,
    paddingHorizontal: 2,
  },
  userProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
    gap: 12,
  },
  avatarWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2.2,
    borderColor: 'rgba(255, 255, 255, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#004D3B',
    shadowColor: '#002E23',
    shadowOpacity: 0.22,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  avatarImg: {
    width: 49,
    height: 49,
    borderRadius: 24.5,
  },
  greetingCol: {
    justifyContent: 'center',
    flexShrink: 1,
  },
  greetingText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.92)',
    fontWeight: '600',
    letterSpacing: 0.1,
    marginBottom: 2,
  },
  userNameText: {
    fontSize: 18.5,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsBtnOuter: {
    width: 46,
    height: 46,
    borderRadius: 23,
    padding: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.42)',
    shadowColor: '#00382B',
    shadowOpacity: 0.28,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
    position: 'relative',
  },
  settingsBtnGradient: {
    flex: 1,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.96 }],
  },
});
