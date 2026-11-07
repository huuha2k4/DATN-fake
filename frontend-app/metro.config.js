const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

// Chủ động đọc file .env và đưa vào process.env để Metro và Babel luôn luôn có biến
function loadEnvFile(envPath) {
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach((line) => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let val = match[2] ? match[2].trim() : '';
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    });
  }
}

// Chỉ đọc DUY NHẤT file .env ở thư mục gốc ngoài cùng của project
loadEnvFile(path.resolve(workspaceRoot, '.env'));

const config = getDefaultConfig(projectRoot);

// Cấu hình watch root ngoài cùng để Expo đọc được file .env ở thư mục gốc
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
];

module.exports = config;

