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
import { hilog } from '@kit.PerformanceAnalysisKit';

const TAG: string = 'SearchPage';

@Entry
@Component
struct SearchPage {
  @State searchText: string = '';
  @State searchResult: BookInfo[] = [];

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

      List() {
        ForEach(this.searchResult, (book: BookInfo) => {
          ListItem() {
            Text(book.bookName)
              .fontSize(16)
              .padding(16)
          }
        })
      }
      .layoutWeight(1)
    }
    .width('100%')
    .height('100%')
  }

  async searchBooks() {
    if (this.searchText) {
      try {
        this.searchResult = await bookDataManager.queryBooksByName(this.searchText);
      } catch (error) {
        hilog.error(0x0000, TAG, 'searchBooks failed, error is: ' + error);
      }
    } else {
      this.searchResult = [];
    }
  }
}
