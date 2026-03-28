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
import { onlineBookDataManager } from '../utils/OnlineBookDataManager';
import { OnlineBookInfo } from '../models/OnlineBookModel';
import { bookListManager } from '../utils/BookListManager';
import { fileIo as fs } from '@kit.CoreFileKit';
import { downloadManager } from '../managers/DownloadManager';

const TAG: string = 'IndexPage';

@Entry
@Component
struct Index {
  @State isShow: boolean = false;
  @State books: BookInfo[] = [];
  @State greetingText: string = '';
  @State onlineBooks: OnlineBookInfo[] = [];
  @State searchText: string = '';
  @State isEditMode: boolean = false;
  @State selectedBooks: number[] = [];
  @State selectedOnlineBooks: number[] = [];
  @State isGridView: boolean = true;
  @State isRefreshing: boolean = false; // 下拉刷新状态
  @State isExportMode: boolean = false; // 导出模式
  @State selectedExportBooks: number[] = []; // 导出模式下选中的在线书籍ID
  
  // 在线搜索相关状态
  @State searchKeyword: string = ''; // 搜索关键词
  @State showSearchSheet: boolean = false; // 搜索弹窗显示状态
  @State onlineSearchResults: NovelInfo[] = []; // 在线搜索结果
  @State isSearching: boolean = false; // 搜索加载状态
  @State searchErrorMessage: string = ''; // 搜索错误信息
  @State showSearchResults: boolean = false; // 显示搜索结果页面
  
  // 添加在线书籍相关状态
  @State showAddOnlineBookSheet: boolean = false; // 添加在线书籍弹窗显示状态
  @State bookUrlInput: string = ''; // 输入的书籍URL
  @State isParsingUrl: boolean = false; // 是否正在解析URL
  
  /**
   * System font scaled density is changed? If it has changed, the reader needs to be restarted.
   */
  @StorageLink('isDensityChange') isDensityChange: boolean = false;

  private getGreeting(): string {
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 5) {
      return '夜深了，早点休息 🌙';
    } else if (hour >= 5 && hour < 9) {
      return '早上好，书友 🌿';
    } else if (hour >= 9 && hour < 12) {
      return '上午好，书友 ☀️';
    } else if (hour >= 12 && hour < 14) {
      return '中午好，书友 🍃';
    } else if (hour >= 14 && hour < 18) {
      return '下午好，书友 🌿';
    } else {
      return '晚上好，书友 🌙';
    }
  }

  async aboutToAppear() {
    hilog.info(0x0000, TAG, 'aboutToAppear');
    this.greetingText = this.getGreeting();
    WindowAbility.getInstance().toggleWindowSystemBar(['status', 'navigation'], this.getUIContext().getHostContext());
    const context = this.getUIContext().getHostContext() as common.UIAbilityContext;
    await bookDataManager.init(context);
    await onlineBookDataManager.init(context);
    await bookListManager.init(context);
    this.loadBooksFromDB();
  }

  async loadBooksFromDB() {
    this.books = await bookDataManager.queryAllBooks();
    this.onlineBooks = await onlineBookDataManager.queryAllOnlineBooks();
    hilog.info(0x0000, TAG, `加载书籍: 本地${this.books.length}本, 在线${this.onlineBooks.length}本`);
  }

  /**
   * 根据书名生成稳定的随机颜色（同一本书每次显示颜色一致）
   */
  private getBookColor(bookName: string): string[] {
    const colorPairs: string[][] = [
      ['#5B9A76', '#3D7A5A'],
      ['#D89575', '#C07A5A'],
      ['#7BA68E', '#5A8A6E'],
      ['#A8C5B8', '#8AAF9C'],
      ['#C4A882', '#A89068'],
      ['#6B9E82', '#4D8066'],
      ['#B8A090', '#9A8272'],
      ['#8DB4A0', '#6E9A84'],
    ];
    let hash = 0;
    for (let i = 0; i < bookName.length; i++) {
      hash = ((hash << 5) - hash) + bookName.charCodeAt(i);
      hash = hash & hash;
    }
    return colorPairs[Math.abs(hash) % colorPairs.length];
  }

  /**
   * 刷新书架数据
   */
  private async refreshBookshelf(): Promise<void> {
    this.isRefreshing = true;
    try {
      await this.loadBooksFromDB();
      hilog.info(0x0000, TAG, '书架刷新完成');
    } catch (error) {
      hilog.error(0x0000, TAG, '刷新书架失败: ' + JSON.stringify(error));
    } finally {
      this.isRefreshing = false;
    }
  }

  onPageShow(): void {
    this.greetingText = this.getGreeting();
    this.refreshBookshelf(); // Refresh bookshelf data when returning to the page
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
      documentSelectOptions.maxSelectNumber = 15;
      let documentPicker = new picker.DocumentViewPicker();
      let documentSelectResult = await documentPicker.select(documentSelectOptions);
      if (!documentSelectResult || documentSelectResult.length <= 0) {
        hilog.error(0x0000, TAG, 'loadBook failed');
        return;
      }

      let importer = new LocalBookImporter();
      let context = this.getUIContext().getHostContext() as common.UIAbilityContext;
      let successCount = 0;
      let failCount = 0;
      const totalCount = documentSelectResult.length;

      for (let i = 0; i < totalCount; i++) {
        let srcFile: string = decodeURI(documentSelectResult[i]);
        hilog.info(0x0000, TAG, `loadBook [${i + 1}/${totalCount}] decodeURI succeeded. ` + srcFile);
        try {
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
          successCount++;
          hilog.info(0x0000, TAG, `loadBook [${i + 1}/${totalCount}] succeeded: ` + newBook.filePath);
        } catch (innerErr) {
          failCount++;
          hilog.error(0x0000, TAG, `loadBook [${i + 1}/${totalCount}] failed: ` + innerErr);
        }
      }

      await this.loadBooksFromDB(); // Refresh the bookshelf

      // Show result toast
      if (failCount === 0) {
        this.getUIContext()
          .getPromptAction()
          .showToast({ message: `成功导入${successCount}本书籍`, duration: 2000 });
      } else {
        this.getUIContext()
          .getPromptAction()
          .showToast({ message: `导入完成：成功${successCount}本，失败${failCount}本`, duration: 3000 });
      }
    } catch (err) {
      hilog.error(0x0000, TAG, 'loadBook failed, error is: ' + err);
    }
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
      // 否则显示书架页面
      Column() {
      // 问候语
      Column() {
        Text('书架')
          .fontSize(26)
          .fontWeight(FontWeight.Bold)
          .fontColor($r('app.color.text_primary'))
        Text(this.greetingText)
          .fontSize(15)
          .fontWeight(FontWeight.Medium)
          .fontColor($r('app.color.text_secondary'))
          .margin({ top: 4 })
      }
      .width('100%')
      .padding({ left: 16, right: 16 })
      .margin({ top: 44 })
      .alignItems(HorizontalAlign.Start)

      Row() {
        Row({ space: 16 }) {
          Image($r('app.media.sousuo'))
            .width(28)
            .height(28)
            .fillColor($r('app.color.text_secondary'))
            .onClick(() => {
              this.getUIContext().getRouter().pushUrl({ url: 'pages/SearchPage' });
            })

          Image($r('app.media.xuanx'))
            .width(28)
            .height(28)
            .fillColor($r('app.color.text_secondary'))
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
      .padding({ left: 16, right: 16 })
      .justifyContent(FlexAlign.End)
      .alignItems(VerticalAlign.Center)

      if (this.isEditMode) {
        Row() {
          Text('删除')
            .fontColor(Color.Red)
            .onClick(async () => {
              // 删除本地书籍
              await bookDataManager.deleteBooksByIds(this.selectedBooks);
              
              // 删除在线书籍（包括缓存文件）
              for (const bookId of this.selectedOnlineBooks) {
                // 先查询书籍信息获取书名
                const book = await onlineBookDataManager.queryOnlineBookById(bookId);
                if (book) {
                  // 删除缓存文件
                  await downloadManager.clearDownloads(bookId, book.title);
                  hilog.info(0x0000, TAG, `已删除书籍缓存: ${book.title}`);
                }
                // 删除数据库记录
                await onlineBookDataManager.deleteOnlineBook(bookId);
              }
              
              this.selectedBooks = [];
              this.selectedOnlineBooks = [];
              this.isEditMode = false;
              await this.loadBooksFromDB();
              
              // 提示用户
              const totalDeleted = this.selectedBooks.length + this.selectedOnlineBooks.length;
              if (totalDeleted > 0) {
                this.getUIContext()
                  .getPromptAction()
                  .showToast({ message: `已删除${totalDeleted}本书籍及其缓存`, duration: 2000 });
              }
            })
          Blank()
          Text('取消')
            .onClick(() => {
              this.selectedBooks = [];
              this.selectedOnlineBooks = [];
              this.isEditMode = false;
            })
        }
        .width('100%')
        .height(56)
        .padding({ left: 16, right: 16 })
        .justifyContent(FlexAlign.SpaceBetween)
      }

      if (this.isExportMode) {
        Row() {
          Text('导出')
            .fontColor('#9F6548')
            .onClick(async () => {
              await this.exportSelectedBooks();
            })
          Blank()
          Text('取消')
            .onClick(() => {
              this.selectedExportBooks = [];
              this.isExportMode = false;
            })
        }
        .width('100%')
        .height(56)
        .padding({ left: 16, right: 16 })
        .justifyContent(FlexAlign.SpaceBetween)
      }

      // 使用Refresh组件包裹内容区域
      Refresh({ refreshing: $$this.isRefreshing }) {
        if (this.isGridView) {
          Grid() {
            // 本地书籍
          ForEach(this.books, (book: BookInfo) => {
            GridItem() {
              Column({ space: 8 }) {
                Stack({ alignContent: Alignment.TopEnd }) {
                  if (book.coverPath) {
                    Image(book.coverPath)
                      .width('100%')
                      .aspectRatio(0.75)
                      .borderRadius(12)
                      .shadow({ radius: 8, color: '#1A191810', offsetX: 0, offsetY: 2 })
                  } else {
                    Column() {
                      Text(book.bookName.length > 4 ? book.bookName.substring(0, 4) : book.bookName)
                        .fontSize(16)
                        .fontWeight(FontWeight.Bold)
                        .fontColor('#FFFFFF')
                        .textAlign(TextAlign.Center)
                        .maxLines(2)
                        .textOverflow({ overflow: TextOverflow.Ellipsis })
                    }
                    .width('100%')
                    .aspectRatio(0.75)
                    .borderRadius(12)
                    .linearGradient({
                      angle: 180,
                      colors: [[this.getBookColor(book.bookName)[0], 0], [this.getBookColor(book.bookName)[1], 1]]
                    })
                    .justifyContent(FlexAlign.Center)
                    .alignItems(HorizontalAlign.Center)
                    .shadow({ radius: 8, color: '#1A191810', offsetX: 0, offsetY: 2 })
                  }
                  if (this.isEditMode) {
                    Image(this.selectedBooks.includes(book.id) ? $r('app.media.CheckCircle') : $r('app.media.Circle'))
                      .width(24)
                      .height(24)
                      .margin({ top: 4, right: 4 })
                  }
                }
                Text(book.bookName)
                  .fontSize(13)
                  .fontWeight(FontWeight.Medium)
                  .fontColor($r('app.color.text_primary'))
                  .maxLines(2)
                  .textOverflow({ overflow: TextOverflow.Ellipsis })
                  .textAlign(TextAlign.Center)
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
          
          // 在线书籍
          ForEach(this.onlineBooks, (book: OnlineBookInfo) => {
            GridItem() {
              Column({ space: 8 }) {
                Stack({ alignContent: Alignment.TopEnd }) {
                  if (book.cover) {
                    Image(book.cover)
                      .width('100%')
                      .aspectRatio(0.75)
                      .borderRadius(12)
                      .shadow({ radius: 8, color: '#1A191810', offsetX: 0, offsetY: 2 })
                  } else {
                    Column() {
                      Text(book.title.length > 4 ? book.title.substring(0, 4) : book.title)
                        .fontSize(16)
                        .fontWeight(FontWeight.Bold)
                        .fontColor('#FFFFFF')
                        .textAlign(TextAlign.Center)
                        .maxLines(2)
                        .textOverflow({ overflow: TextOverflow.Ellipsis })
                    }
                    .width('100%')
                    .aspectRatio(0.75)
                    .borderRadius(12)
                    .linearGradient({
                      angle: 180,
                      colors: [[this.getBookColor(book.title)[0], 0], [this.getBookColor(book.title)[1], 1]]
                    })
                    .justifyContent(FlexAlign.Center)
                    .alignItems(HorizontalAlign.Center)
                    .shadow({ radius: 8, color: '#1A191810', offsetX: 0, offsetY: 2 })
                  }
                  if (this.isEditMode) {
                    Image(this.selectedOnlineBooks.includes(book.id) ? $r('app.media.CheckCircle') : $r('app.media.Circle'))
                      .width(24)
                      .height(24)
                      .margin({ top: 4, right: 4 })
                  }
                  if (this.isExportMode) {
                    Image(this.selectedExportBooks.includes(book.id) ? $r('app.media.CheckCircle') : $r('app.media.Circle'))
                      .width(24)
                      .height(24)
                      .margin({ top: 4, right: 4 })
                  }
                  // 在线标识
                  Text('在线')
                    .fontSize(10)
                    .fontColor(Color.White)
                    .backgroundColor($r('app.color.primary_green'))
                    .padding({ left: 6, right: 6, top: 2, bottom: 2 })
                    .borderRadius(100)
                    .position({ x: 4, y: 4 })
                }
                Text(book.title)
                  .fontSize(13)
                  .fontWeight(FontWeight.Medium)
                  .fontColor($r('app.color.text_primary'))
                  .maxLines(2)
                  .textOverflow({ overflow: TextOverflow.Ellipsis })
                  .textAlign(TextAlign.Center)
              }
              .padding(8)
              .onClick(() => {
                if (this.isEditMode) {
                  const index = this.selectedOnlineBooks.indexOf(book.id);
                  if (index > -1) {
                    this.selectedOnlineBooks.splice(index, 1);
                  } else {
                    this.selectedOnlineBooks.push(book.id);
                  }
                } else if (this.isExportMode) {
                  const index = this.selectedExportBooks.indexOf(book.id);
                  if (index > -1) {
                    this.selectedExportBooks.splice(index, 1);
                  } else {
                    this.selectedExportBooks.push(book.id);
                  }
                } else {
                  this.openOnlineBook(book);
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
          // 本地书籍
          ForEach(this.books, (book: BookInfo) => {
            ListItem() {
              Row({ space: 12 }) {
                if (book.coverPath) {
                  Image(book.coverPath)
                    .width(60)
                    .aspectRatio(0.75)
                    .borderRadius(4)
                } else {
                  Column() {
                    Text(book.bookName.length > 4 ? book.bookName.substring(0, 4) : book.bookName)
                      .fontSize(12)
                      .fontWeight(FontWeight.Bold)
                      .fontColor('#FFFFFF')
                      .textAlign(TextAlign.Center)
                      .maxLines(2)
                      .textOverflow({ overflow: TextOverflow.Ellipsis })
                  }
                  .width(60)
                  .aspectRatio(0.75)
                  .borderRadius(4)
                  .linearGradient({
                    angle: 180,
                    colors: [[this.getBookColor(book.bookName)[0], 0], [this.getBookColor(book.bookName)[1], 1]]
                  })
                  .justifyContent(FlexAlign.Center)
                  .alignItems(HorizontalAlign.Center)
                }
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
          
          // 在线书籍
          ForEach(this.onlineBooks, (book: OnlineBookInfo) => {
            ListItem() {
              Row({ space: 12 }) {
                Stack() {
                  if (book.cover) {
                    Image(book.cover)
                      .width(60)
                      .aspectRatio(0.75)
                      .borderRadius(8)
                  } else {
                    Column() {
                      Text(book.title.length > 4 ? book.title.substring(0, 4) : book.title)
                        .fontSize(12)
                        .fontWeight(FontWeight.Bold)
                        .fontColor('#FFFFFF')
                        .textAlign(TextAlign.Center)
                        .maxLines(2)
                        .textOverflow({ overflow: TextOverflow.Ellipsis })
                    }
                    .width(60)
                    .aspectRatio(0.75)
                    .borderRadius(8)
                    .linearGradient({
                      angle: 180,
                      colors: [[this.getBookColor(book.title)[0], 0], [this.getBookColor(book.title)[1], 1]]
                    })
                    .justifyContent(FlexAlign.Center)
                    .alignItems(HorizontalAlign.Center)
                  }
                  Text('在线')
                    .fontSize(10)
                    .fontColor(Color.White)
                    .backgroundColor($r('app.color.primary_green'))
                    .padding({ left: 6, right: 6, top: 2, bottom: 2 })
                    .borderRadius(100)
                    .position({ x: 2, y: 2 })
                }
                .width(60)
                
                Column({ space: 4 }) {
                  Text(book.title)
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
                this.openOnlineBook(book);
              })
            }
          })
        }
        .layoutWeight(1)
        .padding({ top: 20 })
        }
      }
      .onRefreshing(() => {
        this.refreshBookshelf();
      })
      .layoutWeight(1)
    }
    .height('100%')
    .width('100%')
    .backgroundColor($r('app.color.page_background'))
    .padding({ left: 16, right: 16 })
    .bindSheet($$this.showAddOnlineBookSheet, this.buildAddOnlineBookSheet(), {
      height: 300,
      dragBar: true,
      backgroundColor: Color.White
    })
    }



  /**
   * 构建添加在线书籍弹窗
   */
  @Builder
  buildAddOnlineBookSheet(): void {
    Column() {
      // 标题
      Text('添加在线书籍')
        .fontSize(18)
        .fontWeight(FontWeight.Medium)
        .fontColor('#2D3748')
        .width('100%')
        .textAlign(TextAlign.Center)
        .margin({ bottom: 20 })
      
      // 输入框和解析按钮
      Row() {
        TextInput({ placeholder: '请输入书籍链接', text: this.bookUrlInput })
          .layoutWeight(1)
          .height(44)
          .fontSize(14)
          .borderRadius(8)
          .backgroundColor('#F7FAFC')
          .onChange((value: string) => {
            this.bookUrlInput = value;
          })
        
        Button('解析')
          .fontSize(14)
          .fontColor(Color.White)
          .backgroundColor($r('app.color.primary_green'))
          .borderRadius(12)
          .height(44)
          .width(80)
          .margin({ left: 12 })
          .enabled(!this.isParsingUrl)
          .onClick(() => {
            this.parseBookUrl();
          })
      }
      .width('100%')
      
      // 提示信息
      Text('支持笔趣阁等小说网站的书籍详情页链接')
        .fontSize(12)
        .fontColor('#718096')
        .width('100%')
        .textAlign(TextAlign.Start)
        .margin({ top: 12 })
      
      // 示例链接
      Text('示例: https://www.bqg128.cc/book/12345/')
        .fontSize(12)
        .fontColor('#A0AEC0')
        .width('100%')
        .textAlign(TextAlign.Start)
        .margin({ top: 4 })
    }
    .padding(20)
    .backgroundColor(Color.White)
    .borderRadius({ topLeft: 16, topRight: 16 })
  }

  @Builder
  popupWithButtonBuilder() {
    Column() {
      Row({ space: 16 }) {
        Image($r("app.media.Globe")).width(20).height(20)
        Text('添加在线书籍').fontSize(18)
      }.height(50).width('100%').onClick(() => {
        this.isShow = false;
        this.showAddOnlineBookSheet = true;
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
        this.startExportMode();
      })
      Row({ space: 16 }) {
        Image($r("app.media.SignIn")).width(20).height(20)
        Text('导入书单').fontSize(18)
      }.height(50).width('100%').onClick(() => {
        this.isShow = false;
        this.importBookList();
      })
    }.width(160)
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
        fullBookUrl = 'https://www.bqg128.cc' + novel.link;
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
   * 解析书籍URL并跳转到详情页
   */
  private async parseBookUrl(): Promise<void> {
    if (!this.bookUrlInput.trim()) {
      this.getUIContext()
        .getPromptAction()
        .showToast({ message: '请输入书籍链接', duration: 2000 });
      return;
    }

    this.isParsingUrl = true;
    hilog.info(0x0000, TAG, '开始解析书籍URL: ' + this.bookUrlInput);

    try {
      // 关闭弹窗
      this.showAddOnlineBookSheet = false;

      // 直接跳转到BookDetailPage，让详情页自己解析
      router.pushUrl({
        url: 'pages/BookDetailPage',
        params: {
          bookUrl: this.bookUrlInput.trim()
        }
      }).then(() => {
        hilog.info(0x0000, TAG, '成功跳转到书籍详情页面');
        // 清空输入框
        this.bookUrlInput = '';
      }).catch((error: Error) => {
        hilog.error(0x0000, TAG, '跳转失败: ' + error.message);
        this.getUIContext()
          .getPromptAction()
          .showToast({ message: '跳转失败: ' + error.message, duration: 2000 });
      });
    } catch (error) {
      hilog.error(0x0000, TAG, '解析书籍URL失败: ' + JSON.stringify(error));
      this.getUIContext()
        .getPromptAction()
        .showToast({ message: '解析失败，请检查链接是否正确', duration: 2000 });
    } finally {
      this.isParsingUrl = false;
    }
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

  /**
   * 打开在线书籍
   */
  private openOnlineBook(book: OnlineBookInfo): void {
    hilog.info(0x0000, TAG, `打开在线书籍: ${book.title}`);
    
    // 直接跳转到阅读器（阅读进度由 UnifiedReaderPage 自动恢复）
    router.pushUrl({
      url: 'pages/UnifiedReaderPage',
      params: {
        source: 'online',
        bookId: book.id,
        bookTitle: book.title,
        bookUrl: book.bookUrl
      }
    }).then(() => {
      hilog.info(0x0000, TAG, '成功跳转到阅读器');
    }).catch((error: Error) => {
      hilog.error(0x0000, TAG, '跳转失败: ' + error.message);
    });
  }

  private jumper(book: BookInfo) {
    if (!book.filePath) {
      return;
    }

    // 直接打开自研阅读器
    this.getUIContext().getRouter().pushUrl({
      url: 'pages/UnifiedReaderPage',
      params: {
        source: 'local',
        filePath: book.filePath,
        bookTitle: book.bookName || ''
      }
    })
  }

  /**
   * 开始导出模式
   */
  private startExportMode(): void {
    if (this.onlineBooks.length === 0) {
      this.getUIContext()
        .getPromptAction()
        .showToast({ message: '没有可导出的在线书籍', duration: 2000 });
      return;
    }
    
    this.isExportMode = true;
    this.selectedExportBooks = [];
    // 自动切换到网格视图以便显示选择框
    if (!this.isGridView) {
      this.isGridView = true;
    }
  }

  /**
   * 导出选中的书籍
   */
  private async exportSelectedBooks(): Promise<void> {
    if (this.selectedExportBooks.length === 0) {
      this.getUIContext()
        .getPromptAction()
        .showToast({ message: '请至少选择一本书籍', duration: 2000 });
      return;
    }

    try {
      // 获取选中的书籍信息
      const selectedBooks = this.onlineBooks.filter((book: OnlineBookInfo): boolean => {
        return this.selectedExportBooks.includes(book.id);
      });

      hilog.info(0x0000, TAG, `准备导出${selectedBooks.length}本书籍`);

      // 导出书单到JSON文件
      const filePath = await bookListManager.exportBookList(selectedBooks);

      // 使用Share Kit分享文件
      await this.shareBookListFile(filePath);

      // 重置状态
      this.selectedExportBooks = [];
      this.isExportMode = false;

      this.getUIContext()
        .getPromptAction()
        .showToast({ message: `成功导出${selectedBooks.length}本书籍`, duration: 2000 });
    } catch (error) {
      hilog.error(0x0000, TAG, `导出书单失败: ${JSON.stringify(error)}`);
      this.getUIContext()
        .getPromptAction()
        .showToast({ message: '导出失败: ' + error, duration: 2000 });
    }
  }

  /**
   * 分享书单文件
   * @param filePath 文件路径
   */
  private async shareBookListFile(filePath: string): Promise<void> {
    try {
      hilog.info(0x0000, TAG, `准备分享文件: ${filePath}`);

      // 使用文件选择器保存文件
      const documentSaveOptions = new picker.DocumentSaveOptions();
      documentSaveOptions.newFileNames = [`booklist_${Date.now()}.json`];
      
      const documentPicker = new picker.DocumentViewPicker();
      const documentSaveResult = await documentPicker.save(documentSaveOptions);
      
      if (documentSaveResult && documentSaveResult.length > 0) {
        const destPath = decodeURI(documentSaveResult[0]);
        hilog.info(0x0000, TAG, `用户选择保存路径: ${destPath}`);
        
        // 读取源文件
        const srcFile = fs.openSync(filePath, fs.OpenMode.READ_ONLY);
        const stat = fs.statSync(filePath);
        const buffer = new ArrayBuffer(stat.size);
        fs.readSync(srcFile.fd, buffer);
        fs.closeSync(srcFile);
        
        // 写入目标文件
        const destFile = fs.openSync(destPath, fs.OpenMode.CREATE | fs.OpenMode.WRITE_ONLY);
        fs.writeSync(destFile.fd, buffer);
        fs.closeSync(destFile);
        
        hilog.info(0x0000, TAG, '文件保存成功');
      } else {
        hilog.info(0x0000, TAG, '用户取消保存');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      hilog.error(0x0000, TAG, `分享文件失败: ${errorMsg}`);
      throw new Error('分享文件失败: ' + errorMsg);
    }
  }

  /**
   * 导入书单
   */
  private async importBookList(): Promise<void> {
    try {
      // 初始化文件选择器
      let documentSelectOptions = new picker.DocumentSelectOptions();
      // 设置文件类型为JSON
      documentSelectOptions.fileSuffixFilters = ['.json'];
      let documentPicker = new picker.DocumentViewPicker();
      let documentSelectResult = await documentPicker.select(documentSelectOptions);
      
      if (!documentSelectResult || documentSelectResult.length <= 0) {
        hilog.info(0x0000, TAG, '用户取消选择文件');
        return;
      }

      // 获取文件路径
      let filePath: string = decodeURI(documentSelectResult[0]);
      hilog.info(0x0000, TAG, `选择的文件: ${filePath}`);

      // 导入书单
      const importCount = await bookListManager.importBookList(filePath);

      // 刷新书架
      await this.loadBooksFromDB();

      this.getUIContext()
        .getPromptAction()
        .showToast({ message: `成功导入${importCount}本书籍`, duration: 2000 });
    } catch (error) {
      hilog.error(0x0000, TAG, `导入书单失败: ${JSON.stringify(error)}`);
      this.getUIContext()
        .getPromptAction()
        .showToast({ message: '导入失败: ' + error, duration: 2000 });
    }
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
