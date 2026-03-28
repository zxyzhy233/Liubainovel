/**
 * 本地书籍内容提供者
 * 实现 ContentProvider 接口，支持 epub 和 txt 格式
 */

import { image } from '@kit.ImageKit'
import { ContentProvider, BookMeta, UnifiedChapterInfo } from './ContentProvider'
import { EpubParser, EpubBook, EpubChapter } from './EpubParser'
import { fileIo } from '@kit.CoreFileKit'
import { util } from '@kit.ArkTS'
import hilog from '@ohos.hilog'

const TAG: string = 'LocalBookProvider'

/**
 * txt 章节分割结果
 */
interface TxtChapter {
  title: string
  content: string
  startOffset: number
}

/**
 * 章节起始位置标记
 */
interface ChapterStartMark {
  lineIndex: number
  title: string
}

export class LocalBookProvider implements ContentProvider {
  private filePath: string
  private cacheDir: string
  private format: 'epub' | 'txt'

  // epub 相关
  private epubParser: EpubParser | null = null
  private epubBook: EpubBook | null = null

  // txt 相关
  private txtChapters: TxtChapter[] = []
  private txtTitle: string = ''

  private isInitialized: boolean = false

  constructor(filePath: string, cacheDir: string) {
    this.filePath = filePath
    this.cacheDir = cacheDir

    // 根据扩展名判断格式
    const ext = filePath.toLowerCase()
    if (ext.endsWith('.epub')) {
      this.format = 'epub'
    } else {
      this.format = 'txt'
    }
  }

  /**
   * 初始化（懒加载，首次调用时解析文件）
   */
  private async ensureInitialized(): Promise<void> {
    if (this.isInitialized) return

    if (this.format === 'epub') {
      await this.initEpub()
    } else {
      await this.initTxt()
    }

    this.isInitialized = true
  }

  /**
   * 初始化 epub
   */
  private async initEpub(): Promise<void> {
    this.epubParser = new EpubParser()
    this.epubBook = await this.epubParser.parse(this.filePath, this.cacheDir)
    hilog.info(0x0000, TAG,
      `epub 初始化完成: "${this.epubBook.metadata.title}", ${this.epubBook.chapters.length} 章`)
  }

  /**
   * 初始化 txt
   */
  private async initTxt(): Promise<void> {
    const content = await this.readFileContent(this.filePath)

    // 从文件名提取书名
    const parts = this.filePath.split('/')
    const filename = parts[parts.length - 1]
    this.txtTitle = filename.replace(/\.(txt|text)$/i, '')

    // 分章
    this.txtChapters = this.splitTxtChapters(content)
    hilog.info(0x0000, TAG,
      `txt 初始化完成: "${this.txtTitle}", ${this.txtChapters.length} 章`)
  }

  getBookMeta(): BookMeta {
    if (this.format === 'epub' && this.epubBook) {
      return {
        title: this.epubBook.metadata.title || this.getFileBaseName(),
        author: this.epubBook.metadata.author,
        coverUrl: '',
        format: 'epub',
        totalChapters: this.epubBook.chapters.length
      }
    }

    return {
      title: this.txtTitle || this.getFileBaseName(),
      author: '',
      coverUrl: '',
      format: 'txt',
      totalChapters: this.txtChapters.length
    }
  }

  async getChapterList(): Promise<UnifiedChapterInfo[]> {
    await this.ensureInitialized()

    if (this.format === 'epub' && this.epubBook) {
      return this.epubBook.chapters.map((ch: EpubChapter, index: number): UnifiedChapterInfo => ({
        index: index,
        title: ch.title,
        url: ''
      }))
    }

    return this.txtChapters.map((ch: TxtChapter, index: number): UnifiedChapterInfo => ({
      index: index,
      title: ch.title,
      url: ''
    }))
  }

  async getChapterContent(chapterIndex: number): Promise<string> {
    await this.ensureInitialized()

    if (this.format === 'epub' && this.epubBook) {
      if (chapterIndex < 0 || chapterIndex >= this.epubBook.chapters.length) {
        throw new Error(`无效的章节索引: ${chapterIndex}`)
      }
      return this.epubBook.chapters[chapterIndex].content
    }

    if (chapterIndex < 0 || chapterIndex >= this.txtChapters.length) {
      throw new Error(`无效的章节索引: ${chapterIndex}`)
    }
    return this.txtChapters[chapterIndex].content
  }

  async getCoverImage(): Promise<image.PixelMap | null> {
    await this.ensureInitialized()

    if (this.format === 'epub' && this.epubParser && this.epubBook) {
      return this.epubParser.getCoverImage(this.epubBook)
    }

    return null
  }

  release(): void {
    if (this.epubParser) {
      this.epubParser.cleanup()
      this.epubParser = null
    }
    this.epubBook = null
    this.txtChapters = []
    this.isInitialized = false
    hilog.info(0x0000, TAG, 'LocalBookProvider released')
  }

  // ========== 内部方法 ==========

  /**
   * 读取文件内容为字符串
   */
  private async readFileContent(path: string): Promise<string> {
    const file = fileIo.openSync(path, fileIo.OpenMode.READ_ONLY)
    const stat = fileIo.statSync(path)
    const buffer = new ArrayBuffer(stat.size)
    fileIo.readSync(file.fd, buffer)
    fileIo.closeSync(file)

    const uint8Array = new Uint8Array(buffer)
    const decoder = util.TextDecoder.create('utf-8', { ignoreBOM: true })
    return decoder.decodeToString(uint8Array)
  }

  /**
   * 将 txt 内容按章节分割
   * 支持常见的章节标题格式
   */
  private splitTxtChapters(text: string): TxtChapter[] {
    const chapters: TxtChapter[] = []

    // 章节标题正则：匹配 "第X章"、"第X回"、"Chapter X" 等
    const chapterRegex = /^[\s]*(第[零一二三四五六七八九十百千万\d]{1,10}[章节回卷集部篇]|Chapter\s+\d+|CHAPTER\s+\d+)/m
    const lines = text.split('\n')

    const chapterStarts: ChapterStartMark[] = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (line.length > 0 && line.length < 50 && chapterRegex.test(line)) {
        const mark: ChapterStartMark = { lineIndex: i, title: line }
        chapterStarts.push(mark)
      }
    }

    if (chapterStarts.length === 0) {
      // 没有找到章节标题，按固定行数分段
      const linesPerChapter = 200
      for (let i = 0; i < lines.length; i += linesPerChapter) {
        const end = Math.min(i + linesPerChapter, lines.length)
        const chapterLines = lines.slice(i, end)
        const content = chapterLines.join('\n').trim()
        if (content.length > 0) {
          chapters.push({
            title: `第 ${chapters.length + 1} 段`,
            content: content,
            startOffset: i
          })
        }
      }
    } else {
      // 如果第一个章节标题前有内容，作为"前言"
      if (chapterStarts[0].lineIndex > 0) {
        const preContent = lines.slice(0, chapterStarts[0].lineIndex).join('\n').trim()
        if (preContent.length > 0) {
          chapters.push({
            title: '前言',
            content: preContent,
            startOffset: 0
          })
        }
      }

      // 按章节标题分割
      for (let i = 0; i < chapterStarts.length; i++) {
        const start = chapterStarts[i].lineIndex
        const end = (i + 1 < chapterStarts.length)
          ? chapterStarts[i + 1].lineIndex
          : lines.length

        const chapterLines = lines.slice(start, end)
        const content = chapterLines.join('\n').trim()

        if (content.length > 0) {
          chapters.push({
            title: chapterStarts[i].title,
            content: content,
            startOffset: start
          })
        }
      }
    }

    return chapters
  }

  /**
   * 获取文件基础名（不含路径和扩展名）
   */
  private getFileBaseName(): string {
    const parts = this.filePath.split('/')
    const filename = parts[parts.length - 1]
    const dotIndex = filename.lastIndexOf('.')
    return dotIndex >= 0 ? filename.substring(0, dotIndex) : filename
  }
}
