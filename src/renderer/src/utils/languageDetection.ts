/**
 * 基于Unicode字符范围的简单语言检测工具
 * 支持检测中文、英文、日语和法语
 */

// 语言特征区间定义
const LANGUAGE_RANGES = {
  // 汉字字符范围
  zh: [
    { start: 0x4e00, end: 0x9fff } // CJK统一汉字
  ],
  // 日语特有假名范围（不包括汉字部分，因为与中文重叠）
  ja: [
    { start: 0x3040, end: 0x309f }, // 平假名
    { start: 0x30a0, end: 0x30ff }, // 片假名
    { start: 0xff66, end: 0xff9d } // 半角片假名
  ],
  // 拉丁字母范围 (包括英文和法语基本字符)
  en: [
    { start: 0x0020, end: 0x007f } // ASCII范围
  ],
  // 法语特有字符
  fr: [
    { start: 0x00c0, end: 0x00c6 }, // À Á Â Ã Ä Å Æ
    { start: 0x00c8, end: 0x00cf }, // È É Ê Ë Ì Í Î Ï
    { start: 0x00d9, end: 0x00dc }, // Ù Ú Û Ü
    { start: 0x00e0, end: 0x00e6 }, // à á â ã ä å æ
    { start: 0x00e8, end: 0x00ef }, // è é ê ë ì í î ï
    { start: 0x00f9, end: 0x00fc }, // ù ú û ü
    { start: 0x0152, end: 0x0153 }, // Œ œ
    { start: 0x0178, end: 0x0178 } // Ÿ
  ]
}

/**
 * 检测字符是否在给定的语言Unicode范围内
 */
const isCharInRange = (char: string, ranges: { start: number; end: number }[]): boolean => {
  const code = char.charCodeAt(0)
  return ranges.some((range) => code >= range.start && code <= range.end)
}

/**
 * 计算文本中属于某种语言的字符比例
 */
const calculateLanguageRatio = (text: string, languageCode: string): number => {
  const ranges = LANGUAGE_RANGES[languageCode as keyof typeof LANGUAGE_RANGES]
  if (!ranges) return 0

  let count = 0
  const validChars = text.replace(/\s/g, '') // 移除空白字符

  // 如果有效字符太少，返回0
  if (validChars.length < 2) return 0

  for (const char of validChars) {
    if (isCharInRange(char, ranges)) {
      count++
    }
  }

  return count / validChars.length
}

/**
 * 检测文本最可能的语言
 * @param text 要检测的文本
 * @param fallbackLang 如果无法确定语言时的默认语言
 * @returns 检测到的语言代码 (zh, en, ja, fr)
 */
export const detectLanguage = (text: string, fallbackLang = 'en'): string => {
  if (!text || text.trim().length < 3) {
    return fallbackLang
  }

  // 计算每种语言的字符比例
  const scores: Record<string, number> = {
    zh: calculateLanguageRatio(text, 'zh'),
    ja: calculateLanguageRatio(text, 'ja'),
    en: calculateLanguageRatio(text, 'en'),
    fr: calculateLanguageRatio(text, 'fr')
  }

  // 特殊处理：日语中如果日语假名字符比例超过一定阈值，识别为日语
  // 否则可能会被错误识别为中文（因为日语也包含汉字）
  if (scores.ja > 0.1) {
    scores.ja += 0.3
  }

  // 法语和英语有重叠，需要特殊处理
  // 如果法语特有字符比例超过一定阈值，识别为法语
  const frSpecificChars =
    text.split('').filter((char) => {
      return LANGUAGE_RANGES.fr.some((range) => {
        const code = char.charCodeAt(0)
        return code >= range.start && code <= range.end
      })
    }).length / text.length

  if (frSpecificChars > 0.05) {
    scores.fr += 0.3
    scores.en -= 0.2
  }

  // 找出得分最高的语言
  let maxScore = 0
  let detectedLang = fallbackLang

  for (const [lang, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score
      detectedLang = lang
    }
  }

  // 如果最高分低于一个阈值，则使用默认语言
  if (maxScore < 0.1) {
    return fallbackLang
  }

  return detectedLang
}
