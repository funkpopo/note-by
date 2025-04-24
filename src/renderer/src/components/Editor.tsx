import React, { useState, useEffect } from 'react';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import { Spin, Toast, Button, Dropdown, Typography } from '@douyinfe/semi-ui';
import { IconCopy, IconSetting, IconFile } from '@douyinfe/semi-icons';
import './Editor.css';

// Define props interface
interface EditorProps {
  currentFolder?: string;
  currentFile?: string;
  onFileChanged?: () => void;
}

// Define AI model options
const AI_MODELS = [
  { value: 'gpt-3.5', text: 'GPT-3.5' },
  { value: 'gpt-4', text: 'GPT-4' },
  { value: 'claude-3', text: 'Claude 3' },
  { value: 'gemini', text: 'Gemini' },
];

const EditorComponent: React.FC<EditorProps> = ({ currentFolder, currentFile, onFileChanged }) => {
  const [editorData, setEditorData] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [editorInstance, setEditorInstance] = useState<any>(null);
  const [selectedAIModel, setSelectedAIModel] = useState<string>('gpt-3.5');
  const { Text } = Typography;

  // Load file content when current file changes
  useEffect(() => {
    if (currentFolder && currentFile) {
      loadFileContent();
    } else {
      setEditorData('');
    }
  }, [currentFolder, currentFile]);

  // Load file content from the filesystem
  const loadFileContent = async (): Promise<void> => {
    try {
      setLoading(true);
      // Using the markdown:read-file IPC channel
      const filePath = `${currentFolder}/${currentFile}`;
      const result = await window.api.markdown.readFile(filePath);
      
      if (result.success && result.content !== undefined) {
        setEditorData(result.content);
      } else {
        throw new Error(result.error || 'Failed to load file');
      }
    } catch (error) {
      console.error('Error loading file:', error);
      Toast.error('文件加载失败');
    } finally {
      setLoading(false);
    }
  };

  // Save content to file
  const saveContent = async (content: string): Promise<void> => {
    if (!currentFolder || !currentFile) return;

    try {
      // Using the markdown:save IPC channel
      const filePath = `${currentFolder}/${currentFile}`;
      const result = await window.api.markdown.save(filePath, content);
      
      if (result.success) {
        Toast.success('保存成功');
        if (onFileChanged) {
          onFileChanged();
        }
      } else {
        throw new Error(result.error || 'Failed to save file');
      }
    } catch (error) {
      console.error('Error saving file:', error);
      Toast.error('保存失败');
    }
  };

  // Copy content to clipboard
  const copyContent = (): void => {
    if (editorData) {
      navigator.clipboard.writeText(editorData)
        .then(() => {
          Toast.success('内容已复制到剪贴板');
        })
        .catch(err => {
          console.error('复制失败:', err);
          Toast.error('复制失败');
        });
    }
  };

  // Handle AI model selection
  const handleAIModelChange = (value: string): void => {
    setSelectedAIModel(value);
    Toast.info(`已选择 ${AI_MODELS.find(model => model.value === value)?.text} 作为 AI 助手`);
  };

  // Handle editor initialization
  useEffect(() => {
    if (editorInstance) {
      // Make sure the editor can scroll properly
      try {
        const editorElement = editorInstance.ui.getEditableElement();
        if (editorElement) {
          // Ensure the editable area can scroll
          editorElement.style.overflow = 'auto';
          editorElement.style.height = '100%';
        }
      } catch (error) {
        console.error('Error adjusting editor DOM:', error);
      }
    }
  }, [editorInstance]);

  // Editor configuration
  const editorConfig = {
    // CKEditor configuration options
    toolbar: [
      'heading',
      '|',
      'bold',
      'italic',
      'link',
      'bulletedList',
      'numberedList',
      '|',
      'outdent',
      'indent',
      '|',
      'blockQuote',
      'insertTable',
      'undo',
      'redo'
    ]
  };

  // Handle command+s or ctrl+s to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (editorInstance && editorData) {
          saveContent(editorData);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [editorData, editorInstance]);

  // Build AI model dropdown menu
  const aiModelMenu = {
    render: (item: any) => {
      return <Dropdown.Item onClick={() => handleAIModelChange(item.value)}>{item.text}</Dropdown.Item>;
    },
    items: AI_MODELS,
  };

  return (
    <div className="editor-container">
      {loading ? (
        <div className="loading-container">
          <Spin size="large" />
        </div>
      ) : currentFolder && currentFile ? (
        <div className="editor-wrapper">
          <div className="editor-header">
            <div className="file-info">
              <Text icon={<IconFile />} strong>
                {currentFile} {currentFolder && `(${currentFolder})`}
              </Text>
            </div>
            <div className="editor-actions">
              <Button 
                icon={<IconCopy />} 
                theme="borderless" 
                onClick={copyContent} 
                title="复制全部内容"
              >
                复制全部
              </Button>
              <Dropdown 
                trigger="click" 
                position="bottomRight" 
                render={
                  <Dropdown.Menu>
                    {AI_MODELS.map(model => (
                      <Dropdown.Item 
                        key={model.value} 
                        active={selectedAIModel === model.value}
                        onClick={() => handleAIModelChange(model.value)}
                      >
                        {model.text}
                      </Dropdown.Item>
                    ))}
                  </Dropdown.Menu>
                }
              >
                <Button 
                  icon={<IconSetting />} 
                  theme="borderless" 
                  title="AI 助手配置"
                >
                  {AI_MODELS.find(model => model.value === selectedAIModel)?.text || '选择 AI 模型'}
                </Button>
              </Dropdown>
              <Button 
                className="save-button" 
                onClick={() => saveContent(editorData)}
              >
                保存
              </Button>
            </div>
          </div>
          <CKEditor
            editor={ClassicEditor as any}
            data={editorData}
            config={editorConfig}
            onReady={(editor) => {
              setEditorInstance(editor);
              // You can store the "editor" and use when it is needed.
              console.log('Editor is ready to use!', editor);
            }}
            onChange={(event, editor) => {
              const data = editor.getData();
              setEditorData(data);
            }}
          />
        </div>
      ) : (
        <div className="no-file-selected">
          <p>请选择或创建一个文件</p>
        </div>
      )}
    </div>
  );
};

export default EditorComponent;
