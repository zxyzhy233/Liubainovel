/**
 * 分页引擎 — 全新实现
 * 将纯文本内容分割为可渲染的页面
 * 使用 TextMeasurer 进行精确文字测量
 */

import { TextMeasurer } from './TextMeasurer'
import hilog from '@ohos.hilog'

const TAG: string = 'PageEngine'

/**
 * 字符渲染信息
 */
export class RenderChar {
  char: string = ''
  x: number = 0
  y: number = 0
  width: number = 0
  height: number = 0

  constructor(char: string, x: number, y: number, width: number, height: number) {
    this.char = char
    this.x = x
    this.y = y
    this.width = width
    this.height = height
  }
}

/**
 * 行渲染信息
 */
export class RenderLine {
  chars: RenderChar[] = []
  y: number = 0
  height: number = 0
  /** 是否为段落首行（有缩进） */
  isFirstLine: boolean = false

  getText(): string {
    return this.chars.map((c: RenderChar): string => c.char).join('')
  }
}

/**
 * 页面渲染信息
 */
export class RenderPage {
  chapterIndex: number = 0
  pageIndex: number = 0
  chapterTitle: string = ''
  lines: RenderLine[] = []

  /**
   * 获取页面纯文本
   */
  getText(): string {
    return this.lines.map((line: RenderLine): string => line.getText()).join('\n')
  }

  /**
   * 获取总字符数
   */
  getCharCount(): number {
    let count = 0
    this.lines.forEach((line: RenderLine) => {
      count += line.chars.length
    })
    return count
  }
}

/**
 * 分页配置
 */
export interface PaginateConfig {
  /** 页面宽度 */
  pageWidth: number
  /** 页面高度 */
  pageHeight: number
  /** 字号 */
  fontSize: number
  /** 字体 */
  fontFamily: string
  /** 行距倍数 */
  lineSpacing: number
  /** 段落间距（px） */
  paragraphSpacing: number
  /** 左边距 */
  paddingLeft: number
  /** 右边距 */
  paddingRight: number
  /** 上边距 */
  paddingTop: number
  /** 下边距 */
  paddingBottom: number
  /** 是否首行缩进 */
  indent: boolean
  /** 章节标题 */
  chapterTitle: string
  /** 章节索引 */
  chapterIndex: number
}

/**
 * 分页引擎
 */
export class PageEngine {
  private measurer: TextMeasurer

  constructor(measurer: TextMeasurer) {
    this.measurer = measurer
  }

  /**
   * 对章节内容进行分页
   * @param content 章节纯文本内容
   * @param config 分页配置
   * @returns 页面列表
   */
  paginate(content: string, config: PaginateConfig): RenderPage[] {
    if (!content || content.trim().length === 0) {
      return []
    }

    // 设置字体
    this.measurer.setFont(config.fontSize, config.fontFamily)

    const lineHeight = this.measurer.getLineHeight(config.lineSpacing)
    const contentWidth = config.pageWidth - config.paddingLeft - config.paddingRight
    const contentHeight = config.pageHeight - config.paddingTop - config.paddingBottom
    const linesPerPage = Math.floor(contentHeight / lineHeight)

    if (linesPerPage <= 0 || contentWidth <= 0) {
      hilog.error(0x0000, TAG, `无效的分页参数: contentWidth=${contentWidth}, linesPerPage=${linesPerPage}`)
      return []
    }

    // 第一步：将内容按段落分割
    const paragraphs = content.split(/\n+/).filter((p: string): boolean => p.trim().length > 0)

    // 第二步：将段落转换为渲染行
    const allLines: RenderLine[] = []
    for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
      const paragraph = paragraphs[pIdx].trim()
      if (paragraph.length === 0) continue

      const paragraphLines = this.wrapParagraph(
        paragraph,
        contentWidth,
        config.paddingLeft,
        config.paddingTop, // y 坐标后续在分页时重新计算
        lineHeight,
        config.indent
      )
      allLines.push(...paragraphLines)

      // 段落间距：在段落最后一行后添加额外间距标记
      if (pIdx < paragraphs.length - 1 && config.paragraphSpacing > 0) {
        // 通过在最后一行增加高度来实现段落间距
        if (paragraphLines.length > 0) {
          paragraphLines[paragraphLines.length - 1].height += config.paragraphSpacing
        }
      }
    }

    // 第三步：将行分配到页面
    const pages: RenderPage[] = []
    let lineIndex = 0

    while (lineIndex < allLines.length) {
      const page = new RenderPage()
      page.chapterIndex = config.chapterIndex
      page.pageIndex = pages.length
      page.chapterTitle = config.chapterTitle

      let currentY = config.paddingTop
      const maxY = config.pageHeight - config.paddingBottom

      // 第一页顶部插入章节标题
      if (pages.length === 0 && config.chapterTitle) {
        const titleFontSize = config.fontSize + 4
        const titleLineHeight = titleFontSize * 0.8
        const titleBottomMargin = 2

        // 创建标题行
        const titleLine = new RenderLine()
        titleLine.height = titleLineHeight + titleBottomMargin
        titleLine.isFirstLine = false
        titleLine.y = currentY

        // 标题居中：先测量标题宽度
        let titleX = config.paddingLeft
        for (let ci = 0; ci < config.chapterTitle.length; ci++) {
          const ch = config.chapterTitle[ci]
          const charWidth = this.measurer.measureChar(ch)
          const titleChar = new RenderChar(ch, titleX, currentY, charWidth, titleLineHeight)
          titleLine.chars.push(titleChar)
          titleX += charWidth
        }

        page.lines.push(titleLine)
        currentY += titleLineHeight + titleBottomMargin
      }

      while (lineIndex < allLines.length) {
        const line = allLines[lineIndex]
        const lineBottom = currentY + line.height

        // 检查是否超出页面
        if (lineBottom > maxY && page.lines.length > 0) {
          break // 当前页已满，但至少要有一行
        }

        // 重新计算行内字符的 y 坐标
        const adjustedLine = this.adjustLineY(line, currentY, config.paddingLeft, contentWidth, lineHeight)
        page.lines.push(adjustedLine)

        currentY += line.height
        lineIndex++
      }

      if (page.lines.length > 0) {
        pages.push(page)
      }
    }

    hilog.info(0x0000, TAG,
      `分页完成: 章节="${config.chapterTitle}", 段落数=${paragraphs.length}, 总行数=${allLines.length}, 总页数=${pages.length}`)

    return pages
  }

  /**
   * 将段落文本换行为多个渲染行
   */
  private wrapParagraph(
    text: string,
    maxWidth: number,
    paddingLeft: number,
    startY: number,
    lineHeight: number,
    indent: boolean
  ): RenderLine[] {
    const lines: RenderLine[] = []
    let charIndex = 0
    let isFirstLine = true

    while (charIndex < text.length) {
      const line = new RenderLine()
      line.height = lineHeight
      line.isFirstLine = isFirstLine

      // 首行缩进
      let currentX = paddingLeft
      let availableWidth = maxWidth
      if (isFirstLine && indent) {
        const indentWidth = this.measurer.getIndentWidth()
        currentX += indentWidth
        availableWidth -= indentWidth
      }

      let lineWidth = 0

      // 逐字符填充行
      while (charIndex < text.length) {
        const char = text[charIndex]

        // 跳过行内的换行符
        if (char === '\r') {
          charIndex++
          continue
        }

        const charWidth = this.measurer.measureChar(char)

        // 检查是否超出行宽
        if (lineWidth + charWidth > availableWidth && line.chars.length > 0) {
          // 禁止行首标点处理
          if (charIndex < text.length && TextMeasurer.isLineStartForbidden(text[charIndex])) {
            // 将上一个字符移到下一行
            if (line.chars.length > 1) {
              const lastChar = line.chars.pop()
              if (lastChar) {
                charIndex-- // 回退一个字符
              }
            }
          }
          break
        }

        const renderChar = new RenderChar(
          char,
          currentX + lineWidth,
          startY, // y 坐标后续调整
          charWidth,
          lineHeight
        )
        line.chars.push(renderChar)
        lineWidth += charWidth
        charIndex++
      }

      line.y = startY
      if (line.chars.length > 0) {
        lines.push(line)
      }
      isFirstLine = false
    }

    return lines
  }

  /**
   * 调整行内字符的 y 坐标（分页后重新定位）
   */
  private adjustLineY(
    line: RenderLine,
    newY: number,
    paddingLeft: number,
    contentWidth: number,
    lineHeight: number
  ): RenderLine {
    const adjusted = new RenderLine()
    adjusted.height = line.height
    adjusted.isFirstLine = line.isFirstLine
    adjusted.y = newY

    // 重新计算 x 坐标（保持相对位置）
    let currentX = paddingLeft
    if (line.isFirstLine) {
      currentX += this.measurer.getIndentWidth()
    }

    for (const char of line.chars) {
      const newChar = new RenderChar(
        char.char,
        currentX,
        newY,
        char.width,
        lineHeight
      )
      adjusted.chars.push(newChar)
      currentX += char.width
    }

    return adjusted
  }
}
