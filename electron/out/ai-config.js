"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAIConfigPath = getAIConfigPath;
exports.getAIConfig = getAIConfig;
exports.saveAIConfig = saveAIConfig;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const electron_1 = require("electron");
// 获取AI配置文件路径
function getAIConfigPath() {
    const isDevelopment = process.env.NODE_ENV === 'development';
    if (isDevelopment) {
        // 开发环境：配置文件保存在项目根目录
        return path.join(process.cwd(), 'aiconfig.json');
    }
    else {
        // 生产环境：配置文件保存在应用程序同级目录
        return path.join(path.dirname(electron_1.app.getPath('exe')), 'aiconfig.json');
    }
}
// 获取AI配置
async function getAIConfig() {
    try {
        const configPath = getAIConfigPath();
        console.log('AI配置文件路径:', configPath);
        // 检查文件是否存在
        if (!fs.existsSync(configPath)) {
            console.log('AI配置文件不存在，返回空配置');
            // 如果文件不存在，返回空配置
            return { success: true, providers: [] };
        }
        // 读取配置文件
        const configData = await fs.promises.readFile(configPath, 'utf-8');
        const config = JSON.parse(configData);
        console.log('成功读取AI配置:', config.providers.length, '个提供商');
        return { success: true, providers: config.providers || [] };
    }
    catch (error) {
        console.error('获取AI配置失败:', error);
        return {
            success: false,
            error: `获取AI配置失败: ${error instanceof Error ? error.message : String(error)}`
        };
    }
}
// 保存AI配置
async function saveAIConfig(providers) {
    try {
        const configPath = getAIConfigPath();
        console.log('保存AI配置到:', configPath);
        const config = { providers };
        // 确保目录存在
        const configDir = path.dirname(configPath);
        if (!fs.existsSync(configDir)) {
            await fs.promises.mkdir(configDir, { recursive: true });
        }
        // 写入配置文件
        await fs.promises.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
        console.log('成功保存AI配置:', providers.length, '个提供商');
        return { success: true };
    }
    catch (error) {
        console.error('保存AI配置失败:', error);
        return {
            success: false,
            error: `保存AI配置失败: ${error instanceof Error ? error.message : String(error)}`
        };
    }
}
