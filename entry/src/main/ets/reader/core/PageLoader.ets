/**
 * 页面加载器 - 文本分页核心引擎
 */

import { TxtPage, TxtLine, TxtChar, ChapterInfo } from '../models/BookModels'
import { ReadConfig } from '../config/ReadConfig'

/**
 * 页面加载状态
 */
export enum PageStatus {
  LOADING = 0,    // 加载中
  FINISH = 1,     // 加载完成
  ERROR = 2,      // 加载失败
  EMPTY = 3       // 内容为空
}

/**
 * 页面加载器类
 */
export class PageLoader {
  private config: ReadConfig = ReadConfig.getInstance()
  private pageWidth: number = 0         // 页面宽度
  private pageHeight: number = 0        // 页面高度
  private visibleWidth: number = 0      // 可视区域宽度
  private visibleHeight: number = 0     // 可视区域高度
  
  private currentChapter: ChapterInfo | null = null  // 当前章节
  private chapterContent: string = ''   // 章节内容
  private pageList: TxtPage[] = []      // 当前章节的所有页面
  private currentPageIndex: number = 0  // 当前页索引
  private pageStatus: PageStatus = PageStatus.EMPTY
  
  /**
   * 构造函数
   */
  constructor(width: number, height: number) {
    this.pageWidth = width
    this.pageHeight = height
    this.calculateVisibleArea()
  }
  
  /**
   * 计算可视区域
   */
  private calculateVisibleArea(): void {
    this.visibleWidth = this.pageWidth - 
      this.config.getPaddingLeft() - 
      this.config.getPaddingRight()
    this.visibleHeight = this.pageHeight - 
      this.config.getPaddingTop() - 
      this.config.getPaddingBottom()
  }
  
  /**
   * 更新页面尺寸
   */
  updatePageSize(width: number, height: number): void {
    if (this.pageWidth === width && this.pageHeight === height) {
      return
    }
    this.pageWidth = width
    this.pageHeight = height
    this.calculateVisibleArea()
    // 重新分页
    if (this.chapterContent) {
      this.parseChapterContent()
    }
  }
  
  /**
   * 加载章节
   */
  loadChapter(chapter: ChapterInfo, content: string): void {
    this.currentChapter = chapter
    this.chapterContent = content
    this.currentPageIndex = 0
    this.pageStatus = PageStatus.LOADING
    
    if (!content || content.length === 0) {
      this.pageStatus = PageStatus.EMPTY
      return
    }
    
    try {
      this.parseChapterContent()
      this.pageStatus = PageStatus.FINISH
    } catch (error) {
      console.error('章节解析失败:', error)
      this.pageStatus = PageStatus.ERROR
    }
  }
  
  /**
   * 解析章节内容，进行分页
   */
  private parseChapterContent(): void {
    this.pageList = []
    
    if (!this.chapterContent || this.chapterContent.length === 0) {
      return
    }
    
    // 计算行高
    const lineHeight = this.config.getTextSize() * this.config.getLineSpacing()
    
    // 计算标题高度（标题字号+2，加上底部间距20）- 仅第一页需要
    const titleHeight = (this.config.getTextSize() + 2) * this.config.getLineSpacing() + 20
    
    // 计算页码信息高度（字号12 + 上下边距20）
    const pageInfoHeight = 12 * 1.5 + 20
    
    // 计算第一页可用高度（需要减去标题和页码信息）
    const firstPageContentHeight = this.pageHeight - 
      this.config.getPaddingTop() - 
      this.config.getPaddingBottom() - 
      titleHeight - 
      pageInfoHeight
    
    // 计算第一页能显示的最大行数
    const firstPageMaxLines = Math.floor(firstPageContentHeight / lineHeight)
    
    // 计算后续页可用高度（不需要标题，只需减去页码信息）
    const otherPageContentHeight = this.pageHeight - 
      this.config.getPaddingTop() - 
      this.config.getPaddingBottom() - 
      pageInfoHeight
    
    // 计算后续页能显示的最大行数
    const otherPageMaxLines = Math.floor(otherPageContentHeight / lineHeight)
    
    console.info(`分页参数: 屏幕高度=${this.pageHeight}, 行高=${lineHeight.toFixed(2)}`)
    console.info(`标题高度=${titleHeight.toFixed(2)}, 页码高度=${pageInfoHeight}`)
    console.info(`第一页可用高度=${firstPageContentHeight.toFixed(2)}, 最大行数=${firstPageMaxLines}`)
    console.info(`后续页可用高度=${otherPageContentHeight.toFixed(2)}, 最大行数=${otherPageMaxLines}`)
    
    // 将内容按段落分割
    const paragraphs = this.chapterContent.split(/\n+/)
    
    // 将所有段落转换为行
    const allLines: string[] = []
    for (let paragraph of paragraphs) {
      if (!paragraph || paragraph.trim().length === 0) {
        continue
      }
      const lines = this.wrapText(paragraph)
      allLines.push(...lines)
    }
    
    console.info(`总行数: ${allLines.length}`)
    
    // 按照计算的行数进行分页
    let lineIndex = 0
    let pageIndex = 0
    
    while (lineIndex < allLines.length) {
      const currentPage = this.createNewPage()
      currentPage.pageIndex = pageIndex
      
      // 确定当前页的最大行数
      const maxLines = (pageIndex === 0) ? firstPageMaxLines : otherPageMaxLines
      
      // 添加行到当前页
      let currentY = this.config.getPaddingTop()
      let linesInPage = 0
      
      while (lineIndex < allLines.length && linesInPage < maxLines) {
        const lineText = allLines[lineIndex]
        const txtLine = this.createTxtLine(lineText, currentY, lineHeight)
        currentPage.txtLines.push(txtLine)
        
        currentY += lineHeight
        lineIndex++
        linesInPage++
      }
      
      this.pageList.push(currentPage)
      pageIndex++
      
      console.info(`第${pageIndex}页: ${linesInPage}行`)
    }
    
    console.info(`分页完成: 共${this.pageList.length}页`)
  }
  
  /**
   * 创建新页面
   */
  private createNewPage(): TxtPage {
    const page = new TxtPage()
    page.chapterIndex = this.currentChapter?.chapterIndex ?? 0
    page.title = this.currentChapter?.chapterName ?? ''
    return page
  }
  
  /**
   * 文本换行处理
   */
  private wrapText(text: string): string[] {
    const lines: string[] = []
    const fontSize = this.config.getTextSize()
    const maxWidth = this.visibleWidth
    
    let currentLine = ''
    let currentWidth = 0
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i]
      const charWidth = this.getCharWidth(char, fontSize)
      
      if (currentWidth + charWidth > maxWidth) {
        // 当前行已满，开始新行
        if (currentLine.length > 0) {
          lines.push(currentLine)
        }
        currentLine = char
        currentWidth = charWidth
      } else {
        currentLine += char
        currentWidth += charWidth
      }
    }
    
    // 添加最后一行
    if (currentLine.length > 0) {
      lines.push(currentLine)
    }
    
    return lines.length > 0 ? lines : ['']
  }
  
  /**
   * 获取字符宽度（简化处理）
   */
  private getCharWidth(char: string, fontSize: number): number {
    // 中文字符和全角字符
    if (this.isFullWidth(char)) {
      return fontSize
    }
    // 英文字符和半角字符
    return fontSize * 0.6
  }
  
  /**
   * 判断是否为全角字符
   */
  private isFullWidth(char: string): boolean {
    const code = char.charCodeAt(0)
    // 中文字符范围
    return (code >= 0x4E00 && code <= 0x9FA5) || 
           (code >= 0xFF00 && code <= 0xFFEF)
  }
  
  /**
   * 创建文本行
   */
  private createTxtLine(lineText: string, y: number, lineHeight: number): TxtLine {
    const txtLine = new TxtLine()
    txtLine.lineHeight = lineHeight
    
    let x = this.config.getPaddingLeft()
    const fontSize = this.config.getTextSize()
    
    for (let i = 0; i < lineText.length; i++) {
      const char = lineText[i]
      const charWidth = this.getCharWidth(char, fontSize)
      
      const txtChar = new TxtChar(char)
      txtChar.topLeftX = x
      txtChar.topLeftY = y
      txtChar.bottomRightX = x + charWidth
      txtChar.bottomRightY = y + lineHeight
      
      txtLine.txtChars.push(txtChar)
      x += charWidth
    }
    
    return txtLine
  }
  
  /**
   * 获取当前页
   */
  getCurrentPage(): TxtPage | null {
    if (this.currentPageIndex >= 0 && this.currentPageIndex < this.pageList.length) {
      return this.pageList[this.currentPageIndex]
    }
    return null
  }
  
  /**
   * 获取上一页
   */
  getPrevPage(): TxtPage | null {
    if (this.currentPageIndex > 0) {
      return this.pageList[this.currentPageIndex - 1]
    }
    return null
  }
  
  /**
   * 获取下一页
   */
  getNextPage(): TxtPage | null {
    if (this.currentPageIndex < this.pageList.length - 1) {
      return this.pageList[this.currentPageIndex + 1]
    }
    return null
  }
  
  /**
   * 翻到下一页
   */
  skipToNextPage(): boolean {
    if (this.currentPageIndex < this.pageList.length - 1) {
      this.currentPageIndex++
      return true
    }
    return false
  }
  
  /**
   * 翻到上一页
   */
  skipToPrevPage(): boolean {
    if (this.currentPageIndex > 0) {
      this.currentPageIndex--
      return true
    }
    return false
  }
  
  /**
   * 跳转到指定页
   */
  skipToPage(pageIndex: number): boolean {
    if (pageIndex >= 0 && pageIndex < this.pageList.length) {
      this.currentPageIndex = pageIndex
      return true
    }
    return false
  }
  
  /**
   * 获取总页数
   */
  getPageCount(): number {
    return this.pageList.length
  }
  
  /**
   * 获取当前页索引
   */
  getCurrentPageIndex(): number {
    return this.currentPageIndex
  }
  
  /**
   * 获取页面状态
   */
  getPageStatus(): PageStatus {
    return this.pageStatus
  }
  
  /**
   * 刷新页面（配置更改后重新分页）
   */
  refresh(): void {
    this.calculateVisibleArea()
    if (this.chapterContent) {
      const currentPage = this.currentPageIndex
      this.parseChapterContent()
      // 尽量保持在相同位置
      this.skipToPage(Math.min(currentPage, this.pageList.length - 1))
    }
  }
  
  /**
   * 获取当前阅读进度（百分比）
   */
  getProgress(): number {
    if (this.pageList.length === 0) {
      return 0
    }
    return (this.currentPageIndex / this.pageList.length) * 100
  }
  
  /**
   * 根据进度跳转
   */
  skipToProgress(progress: number): void {
    const targetPage = Math.floor((progress / 100) * this.pageList.length)
    this.skipToPage(targetPage)
  }
}
