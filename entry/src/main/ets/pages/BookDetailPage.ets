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

import { hilog } from '@kit.PerformanceAnalysisKit';
import { router } from '@kit.ArkUI';
import { bookSourceManager } from '../managers/BookSourceManager';
import { BookDetailInfo, ChapterInfo } from '../models/BookSourceModel';

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
@ComponentV2
struct BookDetailPage {
  @Local bookDetail: BookDetailInfo | null = null; // 书籍详情
  @Local chapterList: ChapterInfo[] = []; // 章节列表
  @Local isLoading: boolean = true; // 加载状态
  @Local errorMessage: string = ''; // 错误信息
  @Local showChapterList: boolean = false; // 是否显示章节列表
  @Local bookUrl: string = ''; // 书籍详情页URL
  @Local bookTitle: string = ''; // 书籍标题
  @Local bookAuthor: string = ''; // 书籍作者
  @Local bookCover: string = ''; // 书籍封面

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
      
      if (this.bookUrl) {
        await this.loadBookDetail();
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
   * 使用书源管理器加载书籍详情
   */
  private async loadBookDetail(): Promise<void> {
    try {
      this.isLoading = true;
      this.errorMessage = '';
      
      // 使用书源管理器获取书籍详情
      const detailResult = await bookSourceManager.getBookDetail(this.bookUrl);
      
      if (detailResult.success && detailResult.data) {
        this.bookDetail = detailResult.data;
        hilog.info(0x0000, TAG, `成功加载书籍详情: ${detailResult.data.title}，来源: ${detailResult.source}`);
        
        // 如果有目录URL，获取章节列表
        if (detailResult.data.tocUrl) {
          await this.loadChapterList(detailResult.data.tocUrl);
        } else {
          // 尝试使用当前URL获取章节列表
          await this.loadChapterList(this.bookUrl);
        }
      } else {
        this.errorMessage = detailResult.error || '获取书籍详情失败';
        hilog.error(0x0000, TAG, '获取书籍详情失败: ' + this.errorMessage);
      }
    } catch (error) {
      hilog.error(0x0000, TAG, '加载书籍详情失败: ' + JSON.stringify(error));
      this.errorMessage = '加载失败，请重试';
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * 使用书源管理器加载章节列表
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
   * 打开章节阅读
   * @param chapter 章节信息
   */
  private openChapter(chapter: ChapterInfo): void {
    hilog.info(0x0000, TAG, '打开章节: ' + chapter.title);
    // 这里可以跳转到阅读页面
    // router.pushUrl({
    //   url: 'pages/ReaderPage',
    //   params: {
    //     chapterUrl: chapter.url,
    //     chapterTitle: chapter.title
    //   }
    // });
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
      
      // 占位按钮保持对称
      Button()
        .width(40)
        .height(40)
        .backgroundColor(Color.Transparent)
    }
    .width('100%')
    .height(56)
    .padding({ left: 16, right: 16 })
    .margin({ top: 44 })
    .backgroundColor('#E53E3E')
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
              .fontColor('#2D3748')
              .maxLines(2)
              .textOverflow({ overflow: TextOverflow.Ellipsis })
              .width('100%')
              .textAlign(TextAlign.Start)
              .margin({ bottom: 8 })
            
            // 作者
            Text(`作者：${this.bookAuthor || '未知作者'}`)
              .fontSize(14)
              .fontColor('#4A5568')
              .width('100%')
              .textAlign(TextAlign.Start)
              .margin({ bottom: 6 })
            
            // 状态
            Text('状态：数据加载中...')
              .fontSize(14)
              .fontColor('#4A5568')
              .width('100%')
              .textAlign(TextAlign.Start)
              .margin({ bottom: 6 })
            
            // 提示信息
            Text('正在获取详细信息...')
              .fontSize(14)
              .fontColor('#718096')
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
      }
      .width('100%')
      .padding(20)
      .backgroundColor('#FFFFFF')
      .borderRadius(12)
      .margin({ left: 16, right: 16, top: 2 })
      .shadow({
        radius: 4,
        color: '#10000000',
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
          Text(this.bookDetail.title)
            .fontSize(20)
            .fontWeight(FontWeight.Bold)
            .fontColor('#2D3748')
            .maxLines(2)
            .textOverflow({ overflow: TextOverflow.Ellipsis })
            .width('100%')
            .textAlign(TextAlign.Start)
            .margin({ bottom: 8 })
          
          // 作者
          Text(`作者：${this.bookDetail.author}`)
            .fontSize(14)
            .fontColor('#4A5568')
            .width('100%')
            .textAlign(TextAlign.Start)
            .margin({ bottom: 6 })
          
          // 状态
          Text(`状态：${this.bookDetail.status}`)
            .fontSize(14)
            .fontColor('#4A5568')
            .width('100%')
            .textAlign(TextAlign.Start)
            .margin({ bottom: 6 })
          
          // 更新时间
          Text(`更新：${this.bookDetail.updateTime}`)
            .fontSize(14)
            .fontColor('#4A5568')
            .width('100%')
            .textAlign(TextAlign.Start)
            .margin({ bottom: 6 })
          
          // 最新章节
          Text(`最新：${this.bookDetail.latestChapter}`)
            .fontSize(14)
            .fontColor('#E53E3E')
            .width('100%')
            .textAlign(TextAlign.Start)
            .maxLines(1)
            .textOverflow({ overflow: TextOverflow.Ellipsis })
        }
        .layoutWeight(1)
        .margin({ left: 16 })
        .alignItems(HorizontalAlign.Start)
        .justifyContent(FlexAlign.SpaceBetween)
      }
      .width('100%')
      .alignItems(VerticalAlign.Top)
      
      // 分类和字数标签
      if (this.bookDetail.category || this.bookDetail.wordCount) {
        Row() {
          if (this.bookDetail.category) {
            Text(this.bookDetail.category)
              .fontSize(12)
              .fontColor('#3182CE')
              .backgroundColor('#BEE3F8')
              .padding({ left: 8, right: 8, top: 4, bottom: 4 })
              .borderRadius(12)
          }
          
          if (this.bookDetail.wordCount) {
            Text(this.bookDetail.wordCount)
              .fontSize(12)
              .fontColor('#38A169')
              .backgroundColor('#C6F6D5')
              .padding({ left: 8, right: 8, top: 4, bottom: 4 })
              .borderRadius(12)
              .margin({ left: this.bookDetail.category ? 8 : 0 })
          }
        }
        .width('100%')
        .justifyContent(FlexAlign.Start)
        .margin({ top: 16 })
      }
      }
      .width('100%')
      .padding(20)
      .backgroundColor('#FFFFFF')
      .borderRadius(12)
      .margin({ left: 16, right: 16, top: 2 })
      .shadow({
        radius: 4,
        color: '#10000000',
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
        Button('开始阅读')
          .fontSize(16)
          .fontColor('#FFFFFF')
          .backgroundColor('#E53E3E')
          .borderRadius(8)
          .layoutWeight(1)
          .height(48)
          .onClick(() => {
            if (this.chapterList.length > 0) {
              this.openChapter(this.chapterList[0]);
            }
          })
        
        Button('查看目录')
          .fontSize(16)
          .fontColor('#E53E3E')
          .backgroundColor('#FFFFFF')
          .border({ width: 1, color: '#E53E3E' })
          .borderRadius(8)
          .layoutWeight(1)
          .height(48)
          .margin({ left: 12 })
          .onClick(() => {
            this.showChapters();
          })
      }
      .width('100%')
      .padding({ left: 16, right: 16, top: 12, bottom: 12 })
      .backgroundColor('#FFFFFF')
      .shadow({
        radius: 4,
        color: '#10000000',
        offsetY: -2
      })
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
        .fontColor('#2D3748')
        .width('100%')
        .textAlign(TextAlign.Start)
        .margin({ bottom: 12 })
      
      Text(this.bookDetail.description)
        .fontSize(14)
        .fontColor('#4A5568')
        .lineHeight(22)
        .width('100%')
        .textAlign(TextAlign.Start)
      }
      .width('100%')
      .padding(20)
      .backgroundColor('#FFFFFF')
      .borderRadius(12)
      .margin({ left: 16, right: 16, top: 16 })
      .shadow({
        radius: 4,
        color: '#10000000',
        offsetY: 2
      })
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
          .fontColor('#2D3748')
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
                  .fontColor('#718096')
                  .width(40)
                
                Text(chapter.title)
                  .fontSize(14)
                  .fontColor('#2D3748')
                  .layoutWeight(1)
                  .maxLines(1)
                  .textOverflow({ overflow: TextOverflow.Ellipsis })
              }
              .width('100%')
              .padding({ left: 12, right: 12, top: 12, bottom: 12 })
              .backgroundColor('#F7FAFC')
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
            .fontColor('#718096')
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
        Column() {
          Progress({ type: ProgressType.Ring, value: 0 })
            .width(40)
            .height(40)
            .color('#E53E3E')
          Text('正在加载书籍详情...')
            .fontSize(14)
            .fontColor('#718096')
            .margin({ top: 12 })
        }
        .width('100%')
        .layoutWeight(1)
        .justifyContent(FlexAlign.Center)
        .backgroundColor('#F7FAFC')
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
                .fontColor('#E53E3E')
                .margin({ bottom: 8 })
              
              Text(this.errorMessage)
                .fontSize(14)
                .fontColor('#4A5568')
                .textAlign(TextAlign.Center)
                .margin({ bottom: 16 })
              
              Button('重试')
                .fontSize(14)
                .fontColor(Color.White)
                .backgroundColor('#E53E3E')
                .borderRadius(20)
                .padding({ left: 20, right: 20, top: 8, bottom: 8 })
                .onClick(() => {
                  this.loadBookDetail();
                })
            }
            .width('100%')
            .padding(20)
            .backgroundColor('#FFFFFF')
            .borderRadius(12)
            .margin({ left: 16, right: 16, top: 16 })
            .shadow({
              radius: 4,
              color: '#10000000',
              offsetY: 2
            })
            
            // 底部间距
            Column()
              .height(80)
          }
        }
        .layoutWeight(1)
        .scrollBar(BarState.Off)
        .backgroundColor('#F7FAFC')
      } else {
        // 书籍详情内容
        Scroll() {
          Column() {
            // 书籍信息卡片
            this.buildBookInfo()
            
            // 简介卡片
            this.buildDescription()
            
            // 底部间距，为底部按钮留出空间
            Column()
              .height(80)
          }
        }
        .layoutWeight(1)
        .scrollBar(BarState.Off)
        .backgroundColor('#F7FAFC')
        
        // 底部操作按钮
        this.buildActionButtons()
      }
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#F7FAFC')
    .bindSheet($$this.showChapterList, this.buildChapterListSheet(), {
      height: 500,
      dragBar: true,
      backgroundColor: Color.White
    })
  }
}

export { BookDetailPage };
