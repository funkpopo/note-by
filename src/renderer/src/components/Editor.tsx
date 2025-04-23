import React, { useState, useEffect } from 'react';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import { Spin, Toast } from '@douyinfe/semi-ui';
import './Editor.css';

// Define props interface
interface EditorProps {
  currentFolder?: string;
  currentFile?: string;
  onFileChanged?: () => void;
}

const EditorComponent: React.FC<EditorProps> = ({ currentFolder, currentFile, onFileChanged }) => {
  const [editorData, setEditorData] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [editorInstance, setEditorInstance] = useState<any>(null);

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

  return (
    <div className="editor-container">
      {loading ? (
        <div className="loading-container">
          <Spin size="large" />
        </div>
      ) : currentFolder && currentFile ? (
        <div className="editor-wrapper">
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
          <div className="editor-footer">
            <button className="save-button" onClick={() => saveContent(editorData)}>
              保存
            </button>
          </div>
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
