import React, { useState, useEffect } from 'react'
import { Dropdown, Button, Toast } from '@douyinfe/semi-ui'
import { IconChevronDown } from '@douyinfe/semi-icons'

interface AiApiConfig {
  id: string
  name: string
  apiKey: string
  apiUrl: string
  modelName: string
  temperature?: string
  maxTokens?: string
  isThinkingModel?: boolean
}

interface ModelSelectorProps {
  onModelChange: (modelId: string) => void
  currentModelId: string
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ onModelChange, currentModelId }) => {
  const [models, setModels] = useState<AiApiConfig[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [dropdownVisible, setDropdownVisible] = useState<boolean>(false)

  // 加载模型配置
  useEffect(() => {
    const loadModels = async () => {
      try {
        setLoading(true)
        const configs = await window.api.settings.get('AiApiConfigs')
        if (configs && Array.isArray(configs)) {
          setModels(configs)
          
          // 如果还没有设置当前模型且有可用模型，设置第一个为默认
          if (!currentModelId && configs.length > 0) {
            onModelChange(configs[0].id)
          }
        }
      } catch (error) {
        Toast.error('加载模型配置失败')
        console.error('加载模型配置失败:', error)
      } finally {
        setLoading(false)
      }
    }

    loadModels()
  }, [currentModelId, onModelChange])

  // 获取当前选中模型的名称
  const getCurrentModelName = () => {
    if (loading) return '加载中...'
    
    const currentModel = models.find(model => model.id === currentModelId)
    return currentModel ? currentModel.name : '选择模型'
  }

  return (
    <Dropdown
      trigger="click"
      visible={dropdownVisible}
      onVisibleChange={setDropdownVisible}
      position="bottomLeft"
      render={
        <Dropdown.Menu>
          {models.length === 0 ? (
            <Dropdown.Item disabled>暂无可用模型</Dropdown.Item>
          ) : (
            models.map(model => (
              <Dropdown.Item
                key={model.id}
                onClick={() => onModelChange(model.id)}
                active={model.id === currentModelId}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>{model.name}</span>
                  {model.isThinkingModel && (
                    <span 
                      style={{
                        backgroundColor: 'rgba(0, 180, 42, 0.15)',
                        color: '#00b42a',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}
                    >
                      思维模型
                    </span>
                  )}
                </div>
              </Dropdown.Item>
            ))
          )}
          <Dropdown.Divider />
          <Dropdown.Item 
            onClick={() => {
              window.api.navigation.navigateToView('Settings')
              setDropdownVisible(false)
            }}
          >
            管理模型...
          </Dropdown.Item>
        </Dropdown.Menu>
      }
    >
      <Button
        suffix={<IconChevronDown />}
        loading={loading}
        disabled={loading}
      >
        {getCurrentModelName()}
      </Button>
    </Dropdown>
  )
}

export default ModelSelector