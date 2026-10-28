package com.finance.finance.modules.notification.service;

import com.finance.finance.modules.notification.dto.request.RegisterDeviceRequest;
import com.finance.finance.modules.notification.dto.request.UnregisterDeviceRequest;
import com.finance.finance.modules.notification.dto.response.DeviceRegistrationResponse;
import com.finance.finance.modules.notification.entity.NotificationDevice;
import com.finance.finance.modules.notification.repository.NotificationDeviceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationDeviceService {

    private final NotificationDeviceRepository deviceRepository;

    /**
     * Register a device for push notifications
     */
    @Transactional
    public DeviceRegistrationResponse registerDevice(UUID userId, RegisterDeviceRequest request) {
        log.info("Registering device for user: {}, type: {}", userId, request.getDeviceType());

        // Check if device already exists
        Optional<NotificationDevice> existingDevice = deviceRepository.findByDeviceToken(request.getDeviceToken());

        NotificationDevice device;
        if (existingDevice.isPresent()) {
            // Update existing device
            device = existingDevice.get();
            device.setUserId(userId); // Update user if changed
            device.setDeviceType(request.getDeviceType());
            device.setDeviceName(request.getDeviceName());
            device.setAppVersion(request.getAppVersion());
            device.setIsActive(true);
            device.updateLastUsed();
            
            log.info("Updating existing device: {}", device.getId());
        } else {
            // Create new device
            device = NotificationDevice.builder()
                    .userId(userId)
                    .deviceToken(request.getDeviceToken())
                    .deviceType(request.getDeviceType())
                    .deviceName(request.getDeviceName())
                    .appVersion(request.getAppVersion())
                    .build();
            
            log.info("Creating new device registration");
        }

        device = deviceRepository.save(device);

        log.info("Device registered successfully: {}", device.getId());

        return DeviceRegistrationResponse.builder()
                .deviceId(device.getId())
                .deviceToken(device.getDeviceToken())
                .registeredAt(device.getRegisteredAt())
                .build();
    }

    /**
     * Unregister a device
     */
    @Transactional
    public void unregisterDevice(UUID userId, UnregisterDeviceRequest request) {
        log.info("Unregistering device for user: {}", userId);

        int deletedCount = deviceRepository.deleteByDeviceTokenAndUserId(request.getDeviceToken(), userId);

        if (deletedCount > 0) {
            log.info("Device unregistered successfully");
        } else {
            log.warn("Device not found or already unregistered");
        }
    }
}
