/**
 * 内容提供者接口 — 统一本地和在线书籍的内容获取方式
 * 这是消除双阅读器的关键抽象层
 */

import { image } from '@kit.ImageKit'

/**
 * 书籍格式
 */
export type BookFormat = 'txt' | 'epub' | 'online'

/**
 * 书籍元信息
 */
export interface BookMeta {
  title: string
  author: string
  coverUrl: string
  format: BookFormat
  totalChapters: number
}

/**
 * 章节信息（统一格式）
 */
export interface UnifiedChapterInfo {
  index: number
  title: string
  /** 在线书籍的章节 URL，本地书籍为空 */
  url: string
}

/**
 * 内容提供者接口
 * 所有书籍来源（本地 epub/txt、在线书源）都实现此接口
 */
export interface ContentProvider {
  /**
   * 获取书籍元信息
   */
  getBookMeta(): BookMeta

  /**
   * 获取章节列表
   */
  getChapterList(): Promise<UnifiedChapterInfo[]>

  /**
   * 获取指定章节的纯文本内容
   * @param chapterIndex 章节索引
   * @returns 章节纯文本内容
   */
  getChapterContent(chapterIndex: number): Promise<string>

  /**
   * 获取封面图片
   * @returns PixelMap 或 null
   */
  getCoverImage(): Promise<image.PixelMap | null>

  /**
   * 释放资源
   */
  release(): void
}
