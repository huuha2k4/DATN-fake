package com.finance.finance.common.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

/**
 * Service for sending emails
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Value("${app.frontend.url}")
    private String frontendUrl;

    @Value("${app.name}")
    private String appName;

    /**
     * Send group invitation email
     */
    @Async
    public void sendGroupInvitationEmail(String toEmail, String inviteeName, String inviterName, String groupName, String role) {
        try {
            String subject = String.format("%s đã mời bạn tham gia nhóm \"%s\" trên Finora", inviterName, groupName);
            String content = buildGroupInvitationEmailContent(inviteeName, inviterName, groupName, role);
            sendHtmlEmail(toEmail, subject, content);
            log.info("Group invitation email sent to: {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send group invitation email to: {}", toEmail, e);
        }
    }

    /**
     * Send email verification with OTP
     */
    @Async
    public void sendVerificationOtpEmail(String toEmail, String fullName, String otp) {
        String subject = "Mã xác thực tài khoản Finora: " + otp;
        String content = buildVerificationOtpEmailContent(fullName, otp);
        try {
            sendHtmlEmail(toEmail, subject, content);
            log.info("Verification OTP email sent to: {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send verification OTP email to {}: {}", toEmail, e.getMessage(), e);
        }
    }

    /**
     * Send password reset with OTP
     */
    @Async
    public void sendPasswordResetOtpEmail(String toEmail, String fullName, String otp) {
        try {
            String subject = "Mã xác thực đặt lại mật khẩu Finora: " + otp;
            String content = buildPasswordResetOtpEmailContent(fullName, otp);
            sendHtmlEmail(toEmail, subject, content);
            log.info("Password reset OTP email sent to: {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send password reset OTP email to: {}", toEmail, e);
        }
    }

    /**
     * Send email verification email
     */
    @Async
    public void sendVerificationEmail(String toEmail, String fullName, String token) {
        try {
            String subject = "Xác thực tài khoản " + appName;
            String verificationUrl = frontendUrl + "/verify-email?token=" + token;
            
            String content = buildVerificationEmailContent(fullName, verificationUrl);
            
            sendHtmlEmail(toEmail, subject, content);
            log.info("Verification email sent to: {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send verification email to: {}", toEmail, e);
        }
    }

    /**
     * Send password reset email
     */
    @Async
    public void sendPasswordResetEmail(String toEmail, String fullName, String token) {
        try {
            String subject = "Đặt lại mật khẩu " + appName;
            String resetUrl = frontendUrl + "/reset-password?token=" + token;
            
            String content = buildPasswordResetEmailContent(fullName, resetUrl);
            
            sendHtmlEmail(toEmail, subject, content);
            log.info("Password reset email sent to: {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send password reset email to: {}", toEmail, e);
        }
    }

    /**
     * Send login alert email
     */
    @Async
    public void sendLoginAlertEmail(String toEmail, String fullName, String deviceName, String location, String ipAddress) {
        try {
            String subject = "Cảnh báo đăng nhập mới - " + appName;
            String content = buildLoginAlertEmailContent(fullName, deviceName, location, ipAddress);
            
            sendHtmlEmail(toEmail, subject, content);
            log.info("Login alert email sent to: {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send login alert email to: {}", toEmail, e);
        }
    }

    /**
     * Send account locked email
     */
    @Async
    public void sendAccountLockedEmail(String toEmail, String fullName, String lockedUntil) {
        try {
            String subject = "Tài khoản bị khóa - " + appName;
            String content = buildAccountLockedEmailContent(fullName, lockedUntil);
            
            sendHtmlEmail(toEmail, subject, content);
            log.info("Account locked email sent to: {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send account locked email to: {}", toEmail, e);
        }
    }

    /**
     * Send MFA setup email
     */
    @Async
    public void sendMfaSetupEmail(String toEmail, String fullName, String[] backupCodes) {
        try {
            String subject = "Xác thực hai yếu tố đã được bật - " + appName;
            String content = buildMfaSetupEmailContent(fullName, backupCodes);
            
            sendHtmlEmail(toEmail, subject, content);
            log.info("MFA setup email sent to: {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send MFA setup email to: {}", toEmail, e);
        }
    }

    /**
     * Send HTML email
     */
    private void sendHtmlEmail(String to, String subject, String htmlContent) throws MessagingException {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
        
        try {
            helper.setFrom(new jakarta.mail.internet.InternetAddress(fromEmail, "Finora", "UTF-8"));
        } catch (Exception e) {
            helper.setFrom(fromEmail);
        }
        helper.setTo(to);
        helper.setSubject(subject);
        helper.setText(htmlContent, true);
        
        mailSender.send(message);
    }

    /**
     * Send simple text email
     */
    private void sendSimpleEmail(String to, String subject, String text) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromEmail);
        message.setTo(to);
        message.setSubject(subject);
        message.setText(text);
        
        mailSender.send(message);
    }

    // Email content builders

    private String buildVerificationEmailContent(String fullName, String verificationUrl) {
        return String.format("""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #4F46E5;">Chào mừng đến với %s!</h2>
                    <p>Xin chào <strong>%s</strong>,</p>
                    <p>Cảm ơn bạn đã đăng ký tài khoản. Vui lòng xác thực email của bạn bằng cách nhấn vào nút bên dưới:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="%s" 
                           style="background-color: #4F46E5; color: white; padding: 12px 30px; 
                                  text-decoration: none; border-radius: 5px; display: inline-block;">
                            Xác thực Email
                        </a>
                    </div>
                    <p>Hoặc copy link sau vào trình duyệt:</p>
                    <p style="word-break: break-all; color: #666;">%s</p>
                    <p><strong>Lưu ý:</strong> Link này sẽ hết hạn sau 24 giờ.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                    <p style="color: #666; font-size: 12px;">
                        Nếu bạn không tạo tài khoản này, vui lòng bỏ qua email này.
                    </p>
                </div>
            </body>
            </html>
            """, appName, fullName, verificationUrl, verificationUrl);
    }

    private String buildPasswordResetEmailContent(String fullName, String resetUrl) {
        return String.format("""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #4F46E5;">Đặt lại mật khẩu</h2>
                    <p>Xin chào <strong>%s</strong>,</p>
                    <p>Bạn đã yêu cầu đặt lại mật khẩu. Nhấn vào nút bên dưới để tạo mật khẩu mới:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="%s" 
                           style="background-color: #DC2626; color: white; padding: 12px 30px; 
                                  text-decoration: none; border-radius: 5px; display: inline-block;">
                            Đặt lại mật khẩu
                        </a>
                    </div>
                    <p>Hoặc copy link sau vào trình duyệt:</p>
                    <p style="word-break: break-all; color: #666;">%s</p>
                    <p><strong>Lưu ý:</strong> Link này sẽ hết hạn sau 1 giờ.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                    <p style="color: #666; font-size: 12px;">
                        Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này và đảm bảo tài khoản của bạn an toàn.
                    </p>
                </div>
            </body>
            </html>
            """, fullName, resetUrl, resetUrl);
    }

    private String buildLoginAlertEmailContent(String fullName, String deviceName, String location, String ipAddress) {
        return String.format("""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #F59E0B;">Cảnh báo đăng nhập mới</h2>
                    <p>Xin chào <strong>%s</strong>,</p>
                    <p>Tài khoản của bạn vừa được đăng nhập từ một thiết bị mới:</p>
                    <div style="background-color: #F3F4F6; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <p style="margin: 5px 0;"><strong>Thiết bị:</strong> %s</p>
                        <p style="margin: 5px 0;"><strong>Vị trí:</strong> %s</p>
                        <p style="margin: 5px 0;"><strong>IP:</strong> %s</p>
                    </div>
                    <p>Nếu đây không phải là bạn, vui lòng:</p>
                    <ol>
                        <li>Đổi mật khẩu ngay lập tức</li>
                        <li>Kiểm tra các thiết bị đã đăng nhập</li>
                        <li>Bật xác thực hai yếu tố (2FA)</li>
                    </ol>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                    <p style="color: #666; font-size: 12px;">
                        Email này được gửi tự động để bảo vệ tài khoản của bạn.
                    </p>
                </div>
            </body>
            </html>
            """, fullName, deviceName, location, ipAddress);
    }

    private String buildAccountLockedEmailContent(String fullName, String lockedUntil) {
        return String.format("""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #DC2626;">Tài khoản bị khóa tạm thời</h2>
                    <p>Xin chào <strong>%s</strong>,</p>
                    <p>Tài khoản của bạn đã bị khóa do đăng nhập sai quá nhiều lần.</p>
                    <div style="background-color: #FEE2E2; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <p style="margin: 5px 0;"><strong>Thời gian mở khóa:</strong> %s</p>
                    </div>
                    <p>Để bảo vệ tài khoản của bạn:</p>
                    <ul>
                        <li>Đảm bảo bạn nhớ đúng mật khẩu</li>
                        <li>Nếu quên mật khẩu, sử dụng chức năng "Quên mật khẩu"</li>
                        <li>Cân nhắc bật xác thực hai yếu tố (2FA)</li>
                    </ul>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                    <p style="color: #666; font-size: 12px;">
                        Nếu bạn không thực hiện các lần đăng nhập này, vui lòng liên hệ hỗ trợ ngay.
                    </p>
                </div>
            </body>
            </html>
            """, fullName, lockedUntil);
    }

    private String buildMfaSetupEmailContent(String fullName, String[] backupCodes) {
        StringBuilder codesHtml = new StringBuilder();
        for (String code : backupCodes) {
            codesHtml.append(String.format("<li style='font-family: monospace; font-size: 14px;'>%s</li>", code));
        }

        return String.format("""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #10B981;">Xác thực hai yếu tố đã được bật</h2>
                    <p>Xin chào <strong>%s</strong>,</p>
                    <p>Xác thực hai yếu tố (2FA) đã được kích hoạt thành công cho tài khoản của bạn.</p>
                    <p><strong>Lưu các mã dự phòng sau đây:</strong></p>
                    <div style="background-color: #F3F4F6; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <ul style="list-style: none; padding: 0;">
                            %s
                        </ul>
                    </div>
                    <p style="color: #DC2626;"><strong>Lưu ý quan trọng:</strong></p>
                    <ul>
                        <li>Mỗi mã chỉ có thể sử dụng một lần</li>
                        <li>Lưu các mã này ở nơi an toàn</li>
                        <li>Sử dụng khi bạn không thể truy cập ứng dụng xác thực</li>
                    </ul>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                    <p style="color: #666; font-size: 12px;">
                        Nếu bạn không kích hoạt 2FA, vui lòng liên hệ hỗ trợ ngay lập tức.
                    </p>
                </div>
            </body>
            </html>
            """, fullName, codesHtml.toString());
    }

    private String buildVerificationOtpEmailContent(String fullName, String otp) {
        StringBuilder otpBoxes = new StringBuilder();
        for (char c : otp.toCharArray()) {
            otpBoxes.append(String.format(
                "<span style=\"display: inline-block; width: 34px; height: 44px; line-height: 44px; margin: 0 3px; font-size: 22px; font-weight: 700; color: #047857; background: #ffffff; border: 1.5px solid #a7f3d0; border-radius: 8px; box-shadow: 0 1px 3px rgba(4, 120, 87, 0.08); text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace;\">%c</span>",
                c
            ));
        }

        return String.format("""
            <!DOCTYPE html>
            <html lang="vi">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 24px 12px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1e293b;">
                <table width="100%%" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                        <td align="center">
                            <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="max-width: 500px; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
                                <!-- Header Nền Sáng Chào Mừng Thương Hiệu Finora -->
                                <tr>
                                    <td style="background: linear-gradient(180deg, #ecfdf5 0%%, #ffffff 100%%); padding: 36px 24px 22px 24px; text-align: center; border-bottom: 1px solid #f1f5f9;">
                                        <div style="display: inline-block; background: #047857; color: #ffffff; font-size: 11px; font-weight: 800; letter-spacing: 1.5px; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; margin-bottom: 12px;">
                                            FINORA
                                        </div>
                                        <h1 style="color: #064e3b; margin: 0 0 6px 0; font-size: 22px; font-weight: 800; letter-spacing: -0.3px;">
                                            Chào mừng bạn đến với Finora! 🎉
                                        </h1>
                                        <p style="color: #059669; font-size: 13px; margin: 0; font-weight: 600;">
                                            Nền tảng quản lý tài chính cá nhân thông minh
                                        </p>
                                    </td>
                                </tr>

                                <!-- Body content -->
                                <tr>
                                    <td style="padding: 24px 24px 18px 24px;">
                                        <p style="font-size: 15px; color: #1e293b; margin: 0 0 10px 0; font-weight: 600;">
                                            Xin chào %s,
                                        </p>
                                        <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 20px 0;">
                                            Cảm ơn bạn đã lựa chọn Finora để tối ưu hóa và quản lý tài chính cá nhân. Dưới đây là mã xác thực OTP 6 số để hoàn tất đăng ký tài khoản của bạn:
                                        </p>

                                        <!-- OTP Display Box -->
                                        <div style="background: #f0fdf4; border: 1.5px solid #bbf7d0; border-radius: 12px; padding: 18px 12px; text-align: center; margin: 0 0 20px 0;">
                                            <p style="margin: 0 0 10px 0; font-size: 11px; font-weight: 700; color: #047857; text-transform: uppercase; letter-spacing: 1.5px;">
                                                MÃ XÁC THỰC OTP CỦA BẠN
                                            </p>
                                            <div style="display: inline-block; white-space: nowrap;">
                                                %s
                                            </div>
                                            <p style="margin: 10px 0 0 0; font-size: 12px; color: #059669; font-weight: 500;">
                                                ⏱️ Mã có hiệu lực trong vòng <strong>10 phút</strong>
                                            </p>
                                        </div>

                                        <!-- Giới thiệu các tiện ích Finora -->
                                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; margin: 0 0 20px 0;">
                                            <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 700; color: #334155; text-transform: uppercase; letter-spacing: 0.5px;">
                                                ✨ Tiện ích nổi bật cùng Finora:
                                            </p>
                                            <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="font-size: 12.5px; color: #64748b; line-height: 1.6;">
                                                <tr>
                                                    <td style="padding: 2px 0;">🤖 <strong>Trợ lý AI:</strong> Phân tích thói quen chi tiêu & đề xuất tiết kiệm</td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 2px 0;">📸 <strong>Quét hóa đơn OCR:</strong> Nhận diện và ghi chép chi tiêu tức thì</td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 2px 0;">👨‍👩‍👧 <strong>Ví gia đình & Trẻ em:</strong> Phân quyền và theo dõi ngân sách nhóm</td>
                                                </tr>
                                            </table>
                                        </div>

                                        <p style="font-size: 12px; color: #94a3b8; line-height: 1.5; margin: 0;">
                                            🔒 <em>Lưu ý bảo mật: Tuyệt đối không chia sẻ mã này với bất kỳ ai, kể cả nhân viên Finora.</em>
                                        </p>
                                    </td>
                                </tr>

                                <!-- Footer -->
                                <tr>
                                    <td style="background: #f8fafc; padding: 16px 24px; border-top: 1px solid #f1f5f9; text-align: center;">
                                        <p style="font-size: 11.5px; color: #94a3b8; margin: 0 0 4px 0;">
                                            Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua thư.
                                        </p>
                                        <p style="font-size: 11px; color: #cbd5e1; margin: 0;">
                                            © 2026 Finora · Nền tảng quản lý tài chính cá nhân thông minh
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
            """, fullName != null && !fullName.isBlank() ? fullName : "bạn", otpBoxes.toString());
    }

    private String buildPasswordResetOtpEmailContent(String fullName, String otp) {
        StringBuilder otpBoxes = new StringBuilder();
        for (char c : otp.toCharArray()) {
            otpBoxes.append(String.format(
                "<span style=\"display: inline-block; width: 34px; height: 44px; line-height: 44px; margin: 0 3px; font-size: 22px; font-weight: 700; color: #dc2626; background: #ffffff; border: 1.5px solid #fecaca; border-radius: 8px; box-shadow: 0 1px 3px rgba(220, 38, 38, 0.08); text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace;\">%c</span>",
                c
            ));
        }

        return String.format("""
            <!DOCTYPE html>
            <html lang="vi">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 24px 12px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1e293b;">
                <table width="100%%" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                        <td align="center">
                            <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="max-width: 500px; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
                                <!-- Header Nền Sáng Đặt Lại Mật Khẩu -->
                                <tr>
                                    <td style="background: linear-gradient(180deg, #fef2f2 0%%, #ffffff 100%%); padding: 36px 24px 22px 24px; text-align: center; border-bottom: 1px solid #f1f5f9;">
                                        <div style="display: inline-block; background: #dc2626; color: #ffffff; font-size: 11px; font-weight: 800; letter-spacing: 1.5px; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; margin-bottom: 12px;">
                                            FINORA
                                        </div>
                                        <h1 style="color: #991b1b; margin: 0 0 6px 0; font-size: 22px; font-weight: 800; letter-spacing: -0.3px;">
                                            Yêu cầu đặt lại mật khẩu
                                        </h1>
                                        <p style="color: #ef4444; font-size: 13px; margin: 0; font-weight: 600;">
                                            Finora · Nền tảng quản lý tài chính cá nhân thông minh
                                        </p>
                                    </td>
                                </tr>

                                <!-- Body content -->
                                <tr>
                                    <td style="padding: 24px 24px 18px 24px;">
                                        <p style="font-size: 15px; color: #1e293b; margin: 0 0 10px 0; font-weight: 600;">
                                            Xin chào %s,
                                        </p>
                                        <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 20px 0;">
                                            Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản Finora của bạn. Vui lòng nhập mã OTP 6 số dưới đây để tiếp tục tạo mật khẩu mới:
                                        </p>

                                        <!-- OTP Display Box -->
                                        <div style="background: #fef2f2; border: 1.5px solid #fee2e2; border-radius: 12px; padding: 18px 12px; text-align: center; margin: 0 0 20px 0;">
                                            <p style="margin: 0 0 10px 0; font-size: 11px; font-weight: 700; color: #b91c1c; text-transform: uppercase; letter-spacing: 1.5px;">
                                                MÃ OTP ĐẶT LẠI MẬT KHẨU
                                            </p>
                                            <div style="display: inline-block; white-space: nowrap;">
                                                %s
                                            </div>
                                            <p style="margin: 10px 0 0 0; font-size: 12px; color: #dc2626; font-weight: 500;">
                                                ⏱️ Mã có hiệu lực trong vòng <strong>10 phút</strong>
                                            </p>
                                        </div>

                                        <p style="font-size: 12.5px; color: #64748b; line-height: 1.5; margin: 0;">
                                            🔒 <em>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua thư này. Tài khoản của bạn vẫn được bảo vệ an toàn.</em>
                                        </p>
                                    </td>
                                </tr>

                                <!-- Footer -->
                                <tr>
                                    <td style="background: #f8fafc; padding: 16px 24px; border-top: 1px solid #f1f5f9; text-align: center;">
                                        <p style="font-size: 11.5px; color: #94a3b8; margin: 0 0 4px 0;">
                                            Hỗ trợ bảo mật tài khoản người dùng Finora
                                        </p>
                                        <p style="font-size: 11px; color: #cbd5e1; margin: 0;">
                                            © 2026 Finora · Nền tảng quản lý tài chính cá nhân thông minh
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
            """, fullName != null && !fullName.isBlank() ? fullName : "bạn", otpBoxes.toString());
    }

    private String buildGroupInvitationEmailContent(String inviteeName, String inviterName, String groupName, String role) {
        String roleText = "Thành viên";
        if ("ADMIN".equalsIgnoreCase(role)) roleText = "Quản trị viên";
        else if ("VIEWER".equalsIgnoreCase(role)) roleText = "Người theo dõi";

        String groupLink = "https://finora.3congian.com/groups";

        return String.format("""
            <!DOCTYPE html>
            <html lang="vi">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 24px 12px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1e293b;">
                <table width="100%%" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                        <td align="center">
                            <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="max-width: 500px; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
                                <!-- Header Lời Mời Tham Gia Nhóm -->
                                <tr>
                                    <td style="background: linear-gradient(180deg, #ecfdf5 0%%, #ffffff 100%%); padding: 36px 24px 22px 24px; text-align: center; border-bottom: 1px solid #f1f5f9;">
                                        <div style="display: inline-block; background: #047857; color: #ffffff; font-size: 11px; font-weight: 800; letter-spacing: 1.5px; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; margin-bottom: 12px;">
                                            FINORA
                                        </div>
                                        <h1 style="color: #064e3b; margin: 0 0 6px 0; font-size: 21px; font-weight: 800; letter-spacing: -0.3px;">
                                            Lời mời tham gia nhóm 👥
                                        </h1>
                                        <p style="color: #059669; font-size: 13px; margin: 0; font-weight: 600;">
                                            Quản lý chi tiêu & ngân sách chung minh bạch
                                        </p>
                                    </td>
                                </tr>

                                <!-- Body content -->
                                <tr>
                                    <td style="padding: 24px 24px 20px 24px;">
                                        <p style="font-size: 15px; color: #1e293b; margin: 0 0 12px 0; font-weight: 600;">
                                            Xin chào %s,
                                        </p>
                                        <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 20px 0;">
                                            <strong>%s</strong> vừa gửi cho bạn một lời mời tham gia nhóm quản lý tài chính trên Finora.
                                        </p>

                                        <!-- Group Info Card -->
                                        <div style="background: #f0fdf4; border: 1.5px solid #bbf7d0; border-radius: 14px; padding: 18px 20px; margin: 0 0 22px 0;">
                                            <p style="margin: 0 0 8px 0; font-size: 13px; color: #065f46;">
                                                Tên nhóm: <strong style="font-size: 16px; color: #047857;">%s</strong>
                                            </p>
                                            <p style="margin: 0; font-size: 13px; color: #065f46;">
                                                Vai trò được mời: <span style="display: inline-block; background: #ffffff; border: 1px solid #86efac; color: #047857; padding: 2px 10px; border-radius: 6px; font-weight: 700; font-size: 12px;">%s</span>
                                            </p>
                                        </div>

                                        <p style="font-size: 13.5px; color: #475569; line-height: 1.6; margin: 0 0 24px 0;">
                                            Hãy truy cập mục <strong>Nhóm</strong> trên Finora để xem chi tiết và xác nhận lời mời:
                                        </p>

                                        <!-- CTA Button -->
                                        <div style="text-align: center; margin: 0 0 24px 0;">
                                            <a href="%s" style="display: inline-block; background: #059669; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-size: 14px; font-weight: 700; box-shadow: 0 3px 8px rgba(5, 150, 105, 0.25);">
                                                Xem Lời Mời & Tham Gia
                                            </a>
                                        </div>

                                        <p style="font-size: 12px; color: #94a3b8; line-height: 1.5; margin: 0;">
                                            💡 <em>Nếu bạn không biết người gửi hoặc không có nhu cầu tham gia nhóm này, bạn có thể từ chối trực tiếp trên hệ thống hoặc bỏ qua email này.</em>
                                        </p>
                                    </td>
                                </tr>

                                <!-- Footer -->
                                <tr>
                                    <td style="background: #f8fafc; padding: 16px 24px; border-top: 1px solid #f1f5f9; text-align: center;">
                                        <p style="font-size: 11px; color: #cbd5e1; margin: 0;">
                                            © 2026 Finora · Nền tảng quản lý tài chính cá nhân thông minh
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
            """,
            inviteeName != null && !inviteeName.isBlank() ? inviteeName : "bạn",
            inviterName,
            groupName,
            roleText,
            groupLink
        );
    }
}
