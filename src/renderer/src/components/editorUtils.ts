export const uploadImage = async (
  file: File,
  currentFolder?: string,
  currentFile?: string
): Promise<string> => {
  if (!currentFolder || !currentFile) {
    throw new Error('请先选择或创建一个文档')
  }

  if (!file.type.startsWith('image/')) {
    throw new Error('请选择图片文件')
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error('图片文件不能超过 5MB')
  }

  try {
    const fileData = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

    const result = await window.api.markdown.uploadFile(
      `${currentFolder}/${currentFile}`,
      fileData,
      file.name
    )

    if (result.success && result.url) {
      return result.url
    }

    throw new Error(result.error || '上传失败')
  } catch (error) {
    throw new Error(`上传图片失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    textArea.style.top = '-999999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    const success = document.execCommand('copy')
    document.body.removeChild(textArea)
    return success
  }
}
