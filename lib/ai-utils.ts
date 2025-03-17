// AI提供商类型
export interface AIProvider {
  id: string;
  name: string;
  apiEndpoint: string;
  apiKey: string;
  model: string;
  isDefault: boolean;
}

// Electron API 类型定义
interface ElectronAIConfig {
  success: boolean;
  providers?: AIProvider[];
  error?: string;
}

// 获取所有AI提供商
export function getAIProviders(): AIProvider[] {
  if (typeof window === 'undefined') return [];
  
  try {
    // 检查是否在Electron环境中运行
    if ('electron' in window) {
      const electron = (window as Window & typeof globalThis & { electron: { 
        getAIConfig: () => Promise<ElectronAIConfig>;
        saveAIConfig: (providers: AIProvider[]) => Promise<{ success: boolean; error?: string }>;
      } }).electron;
      
      // 使用Electron IPC调用获取AI配置
      // 注意：这是同步调用的结果，实际上是一个Promise
      // 为了保持API兼容性，我们在这里返回一个空数组，实际的异步获取应该在组件中处理
      
      // 启动异步获取
      electron.getAIConfig().then((result: ElectronAIConfig) => {
        if (result && result.success && result.providers) {
          // 将结果存储在localStorage中，以便在下次同步调用时使用
          localStorage.setItem('aiProviders', JSON.stringify(result.providers));
        }
      }).catch((error: Error) => {
        console.error('获取AI配置失败:', error);
      });
      
      // 返回缓存的结果
      const cachedProviders = localStorage.getItem('aiProviders');
      if (cachedProviders) {
        return JSON.parse(cachedProviders);
      }
    } else {
      // 在非Electron环境中使用localStorage
      const savedProviders = localStorage.getItem('aiProviders');
      if (savedProviders) {
        return JSON.parse(savedProviders);
      }
    }
  } catch (error) {
    console.error('加载AI提供商设置失败:', error);
  }
  
  return [];
}

// 获取默认AI提供商
export function getDefaultAIProvider(): AIProvider | null {
  const providers = getAIProviders();
  return providers.find(p => p.isDefault) || (providers.length > 0 ? providers[0] : null);
}

// 保存AI提供商设置
export function saveAIProviders(providers: AIProvider[]): boolean {
  try {
    // 检查是否在Electron环境中运行
    if (typeof window !== 'undefined' && 'electron' in window) {
      const electron = (window as Window & typeof globalThis & { electron: { 
        getAIConfig: () => Promise<ElectronAIConfig>;
        saveAIConfig: (providers: AIProvider[]) => Promise<{ success: boolean; error?: string }>;
      } }).electron;
      
      // 使用Electron IPC调用保存AI配置
      electron.saveAIConfig(providers).then((result: { success: boolean; error?: string }) => {
        if (result && result.success) {
          // 更新本地缓存
          localStorage.setItem('aiProviders', JSON.stringify(providers));
        } else {
          console.error('保存AI配置失败:', result.error);
        }
      }).catch((error: Error) => {
        console.error('保存AI配置失败:', error);
      });
      
      // 先更新本地缓存，以便立即可用
      localStorage.setItem('aiProviders', JSON.stringify(providers));
      return true;
    } else {
      // 在非Electron环境中使用localStorage
      localStorage.setItem('aiProviders', JSON.stringify(providers));
      return true;
    }
  } catch (error) {
    console.error('保存AI提供商设置失败:', error);
    return false;
  }
}

// 检测是否为OpenAI API
function isOpenAIEndpoint(endpoint: string): boolean {
  return endpoint.includes('openai.com') || 
         endpoint.includes('api.openai') || 
         endpoint.toLowerCase().includes('openai');
}

// 发送请求到AI API
export async function callAI(
  prompt: string, 
  providerId?: string
): Promise<{ success: boolean; content?: string; error?: string }> {
  try {
    // 获取AI提供商
    const providers = getAIProviders();
    if (providers.length === 0) {
      return { 
        success: false, 
        error: '未配置AI提供商。请先在AI设置中添加提供商。' 
      };
    }
    
    // 获取指定的提供商或默认提供商
    const provider = providerId 
      ? providers.find(p => p.id === providerId) 
      : providers.find(p => p.isDefault) || providers[0];
    
    if (!provider) {
      return { 
        success: false, 
        error: '找不到指定的AI提供商' 
      };
    }
    
    if (!provider.apiKey) {
      return { 
        success: false, 
        error: `${provider.name} 未配置API密钥` 
      };
    }
    
    // 检测是否为OpenAI API
    const isOpenAI = isOpenAIEndpoint(provider.apiEndpoint);
    
    // 根据提供商类型构建请求
    const requestBody = {
      model: provider.model || (isOpenAI ? 'gpt-3.5-turbo' : 'default-model'),
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 1000
    };
    
    // 如果是OpenAI API，尝试使用OpenAI SDK
    if (isOpenAI && typeof window !== 'undefined') {
      try {
        // 动态导入OpenAI SDK (仅在客户端)
        const { OpenAI } = await import('openai');
        
        // 创建OpenAI客户端
        const openai = new OpenAI({
          apiKey: provider.apiKey,
          baseURL: provider.apiEndpoint !== 'https://api.openai.com/v1' && provider.apiEndpoint 
            ? provider.apiEndpoint 
            : undefined,
        });
        
        // 发送请求
        const completion = await openai.chat.completions.create({
          model: provider.model || 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 1000,
        });
        
        const content = completion.choices[0]?.message?.content || '';
        return { success: true, content };
      } catch (error) {
        console.error('OpenAI SDK调用失败，回退到fetch API:', error);
        // 如果SDK调用失败，回退到fetch API
      }
    }
    
    // 使用fetch API发送请求
    const response = await fetch(provider.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${provider.apiKey}`
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { 
        success: false, 
        error: `API请求失败: ${response.status} ${response.statusText} - ${errorData.error?.message || JSON.stringify(errorData)}` 
      };
    }
    
    const data = await response.json();
    
    // 假设返回格式是OpenAI兼容的
    const content = data.choices?.[0]?.message?.content || data.content || '';
    
    return { success: true, content };
  } catch (error) {
    console.error('AI API调用失败:', error);
    return { 
      success: false, 
      error: `AI API调用失败: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
}