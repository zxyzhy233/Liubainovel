/**
 * 精确文字测量工具
 * 使用 Canvas measureText 进行真实字符宽度测量
 * 替代旧 PageLoader 中的固定比例估算
 */

import hilog from '@ohos.hilog'

const TAG: string = 'TextMeasurer'

/**
 * 字符宽度缓存条目
 */
interface CharWidthEntry {
  width: number
  fontSize: number
  fontFamily: string
}

export class TextMeasurer {
  private context: CanvasRenderingContext2D
  private charWidthCache: Map<string, number> = new Map()
  private currentFontSize: number = 20
  private currentFontFamily: string = 'HarmonyOS Sans'
  private spaceWidth: number = 0
  private cjkWidth: number = 0

  constructor(context: CanvasRenderingContext2D) {
    this.context = context
  }

  /**
   * 设置字体参数，清空缓存
   */
  setFont(fontSize: number, fontFamily: string): void {
    if (this.currentFontSize === fontSize && this.currentFontFamily === fontFamily) {
      return
    }
    this.currentFontSize = fontSize
    this.currentFontFamily = fontFamily
    this.charWidthCache.clear()
    this.applyFont()
    // 预缓存常用字符宽度
    this.spaceWidth = this.measureChar(' ')
    this.cjkWidth = this.measureChar('中')
  }

  /**
   * 应用字体到 Canvas context
   */
  private applyFont(): void {
    this.context.font = `${this.currentFontSize}px ${this.currentFontFamily}`
  }

  /**
   * 测量单个字符宽度
   */
  measureChar(char: string): number {
    const cached = this.charWidthCache.get(char)
    if (cached !== undefined) {
      return cached
    }

    this.applyFont()
    const metrics = this.context.measureText(char)
    const width = metrics.width
    this.charWidthCache.set(char, width)
    return width
  }

  /**
   * 测量字符串宽度
   */
  measureText(text: string): number {
    if (text.length === 0) return 0

    // 对于短字符串，直接整体测量更准确
    if (text.length <= 5) {
      this.applyFont()
      return this.context.measureText(text).width
    }

    // 对于长字符串，逐字符累加（利用缓存）
    let totalWidth = 0
    for (let i = 0; i < text.length; i++) {
      totalWidth += this.measureChar(text[i])
    }
    return totalWidth
  }

  /**
   * 获取行高（基于字号和行距倍数）
   */
  getLineHeight(lineSpacing: number): number {
    return this.currentFontSize * lineSpacing
  }

  /**
   * 获取首行缩进宽度（2个全角空格）
   */
  getIndentWidth(): number {
    return this.cjkWidth * 2
  }

  /**
   * 获取当前字号
   */
  getFontSize(): number {
    return this.currentFontSize
  }

  /**
   * 获取当前字体
   */
  getFontFamily(): string {
    return this.currentFontFamily
  }

  /**
   * 判断是否为 CJK 字符
   */
  static isCJK(char: string): boolean {
    const code = char.charCodeAt(0)
    return (code >= 0x4E00 && code <= 0x9FFF) ||   // CJK 统一汉字
      (code >= 0x3400 && code <= 0x4DBF) ||         // CJK 扩展 A
      (code >= 0xF900 && code <= 0xFAFF) ||         // CJK 兼容汉字
      (code >= 0x3000 && code <= 0x303F) ||         // CJK 标点
      (code >= 0xFF00 && code <= 0xFFEF) ||         // 全角字符
      (code >= 0x3040 && code <= 0x309F) ||         // 平假名
      (code >= 0x30A0 && code <= 0x30FF)            // 片假名
  }

  /**
   * 判断是否为标点符号（不应出现在行首）
   */
  static isLineStartForbidden(char: string): boolean {
    return '，。！？；：、）】》」』"\'…—～·'.includes(char)
  }

  /**
   * 判断是否为标点符号（不应出现在行尾）
   */
  static isLineEndForbidden(char: string): boolean {
    return '（【《「『"\''.includes(char)
  }
}
