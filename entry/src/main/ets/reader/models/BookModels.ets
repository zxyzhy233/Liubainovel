/**
 * 书籍相关数据模型
 */

/**
 * 书籍信息
 */
export class BookInfo {
  bookId: string = ''
  bookName: string = ''
  author: string = ''
  coverUrl: string = ''
  intro: string = ''
  charset: string = 'UTF-8'
}

/**
 * 章节信息
 */
export class ChapterInfo {
  chapterIndex: number = 0
  chapterName: string = ''
  chapterUrl: string = ''
  bookId: string = ''
  isVip: boolean = false
  isPay: boolean = false
}

/**
 * 文本字符信息
 */
export class TxtChar {
  charData: string = ''
  // 字符左上角坐标
  topLeftX: number = 0
  topLeftY: number = 0
  // 字符右下角坐标
  bottomRightX: number = 0
  bottomRightY: number = 0
  
  constructor(charData: string) {
    this.charData = charData
  }
}

/**
 * 文本行信息
 */
export class TxtLine {
  txtChars: TxtChar[] = []
  lineHeight: number = 0
  
  getLineText(): string {
    return this.txtChars.map(char => char.charData).join('')
  }
}

/**
 * 文本页信息
 */
export class TxtPage {
  chapterIndex: number = 0
  pageIndex: number = 0
  title: string = ''
  txtLines: TxtLine[] = []
  
  /**
   * 获取页面文本内容
   */
  getContent(): string {
    return this.txtLines.map(line => line.getLineText()).join('\n')
  }
  
  /**
   * 获取页面总字符数
   */
  getCharCount(): number {
    let count = 0
    this.txtLines.forEach(line => {
      count += line.txtChars.length
    })
    return count
  }
}

/**
 * 书签信息
 */
export class BookmarkInfo {
  bookId: string = ''
  chapterIndex: number = 0
  pageIndex: number = 0
  chapterName: string = ''
  content: string = ''
  createTime: number = Date.now()
}
