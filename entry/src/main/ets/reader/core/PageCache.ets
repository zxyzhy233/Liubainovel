/**
 * 页面渲染缓存 — LRU 策略
 * 缓存已渲染的页面 ImageBitmap，避免重复绘制
 * 支持预渲染相邻页面
 */

import { RenderPage } from './PageEngine'
import hilog from '@ohos.hilog'

const TAG: string = 'PageCache'

/**
 * 缓存条目
 */
interface CacheEntry {
  key: string
  bitmap: ImageBitmap
  lastAccess: number
}

/**
 * 预渲染任务
 */
export interface PrerenderTask {
  chapterIndex: number
  pageIndex: number
}

export class PageCache {
  private cache: Map<string, CacheEntry> = new Map()
  private maxSize: number
  private accessCounter: number = 0

  constructor(maxSize: number = 20) {
    this.maxSize = maxSize
  }

  /**
   * 生成缓存 key
   */
  private makeKey(chapterIndex: number, pageIndex: number): string {
    return `${chapterIndex}_${pageIndex}`
  }

  /**
   * 获取缓存的页面位图
   */
  get(chapterIndex: number, pageIndex: number): ImageBitmap | null {
    const key = this.makeKey(chapterIndex, pageIndex)
    const entry = this.cache.get(key)
    if (entry) {
      entry.lastAccess = ++this.accessCounter
      return entry.bitmap
    }
    return null
  }

  /**
   * 缓存页面位图
   */
  put(chapterIndex: number, pageIndex: number, bitmap: ImageBitmap): void {
    const key = this.makeKey(chapterIndex, pageIndex)

    // 如果已存在，更新
    if (this.cache.has(key)) {
      const entry = this.cache.get(key)!
      entry.bitmap.close()
      entry.bitmap = bitmap
      entry.lastAccess = ++this.accessCounter
      return
    }

    // 驱逐最久未使用的条目
    this.evictIfNeeded()

    this.cache.set(key, {
      key: key,
      bitmap: bitmap,
      lastAccess: ++this.accessCounter
    })
  }

  /**
   * 检查是否有缓存
   */
  has(chapterIndex: number, pageIndex: number): boolean {
    return this.cache.has(this.makeKey(chapterIndex, pageIndex))
  }

  /**
   * LRU 驱逐
   */
  private evictIfNeeded(): void {
    while (this.cache.size >= this.maxSize) {
      let oldestKey: string = ''
      let oldestAccess: number = Number.MAX_VALUE

      this.cache.forEach((entry: CacheEntry, key: string) => {
        if (entry.lastAccess < oldestAccess) {
          oldestAccess = entry.lastAccess
          oldestKey = key
        }
      })

      if (oldestKey) {
        const entry = this.cache.get(oldestKey)
        if (entry) {
          entry.bitmap.close()
        }
        this.cache.delete(oldestKey)
        hilog.info(0x0000, TAG, `LRU 驱逐: ${oldestKey}`)
      } else {
        break
      }
    }
  }

  /**
   * 清除指定章节的缓存
   */
  invalidateChapter(chapterIndex: number): void {
    const prefix = `${chapterIndex}_`
    const keysToDelete: string[] = []

    this.cache.forEach((_: CacheEntry, key: string) => {
      if (key.startsWith(prefix)) {
        keysToDelete.push(key)
      }
    })

    keysToDelete.forEach((key: string) => {
      const entry = this.cache.get(key)
      if (entry) {
        entry.bitmap.close()
      }
      this.cache.delete(key)
    })

    if (keysToDelete.length > 0) {
      hilog.info(0x0000, TAG, `清除章节 ${chapterIndex} 缓存: ${keysToDelete.length} 页`)
    }
  }

  /**
   * 清空所有缓存
   */
  invalidateAll(): void {
    this.cache.forEach((entry: CacheEntry) => {
      entry.bitmap.close()
    })
    this.cache.clear()
    this.accessCounter = 0
    hilog.info(0x0000, TAG, '清空所有缓存')
  }

  /**
   * 生成预渲染任务列表
   * @param currentChapter 当前章节
   * @param currentPage 当前页
   * @param totalPages 当前章节总页数
   * @param radius 预渲染半径
   */
  getPrerenderTasks(
    currentChapter: number,
    currentPage: number,
    totalPages: number,
    radius: number = 3
  ): PrerenderTask[] {
    const tasks: PrerenderTask[] = []

    // 预渲染后续页面（优先）
    for (let d = 1; d <= radius; d++) {
      const nextPage = currentPage + d
      if (nextPage < totalPages && !this.has(currentChapter, nextPage)) {
        tasks.push({ chapterIndex: currentChapter, pageIndex: nextPage })
      }
    }

    // 预渲染前面的页面
    for (let d = 1; d <= radius; d++) {
      const prevPage = currentPage - d
      if (prevPage >= 0 && !this.has(currentChapter, prevPage)) {
        tasks.push({ chapterIndex: currentChapter, pageIndex: prevPage })
      }
    }

    return tasks
  }

  /**
   * 获取缓存大小
   */
  getSize(): number {
    return this.cache.size
  }

  /**
   * 释放所有资源
   */
  release(): void {
    this.invalidateAll()
  }
}
