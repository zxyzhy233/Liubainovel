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

import { picker } from '@kit.CoreFileKit';
import { WindowAbility } from '../entryability/WindowAbility';
import { LocalBookImporter } from '../common/LocalBookImporter';
import { readerCore, bookParser } from '@kit.ReaderKit';
import { hilog } from '@kit.PerformanceAnalysisKit';
import { BookUtils } from '../utils/BookUtils';
import { common } from '@kit.AbilityKit';
import { bookDataManager } from '../utils/BookDataManager';
import { BookInfo } from '../common/BookInfo';
import { router } from '@kit.ArkUI';
import { bookSourceManager } from '../managers/BookSourceManager';
import { NovelInfo } from '../models/BookSourceModel';

const TAG: string = 'IndexPage';

@Entry
@Component
struct Index {
  @State isShow: boolean = false;
  @State books: BookInfo[] = [];
  @State searchText: string = '';
  @State isEditMode: boolean = false;
  @State selectedBooks: number[] = [];
  @State isGridView: boolean = true;
  
  // 在线搜索相关状态
  @State searchKeyword: string = ''; // 搜索关键词
  @State showSearchSheet: boolean = false; // 搜索弹窗显示状态
  @State onlineSearchResults: NovelInfo[] = []; // 在线搜索结果
  @State isSearching: boolean = false; // 搜索加载状态
  @State searchErrorMessage: string = ''; // 搜索错误信息
  @State showSearchResults: boolean = false; // 显示搜索结果页面
  
  /**
   * System font scaled density is changed? If it has changed, the reader needs to be restarted.
   */
  @StorageLink('isDensityChange') isDensityChange: boolean = false;

  async aboutToAppear() {
    hilog.info(0x0000, TAG, 'aboutToAppear');
    WindowAbility.getInstance().toggleWindowSystemBar(['status', 'navigation'], this.getUIContext().getHostContext());
    await bookDataManager.init(this.getUIContext().getHostContext() as common.UIAbilityContext);
    this.loadBooksFromDB();
  }

  async loadBooksFromDB() {
    this.books = await bookDataManager.queryAllBooks();
  }

  onPageShow(): void {
    this.loadBooksFromDB(); // Refresh bookshelf data when returning to the page
    WindowAbility.getInstance().toggleWindowSystemBar(['status', 'navigation'], this.getUIContext().getHostContext());
    if (this.isDensityChange) {
      // Restart the reader page
      if (this.books.length > 0) {
        this.jumper(this.books[0]);
      }
      AppStorage.setOrCreate('isDensityChange', false);
    }
  }

  private async loadBook() {
    try {
      // Initialize file selector
      let documentSelectOptions = new picker.DocumentSelectOptions();
      // Set file type selection
      documentSelectOptions.fileSuffixFilters = ['.epub', '.txt', '.mobi', '.azw', '.azw3'];
      let documentPicker = new picker.DocumentViewPicker();
      let documentSelectResult = await documentPicker.select(documentSelectOptions);
      if (!documentSelectResult || documentSelectResult.length <= 0) {
        hilog.error(0x0000, TAG, 'loadBook failed');
        return;
      }
      // get book file path
      let srcFile: string = decodeURI(documentSelectResult[0]);
      hilog.info(0x0000, TAG, 'loadBook decodeURI succeeded. ' + srcFile);
      let importer = new LocalBookImporter();
      let context = this.getUIContext().getHostContext() as common.UIAbilityContext;
      let bookParserInfo = await importer.importLocalBookToCache(srcFile,
        BookUtils.getBookFileLocalBookPath(context.filesDir));
      const newBook = new BookInfo();
      newBook.filePath = bookParserInfo.getFilePath();
      newBook.bookName = bookParserInfo.getBookName();
      try {
        let defaultHandler = await bookParser.getDefaultHandler(newBook.filePath);
        let bookInfo = defaultHandler.getBookInfo();
        newBook.author = bookInfo?.bookCreator || '未知';
      } catch (e) {
        hilog.error(0x0000, TAG, 'get book author failed', e);
      }
      newBook.coverPath = ''; // Temporarily empty
      newBook.lastReadTime = new Date().getTime();
      await bookDataManager.insertBook(newBook);
      await this.loadBooksFromDB(); // Refresh the bookshelf
      hilog.info(0x0000, TAG, 'loadBook bookParserInfo parse succeeded,dest path is: ' + newBook.filePath);
      this.getUIContext()
        .getPromptAction()
        .showToast({ message: $r('app.string.import_successful_tips'), duration: 2000 });
    } catch (err) {
      hilog.error(0x0000, TAG, 'loadBook failed, error is: ' + err);
    }
  }

  /**
   * 构建搜索弹窗
   */
  @Builder
  private buildSearchSheet(): void {
    Column() {
      // 弹窗标题
      Row() {
        Text('搜索小说')
          .fontSize(18)
          .fontWeight(FontWeight.Medium)
          .fontColor('#2D3748')
        
        Blank()
      }
      .width('100%')
      .margin({ bottom: 20 })
      
      // 搜索输入框
      TextInput({ placeholder: '请输入书名、作者或主角名', text: $$this.searchKeyword })
        .fontSize(16)
        .backgroundColor('#F7FAFC')
        .borderRadius(8)
        .padding({ left: 12, right: 12, top: 12, bottom: 12 })
        .margin({ bottom: 20 })
        .onSubmit(() => {
          this.performOnlineSearch();
        })
      
      // 搜索按钮
      Button('搜索')
        .fontSize(16)
        .fontColor(Color.White)
        .backgroundColor('#E53E3E')
        .borderRadius(8)
        .width('100%')
        .height(44)
        .onClick(() => {
          this.performOnlineSearch();
        })
    }
    .padding(20)
    .backgroundColor(Color.White)
    .borderRadius({ topLeft: 16, topRight: 16 })
  }

  /**
   * 构建搜索结果页面
   */
  @Builder
  private buildSearchResultsPage(): void {
    Column() {
      // 搜索结果页面标题栏
      Row() {
        Button() {
          Text('‹')
            .fontSize(24)
            .fontColor('#2D3748')
            .fontWeight(FontWeight.Bold)
        }
        .width(40)
        .height(40)
        .backgroundColor(Color.Transparent)
        .onClick(() => {
          this.backToBookshelf();
        })
        
        Text(`搜索结果: ${this.searchKeyword}`)
          .fontSize(18)
          .fontWeight(FontWeight.Medium)
          .fontColor('#2D3748')
          .layoutWeight(1)
          .textAlign(TextAlign.Center)
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
        
        Button()
          .width(40)
          .height(40)
          .backgroundColor(Color.Transparent)
      }
      .width('100%')
      .height(56)
      .padding({ left: 16, right: 16 })
      .margin({ top: 44 })
      .backgroundColor(Color.White)
      .shadow({
        radius: 2,
        color: '#10000000',
        offsetY: 1
      })
      
      // 搜索结果内容
      if (this.isSearching) {
        // 搜索中状态
        Column() {
          Progress({ type: ProgressType.Ring, value: 0 })
            .width(40)
            .height(40)
            .color('#E53E3E')
          Text('正在搜索小说...')
            .fontSize(14)
            .fontColor('#718096')
            .margin({ top: 12 })
        }
        .width('100%')
        .layoutWeight(1)
        .justifyContent(FlexAlign.Center)
        .backgroundColor('#F7FAFC')
      } else if (this.searchErrorMessage) {
        // 搜索错误状态
        Column() {
          Text('😔')
            .fontSize(48)
            .margin({ bottom: 12 })
          Text(this.searchErrorMessage)
            .fontSize(14)
            .fontColor('#E53E3E')
            .margin({ bottom: 16 })
          Button('重新搜索')
            .fontSize(14)
            .fontColor(Color.White)
            .backgroundColor('#E53E3E')
            .borderRadius(20)
            .padding({ left: 20, right: 20, top: 8, bottom: 8 })
            .onClick(() => {
              this.performOnlineSearch();
            })
        }
        .width('100%')
        .layoutWeight(1)
        .justifyContent(FlexAlign.Center)
        .backgroundColor('#F7FAFC')
      } else if (this.onlineSearchResults.length === 0) {
        // 无搜索结果状态
        Column() {
          Text('📚')
            .fontSize(48)
            .margin({ bottom: 12 })
          Text('未找到相关小说')
            .fontSize(14)
            .fontColor('#718096')
            .margin({ bottom: 16 })
          Button('重新搜索')
            .fontSize(14)
            .fontColor('#3182CE')
            .backgroundColor('#EBF8FF')
            .borderRadius(20)
            .padding({ left: 20, right: 20, top: 8, bottom: 8 })
            .onClick(() => {
              this.showSearchSheet = true;
            })
        }
        .width('100%')
        .layoutWeight(1)
        .justifyContent(FlexAlign.Center)
        .backgroundColor('#F7FAFC')
      } else {
        // 搜索结果列表
        Scroll() {
          Column() {
            // 结果统计
            Text(`找到 ${this.onlineSearchResults.length} 本相关小说`)
              .fontSize(14)
              .fontColor('#718096')
              .width('100%')
              .textAlign(TextAlign.Center)
              .margin({ top: 16, bottom: 16 })
            
            // 小说列表
            ForEach(this.onlineSearchResults, (novel: NovelInfo, index: number) => {
              this.buildNovelCard(novel)
            })
            
            // 底部提示
            Text('已显示全部搜索结果')
              .fontSize(12)
              .fontColor('#A0AEC0')
              .margin({ top: 20, bottom: 20 })
          }
        }
        .layoutWeight(1)
        .scrollBar(BarState.Off)
        .backgroundColor('#F7FAFC')
      }
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#F7FAFC')
  }

  /**
   * 构建小说卡片
   */
  @Builder
  private buildNovelCard(novel: NovelInfo): void {
    Row() {
      // 小说封面
      Image(novel.cover)
        .width(60)
        .height(80)
        .objectFit(ImageFit.Cover)
        .borderRadius(6)
        .shadow({
          radius: 4,
          color: '#20000000',
          offsetY: 2
        })
      
      // 小说信息
      Column() {
        // 标题
        Text(novel.title)
          .fontSize(16)
          .fontWeight(FontWeight.Medium)
          .fontColor('#2D3748')
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
          .width('100%')
          .textAlign(TextAlign.Start)
        
        // 作者信息
        Text(novel.author)
          .fontSize(12)
          .fontColor('#718096')
          .margin({ top: 4, bottom: 6 })
          .width('100%')
          .textAlign(TextAlign.Start)
        
        // 简介
        Text(novel.description)
          .fontSize(13)
          .fontColor('#4A5568')
          .maxLines(2)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
          .lineHeight(18)
          .width('100%')
          .textAlign(TextAlign.Start)
        
        // 热度和分类
        Row() {
          Text(novel.hotValue || '热度未知')
            .fontSize(11)
            .fontColor('#E53E3E')
            .backgroundColor('#FED7D7')
            .padding({ left: 6, right: 6, top: 2, bottom: 2 })
            .borderRadius(10)
          
          if (novel.category) {
            Text(novel.category)
              .fontSize(11)
              .fontColor('#3182CE')
              .backgroundColor('#BEE3F8')
              .padding({ left: 6, right: 6, top: 2, bottom: 2 })
              .borderRadius(10)
              .margin({ left: 8 })
          }
        }
        .margin({ top: 6 })
        .width('100%')
        .justifyContent(FlexAlign.Start)
      }
      .layoutWeight(1)
      .margin({ left: 12 })
      .alignItems(HorizontalAlign.Start)
      .justifyContent(FlexAlign.SpaceBetween)
    }
    .width('100%')
    .padding(12)
    .backgroundColor(Color.White)
    .borderRadius(8)
    .margin({ left: 16, right: 16, bottom: 12 })
    .shadow({
      radius: 2,
      color: '#10000000',
      offsetY: 1
    })
    .onClick(() => {
      this.openNovelDetail(novel);
    })
  }

  build() {
    // 如果显示搜索结果页面，则显示搜索结果
    if (this.showSearchResults) {
      this.buildSearchResultsPage()
    } else {
      // 否则显示书架页面
      Column() {
      Row() {
        Row({ space: 16 }) {
          Image($r('app.media.sousuo'))
            .width(32)
            .height(32)
            .onClick(() => {
              this.getUIContext().getRouter().pushUrl({ url: 'pages/SearchPage' });
            })

          Image($r('app.media.xuanx'))
            .width(32)
            .height(32)
            .onClick(() => {
              this.isShow = !this.isShow;
            })
            .bindPopup(this.isShow, {
              builder: this.popupWithButtonBuilder(),
              placement: Placement.Bottom,
              onStateChange: (e) => {
                if (!e.isVisible) {
                  this.isShow = false;
                }
              }
            })
        }
      }
      .width('100%')
      .height(56)
      .padding({ left: 16, right: 16 })
      .margin({ top: 44 })
      .justifyContent(FlexAlign.End)
      .alignItems(VerticalAlign.Center)

      if (this.isEditMode) {
        Row() {
          Text('删除')
            .fontColor(Color.Red)
            .onClick(async () => {
              await bookDataManager.deleteBooksByIds(this.selectedBooks);
              this.selectedBooks = [];
              this.isEditMode = false;
              await this.loadBooksFromDB();
            })
          Blank()
          Text('取消')
            .onClick(() => {
              this.selectedBooks = [];
              this.isEditMode = false;
            })
        }
        .width('100%')
        .height(56)
        .padding({ left: 16, right: 16 })
        .justifyContent(FlexAlign.SpaceBetween)
      }

      if (this.isGridView) {
        Grid() {
          ForEach(this.books, (book: BookInfo) => {
            GridItem() {
              Column({ space: 8 }) {
                Stack({ alignContent: Alignment.TopEnd }) {
                  Image(book.coverPath || $r('app.media.zwfm'))
                    .width('100%')
                    .aspectRatio(0.75)
                    .borderRadius(8)
                    .backgroundColor($r('app.color.black_5_opacity'))
                  if (this.isEditMode) {
                    Image(this.selectedBooks.includes(book.id) ? $r('app.media.CheckCircle') : $r('app.media.Circle'))
                      .width(24)
                      .height(24)
                      .margin({ top: 4, right: 4 })
                  }
                }
                Text(book.bookName)
                  .fontSize(14)
                  .maxLines(2)
                  .textOverflow({ overflow: TextOverflow.Ellipsis })
              }
              .padding(8)
              .onClick(() => {
                if (this.isEditMode) {
                  const index = this.selectedBooks.indexOf(book.id);
                  if (index > -1) {
                    this.selectedBooks.splice(index, 1);
                  } else {
                    this.selectedBooks.push(book.id);
                  }
                } else {
                  this.jumper(book);
                }
              })
            }
          })
        }
        .columnsTemplate('1fr 1fr 1fr')
        .columnsGap(16)
        .rowsGap(16)
        .layoutWeight(1)
        .padding({ top: 20 })
      } else {
        // List布局
        List({ space: 12 }) {
          ForEach(this.books, (book: BookInfo) => {
            ListItem() {
              Row({ space: 12 }) {
                Image(book.coverPath || $r('app.media.zwfm'))
                  .width(60)
                  .aspectRatio(0.75)
                  .borderRadius(4)
                  .backgroundColor($r('app.color.black_5_opacity'))
                Column({ space: 4 }) {
                  Text(book.bookName)
                    .fontSize(16)
                    .fontWeight(FontWeight.Bold)
                    .maxLines(1)
                    .textOverflow({ overflow: TextOverflow.Ellipsis })
                  Text(book.author || '未知')
                    .fontSize(14)
                    .fontColor($r('app.color.black_60_opacity'))
                    .maxLines(1)
                    .textOverflow({ overflow: TextOverflow.Ellipsis })
                  Text(`已读: ${book.currentChapter || book.progress || '未开始'}`)
                    .fontSize(12)
                    .fontColor($r('app.color.black_60_opacity'))
                }
                .alignItems(HorizontalAlign.Start)
                .layoutWeight(1)
              }
              .padding({ top: 8, bottom: 8 })
              .onClick(() => {
                this.jumper(book);
              })
            }
          })
        }
        .layoutWeight(1)
        .padding({ top: 20 })
      }
    }
    .height('100%')
    .width('100%')
    .backgroundColor($r('app.color.page_background'))
    .padding({ left: 16, right: 16 })
    .bindSheet($$this.showSearchSheet, this.buildSearchSheet(), {
      height: 300,
      dragBar: true,
      backgroundColor: Color.White,
      onAppear: () => {
        hilog.info(0x0000, TAG, '搜索弹窗出现');
      },
      onDisappear: () => {
        hilog.info(0x0000, TAG, '搜索弹窗消失');
      }
    })
    }
  }

  @Builder
  popupWithButtonBuilder() {
    Column() {
      Row({ space: 16 }) {
        Image($r("app.media.sousuo")).width(20).height(20)
        Text('在线搜索').fontSize(18)
      }.height(50).width('100%').onClick(() => {
        this.isShow = false;
        this.showSearchSheet = true;
      })
      Row({ space: 16 }) {
        Image($r("app.media.fenlei")).width(20).height(20)
        Text('切换显示模式').fontSize(18)
      }.height(50).width('100%').onClick(() => {
        this.isGridView = !this.isGridView;
        this.isShow = false;
      })
      Row({ space: 16 }) {
        Image($r("app.media.Plus")).width(20).height(20)
        Text('添加本地').fontSize(18)
      }.height(50).width('100%').onClick(() => {
        this.isShow = false;
        this.loadBook();
      })
      Row({ space: 16 }) {
        Image($r("app.media.StackMinus")).width(20).height(20)
        Text('书架管理').fontSize(18)
      }.height(50).width('100%').onClick(() => {
        this.isShow = false;
        this.isEditMode = true;
        // 自动切换到图片列表框模式以便显示选择框
        if (!this.isGridView) {
          this.isGridView = true;
        }
      })
      Row({ space: 16 }) {
        Image($r("app.media.SignOut")).width(20).height(20)
        Text('导出书单').fontSize(18)
      }.height(50).width('100%').onClick(() => {
        this.isShow = false;
      })
      Row({ space: 16 }) {
        Image($r("app.media.SignIn")).width(20).height(20)
        Text('导入书单').fontSize(18)
      }.height(50).width('100%').onClick(() => {
        this.isShow = false;
      })
    }.width(160)
  }

  /**
   * 执行在线搜索
   */
  private async performOnlineSearch(): Promise<void> {
    if (this.searchKeyword.trim()) {
      hilog.info(0x0000, TAG, '在线搜索关键词: ' + this.searchKeyword);
      this.showSearchSheet = false;
      
      try {
        this.isSearching = true;
        this.searchErrorMessage = '';
        
        // 使用书源管理器搜索小说
        const result = await bookSourceManager.searchNovels(this.searchKeyword.trim());
        
        if (result.success && result.data) {
          this.onlineSearchResults = result.data;
          this.showSearchResults = true;
          hilog.info(0x0000, TAG, `在线搜索成功，找到 ${result.data.length} 本小说`);
        } else {
          this.searchErrorMessage = result.error || '搜索失败';
          hilog.error(0x0000, TAG, '在线搜索失败: ' + this.searchErrorMessage);
        }
      } catch (error) {
        hilog.error(0x0000, TAG, '在线搜索出错: ' + JSON.stringify(error));
        this.searchErrorMessage = '搜索出错，请重试';
      } finally {
        this.isSearching = false;
      }
    }
  }

  /**
   * 打开小说详情
   * @param novel 小说信息
   */
  private openNovelDetail(novel: NovelInfo): void {
    hilog.info(0x0000, TAG, '打开小说详情: ' + novel.title);
    
    // 构建完整的书籍详情URL
    let fullBookUrl = novel.link;
    
    // 如果链接不是完整的URL，则需要拼接书源的基础URL
    if (!novel.link.startsWith('http')) {
      // 获取启用的书源列表
      const enabledSources = bookSourceManager.getEnabledBookSources();
      if (enabledSources.length > 0) {
        // 使用第一个启用的书源作为基础URL
        const baseUrl = enabledSources[0].bookSourceUrl;
        fullBookUrl = baseUrl + novel.link;
        hilog.info(0x0000, TAG, `使用书源 ${enabledSources[0].bookSourceName} 的基础URL: ${baseUrl}`);
      } else {
        // 如果没有启用的书源，使用默认的笔趣阁URL
        fullBookUrl = 'https://www.bqg128.com' + novel.link;
        hilog.warn(0x0000, TAG, '没有启用的书源，使用默认URL');
      }
    }
    
    hilog.info(0x0000, TAG, '书籍详情链接: ' + fullBookUrl);
    
    // 跳转到书籍详情页面
    router.pushUrl({
      url: 'pages/BookDetailPage',
      params: {
        bookUrl: fullBookUrl,
        bookTitle: novel.title,
        bookAuthor: novel.author,
        bookCover: novel.cover
      }
    }).then(() => {
      hilog.info(0x0000, TAG, '成功跳转到书籍详情页面');
    }).catch((error: Error) => {
      hilog.error(0x0000, TAG, '跳转失败: ' + error.message);
    });
  }

  /**
   * 返回书架
   */
  private backToBookshelf(): void {
    this.showSearchResults = false;
    this.onlineSearchResults = [];
    this.searchKeyword = '';
    this.searchErrorMessage = '';
  }

  private jumper(book: BookInfo) {
    if (!book.filePath) {
      return;
    }
    this.getUIContext().getRouter().pushUrl({
      url: "pages/Reader", params: {
        filePath: book.filePath,
        resourceIndex: book.resourceIndex,
        domPos: book.domPos || ''
      }
    })
    // Router addObserver 方法已移除，因为Router类型没有这个属性
  }

  /**
   * Remove the page transition animation to speed up the page access speed of the reader
   */
  pageTransition() {
    PageTransitionEnter({ duration: 0, curve: Curve.Sharp });
    PageTransitionExit({ duration: 0, curve: Curve.Sharp });
  }
}

export { Index };
