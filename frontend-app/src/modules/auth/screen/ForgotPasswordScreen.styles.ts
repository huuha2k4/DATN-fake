import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  flexOne: {
    flex: 1,
  },

  page: {
    flex: 1,
    backgroundColor: '#ffffff',
  },

  scrollContent: {
    flexGrow: 1,
    backgroundColor: '#ffffff',
  },

  screenContainer: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
  },

  /* 1. Header Block */
  headerBlock: {
    width: '100%',
    paddingTop: 8,
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
    marginBottom: 12,
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

  /* Step Indicator dots */
  stepIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
    gap: 6,
  },

  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#dce3df',
  },

  stepDotActive: {
    backgroundColor: '#006747',
    width: 20,
    borderRadius: 4,
  },

  stepLine: {
    width: 24,
    height: 2,
    backgroundColor: '#e5e9e7',
  },

  stepLineActive: {
    backgroundColor: '#006747',
  },

  title: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    color: '#12251f',
  },

  subtitle: {
    fontSize: 13,
    color: '#69756f',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    paddingHorizontal: 10,
  },

  /* Alert thông báo */
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
    marginTop: 10,
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
    marginTop: 10,
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

  /* 2. Form Block */
  formBlock: {
    width: '100%',
    paddingVertical: 16,
  },

  stepWrap: {
    width: '100%',
    gap: 14,
  },

  formGroup: {
    width: '100%',
  },

  formLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#12251f',
    marginBottom: 6,
  },

  required: {
    color: '#006747',
    fontWeight: '700',
  },

  inputWrap: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#dce3df',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },

  inputWrapFocused: {
    borderColor: '#009a70',
    borderWidth: 1.5,
  },

  input: {
    flex: 1,
    fontSize: 14,
    color: '#12251f',
    paddingVertical: 0,
    height: '100%',
  },

  otpInput: {
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 10,
    color: '#006747',
  },

  eyeBtn: {
    padding: 6,
  },

  otpActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: -4,
  },

  changeEmailText: {
    fontSize: 12.5,
    color: '#6b7571',
    fontWeight: '600',
  },

  resendOtpText: {
    fontSize: 12.5,
    color: '#006747',
    fontWeight: '700',
  },

  resendOtpDisabled: {
    color: '#9ca3af',
  },

  passwordHintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EAF8F1',
    borderWidth: 1,
    borderColor: '#C7E8D8',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  passwordHintIcon: {
    fontSize: 12,
  },
  passwordHintText: {
    fontSize: 11,
    color: '#006747',
    fontWeight: '500',
    flex: 1,
    lineHeight: 15,
  },

  ctaBtn: {
    width: '100%',
    borderRadius: 12,
    backgroundColor: '#006747',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#004c3b',
    shadowOpacity: 0.22,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 3,
  },

  ctaBtnDisabled: {
    opacity: 0.7,
  },

  ctaBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },

  /* 3. Bottom Block */
  bottomBlock: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 12,
  },

  footerRow: {
    alignItems: 'center',
    gap: 8,
  },

  footerText: {
    fontSize: 13,
    color: '#6b7571',
  },

  footerLink: {
    color: '#006747',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },

  copyrightText: {
    fontSize: 10.5,
    color: '#9ca3af',
    textAlign: 'center',
  },

  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.988 }],
  },
});

