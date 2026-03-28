/**
 * Epub 解析器 — 纯 ArkTS 实现
 * 解析 epub 文件（zip 格式），提取章节纯文本内容
 *
 * 解析流程：
 * 1. 使用 zlib 解压 epub 到临时目录
 * 2. 解析 META-INF/container.xml 获取 OPF 路径
 * 3. 解析 OPF 获取 manifest + spine
 * 4. 按 spine 顺序提取章节 xhtml
 * 5. 从 xhtml 中提取纯文本
 * 6. 提取封面图片
 */

import { zlib } from '@kit.BasicServicesKit'
import { fileIo } from '@kit.CoreFileKit'
import { util } from '@kit.ArkTS'
import { image } from '@kit.ImageKit'
import hilog from '@ohos.hilog'

const TAG: string = 'EpubParser'

/**
 * Epub 章节
 */
export interface EpubChapter {
  title: string
  content: string  // 纯文本
  href: string
}

/**
 * Epub 元数据
 */
export interface EpubMetadata {
  title: string
  author: string
  language: string
  coverHref: string
}

/**
 * Epub 解析结果
 */
export interface EpubBook {
  metadata: EpubMetadata
  chapters: EpubChapter[]
  basePath: string  // 解压后的基础路径
}

/**
 * OPF manifest 条目
 */
interface ManifestItem {
  id: string
  href: string
  mediaType: string
}

export class EpubParser {
  private extractDir: string = ''

  /**
   * 解析 epub 文件
   * @param epubPath epub 文件路径
   * @param cacheDir 缓存目录（用于解压）
   */
  async parse(epubPath: string, cacheDir: string): Promise<EpubBook> {
    hilog.info(0x0000, TAG, `开始解析 epub: ${epubPath}`)

    // 1. 解压 epub 到临时目录
    this.extractDir = `${cacheDir}/epub_${Date.now()}`
    await this.unzipEpub(epubPath, this.extractDir)

    // 2. 解析 container.xml 获取 OPF 路径
    const opfPath = await this.parseContainer()

    // 3. 解析 OPF
    const opfDir = this.getDirectory(opfPath)
    const opfContent = await this.readFileAsString(`${this.extractDir}/${opfPath}`)
    const manifest = this.parseManifest(opfContent)
    const spineIds = this.parseSpine(opfContent)
    const metadata = this.parseMetadata(opfContent, manifest)

    // 4. 按 spine 顺序提取章节
    const chapters: EpubChapter[] = []
    for (const idref of spineIds) {
      const item = manifest.find((m: ManifestItem): boolean => m.id === idref)
      if (!item) continue

      const fullHref = opfDir ? `${opfDir}/${item.href}` : item.href
      try {
        const xhtmlContent = await this.readFileAsString(`${this.extractDir}/${fullHref}`)
        const title = this.extractTitle(xhtmlContent, item.href)
        const plainText = this.htmlToPlainText(xhtmlContent)

        if (plainText.trim().length > 0) {
          chapters.push({
            title: title,
            content: plainText,
            href: item.href
          })
        }
      } catch (e) {
        hilog.warn(0x0000, TAG, `跳过无法读取的章节: ${fullHref}`)
      }
    }

    hilog.info(0x0000, TAG,
      `epub 解析完成: 标题="${metadata.title}", 章节数=${chapters.length}`)

    return {
      metadata: metadata,
      chapters: chapters,
      basePath: this.extractDir
    }
  }

  /**
   * 获取封面图片
   */
  async getCoverImage(book: EpubBook): Promise<image.PixelMap | null> {
    if (!book.metadata.coverHref) return null

    try {
      const coverPath = `${book.basePath}/${book.metadata.coverHref}`
      const file = fileIo.openSync(coverPath, fileIo.OpenMode.READ_ONLY)
      const stat = fileIo.statSync(coverPath)
      const buffer = new ArrayBuffer(stat.size)
      fileIo.readSync(file.fd, buffer)
      fileIo.closeSync(file)

      const imageSource = image.createImageSource(buffer)
      const pixelMap = await imageSource.createPixelMap()
      imageSource.release()
      return pixelMap
    } catch (e) {
      hilog.warn(0x0000, TAG, `获取封面失败: ${JSON.stringify(e)}`)
      return null
    }
  }

  /**
   * 清理解压的临时文件
   */
  cleanup(): void {
    if (this.extractDir) {
      try {
        fileIo.rmdirSync(this.extractDir)
        hilog.info(0x0000, TAG, `清理临时目录: ${this.extractDir}`)
      } catch (e) {
        hilog.warn(0x0000, TAG, `清理临时目录失败: ${JSON.stringify(e)}`)
      }
    }
  }

  // ========== 内部方法 ==========

  /**
   * 解压 epub 文件
   */
  private async unzipEpub(epubPath: string, destDir: string): Promise<void> {
    // 确保目标目录存在
    try {
      fileIo.mkdirSync(destDir, true)
    } catch (e) {
      // 目录可能已存在
    }

    const options: zlib.Options = {
      level: zlib.CompressLevel.COMPRESS_LEVEL_DEFAULT_COMPRESSION
    }

    await zlib.decompressFile(epubPath, destDir, options)
    hilog.info(0x0000, TAG, `epub 解压完成: ${destDir}`)
  }

  /**
   * 解析 container.xml 获取 OPF 路径
   */
  private async parseContainer(): Promise<string> {
    const containerPath = `${this.extractDir}/META-INF/container.xml`
    const content = await this.readFileAsString(containerPath)

    // 提取 full-path 属性
    const match = content.match(/full-path\s*=\s*"([^"]+)"/)
    if (!match) {
      throw new Error('container.xml 中未找到 full-path')
    }

    hilog.info(0x0000, TAG, `OPF 路径: ${match[1]}`)
    return match[1]
  }

  /**
   * 解析 OPF manifest
   */
  private parseManifest(opfContent: string): ManifestItem[] {
    const items: ManifestItem[] = []
    const itemRegex = /<item\s+([^>]+)>/gi
    let match: RegExpExecArray | null

    while ((match = itemRegex.exec(opfContent)) !== null) {
      const attrs = match[1]
      const id = this.extractAttr(attrs, 'id')
      const href = this.extractAttr(attrs, 'href')
      const mediaType = this.extractAttr(attrs, 'media-type')

      if (id && href) {
        items.push({
          id: id,
          href: this.decodeHtmlEntities(href),
          mediaType: mediaType || ''
        })
      }
    }

    return items
  }

  /**
   * 解析 OPF spine
   */
  private parseSpine(opfContent: string): string[] {
    const ids: string[] = []
    // 提取 spine 标签内容
    const spineMatch = opfContent.match(/<spine[^>]*>([\s\S]*?)<\/spine>/i)
    if (!spineMatch) return ids

    const spineContent = spineMatch[1]
    const itemrefRegex = /<itemref\s+([^>]+)>/gi
    let match: RegExpExecArray | null

    while ((match = itemrefRegex.exec(spineContent)) !== null) {
      const idref = this.extractAttr(match[1], 'idref')
      if (idref) {
        ids.push(idref)
      }
    }

    return ids
  }

  /**
   * 解析 OPF 元数据
   */
  private parseMetadata(opfContent: string, manifest: ManifestItem[]): EpubMetadata {
    const metadata: EpubMetadata = {
      title: '',
      author: '',
      language: '',
      coverHref: ''
    }

    // 提取标题
    const titleMatch = opfContent.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/i)
    if (titleMatch) {
      metadata.title = this.decodeHtmlEntities(titleMatch[1].trim())
    }

    // 提取作者
    const authorMatch = opfContent.match(/<dc:creator[^>]*>([^<]+)<\/dc:creator>/i)
    if (authorMatch) {
      metadata.author = this.decodeHtmlEntities(authorMatch[1].trim())
    }

    // 提取语言
    const langMatch = opfContent.match(/<dc:language[^>]*>([^<]+)<\/dc:language>/i)
    if (langMatch) {
      metadata.language = langMatch[1].trim()
    }

    // 查找封面图片
    // 方式1: meta name="cover" content="cover-image-id"
    const coverMeta = opfContent.match(/<meta\s+name\s*=\s*"cover"\s+content\s*=\s*"([^"]+)"/i)
    if (coverMeta) {
      const coverId = coverMeta[1]
      const coverItem = manifest.find((m: ManifestItem): boolean => m.id === coverId)
      if (coverItem) {
        metadata.coverHref = coverItem.href
      }
    }

    // 方式2: manifest 中 properties="cover-image"
    if (!metadata.coverHref) {
      const coverItem = manifest.find((m: ManifestItem): boolean =>
        m.mediaType.startsWith('image/') &&
        (m.id.toLowerCase().includes('cover') || m.href.toLowerCase().includes('cover'))
      )
      if (coverItem) {
        metadata.coverHref = coverItem.href
      }
    }

    return metadata
  }

  /**
   * 从 xhtml 中提取标题
   */
  private extractTitle(xhtml: string, fallbackHref: string): string {
    // 尝试从 <title> 标签提取
    const titleMatch = xhtml.match(/<title[^>]*>([^<]+)<\/title>/i)
    if (titleMatch && titleMatch[1].trim().length > 0) {
      return this.decodeHtmlEntities(titleMatch[1].trim())
    }

    // 尝试从 <h1>-<h3> 标签提取
    const hMatch = xhtml.match(/<h[1-3][^>]*>([^<]+)<\/h[1-3]>/i)
    if (hMatch && hMatch[1].trim().length > 0) {
      return this.decodeHtmlEntities(hMatch[1].trim())
    }

    // 使用文件名作为标题
    const parts = fallbackHref.split('/')
    const filename = parts[parts.length - 1]
    return filename.replace(/\.(xhtml|html|htm)$/i, '')
  }

  /**
   * HTML 转纯文本
   * 处理段落、换行、HTML 实体
   */
  private htmlToPlainText(html: string): string {
    let text = html

    // 提取 body 内容
    const bodyMatch = text.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
    if (bodyMatch) {
      text = bodyMatch[1]
    }

    // 移除 script 和 style
    text = text.replace(/<script[\s\S]*?<\/script>/gi, '')
    text = text.replace(/<style[\s\S]*?<\/style>/gi, '')

    // <p> 和 <div> 标签转换为换行
    text = text.replace(/<\/p>/gi, '\n')
    text = text.replace(/<\/div>/gi, '\n')
    text = text.replace(/<p[^>]*>/gi, '')
    text = text.replace(/<div[^>]*>/gi, '')

    // <br> 转换为换行
    text = text.replace(/<br\s*\/?>/gi, '\n')

    // <h1>-<h6> 标签保留为段落
    text = text.replace(/<\/h[1-6]>/gi, '\n')
    text = text.replace(/<h[1-6][^>]*>/gi, '')

    // 移除所有其他 HTML 标签
    text = text.replace(/<[^>]+>/g, '')

    // 解码 HTML 实体
    text = this.decodeHtmlEntities(text)

    // 清理多余空白
    text = text.replace(/[ \t]+/g, ' ')           // 多个空格合并
    text = text.replace(/\n\s*\n\s*\n/g, '\n\n')  // 多个空行合并为两个
    text = text.trim()

    return text
  }

  /**
   * 解码 HTML 实体
   */
  private decodeHtmlEntities(text: string): string {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/&mdash;/g, '—')
      .replace(/&ndash;/g, '–')
      .replace(/&hellip;/g, '…')
      .replace(/&lsquo;/g, '\u2018')
      .replace(/&rsquo;/g, '\u2019')
      .replace(/&ldquo;/g, '\u201C')
      .replace(/&rdquo;/g, '\u201D')
      .replace(/&#(\d+);/g, (_match: string, dec: string): string => {
        return String.fromCharCode(parseInt(dec))
      })
      .replace(/&#x([0-9a-fA-F]+);/g, (_match: string, hex: string): string => {
        return String.fromCharCode(parseInt(hex, 16))
      })
  }

  /**
   * 从属性字符串中提取指定属性值
   */
  private extractAttr(attrs: string, name: string): string {
    const regex = new RegExp(`${name}\\s*=\\s*"([^"]*)"`, 'i')
    const match = attrs.match(regex)
    return match ? match[1] : ''
  }

  /**
   * 获取路径的目录部分
   */
  private getDirectory(path: string): string {
    const lastSlash = path.lastIndexOf('/')
    return lastSlash >= 0 ? path.substring(0, lastSlash) : ''
  }

  /**
   * 读取文件为字符串
   */
  private async readFileAsString(filePath: string): Promise<string> {
    const file = fileIo.openSync(filePath, fileIo.OpenMode.READ_ONLY)
    const stat = fileIo.statSync(filePath)
    const buffer = new ArrayBuffer(stat.size)
    fileIo.readSync(file.fd, buffer)
    fileIo.closeSync(file)

    const uint8Array = new Uint8Array(buffer)
    const decoder = util.TextDecoder.create('utf-8', { ignoreBOM: true })
    return decoder.decodeToString(uint8Array)
  }
}
