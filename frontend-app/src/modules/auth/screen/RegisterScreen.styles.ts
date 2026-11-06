import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  flexOne: {
    flex: 1,
  },

  registerPage: {
    flex: 1,
    backgroundColor: '#ffffff',
  },

  scrollContent: {
    flexGrow: 1,
    backgroundColor: '#ffffff',
  },

  /* Toàn bộ nội dung co giãn phân bố đều không gian toàn màn hình */
  screenContainer: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
    justifyContent: 'space-between',
  },

  /* 1. Header Block */
  headerBlock: {
    width: '100%',
    paddingTop: 4,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },

  inlineBackBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#F3F7F5',
    marginBottom: 8,
  },

  inlineBackArrow: {
    color: '#006747',
    fontSize: 18,
    fontWeight: '800',
    marginTop: -2,
  },

  inlineBackText: {
    color: '#006747',
    fontSize: 13,
    fontWeight: '700',
  },

  registerTitle: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    color: '#12251f',
  },

  registerSubtitle: {
    fontSize: 13,
    color: '#69756f',
    textAlign: 'center',
    marginTop: 4,
  },

  /* Alert thông báo lỗi */
  alertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF1F0',
    borderWidth: 1,
    borderColor: '#FFD8D6',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 8,
  },
  alertIcon: {
    fontSize: 13,
  },
  alertText: {
    fontSize: 12,
    color: '#D93025',
    fontWeight: '600',
    flex: 1,
  },

  /* Alert thông báo thành công (Gửi mã OTP) */
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 8,
  },
  successIcon: {
    fontSize: 13,
  },
  successText: {
    fontSize: 12,
    color: '#166534',
    fontWeight: '600',
    flex: 1,
  },

  /* 2. Middle Block: 6 trường nhập tự giãn phân bổ đều */
  formBlock: {
    flex: 1,
    width: '100%',
    justifyContent: 'space-evenly',
    paddingVertical: 2,
    minHeight: 330,
  },

  formGroup: {
    width: '100%',
  },

  formLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#12251f',
    marginBottom: 4,
  },

  formLabelRequired: {
    color: '#006747',
    fontWeight: '700',
  },

  formOptionalText: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '400',
  },

  formInputWrap: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#dce3df',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },

  formInputWrapFocused: {
    borderColor: '#009a70',
    borderWidth: 1.5,
  },

  formInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#12251f',
    paddingVertical: 0,
    height: '100%',
  },

  eyeBtn: {
    padding: 6,
  },

  /* Row cho ô OTP và Nút lấy mã */
  otpRowWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },

  otpInputWrap: {
    flex: 1,
  },

  otpSendBtn: {
    backgroundColor: '#006747',
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 88,
  },

  otpSendBtnDisabled: {
    backgroundColor: '#73958c',
  },

  otpSendBtnText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '700',
  },

  /* Hint box yêu cầu mật khẩu */
  passwordHintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EAF8F1',
    borderWidth: 1,
    borderColor: '#C7E8D8',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  passwordHintIcon: {
    fontSize: 12,
  },
  passwordHintText: {
    fontSize: 11,
    color: '#006747',
    fontWeight: '500',
    flex: 1,
    lineHeight: 14,
  },

  /* 3. Bottom Block: Neo sát chân và phân bổ đều */
  bottomBlock: {
    width: '100%',
    justifyContent: 'flex-end',
    gap: 8,
  },

  /* Điều khoản dịch vụ & Chính sách bảo mật */
  termsAgreementText: {
    fontSize: 11,
    color: '#69756f',
    textAlign: 'center',
    lineHeight: 15,
    paddingHorizontal: 4,
  },
  termsAgreementLink: {
    color: '#006747',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },

  /* Nút bấm Hoàn tất tạo tài khoản */
  registerButton: {
    width: '100%',
    borderRadius: 12,
    backgroundColor: '#006747',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#004c3b',
    shadowOpacity: 0.22,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 3,
  },

  registerButtonDisabled: {
    opacity: 0.7,
  },

  registerButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },

  /* Divider */
  dividerBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e9e7',
  },
  dividerText: {
    marginHorizontal: 10,
    fontSize: 10.5,
    color: '#9ca3af',
    fontWeight: '700',
  },

  /* Nút Google */
  googleButton: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dce3df',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  googleButtonText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#24352f',
  },

  /* Footer chuyển tiếp Đăng nhập & Copyright */
  registerFooter: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },

  registerFooterText: {
    fontSize: 12.5,
    color: '#6b7571',
    textAlign: 'center',
  },

  registerFooterLink: {
    color: '#006747',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },

  copyrightText: {
    fontSize: 10,
    color: '#9ca3af',
    textAlign: 'center',
  },

  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.988 }],
  },
});
