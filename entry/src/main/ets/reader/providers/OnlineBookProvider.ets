/**
 * 在线书籍内容提供者
 * 实现 ContentProvider 接口，从在线书源获取内容
 * 复用现有的 BookSourceParser 和 OnlineBookDataManager
 */

import { image } from '@kit.ImageKit'
import { ContentProvider, BookMeta, UnifiedChapterInfo } from './ContentProvider'
import { ChapterInfo as SourceChapterInfo } from '../../models/BookSourceModel'
import { onlineBookDataManager } from '../../utils/OnlineBookDataManager'
import { ChapterDownloadInfo } from '../../models/OnlineBookModel'
import { bookSourceManager } from '../../managers/BookSourceManager'
import { BookSourceParser } from '../../managers/BookSourceParser'
import { fileIo } from '@kit.CoreFileKit'
import { util } from '@kit.ArkTS'
import hilog from '@ohos.hilog'

const TAG: string = 'OnlineBookProvider'

export class OnlineBookProvider implements ContentProvider {
  private bookId: number
  private bookTitle: string
  private chapters: SourceChapterInfo[]
  private bookUrl: string = ''
  private bookCoverUrl: string = ''

  constructor(bookId: number, bookTitle: string, chapters: SourceChapterInfo[]) {
    this.bookId = bookId
    this.bookTitle = bookTitle
    this.chapters = chapters
    // 异步加载封面 URL
    this.loadCoverUrl()
  }

  /**
   * 从数据库加载封面 URL
   */
  private async loadCoverUrl(): Promise<void> {
    try {
      const allBooks = await onlineBookDataManager.queryAllOnlineBooks()
      const onlineBook = allBooks.find((book) => book.id === this.bookId)
      if (onlineBook && onlineBook.cover) {
        this.bookCoverUrl = onlineBook.cover
        hilog.info(0x0000, TAG, `封面 URL 已加载: ${this.bookCoverUrl}`)
      }
    } catch (e) {
      hilog.warn(0x0000, TAG, `加载封面 URL 失败: ${JSON.stringify(e)}`)
    }
  }

  getBookMeta(): BookMeta {
    return {
      title: this.bookTitle,
      author: '',
      coverUrl: this.bookCoverUrl,
      format: 'online',
      totalChapters: this.chapters.length
    }
  }

  /**
   * 获取封面 URL（供外部直接调用）
   */
  async getCoverUrl(): Promise<string> {
    if (this.bookCoverUrl) {
      return this.bookCoverUrl
    }
    // 如果还没加载完，尝试再加载一次
    await this.loadCoverUrl()
    return this.bookCoverUrl
  }

  async getChapterList(): Promise<UnifiedChapterInfo[]> {
    return this.chapters.map((ch: SourceChapterInfo, index: number): UnifiedChapterInfo => ({
      index: index,
      title: ch.title,
      url: ch.url
    }))
  }

  async getChapterContent(chapterIndex: number): Promise<string> {
    if (chapterIndex < 0 || chapterIndex >= this.chapters.length) {
      throw new Error(`无效的章节索引: ${chapterIndex}`)
    }

    const sourceChapter = this.chapters[chapterIndex]

    // 优先从本地缓存读取
    try {
      const cachedChapter = await onlineBookDataManager.queryChapterDownload(this.bookId, chapterIndex)

      if (cachedChapter && cachedChapter.isDownloaded) {
        if (cachedChapter.filePath && fileIo.accessSync(cachedChapter.filePath)) {
          const file = fileIo.openSync(cachedChapter.filePath, fileIo.OpenMode.READ_ONLY)
          const stat = fileIo.statSync(cachedChapter.filePath)
          const buffer = new ArrayBuffer(stat.size)
          fileIo.readSync(file.fd, buffer)
          fileIo.closeSync(file)
          const uint8Array = new Uint8Array(buffer)
          const decoder = util.TextDecoder.create('utf-8', { ignoreBOM: true })
          const content = decoder.decodeToString(uint8Array)
          if (content && content.length > 0) {
            return content
          }
        } else if (cachedChapter.content) {
          return cachedChapter.content
        }
      }
    } catch (e) {
      hilog.warn(0x0000, TAG, `读取缓存失败: ${JSON.stringify(e)}`)
    }

    // 缓存未命中，从网络获取
    const allBooks = await onlineBookDataManager.queryAllOnlineBooks()
    const onlineBook = allBooks.find((book) => book.id === this.bookId)
    if (!onlineBook) {
      throw new Error('未找到在线书籍信息')
    }

    const allSources = await bookSourceManager.getAllBookSources()
    const bookSource = allSources.find((source) => onlineBook.bookUrl.includes(source.bookSourceUrl))
    if (!bookSource) {
      throw new Error('未找到对应的书源')
    }

    const parser = new BookSourceParser(bookSource)
    const result = await parser.parseChapterContent(sourceChapter.url)
    if (!result.success || !result.data) {
      throw new Error(result.error || '获取章节内容失败')
    }

    // 自动缓存网络获取的内容到数据库
    try {
      const downloadInfo = new ChapterDownloadInfo()
      downloadInfo.bookId = this.bookId
      downloadInfo.chapterIndex = chapterIndex
      downloadInfo.chapterTitle = sourceChapter.title
      downloadInfo.chapterUrl = sourceChapter.url
      downloadInfo.content = result.data
      downloadInfo.isDownloaded = true
      downloadInfo.filePath = ''
      await onlineBookDataManager.saveChapterDownload(downloadInfo)
      hilog.info(0x0000, TAG, `自动缓存章节: ${sourceChapter.title}`)
    } catch (cacheErr) {
      hilog.warn(0x0000, TAG, `自动缓存章节失败: ${JSON.stringify(cacheErr)}`)
    }

    return result.data
  }

  /**
   * 预缓存指定范围的章节（后台静默，不重复缓存）
   */
  async prefetchChapters(startIndex: number, count: number): Promise<void> {
    const endIndex = Math.min(startIndex + count, this.chapters.length)
    hilog.info(0x0000, TAG, `开始预缓存: 章节 ${startIndex}-${endIndex - 1}`)

    for (let i = startIndex; i < endIndex; i++) {
      // 检查是否已缓存
      try {
        const cached = await onlineBookDataManager.queryChapterDownload(this.bookId, i)
        if (cached && cached.isDownloaded) {
          continue  // 已缓存，跳过
        }
      } catch (e) {
        // 查询失败，继续尝试缓存
      }

      // 从网络获取并缓存
      try {
        await this.getChapterContent(i)
        hilog.info(0x0000, TAG, `预缓存完成: 章节 ${i} - ${this.chapters[i].title}`)
      } catch (e) {
        hilog.warn(0x0000, TAG, `预缓存失败: 章节 ${i}, ${JSON.stringify(e)}`)
        // 单个章节失败不影响后续
      }
    }

    hilog.info(0x0000, TAG, `预缓存结束: 章节 ${startIndex}-${endIndex - 1}`)
  }

  async getCoverImage(): Promise<image.PixelMap | null> {
    // 在线书籍封面通常是 URL，需要下载
    // 暂时返回 null，后续可以从 onlineBookDataManager 获取封面 URL 并下载
    return null
  }

  release(): void {
    // 在线书籍无需特殊释放
    hilog.info(0x0000, TAG, 'OnlineBookProvider released')
  }
}
