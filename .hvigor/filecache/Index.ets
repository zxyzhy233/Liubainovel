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
import { readerCore } from '@kit.ReaderKit';
import { hilog } from '@kit.PerformanceAnalysisKit';
import { BookUtils } from '../utils/BookUtils';
import { common } from '@kit.AbilityKit';
import { bookDataManager } from '../utils/BookDataManager';
import { BookInfo } from '../common/BookInfo';

const TAG: string = 'IndexPage';

@Component
struct Index {
  @State books: BookInfo[] = [];
  @State searchText: string = '';
  /**
   * Page data information, used here to get the reading progress of the book
   */
  @StorageLink('currentData') currentData: readerCore.PageDataInfo | null = null;
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
      newBook.coverPath = ''; // Temporarily empty
      newBook.lastReadTime = new Date().getTime();
      await bookDataManager.insertBook(newBook);
      await this.loadBooksFromDB(); // Refresh the bookshelf
      hilog.info(0x0000, TAG, 'loadBook bookParserInfo parse succeeded,dest path is: ' + newBook.filePath);
      this.getUIContext()
        .getPromptAction()
        .showToast({ message: $r('app.string.import_successful_tips'), duration: 2000 });
      this.currentData = null;
    } catch (err) {
      hilog.error(0x0000, TAG, 'loadBook failed, error is: ' + err);
    }
  }

  build() {
    Column() {
      Row() {
        Row({ space: 16 }) {
          Image($r('app.media.sousuo'))
            .width(36)
            .height(36)
            .onClick(() => {
              this.getUIContext().getRouter().pushUrl({ url: 'pages/SearchPage' });
            })

          Image($r('app.media.xuanx'))
            .width(36)
            .height(36)
            .onClick(() => {
              this.showMenu();
            })
        }
      }
      .width('100%')
      .height(56)
      .padding({ left: 16, right: 16 })
      .margin({ top: 44 })
      .justifyContent(FlexAlign.End)
      .alignItems(VerticalAlign.Center)

      Grid() {
        ForEach(this.books, (book: BookInfo) => {
          GridItem() {
            Column({ space: 8 }) {
              Image(book.coverPath || $r('app.media.zwfm'))
                .width('100%')
                .aspectRatio(0.75)
                .borderRadius(8)
                .backgroundColor($r('app.color.black_5_opacity'))
              Text(book.bookName)
                .fontSize(14)
                .maxLines(2)
                .textOverflow({ overflow: TextOverflow.Ellipsis })
            }
            .padding(8)
            .onClick(() => {
              this.jumper(book);
            })
          }
        })
      }
      .columnsTemplate('1fr 1fr 1fr')
      .columnsGap(16)
      .rowsGap(16)
      .layoutWeight(1)
      .padding({ top: 20 })
    }
    .height('100%')
    .width('100%')
    .backgroundColor($r('app.color.page_background'))
    .padding({ left: 16, right: 16 })
  }

  private showMenu() {
    this.getUIContext().getPromptAction().showActionMenu({
      menuItems: [
        {
          title: '切换显示模式'
        },
        {
          title: '添加本地'
        },
        {
          title: '书架管理'
        },
        {
          title: '导出书单'
        },
        {
          title: '导入书单'
        }
      ]
    }).then((result) => {
      if (result.index === 1) {
        this.loadBook();
      }
    })
  }

  private jumper(book: BookInfo) {
    if (!book.filePath) {
      return;
    }
    AppStorage.setOrCreate('filePath', book.filePath);
    this.getUIContext().getRouter().pushUrl({
      url: "pages/Reader", params: {
        filePath: book.filePath,
        resourceIndex: book.resourceIndex,
        domPos: book.domPos || ''
      }
    })
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
