const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

// Gọi đúng chuẩn module @expo/env của chính Expo để nạp file .env ở thư mục gốc DATN
try {
  const { loadProjectEnv } = require('@expo/env');
  loadProjectEnv(workspaceRoot, { force: true });
} catch (e) {
  // Silent fallback
}

const config = getDefaultConfig(projectRoot);

// Cấu hình watch root ngoài cùng để Expo đọc được file .env ở thư mục gốc
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
];

module.exports = config;
