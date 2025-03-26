import crypto from 'crypto'

// 生成固定密钥和初始化向量（正式使用时应使用环境变量或配置文件）
const SECRET_KEY = 'note-by-app-secret-key-for-encryption'
const SECRET_IV = 'note-by-app-iv-16'

// 使用AES-256-CBC算法加密字符串
export function encrypt(text: string): string {
  try {
    // 创建哈希来生成一个确定的密钥
    const key = crypto.createHash('sha256').update(SECRET_KEY).digest('base64').substring(0, 32)
    // 创建一个固定的IV
    const iv = Buffer.from(SECRET_IV.padEnd(16, '0').substring(0, 16))

    // 创建cipher对象
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)

    // 加密
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')

    return encrypted
  } catch (error) {
    console.error('加密失败:', error)
    return ''
  }
}

// 解密字符串
export function decrypt(encryptedText: string): string {
  try {
    // 使用相同的密钥和IV
    const key = crypto.createHash('sha256').update(SECRET_KEY).digest('base64').substring(0, 32)
    const iv = Buffer.from(SECRET_IV.padEnd(16, '0').substring(0, 16))

    // 创建decipher对象
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)

    // 解密
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  } catch (error) {
    console.error('解密失败:', error)
    return ''
  }
}
