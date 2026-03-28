/*
 * Copyright (c) 2025 Huawei Device Co., Ltd.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
// 书籍详情页
import { hilog } from '@kit.PerformanceAnalysisKit';
import { router } from '@kit.ArkUI';
import { bookSourceManager } from '../managers/BookSourceManager';
import { BookDetailInfo, ChapterInfo } from '../models/BookSourceModel';
import { onlineBookDataManager } from '../utils/OnlineBookDataManager';
import { OnlineBookInfo, BookDetailUpdateInfo } from '../models/OnlineBookModel';
import { downloadManager } from '../managers/DownloadManager';
import { common } from '@kit.AbilityKit';
import { fileIo as fs } from '@kit.CoreFileKit';
import { picker } from '@kit.CoreFileKit';
import { BusinessError } from '@kit.BasicServicesKit';

const TAG: string = 'BookDetailPage';


/**
 * 页面参数接口
 */
interface PageParams {
  bookUrl?: string; // 书籍详情页URL
  bookTitle?: string; // 书籍标题（用于显示）
  bookAuthor?: string; // 书籍作者（用于显示）
  bookCover?: string; // 书籍封面（用于显示）
}

@Entry
@Component
struct BookDetailPage {
  @State showDetailMenu: boolean = false; // 详情页菜单弹出状态
  @State bookDetail: BookDetailInfo | null = null; // 书籍详情
  @State chapterList: ChapterInfo[] = []; // 章节列表
  @State isLoading: boolean = true; // 加载状态
  @State errorMessage: string = ''; // 错误信息
  @State showChapterList: boolean = false; // 是否显示章节列表
  @State bookUrl: string = ''; // 书籍详情页URL
  @State bookTitle: string = ''; // 书籍标题
  @State bookAuthor: string = ''; // 书籍作者
  @State bookCover: string = ''; // 书籍封面
  @State isInBookshelf: boolean = false; // 是否已加入书架
  @State onlineBookId: number = 0; // 在线书籍ID
  @State isCaching: boolean = false; // 是否正在缓存
  @State cacheProgress: number = 0; // 缓存进度 0-100
  @State isCacheComplete: boolean = false; // 缓存是否完成

  /**
   * 页面显示时初始化数据
   */
  async aboutToAppear() {
    try {
      const params = router.getParams() as PageParams;
      if (params) {
        this.bookUrl = params.bookUrl || '';
        this.bookTitle = params.bookTitle || '书籍详情';
        this.bookAuthor = params.bookAuthor || '';
        this.bookCover = params.bookCover || '';
        
        hilog.info(0x0000, TAG, `接收到页面参数: URL=${this.bookUrl}, 标题=${this.bookTitle}, 作者=${this.bookAuthor}`);
      }
      
      // 初始化在线书籍数据管理器和下载管理器
      const context = this.getUIContext().getHostContext() as common.UIAbilityContext;
      await onlineBookDataManager.init(context);
      downloadManager.init(context);
      
      // 检查是否已加入书架，并尝试从缓存加载书籍详情
      await this.checkBookshelfStatus();
      
      if (this.bookUrl) {
        // 如果已经从缓存加载了书籍详情，在后台静默刷新
        if (this.bookDetail) {
          hilog.info(0x0000, TAG, '已从缓存加载书籍详情，后台刷新中...');
          this.isLoading = false;
          // 后台静默刷新，不显示加载状态
          this.loadBookDetail(true);
        } else {
          // 没有缓存，正常加载
          await this.loadBookDetail(false);
        }
      } else {
        this.errorMessage = '缺少书籍链接信息';
        this.isLoading = false;
      }
    } catch (error) {
      hilog.error(0x0000, TAG, '页面初始化失败: ' + JSON.stringify(error));
      this.errorMessage = '页面初始化失败';
      this.isLoading = false;
    }
  }

  /**
   * 使用鹿析管理器加载书籍详情
   * @param silent 是否静默刷新（不显示加载状态，不覆盖错误信息）
   */
  private async loadBookDetail(silent: boolean = false): Promise<void> {
    try {
      if (!silent) {
        this.isLoading = true;
        this.errorMessage = '';
      }
      
      // 使用鹿析管理器获取书籍详情
      const detailResult = await bookSourceManager.getBookDetail(this.bookUrl);
      
      if (detailResult.success && detailResult.data) {
        this.bookDetail = detailResult.data;
        hilog.info(0x0000, TAG, `成功加载书籍详情: ${detailResult.data.title}，来源: ${detailResult.source}`);
        
        // 如果书籍已在书架中，更新缓存的书籍信息
        if (this.isInBookshelf && this.onlineBookId > 0) {
          try {
            const updateInfo: BookDetailUpdateInfo = {
              title: detailResult.data.title,
              author: detailResult.data.author || '',
              cover: detailResult.data.cover || '',
              description: detailResult.data.description || '',
              category: detailResult.data.category || '',
              status: detailResult.data.status || '',
              latestChapter: detailResult.data.latestChapter || '',
              updateTime: detailResult.data.updateTime || ''
            };
            await onlineBookDataManager.updateOnlineBookDetail(this.onlineBookId, updateInfo);
            hilog.info(0x0000, TAG, '已更新缓存的书籍详情');
          } catch (updateError) {
            hilog.warn(0x0000, TAG, '更新缓存书籍详情失败: ' + JSON.stringify(updateError));
          }
        }
        
        // 如果有目录URL，获取章节列表
        if (detailResult.data.tocUrl) {
          await this.loadChapterList(detailResult.data.tocUrl);
        } else {
          // 尝试使用当前URL获取章节列表
          await this.loadChapterList(this.bookUrl);
        }
      } else {
        if (!silent) {
          this.errorMessage = detailResult.error || '获取书籍详情失败';
        }
        hilog.error(0x0000, TAG, '获取书籍详情失败: ' + (detailResult.error || '未知错误'));
      }
    } catch (error) {
      hilog.error(0x0000, TAG, '加载书籍详情失败: ' + JSON.stringify(error));
      if (!silent) {
        this.errorMessage = '加载失败，请重试';
      }
    } finally {
      if (!silent) {
        this.isLoading = false;
      }
    }
  }

  /**
   * 使用鹿析管理器加载章节列表
   * @param tocUrl 目录URL
   */
  private async loadChapterList(tocUrl: string): Promise<void> {
    try {
      const chapterResult = await bookSourceManager.getChapterList(tocUrl);
      
      if (chapterResult.success && chapterResult.data) {
        this.chapterList = chapterResult.data;
        hilog.info(0x0000, TAG, `成功加载 ${chapterResult.data.length} 个章节，来源: ${chapterResult.source}`);
      } else {
        hilog.warn(0x0000, TAG, '获取章节列表失败: ' + (chapterResult.error || '未知错误'));
        // 章节列表获取失败不影响书籍详情显示
        this.chapterList = [];
      }
    } catch (error) {
      hilog.error(0x0000, TAG, '加载章节列表失败: ' + JSON.stringify(error));
      this.chapterList = [];
    }
  }


  /**
   * 显示章节列表
   */
  private showChapters(): void {
    this.showChapterList = true;
  }

  /**
   * 检查书籍是否已加入书架
   */
  private async checkBookshelfStatus(): Promise<void> {
    try {
      const book = await onlineBookDataManager.queryOnlineBookByUrl(this.bookUrl);
      if (book) {
        this.isInBookshelf = true;
        this.onlineBookId = book.id;
        hilog.info(0x0000, TAG, `书籍已在书架中: ${book.title}`);
        
        // 从缓存的书籍信息构建BookDetailInfo，立即显示
        if (book.title) {
          this.bookDetail = {
            cover: book.cover || this.bookCover || '',
            title: book.title || this.bookTitle || '',
            author: book.author || this.bookAuthor || '',
            description: book.description || '',
            status: book.status || '',
            updateTime: book.updateTime || '',
            latestChapter: book.latestChapter || '',
            category: book.category || '',
          };
          hilog.info(0x0000, TAG, `从缓存加载书籍详情: ${book.title}`);
        }
        
        // 检查是否已有合并文件
        const mergedFilePath = downloadManager.getMergedFilePath(book.id, book.title);
        if (mergedFilePath) {
          this.isCacheComplete = true;
          hilog.info(0x0000, TAG, `书籍已缓存完成: ${mergedFilePath}`);
        } else {
          // 检查是否正在下载
          if (downloadManager.isDownloading(book.id)) {
            this.isCaching = true;
            this.cacheProgress = downloadManager.getDownloadProgress(book.id);
            hilog.info(0x0000, TAG, `书籍正在缓存中: ${this.cacheProgress}%`);
          }
        }
      } else {
        this.isInBookshelf = false;
        this.onlineBookId = 0;
      }
    } catch (error) {
      hilog.error(0x0000, TAG, '检查书架状态失败: ' + JSON.stringify(error));
    }
  }

  /**
   * 加入书架
   */
  private async addToBookshelf(): Promise<void> {
    if (!this.bookDetail) {
      return;
    }

    try {
      const onlineBook = new OnlineBookInfo();
      onlineBook.bookUrl = this.bookUrl;
      onlineBook.title = this.bookDetail.title;
      onlineBook.author = this.bookDetail.author || '';
      onlineBook.cover = this.bookDetail.cover || '';
      onlineBook.description = this.bookDetail.description || '';
      onlineBook.category = this.bookDetail.category || '';
      onlineBook.status = this.bookDetail.status || '';
      onlineBook.latestChapter = this.bookDetail.latestChapter || '';
      onlineBook.updateTime = this.bookDetail.updateTime || '';
      onlineBook.totalChapters = this.chapterList.length;

      const bookId = await onlineBookDataManager.addOnlineBook(onlineBook);
      this.onlineBookId = bookId;
      this.isInBookshelf = true;

      this.getUIContext()
        .getPromptAction()
        .showToast({ message: '已加入书架', duration: 2000 });

      hilog.info(0x0000, TAG, `书籍已加入书架: ${onlineBook.title}`);
    } catch (error) {
      hilog.error(0x0000, TAG, '加入书架失败: ' + JSON.stringify(error));
      this.getUIContext()
        .getPromptAction()
        .showToast({ message: '加入书架失败', duration: 2000 });
    }
  }
  
  /**
   * 开始缓存全部章节
   */
  private startCacheAll(): void {
    if (!this.bookDetail || this.chapterList.length === 0) {
      return;
    }
    
    this.isCaching = true;
    this.cacheProgress = 0;
    
    hilog.info(0x0000, TAG, `开始缓存全部章节: ${this.chapterList.length} 章`);
    
    // 开始下载并合并章节
    downloadManager.startDownloadBook(
      this.onlineBookId,
      this.bookDetail.title,
      this.chapterList,
      (current: number, total: number) => {
        // 进度回调
        this.cacheProgress = Math.round((current / total) * 100);
        hilog.info(0x0000, TAG, `缓存进度: ${this.cacheProgress}%`);
      },
      () => {
        // 完成回调
        this.isCaching = false;
        this.isCacheComplete = true;
        hilog.info(0x0000, TAG, '缓存完成');
        
        this.getUIContext()
          .getPromptAction()
          .showToast({ message: '缓存完成，可以开始阅读了', duration: 2000 });
      }
    );
  }

  /**
   * 开始阅读
   */
  private async startReading(): Promise<void> {
    hilog.info(0x0000, TAG, '=== 开始阅读 ===');
    
    // 如果章节列表为空，尝试重新加载
    if (this.chapterList.length === 0) {
      hilog.info(0x0000, TAG, '章节列表为空，尝试重新加载...');
      const tocUrl = this.bookDetail?.tocUrl || this.bookUrl;
      if (tocUrl) {
        await this.loadChapterList(tocUrl);
      }
      
      if (this.chapterList.length === 0) {
        this.getUIContext()
          .getPromptAction()
          .showToast({ message: '暂无章节可阅读，请稍后重试', duration: 2000 });
        return;
      }
    }

    // 跳转到自研阅读器（阅读进度由 UnifiedReaderPage 自动从 Preferences 恢复）
    router.pushUrl({
      url: 'pages/UnifiedReaderPage',
      params: {
        source: 'online',
        bookId: this.onlineBookId,
        bookTitle: this.bookDetail?.title || this.bookTitle,
        chapters: this.chapterList
      }
    }).then(() => {
      hilog.info(0x0000, TAG, '成功跳转到阅读器');
    }).catch((error: Error) => {
      hilog.error(0x0000, TAG, '跳转失败: ' + error.message);
      this.getUIContext()
        .getPromptAction()
        .showToast({ message: '打开阅读器失败', duration: 2000 });
    });
  }

  /**
   * 打开章节阅读
   * @param chapter 章节信息
   */
  private async openChapter(chapter: ChapterInfo): Promise<void> {
    hilog.info(0x0000, TAG, '打开章节: ' + chapter.title);
    
    // 查找章节索引
    const chapterIndex = this.chapterList.findIndex(c => c.url === chapter.url);
    
    hilog.info(0x0000, TAG, `跳转到阅读器，章节: ${chapter.title}, 索引: ${chapterIndex}`);
    
    router.pushUrl({
      url: 'pages/UnifiedReaderPage',
      params: {
        source: 'online',
        bookId: this.onlineBookId,
        bookTitle: this.bookDetail?.title || this.bookTitle,
        chapterIndex: chapterIndex >= 0 ? chapterIndex : 0,
        chapters: this.chapterList
      }
    }).then(() => {
      hilog.info(0x0000, TAG, '成功跳转到阅读器');
    }).catch((error: Error) => {
      hilog.error(0x0000, TAG, '跳转失败: ' + error.message);
      this.getUIContext()
        .getPromptAction()
        .showToast({ message: '打开阅读器失败', duration: 2000 });
    });
  }

  /**
   * 导出合并的TXT文件
   */
  private async exportMergedFile(): Promise<void> {
    try {
      // 检查是否有合并文件
      const mergedFilePath = downloadManager.getMergedFilePath(
        this.onlineBookId, 
        this.bookDetail?.title || this.bookTitle
      );
      
      if (!mergedFilePath) {
        this.getUIContext()
          .getPromptAction()
          .showToast({ message: '请先缓存全部章节', duration: 2000 });
        return;
      }
      
      // 检查文件是否存在
      if (!fs.accessSync(mergedFilePath)) {
        this.getUIContext()
          .getPromptAction()
          .showToast({ message: '缓存文件不存在', duration: 2000 });
        return;
      }
      
      hilog.info(0x0000, TAG, `准备导出文件: ${mergedFilePath}`);
      
      // 使用文件选择器让用户选择保存位置
      const documentSaveOptions = new picker.DocumentSaveOptions();
      documentSaveOptions.newFileNames = [`${this.bookDetail?.title || this.bookTitle}.txt`];
      
      const documentPicker = new picker.DocumentViewPicker();
      
      documentPicker.save(documentSaveOptions).then(async (result: Array<string>) => {
        if (result && result.length > 0) {
          const destUri = result[0];
          hilog.info(0x0000, TAG, `用户选择的保存路径: ${destUri}`);
          
          try {
            // 读取源文件
            const srcFile = fs.openSync(mergedFilePath, fs.OpenMode.READ_ONLY);
            const stat = fs.statSync(mergedFilePath);
            const buffer = new ArrayBuffer(stat.size);
            fs.readSync(srcFile.fd, buffer);
            fs.closeSync(srcFile);
            
            // 写入目标文件
            const destFile = fs.openSync(destUri, fs.OpenMode.WRITE_ONLY | fs.OpenMode.CREATE);
            fs.writeSync(destFile.fd, buffer);
            fs.closeSync(destFile);
            
            hilog.info(0x0000, TAG, `文件导出成功: ${destUri}`);
            
            this.getUIContext()
              .getPromptAction()
              .showToast({ message: '导出成功', duration: 2000 });
          } catch (error) {
            const err = error as BusinessError;
            hilog.error(0x0000, TAG, `文件复制失败: code=${err.code}, message=${err.message}`);
            
            this.getUIContext()
              .getPromptAction()
              .showToast({ message: '导出失败', duration: 2000 });
          }
        } else {
          hilog.info(0x0000, TAG, '用户取消了保存');
        }
      }).catch((error: BusinessError) => {
        hilog.error(0x0000, TAG, `文件选择器错误: code=${error.code}, message=${error.message}`);
        
        this.getUIContext()
          .getPromptAction()
          .showToast({ message: '打开文件选择器失败', duration: 2000 });
      });
      
    } catch (error) {
      hilog.error(0x0000, TAG, '导出文件失败: ' + JSON.stringify(error));
      
      this.getUIContext()
        .getPromptAction()
        .showToast({ message: '导出失败', duration: 2000 });
    }
  }

  /**
   * 返回上一页
   */
  private goBack(): void {
    router.back();
  }

  /**
   * 构建顶部导航栏
   */
  @Builder
  private buildHeader(): void {
    Row() {
      // 返回按钮
      Button() {
        Text('‹')
          .fontSize(24)
          .fontColor('#FFFFFF')
          .fontWeight(FontWeight.Bold)
      }
      .width(40)
      .height(40)
      .backgroundColor(Color.Transparent)
      .onClick(() => {
        this.goBack();
      })
      
      // 标题
      Text(this.bookDetail?.title || this.bookTitle || '书籍详情')
        .fontSize(18)
        .fontWeight(FontWeight.Medium)
        .fontColor('#FFFFFF')
        .layoutWeight(1)
        .textAlign(TextAlign.Center)
        .maxLines(1)
        .textOverflow({ overflow: TextOverflow.Ellipsis })
      
      // 菜单按钮
      Button() {
        Text('≡')
          .fontSize(22)
          .fontColor('#FFFFFF')
      }
      .width(40)
      .height(40)
      .backgroundColor(Color.Transparent)
      .bindPopup(this.showDetailMenu, {
        builder: this.buildDetailMenuPopup,
        placement: Placement.BottomRight,
        popupColor: Color.White,
        onStateChange: (e) => {
          if (!e.isVisible) {
            this.showDetailMenu = false;
          }
        }
      })
      .onClick(() => {
        this.showDetailMenu = !this.showDetailMenu;
      })
    }
    .width('100%')
    .height(56)
    .padding({ left: 16, right: 16 })
    .margin({ top: 44 })
    .backgroundColor($r('app.color.primary_green'))
  }

  @Builder
  private buildDetailMenuPopup(): void {
    Column() {
      Row() {
        Text('📥')
          .fontSize(16)
          .margin({ right: 8 })
        Text(this.isCaching
          ? `缓存中 ${this.cacheProgress}%`
          : (this.isCacheComplete ? '已缓存' : '缓存全部'))
          .fontSize(14)
          .fontColor(this.isCaching ? '#999' : $r('app.color.text_primary'))
      }
      .width('100%')
      .height(44)
      .padding({ left: 16, right: 16 })
      .alignItems(VerticalAlign.Center)
      .onClick(() => {
        this.showDetailMenu = false;
        if (!this.isCaching && !this.isCacheComplete) {
          this.startCacheAll();
        }
      })

      Divider().color('#F0F0F0')

      Row() {
        Text('📄')
          .fontSize(16)
          .margin({ right: 8 })
        Text('导出TXT')
          .fontSize(14)
          .fontColor(this.isCacheComplete ? $r('app.color.text_primary') : $r('app.color.text_tertiary'))
      }
      .width('100%')
      .height(44)
      .padding({ left: 16, right: 16 })
      .alignItems(VerticalAlign.Center)
      .onClick(() => {
        this.showDetailMenu = false;
        this.exportMergedFile();
      })
    }
    .width(160)
    .padding({ top: 4, bottom: 4 })
  }

  /**
   * 构建默认书籍信息（使用传递的参数）
   */
  @Builder
  private buildDefaultBookInfo(): void {
    if (this.bookTitle || this.bookAuthor || this.bookCover) {
      Column() {
        Row() {
          // 封面图片
          Image(this.bookCover || $r('app.media.default_cover'))
            .width(100)
            .height(130)
            .objectFit(ImageFit.Cover)
            .borderRadius(8)
            .shadow({
              radius: 8,
              color: '#20000000',
              offsetY: 4
            })
          
          // 书籍信息
          Column() {
            // 书名
            Text(this.bookTitle || '未知书名')
              .fontSize(20)
              .fontWeight(FontWeight.Bold)
              .fontColor($r('app.color.text_primary'))
              .maxLines(2)
              .textOverflow({ overflow: TextOverflow.Ellipsis })
              .width('100%')
              .textAlign(TextAlign.Start)
              .margin({ bottom: 8 })
            
            // 作者
            Text(`作者：${this.bookAuthor || '未知作者'}`)
              .fontSize(14)
              .fontColor($r('app.color.text_secondary'))
              .width('100%')
              .textAlign(TextAlign.Start)
              .margin({ bottom: 6 })
            
            // 状态
            Text('状态：数据加载中...')
              .fontSize(14)
              .fontColor($r('app.color.text_secondary'))
              .width('100%')
              .textAlign(TextAlign.Start)
              .margin({ bottom: 6 })
            
            // 提示信息
            Text('正在获取详细信息...')
              .fontSize(14)
              .fontColor($r('app.color.text_tertiary'))
              .width('100%')
              .textAlign(TextAlign.Start)
          }
          .layoutWeight(1)
          .margin({ left: 16 })
          .alignItems(HorizontalAlign.Start)
          .justifyContent(FlexAlign.SpaceBetween)
        }
        .width('100%')
        .alignItems(VerticalAlign.Top)
        .justifyContent(FlexAlign.Start)
      }
      .width('100%')
      .height('45%')
      .padding(20)
      .backgroundColor($r('app.color.card_bg'))
      .borderRadius(16)
      .margin({ left: 16, right: 16, top: 2 })
      .shadow({
        radius: 8,
        color: '#0D000000',
        offsetY: 2
      })
    }
  }

  /**
   * 构建书籍信息卡片
   */
  @Builder
  private buildBookInfo(): void {
    if (this.bookDetail) {
      Column() {
        Row() {
          // 封面图片
          Image(this.bookDetail.cover)
            .width(110)
            .height(150)
            .objectFit(ImageFit.Cover)
            .borderRadius(8)
            .shadow({
              radius: 8,
              color: '#20000000',
              offsetY: 4
            })

          // 书籍信息
          Column() {
            // 书名
            Text(this.bookDetail.title)
              .fontSize(20)
              .fontWeight(FontWeight.Bold)
              .fontColor($r('app.color.text_primary'))
              .maxLines(2)
              .textOverflow({ overflow: TextOverflow.Ellipsis })
              .width('100%')
              .textAlign(TextAlign.Start)
              .margin({ bottom: 24 })


              // 分类和字数标签
              if (this.bookDetail.category || this.bookDetail.wordCount) {
                Row() {
                  if (this.bookDetail.category) {
                    Text(this.bookDetail.category)
                      .fontSize(14)
                      .fontColor($r('app.color.text_secondary'))
                      .width('wrapContent')
                      .textAlign(TextAlign.Start)
                      .margin({ bottom: 18 })
                  }

                  if (this.bookDetail.wordCount) {
                    Text(this.bookDetail.wordCount)
                      .fontSize(14)
                      .fontColor($r('app.color.text_secondary'))
                      .width('wrapContent')
                      .textAlign(TextAlign.Start)
                      .margin({ bottom: 18 })
                  }
                }
              }
            Row() {
              // 状态
              Text(`${this.bookDetail.status}`)
                .fontSize(14)
                .fontColor($r('app.color.text_secondary'))
                .width('wrapContent')
                .textAlign(TextAlign.Start)
                .margin({ bottom: 6 })

              // 更新时间
              Text(`🕒${this.bookDetail.updateTime}`)
                .fontSize(14)
                .fontColor($r('app.color.text_secondary'))
                .width('wrapContent')
                .textAlign(TextAlign.Start)
                .margin({ bottom: 6 })
            }

          }
          .layoutWeight(1)
          .margin({ left: 8 })
          .alignItems(HorizontalAlign.Start)
          .justifyContent(FlexAlign.SpaceBetween)
        }
        .width('100%')
        .margin({ bottom: 24 })
        .alignItems(VerticalAlign.Top)

        Row() {
          Image($r("app.media.User"))
            .width(32)
            .height(32)
        // 作者
        Text(`${this.bookDetail.author}`)
          .fontSize(20)
          .fontColor($r('app.color.text_secondary'))
          .width('100%')
          // .textAlign(TextAlign.Start)
          // .margin({ top: 8 })
          // .margin({ bottom: 8 })
        }
        .margin({ top: 12 })
        .margin({ bottom: 12 })
        // 最新章节
        Text(`最新：${this.bookDetail.latestChapter}`)
          .fontSize(16)
          .fontColor($r('app.color.primary_green'))
          .width('100%')
          .textAlign(TextAlign.Start)
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
          .margin({ top: 12 })
      }
      .width('100%')
      .height('48%')
      .justifyContent(FlexAlign.Start)
      .padding(20)
      .backgroundColor($r('app.color.card_bg'))
      .borderRadius(16)
      .margin({ left: 16, right: 16, top: 2 })
      .shadow({
        radius: 8,
        color: '#0D000000',
        offsetY: 2
      })
    }
  }

  /**
   * 构建底部操作按钮
   */
  @Builder
  private buildActionButtons(): void {
    if (this.bookDetail) {
      Row() {
        // 主按钮（使用Stack结构与查看目录按钮保持一致）
        Stack() {
          Row()
            .width('100%')
            .height('100%')
            .backgroundColor($r('app.color.primary_green'))
            .borderRadius(8)
          
          Text(this.getMainButtonText())
            .fontSize(16)
            .fontColor('#FFFFFF')
            .fontWeight(FontWeight.Medium)
            .width('100%')
            .height('100%')
            .textAlign(TextAlign.Center)
            .zIndex(10)
        }
        .width('100%')
        .height(48)
        .layoutWeight(1)
        .clip(true)
        .borderRadius(8)
        .onClick(() => {
          this.handleMainButtonClick();
        })
        
        // 查看目录按钮（使用Stack结构保持一致）
        Stack() {
          // 按钮背景
          Row()
            .width('100%')
            .height('100%')
            .backgroundColor($r('app.color.card_bg'))
            .border({ width: 1, color: $r('app.color.primary_green') })
            .borderRadius(8)
          
          // 按钮文字
          Text('查看目录')
            .fontSize(16)
            .fontColor($r('app.color.primary_green'))
            .fontWeight(FontWeight.Medium)
            .width('100%')
            .height('100%')
            .textAlign(TextAlign.Center)
            .zIndex(10)
        }
        .width('100%')
        .height(48)
        .layoutWeight(1)
        .clip(true)
        .borderRadius(8)
        .margin({ left: 12 })
        .onClick(() => {
          this.showChapters();
        })
      }
      .width('100%')
      .padding({ left: 16, right: 16, top: 12, bottom: 12 })
      .backgroundColor($r('app.color.card_bg'))
      .shadow({
        radius: 8,
        color: '#0D000000',
        offsetY: -2
      })
    }
  }
  
  /**
   * 获取主按钮文字
   */
  private getMainButtonText(): string {
    if (!this.isInBookshelf) {
      return '加入书架';
    }
    return '开始阅读';
  }
  
  /**
   * 处理主按钮点击
   */
  private handleMainButtonClick(): void {
    if (!this.isInBookshelf) {
      this.addToBookshelf();
    } else {
      this.startReading();
    }
  }

  /**
   * 构建简介卡片
   */
  @Builder
  private buildDescription(): void {
    if (this.bookDetail?.description) {
      Column() {
      Text('内容简介')
        .fontSize(16)
        .fontWeight(FontWeight.Bold)
        .fontColor($r('app.color.text_primary'))
        .width('100%')
        .textAlign(TextAlign.Start)
        .margin({ bottom: 12 })
      
      Text(this.bookDetail.description)
        .fontSize(14)
        .fontColor($r('app.color.text_secondary'))
        .lineHeight(22)
        .width('100%')
        .textAlign(TextAlign.Start)
      }
      .width('100%')
      .height('46%')
      .padding(20)
      .backgroundColor($r('app.color.card_bg'))
      .borderRadius(16)
      .margin({ left: 16, right: 16, top: 16 })
      .shadow({
        radius: 8,
        color: '#0D000000',
        offsetY: 2
      })
    }
  }

  /**
   * 构建缓存和导出按钮
   */
  @Builder
  private buildExportButton(): void {
    if (this.isInBookshelf) {
      Column() {
        // 缓存进度条（仅在缓存进行中显示）
        if (this.isCaching) {
          Stack() {
            Row()
              .width('100%')
              .height('100%')
              .backgroundColor($r('app.color.page_background'))
              .border({ width: 1, color: $r('app.color.primary_green') })
              .borderRadius(8)
            Row()
              .width(`${this.cacheProgress}%`)
              .height('100%')
              .backgroundColor($r('app.color.light_green'))
              .borderRadius(8)
            Text(`缓存中 ${this.cacheProgress}%`)
              .fontSize(16)
              .fontColor($r('app.color.primary_green'))
              .fontWeight(FontWeight.Medium)
              .width('100%')
              .height('100%')
              .textAlign(TextAlign.Center)
              .zIndex(10)
          }
          .width('calc(100% - 32vp)')
          .height(48)
          .clip(true)
          .borderRadius(8)
          .alignContent(Alignment.Start)
          .margin({ left: 16, right: 16, top: 16 })
        }

        // 导出TXT按钮（缓存完成后显示）
        if (this.isCacheComplete) {
          Button('导出TXT文件')
            .fontSize(16)
            .fontColor('#FFFFFF')
            .fontWeight(FontWeight.Medium)
            .backgroundColor($r('app.color.primary_green'))
            .borderRadius(8)
            .width('calc(100% - 32vp)')
            .height(48)
            .margin({ left: 16, right: 16, top: 16 })
            .onClick(() => {
              this.exportMergedFile();
            })
        }
      }
    }
  }

  /**
   * 构建章节列表弹窗
   */
  @Builder
  private buildChapterListSheet(): void {
    Column() {
      // 弹窗标题（移除自定义关闭按钮，使用系统默认的）
      Row() {
        Text('章节目录')
          .fontSize(18)
          .fontWeight(FontWeight.Medium)
          .fontColor($r('app.color.text_primary'))
          .width('100%')
          .textAlign(TextAlign.Center)
      }
      .width('100%')
      .margin({ bottom: 16 })
      
      // 章节列表
      if (this.chapterList.length > 0) {
        List() {
          ForEach(this.chapterList, (chapter: ChapterInfo, index: number) => {
            ListItem() {
              Row() {
                Text(`${index + 1}.`)
                  .fontSize(14)
                  .fontColor($r('app.color.text_tertiary'))
                  .width(40)
                
                Text(chapter.title)
                  .fontSize(14)
                  .fontColor($r('app.color.text_primary'))
                  .layoutWeight(1)
                  .maxLines(1)
                  .textOverflow({ overflow: TextOverflow.Ellipsis })
              }
              .width('100%')
              .padding({ left: 12, right: 12, top: 12, bottom: 12 })
              .backgroundColor($r('app.color.page_background'))
              .borderRadius(8)
              .margin({ bottom: 8 })
              .onClick(() => {
                this.openChapter(chapter);
                this.showChapterList = false;
              })
            }
          })
        }
        .height(400)
        .scrollBar(BarState.Auto)
      } else {
        Column() {
          Text('📖')
            .fontSize(48)
            .margin({ bottom: 12 })
          Text('暂无章节信息')
            .fontSize(14)
            .fontColor($r('app.color.text_tertiary'))
        }
        .width('100%')
        .height(200)
        .justifyContent(FlexAlign.Center)
      }
    }
    .padding(20)
    .backgroundColor(Color.White)
    .borderRadius({ topLeft: 16, topRight: 16 })
  }

  build() {
    Column() {
      // 顶部导航栏
      this.buildHeader()
      
      // 主要内容区域
      if (this.isLoading) {
        // 加载中状态
        Scroll() {
          Column() {
            Column() {
              Progress({ type: ProgressType.Ring, value: 0 })
                .width(40)
                .height(40)
                .color($r('app.color.primary_green'))
              Text('正在加载书籍详情...')
                .fontSize(14)
                .fontColor($r('app.color.text_tertiary'))
                .margin({ top: 12 })
            }
            .width('100%')
            .padding({ top: 40 })
            .justifyContent(FlexAlign.Center)
          }
          .justifyContent(FlexAlign.Start)
        }
        .layoutWeight(1)
        .scrollBar(BarState.Off)
        .backgroundColor($r('app.color.page_background'))
      } else if (this.errorMessage) {
        // 错误状态 - 显示传递的参数信息和错误提示
        Scroll() {
          Column() {
            // 显示传递的书籍信息
            this.buildDefaultBookInfo()
            
            // 错误提示卡片
            Column() {
              Text('数据加载失败')
                .fontSize(16)
                .fontWeight(FontWeight.Bold)
                .fontColor($r('app.color.primary_green'))
                .margin({ bottom: 8 })
              
              Text(this.errorMessage)
                .fontSize(14)
                .fontColor($r('app.color.text_secondary'))
                .textAlign(TextAlign.Center)
                .margin({ bottom: 16 })
              
              Button('重试')
                .fontSize(14)
                .fontColor(Color.White)
                .backgroundColor($r('app.color.primary_green'))
                .borderRadius(20)
                .padding({ left: 20, right: 20, top: 8, bottom: 8 })
                .onClick(() => {
                  this.loadBookDetail();
                })
            }
            .width('100%')
            .padding(20)
            .backgroundColor($r('app.color.card_bg'))
            .borderRadius(16)
            .margin({ left: 16, right: 16, top: 16 })
            .shadow({
              radius: 8,
              color: '#0D000000',
              offsetY: 2
            })
            
            // 底部间距
            Column()
              .height(80)
          }
        }
        .layoutWeight(1)
        .scrollBar(BarState.Off)
        .backgroundColor($r('app.color.page_background'))
      } else {
        // 书籍详情内容
        Scroll() {
          Column() {
            // 书籍信息卡片
            this.buildBookInfo()
            
            // 简介卡片
            this.buildDescription()

            // 缓存和导出按钮
            this.buildExportButton()

            // 底部间距，为底部按钮留出空间
            Column()
              .height(80)
          }
        }
        .layoutWeight(1)
        .scrollBar(BarState.Off)
        .backgroundColor($r('app.color.page_background'))
        
        // 底部操作按钮
        this.buildActionButtons()
      }
    }
    .width('100%')
    .height('wrapContent')
    .backgroundColor($r('app.color.page_background'))
    .bindSheet($$this.showChapterList, this.buildChapterListSheet(), {
      height: 500,
      dragBar: true,
      backgroundColor: Color.White
    })
  }
}

export { BookDetailPage };
