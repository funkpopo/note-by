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

// AI配置类型
export interface AIConfig {
  providers: AIProvider[];
}

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
export async function getAIConfig(): Promise<{ success: boolean; providers?: AIProvider[]; error?: string }> {
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
    const config = JSON.parse(configData) as AIConfig;
    
    console.log('成功读取AI配置:', config.providers.length, '个提供商');
    return { success: true, providers: config.providers || [] };
  } catch (error) {
    console.error('获取AI配置失败:', error);
    return { 
      success: false, 
      error: `获取AI配置失败: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
}

// 保存AI配置
export async function saveAIConfig(providers: AIProvider[]): Promise<{ success: boolean; error?: string }> {
  try {
    const configPath = getAIConfigPath();
    console.log('保存AI配置到:', configPath);
    const config: AIConfig = { providers };
    
    // 确保目录存在
    const configDir = path.dirname(configPath);
    if (!fs.existsSync(configDir)) {
      await fs.promises.mkdir(configDir, { recursive: true });
    }
    
    // 写入配置文件
    await fs.promises.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
    
    console.log('成功保存AI配置:', providers.length, '个提供商');
    return { success: true };
  } catch (error) {
    console.error('保存AI配置失败:', error);
    return { 
      success: false, 
      error: `保存AI配置失败: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
} 