import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

// AI提供商类型
export interface AIProvider {
  id: string;
  name: string;
  apiEndpoint: string;
  apiKey: string;
  model: string;
  isDefault: boolean;
}

// AI提示词类型
export interface AIPrompt {
  id: string;
  name: string;
  prompt: string;
  isDefault?: boolean;
}

// AI配置类型
export interface AIConfig {
  providers: AIProvider[];
  prompts: {
    understand: AIPrompt[];  // 理解内容
    rewrite: AIPrompt[];     // 改写内容
    expand: AIPrompt[];      // 扩展写作
    continue: AIPrompt[];    // 继续写作
  };
}

// 默认提示词配置
export const defaultPrompts: AIConfig['prompts'] = {
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
export function getAIConfigPath(): string {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (isDevelopment) {
    // 开发环境：配置文件保存在项目根目录
    return path.join(process.cwd(), 'aiconfig.json');
  } else {
    // 生产环境：配置文件保存在应用程序同级目录
    return path.join(path.dirname(app.getPath('exe')), 'aiconfig.json');
  }
}

// 获取AI配置
export async function getAIConfig(): Promise<{ success: boolean; providers?: AIProvider[]; prompts?: AIConfig['prompts']; error?: string }> {
  try {
    const configPath = getAIConfigPath();
    console.log('AI配置文件路径:', configPath);
    
    // 检查文件是否存在
    if (!fs.existsSync(configPath)) {
      console.log('AI配置文件不存在，返回默认配置');
      // 如果文件不存在，返回默认配置
      return { success: true, providers: [], prompts: defaultPrompts };
    }
    
    // 读取配置文件
    const configData = await fs.promises.readFile(configPath, 'utf-8');
    const config = JSON.parse(configData) as AIConfig;
    
    // 确保prompts字段存在，如果不存在则使用默认值
    if (!config.prompts) {
      config.prompts = defaultPrompts;
    }
    
    // 确保所有prompt类型都存在
    if (!config.prompts.understand) config.prompts.understand = defaultPrompts.understand;
    if (!config.prompts.rewrite) config.prompts.rewrite = defaultPrompts.rewrite;
    if (!config.prompts.expand) config.prompts.expand = defaultPrompts.expand;
    if (!config.prompts.continue) config.prompts.continue = defaultPrompts.continue;
    
    console.log('成功读取AI配置:', config.providers.length, '个提供商,', 
      '提示词配置:', 
      config.prompts.understand.length, '个理解提示,',
      config.prompts.rewrite.length, '个改写提示,',
      config.prompts.expand.length, '个扩展提示,',
      config.prompts.continue.length, '个续写提示');
    
    return { 
      success: true, 
      providers: config.providers || [], 
      prompts: config.prompts
    };
  } catch (error) {
    console.error('获取AI配置失败:', error);
    return { 
      success: false, 
      error: `获取AI配置失败: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
}

// 保存AI配置
export async function saveAIConfig(
  config: { providers?: AIProvider[]; prompts?: AIConfig['prompts'] }
): Promise<{ success: boolean; error?: string }> {
  try {
    const configPath = getAIConfigPath();
    console.log('保存AI配置到:', configPath);
    
    // 读取现有配置（如果存在）
    let existingConfig: AIConfig = { 
      providers: [], 
      prompts: defaultPrompts 
    };
    
    if (fs.existsSync(configPath)) {
      try {
        const configData = await fs.promises.readFile(configPath, 'utf-8');
        existingConfig = JSON.parse(configData) as AIConfig;
      } catch (err) {
        console.warn('读取现有配置失败，将使用默认配置', err);
      }
    }
    
    // 合并配置
    const mergedConfig: AIConfig = {
      providers: config.providers || existingConfig.providers || [],
      prompts: config.prompts || existingConfig.prompts || defaultPrompts
    };
    
    // 确保目录存在
    const configDir = path.dirname(configPath);
    if (!fs.existsSync(configDir)) {
      await fs.promises.mkdir(configDir, { recursive: true });
    }
    
    // 写入配置文件
    await fs.promises.writeFile(configPath, JSON.stringify(mergedConfig, null, 2), 'utf-8');
    
    console.log('成功保存AI配置:',
      mergedConfig.providers.length, '个提供商,',
      '提示词配置:',
      mergedConfig.prompts.understand.length, '个理解提示,',
      mergedConfig.prompts.rewrite.length, '个改写提示,',
      mergedConfig.prompts.expand.length, '个扩展提示,',
      mergedConfig.prompts.continue.length, '个续写提示');
    
    return { success: true };
  } catch (error) {
    console.error('保存AI配置失败:', error);
    return { 
      success: false, 
      error: `保存AI配置失败: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
} 