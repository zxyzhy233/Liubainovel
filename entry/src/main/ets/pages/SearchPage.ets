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

import { BookInfo } from '../common/BookInfo';
import { bookDataManager } from '../utils/BookDataManager';
import { OnlineBookInfo } from '../models/OnlineBookModel';
import { onlineBookDataManager } from '../utils/OnlineBookDataManager';
import { hilog } from '@kit.PerformanceAnalysisKit';
import { common } from '@kit.AbilityKit';

const TAG: string = 'SearchPage';

@Entry
@Component
struct SearchPage {
  @State searchText: string = '';
  @State searchResult: BookInfo[] = [];
  @State onlineSearchResult: OnlineBookInfo[] = [];

  build() {
    Column() {
      Row({ space: 16 }) {
        TextInput({ placeholder: '请输入书名进行搜索', text: this.searchText })
          .layoutWeight(1)
          .onChange((value: string) => {
            this.searchText = value;
            this.searchBooks();
          })

        Text('取消')
          .fontSize(16)
          .fontColor($r('app.color.blue'))
          .onClick(() => {
            this.getUIContext().getRouter().back();
          })
      }
      .width('100%')
      .height(56)
      .padding({ left: 16, right: 16 })
      .margin({ top: 44 })
      .justifyContent(FlexAlign.SpaceBetween)
      .alignItems(VerticalAlign.Center)

      if (this.searchResult.length === 0 && this.onlineSearchResult.length === 0 && this.searchText) {
        Column() {
          Text('📚')
            .fontSize(48)
            .margin({ bottom: 12 })
          Text('未找到相关书籍')
            .fontSize(14)
            .fontColor('#718096')
        }
        .width('100%')
        .layoutWeight(1)
        .justifyContent(FlexAlign.Center)
      } else {
        List() {
          // 本地书籍搜索结果
          if (this.searchResult.length > 0) {
            ListItem() {
              Text('本地书籍')
                .fontSize(14)
                .fontColor('#718096')
                .fontWeight(FontWeight.Medium)
                .padding({ left: 16, top: 12, bottom: 8 })
            }
          }

          ForEach(this.searchResult, (book: BookInfo) => {
            ListItem() {
              Row() {
                Column() {
                  Text(book.bookName)
                    .fontSize(16)
                    .fontWeight(FontWeight.Medium)
                    .fontColor('#2D3748')
                    .maxLines(1)
                    .textOverflow({ overflow: TextOverflow.Ellipsis })
                  
                  if (book.author) {
                    Text(book.author)
                      .fontSize(12)
                      .fontColor('#A0AEC0')
                      .margin({ top: 4 })
                  }
                }
                .alignItems(HorizontalAlign.Start)
                .layoutWeight(1)

                Text('本地')
                  .fontSize(12)
                  .fontColor('#48BB78')
                  .padding({ left: 8, right: 8, top: 4, bottom: 4 })
                  .backgroundColor('#F0FFF4')
                  .borderRadius(4)
              }
              .width('100%')
              .padding(16)
              .backgroundColor('#FFFFFF')
            }
            .onClick(() => {
              // 跳转到本地书籍阅读页面
              this.getUIContext().getRouter().pushUrl({
                url: 'pages/Reader',
                params: {
                  bookId: book.id
                }
              });
            })
          })

          // 在线书籍搜索结果
          if (this.onlineSearchResult.length > 0) {
            ListItem() {
              Text('在线书籍')
                .fontSize(14)
                .fontColor('#718096')
                .fontWeight(FontWeight.Medium)
                .padding({ left: 16, top: 16, bottom: 8 })
            }
          }

          ForEach(this.onlineSearchResult, (book: OnlineBookInfo) => {
            ListItem() {
              Row() {
                Column() {
                  Text(book.title)
                    .fontSize(16)
                    .fontWeight(FontWeight.Medium)
                    .fontColor('#2D3748')
                    .maxLines(1)
                    .textOverflow({ overflow: TextOverflow.Ellipsis })
                  
                  Row({ space: 8 }) {
                    if (book.author) {
                      Text(book.author)
                        .fontSize(12)
                        .fontColor('#A0AEC0')
                    }
                    
                    if (book.currentChapter) {
                      Text(`读至: ${book.currentChapter}`)
                        .fontSize(12)
                        .fontColor('#718096')
                    }
                  }
                  .margin({ top: 4 })
                }
                .alignItems(HorizontalAlign.Start)
                .layoutWeight(1)

                Text('在线')
                  .fontSize(12)
                  .fontColor('#4299E1')
                  .padding({ left: 8, right: 8, top: 4, bottom: 4 })
                  .backgroundColor('#EBF8FF')
                  .borderRadius(4)
              }
              .width('100%')
              .padding(16)
              .backgroundColor('#FFFFFF')
            }
            .onClick(() => {
              // 跳转到在线书籍详情页面，传递必要的参数
              this.getUIContext().getRouter().pushUrl({
                url: 'pages/BookDetailPage',
                params: {
                  bookUrl: book.bookUrl,
                  bookTitle: book.title,
                  bookAuthor: book.author,
                  bookCover: book.cover
                }
              });
            })
          })
        }
        .layoutWeight(1)
        .divider({
          strokeWidth: 1,
          color: '#F7FAFC'
        })
      }
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#F7FAFC')
  }

  /**
   * 搜索书籍（包括本地书籍和在线书籍）
   */
  async searchBooks(): Promise<void> {
    if (this.searchText) {
      try {
        // 搜索本地书籍
        this.searchResult = await bookDataManager.queryBooksByName(this.searchText);
        
        // 搜索在线书籍
        await this.searchOnlineBooks();
      } catch (error) {
        hilog.error(0x0000, TAG, 'searchBooks failed, error is: ' + error);
      }
    } else {
      this.searchResult = [];
      this.onlineSearchResult = [];
    }
  }

  /**
   * 搜索在线书籍
   */
  async searchOnlineBooks(): Promise<void> {
    try {
      // 初始化在线书籍数据管理器
      const context = this.getUIContext().getHostContext() as common.UIAbilityContext;
      await onlineBookDataManager.init(context);
      
      // 获取所有在线书籍
      const allOnlineBooks = await onlineBookDataManager.queryAllOnlineBooks();
      
      // 根据书名筛选
      const keyword = this.searchText.toLowerCase();
      this.onlineSearchResult = allOnlineBooks.filter((book: OnlineBookInfo) => {
        return book.title.toLowerCase().includes(keyword) || 
               (book.author && book.author.toLowerCase().includes(keyword));
      });
      
      hilog.info(0x0000, TAG, `搜索到 ${this.onlineSearchResult.length} 本在线书籍`);
    } catch (error) {
      hilog.error(0x0000, TAG, 'searchOnlineBooks failed, error is: ' + error);
      this.onlineSearchResult = [];
    }
  }
}
