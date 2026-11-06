package com.finance.finance.modules.admin.service;

import com.finance.finance.modules.admin.entity.SystemSetting;
import com.finance.finance.modules.admin.repository.SystemSettingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class SystemConfigService {

    private final SystemSettingRepository systemSettingRepository;

    public String getString(String key, String defaultValue) {
        try {
            Optional<SystemSetting> setting = systemSettingRepository.findById(key);
            return setting.map(SystemSetting::getValue).orElse(defaultValue);
        } catch (Exception e) {
            log.warn("Failed to load setting [{}], using default: {}", key, defaultValue);
            return defaultValue;
        }
    }

    public boolean getBoolean(String key, boolean defaultValue) {
        String val = getString(key, String.valueOf(defaultValue));
        return "true".equalsIgnoreCase(val) || "1".equals(val);
    }

    public int getInt(String key, int defaultValue) {
        String val = getString(key, String.valueOf(defaultValue));
        try {
            return Integer.parseInt(val.trim());
        } catch (NumberFormatException e) {
            return defaultValue;
        }
    }

    public long getLong(String key, long defaultValue) {
        String val = getString(key, String.valueOf(defaultValue));
        try {
            return Long.parseLong(val.trim());
        } catch (NumberFormatException e) {
            return defaultValue;
        }
    }

    public double getDouble(String key, double defaultValue) {
        String val = getString(key, String.valueOf(defaultValue));
        try {
            return Double.parseDouble(val.trim());
        } catch (NumberFormatException e) {
            return defaultValue;
        }
    }
}

