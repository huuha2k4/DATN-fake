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
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
        
        helper.setFrom(fromEmail);
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
}
