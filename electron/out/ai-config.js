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
exports.defaultPrompts = void 0;
exports.getAIConfigPath = getAIConfigPath;
exports.getAIConfig = getAIConfig;
exports.saveAIConfig = saveAIConfig;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const electron_1 = require("electron");
// 默认提示词配置
exports.defaultPrompts = {
    understand: [
        {
            id: 'default-understand',
            name: '默认理解',
            prompt: '请帮我理解以下内容，解释其中的含义和关键点：\n\n{{content}}',
            isDefault: true
        }
    ],
    rewrite: [
        {
            id: 'default-rewrite',
            name: '默认改写',
            prompt: '请帮我改写以下内容，保持原意但使表达更加清晰和流畅：\n\n{{content}}',
            isDefault: true
        }
    ],
    expand: [
        {
            id: 'default-expand',
            name: '默认扩展',
            prompt: '请基于以下内容进行扩展写作，添加更多相关的观点、例子或细节：\n\n{{content}}',
            isDefault: true
        }
    ],
    continue: [
        {
            id: 'default-continue',
            name: '默认续写',
            prompt: '请基于以下内容继续写作，保持风格一致并发展后续内容：\n\n{{content}}',
            isDefault: true
        }
    ]
};
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
            console.log('AI配置文件不存在，返回默认配置');
            // 如果文件不存在，返回默认配置
            return { success: true, providers: [], prompts: exports.defaultPrompts };
        }
        // 读取配置文件
        const configData = await fs.promises.readFile(configPath, 'utf-8');
        const config = JSON.parse(configData);
        // 确保prompts字段存在，如果不存在则使用默认值
        if (!config.prompts) {
            config.prompts = exports.defaultPrompts;
        }
        // 确保所有prompt类型都存在
        if (!config.prompts.understand)
            config.prompts.understand = exports.defaultPrompts.understand;
        if (!config.prompts.rewrite)
            config.prompts.rewrite = exports.defaultPrompts.rewrite;
        if (!config.prompts.expand)
            config.prompts.expand = exports.defaultPrompts.expand;
        if (!config.prompts.continue)
            config.prompts.continue = exports.defaultPrompts.continue;
        console.log('成功读取AI配置:', config.providers.length, '个提供商,', '提示词配置:', config.prompts.understand.length, '个理解提示,', config.prompts.rewrite.length, '个改写提示,', config.prompts.expand.length, '个扩展提示,', config.prompts.continue.length, '个续写提示');
        return {
            success: true,
            providers: config.providers || [],
            prompts: config.prompts
        };
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
async function saveAIConfig(config) {
    try {
        const configPath = getAIConfigPath();
        console.log('保存AI配置到:', configPath);
        // 读取现有配置（如果存在）
        let existingConfig = {
            providers: [],
            prompts: exports.defaultPrompts
        };
        if (fs.existsSync(configPath)) {
            try {
                const configData = await fs.promises.readFile(configPath, 'utf-8');
                existingConfig = JSON.parse(configData);
            }
            catch (err) {
                console.warn('读取现有配置失败，将使用默认配置', err);
            }
        }
        // 合并配置
        const mergedConfig = {
            providers: config.providers || existingConfig.providers || [],
            prompts: config.prompts || existingConfig.prompts || exports.defaultPrompts
        };
        // 确保目录存在
        const configDir = path.dirname(configPath);
        if (!fs.existsSync(configDir)) {
            await fs.promises.mkdir(configDir, { recursive: true });
        }
        // 写入配置文件
        await fs.promises.writeFile(configPath, JSON.stringify(mergedConfig, null, 2), 'utf-8');
        console.log('成功保存AI配置:', mergedConfig.providers.length, '个提供商,', '提示词配置:', mergedConfig.prompts.understand.length, '个理解提示,', mergedConfig.prompts.rewrite.length, '个改写提示,', mergedConfig.prompts.expand.length, '个扩展提示,', mergedConfig.prompts.continue.length, '个续写提示');
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
