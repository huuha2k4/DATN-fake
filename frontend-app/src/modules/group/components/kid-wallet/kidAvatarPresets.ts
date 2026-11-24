import { userProfileApi } from '../../../profile/api/userProfileApi';

// 2 ảnh Avatar chuẩn bé trai và bé gái người dùng cung cấp
export const BOY_AVATAR_IMAGE = require('../../../../assets/icons/groups/kid_avatar_boy.png');
export const GIRL_AVATAR_IMAGE = require('../../../../assets/icons/groups/kid_avatar_girl.png');

export interface KidAvatarPreset {
  id: string;
  name: string;
  key: string; // Key lưu vào DB, ví dụ: 'kid_boy' hoặc 'kid_girl' hoặc link http/relative path
  gender: 'boy' | 'girl';
  localSource: any;
}

export const OFFICIAL_KID_AVATARS: KidAvatarPreset[] = [
  {
    id: 'kid-boy-official',
    name: 'Bé trai',
    key: 'kid_boy',
    gender: 'boy',
    localSource: BOY_AVATAR_IMAGE,
  },
  {
    id: 'kid-girl-official',
    name: 'Bé gái',
    key: 'kid_girl',
    gender: 'girl',
    localSource: GIRL_AVATAR_IMAGE,
  },
];

export function resolveKidAvatarSource(avatarKey?: string | null, isGirlHint?: boolean): any {
  if (!avatarKey || avatarKey.trim() === '') {
    return isGirlHint ? GIRL_AVATAR_IMAGE : BOY_AVATAR_IMAGE;
  }
  const cleanKey = avatarKey.trim();
  if (cleanKey === 'kid_girl' || cleanKey.includes('kid_avatar_girl')) {
    return GIRL_AVATAR_IMAGE;
  }
  if (cleanKey === 'kid_boy' || cleanKey.includes('kid_avatar_boy')) {
    return BOY_AVATAR_IMAGE;
  }
  if (cleanKey.startsWith('http://') || cleanKey.startsWith('https://')) {
    return { uri: cleanKey };
  }
  const formattedUrl = userProfileApi.formatAvatarUrl(cleanKey);
  if (formattedUrl) {
    return { uri: formattedUrl };
  }
  return isGirlHint ? GIRL_AVATAR_IMAGE : BOY_AVATAR_IMAGE;
}
