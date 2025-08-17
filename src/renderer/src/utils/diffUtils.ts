/**
 * 文本差异比较工具
 * 提供字符级和行级diff算法
 */

export interface DiffItem {
  type: 'equal' | 'insert' | 'delete' | 'replace'
  originalText: string
  newText: string
  index: number
}

export interface DiffResult {
  diffs: DiffItem[]
  hasChanges: boolean
}

/**
 * 最长公共子序列算法
 */
function longestCommonSubsequence(text1: string, text2: string): number[][] {
  const m = text1.length
  const n = text2.length
  const dp: number[][] = Array(m + 1)
    .fill(0)
    .map(() => Array(n + 1).fill(0))

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (text1[i - 1] === text2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  return dp
}

/**
 * 计算两个文本字符串的差异
 */
export function computeTextDiff(originalText: string, newText: string): DiffResult {
  if (originalText === newText) {
    return {
      diffs: [
        {
          type: 'equal',
          originalText,
          newText,
          index: 0
        }
      ],
      hasChanges: false
    }
  }

  const diffs: DiffItem[] = []
  const dp = longestCommonSubsequence(originalText, newText)

  let i = originalText.length
  let j = newText.length
  let index = 0

  // 从右下角开始回溯
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && originalText[i - 1] === newText[j - 1]) {
      // 字符相同，继续
      i--
      j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      // 插入字符
      diffs.unshift({
        type: 'insert',
        originalText: '',
        newText: newText[j - 1],
        index: index++
      })
      j--
    } else if (i > 0) {
      // 删除字符
      diffs.unshift({
        type: 'delete',
        originalText: originalText[i - 1],
        newText: '',
        index: index++
      })
      i--
    }
  }

  // 合并相邻的相同类型操作
  const mergedDiffs = mergeSimilarDiffs(diffs)

  // 添加相等的部分
  const finalDiffs = addEqualParts(originalText, newText, mergedDiffs)

  return {
    diffs: finalDiffs,
    hasChanges: mergedDiffs.some((diff) => diff.type !== 'equal')
  }
}

/**
 * 合并相邻的相同类型diff项
 */
function mergeSimilarDiffs(diffs: DiffItem[]): DiffItem[] {
  if (diffs.length <= 1) return diffs

  const merged: DiffItem[] = []
  let current = { ...diffs[0] }

  for (let i = 1; i < diffs.length; i++) {
    const next = diffs[i]

    if (current.type === next.type) {
      // 合并相同类型的diff
      current.originalText += next.originalText
      current.newText += next.newText
    } else {
      merged.push(current)
      current = { ...next }
    }
  }

  merged.push(current)
  return merged
}

/**
 * 添加未变更的文本部分
 */
function addEqualParts(originalText: string, _newText: string, diffs: DiffItem[]): DiffItem[] {
  const result: DiffItem[] = []
  let originalIndex = 0

  for (const diff of diffs) {
    // 查找这个diff在原文本中的位置
    if (diff.type === 'delete' || diff.type === 'replace') {
      const diffStart = originalText.indexOf(diff.originalText, originalIndex)
      if (diffStart > originalIndex) {
        // 添加相等的前缀部分
        const equalText = originalText.slice(originalIndex, diffStart)
        result.push({
          type: 'equal',
          originalText: equalText,
          newText: equalText,
          index: result.length
        })
        originalIndex = diffStart
      }
      originalIndex += diff.originalText.length
    }

    result.push({
      ...diff,
      index: result.length
    })
  }

  // 添加末尾相等的部分
  if (originalIndex < originalText.length) {
    const remainingText = originalText.slice(originalIndex)
    result.push({
      type: 'equal',
      originalText: remainingText,
      newText: remainingText,
      index: result.length
    })
  }

  return result
}

/**
 * 计算两个文本行的差异
 */
export function computeLineDiff(originalText: string, newText: string): DiffResult {
  const originalLines = originalText.split('\n')
  const newLines = newText.split('\n')

  const diffs: DiffItem[] = []

  let i = 0,
    j = 0
  let index = 0

  while (i < originalLines.length || j < newLines.length) {
    if (i < originalLines.length && j < newLines.length && originalLines[i] === newLines[j]) {
      // 行相同
      diffs.push({
        type: 'equal',
        originalText: originalLines[i],
        newText: newLines[j],
        index: index++
      })
      i++
      j++
    } else if (i < originalLines.length && j < newLines.length) {
      // 行不同，判断是修改还是替换
      diffs.push({
        type: 'replace',
        originalText: originalLines[i],
        newText: newLines[j],
        index: index++
      })
      i++
      j++
    } else if (i < originalLines.length) {
      // 删除行
      diffs.push({
        type: 'delete',
        originalText: originalLines[i],
        newText: '',
        index: index++
      })
      i++
    } else {
      // 插入行
      diffs.push({
        type: 'insert',
        originalText: '',
        newText: newLines[j],
        index: index++
      })
      j++
    }
  }

  return {
    diffs,
    hasChanges: diffs.some((diff) => diff.type !== 'equal')
  }
}

/**
 * 应用diff到原文本，返回新文本
 */
export function applyDiff(_originalText: string, diffs: DiffItem[]): string {
  let result = ''

  for (const diff of diffs) {
    switch (diff.type) {
      case 'equal':
      case 'insert':
      case 'replace':
        result += diff.newText
        break
      case 'delete':
        // 跳过删除的内容
        break
    }
  }

  return result
}

/**
 * 智能diff：根据文本内容选择字符级或行级diff
 */
export function smartDiff(originalText: string, newText: string): DiffResult {
  const originalLines = originalText.split('\n').length
  const newLines = newText.split('\n').length

  // 如果是多行文本且行数差异较大，使用行级diff
  if (originalLines > 3 || newLines > 3 || Math.abs(originalLines - newLines) > 1) {
    return computeLineDiff(originalText, newText)
  }

  // 否则使用字符级diff
  return computeTextDiff(originalText, newText)
}
