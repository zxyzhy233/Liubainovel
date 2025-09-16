bookParser（书籍解析能力）
==================

更新时间: 2025-09-16 15:26

本模块提供书籍解析的能力，支持对txt、epub、mobi、azw、azw3格式的书籍文件进行解析。通过本地书籍资源的[沙箱路径](https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/app-sandbox-directory)，将书籍基本信息、[书脊](https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/reader-introduction#section2215512152119)内容列表、目录列表和章节内容解析出来。

**起始版本：**5.0.4(16)
导入模块
----

支持设备PhonePC/2in1Tablet

1. import { bookParser } from '@kit.ReaderKit';

BookInfo
--------

支持设备PhonePC/2in1Tablet

书籍基本信息。

**元服务API：**从版本5.0.4(16)开始，该接口支持在元服务中使用。

**系统能力：**SystemCapability.Reader.ReaderService.BookParser

**起始版本：**5.0.4(16)

| **名称**               | **类型**  | 只读  | 可选  | **说明**                                                                                                                                                           |
| -------------------- | ------- | --- | --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| bookTitle            | string  | 否   | 否   | 书籍名称。                                                                                                                                                            |
| bookCreator          | string  | 否   | 是   | 作者。                                                                                                                                                              |
| bookPublishDate      | string  | 否   | 是   | 出版日期。（预留字段，暂不支持。）                                                                                                                                                |
| bookLanguage         | string  | 否   | 是   | 书籍语言。<br><br>* zh_HK：繁体中文，包括台湾繁体及香港繁体。<br>* zh_CN：中文简体。<br>* zh：中文（不支持或非法语言会使用zh作为默认值）。<br>* en_US：英文。                                                           |
| bookCoverImage       | string  | 否   | 是   | 书封图片路径。例如：“OEBPS/images/coverpage.jpg”。                                                                                                                          |
| bookCharset          | string  | 否   | 是   | 书籍内容的字符集，根据书籍编码格式决定，例如："utf-8"。具体支持格式可参考[TextEncoder](https://developer.huawei.com/consumer/cn/doc/harmonyos-references/js-apis-util#textencoder)定义。（预留字段，暂不支持。） |
| bookType             | string  | 否   | 是   | 书籍格式： "txt"、"epub"、"mobi"、"azw"、"azw3"。                                                                                                                          |
| isRtl                | boolean | 否   | 是   | 书籍阅读方向。（预留字段，暂不支持。）<br><br>* true：从右到左排版<br>* false：从左到右排版                                                                                                       |
| renditionLayout      | string  | 否   | 是   | 书籍排版方式。（预留字段，暂不支持。）<br><br>* reflowable：流式排版<br>* pre-paginated：固定版式排版                                                                                           |
| renditionOrientation | string  | 否   | 是   | 横竖屏呈现定义。（预留字段，暂不支持。）<br><br>* landscape：横屏<br>* portrait：竖屏<br>* auto：自适应                                                                                        |
| renditionSpread      | string  | 否   | 是   | 书脊左右页合并场景。（预留字段，暂不支持。）<br><br>* none：不合并分页<br>* landscape：横屏合并<br>* portrait：竖屏时合并<br>* auto：自动适配                                                                |

SpineItem
---------

支持设备PhonePC/2in1Tablet

书脊（spine）内容节点，标识着可阅读的一个内容资源（例如：chapter1.xhtml)。

**元服务API：**从版本5.0.4(16)开始，该接口支持在元服务中使用。

**系统能力：**SystemCapability.Reader.ReaderService.BookParser

**起始版本：**5.0.4(16)

| **名称**     | **类型** | 只读  | 可选  | **说明**                                                                                                   |
| ---------- | ------ | --- | --- | -------------------------------------------------------------------------------------------------------- |
| idRef      | string | 否   | 否   | 内容节点资源标识，唯一标识一个正文内容文件。                                                                                   |
| index      | number | 否   | 否   | 内容资源索引，从0开始顺序取值。                                                                                         |
| href       | string | 否   | 否   | 内容资源在书籍内的引用路径。例如："/OEBPS/Txt/chapter01.xhtml"。                                                           |
| properties | string | 否   | 否   | 当一屏双页展示时，内容节点的呈现方式。（预留字段，暂不支持。）<br><br>* page-spread-left：标识内容在屏幕左侧呈现。<br>* page-spread-right：标识在屏幕右侧呈现。 |

CatalogItem
-----------

支持设备PhonePC/2in1Tablet

书籍目录节点，可用于目录列表的展示。

**元服务API：**从版本5.0.4(16)开始，该接口支持在元服务中使用。

**系统能力：**SystemCapability.Reader.ReaderService.BookParser

**起始版本：**5.0.4(16)

| **名称**       | **类型** | 只读  | 可选  | **说明**                                                                                         |
| ------------ | ------ | --- | --- | ---------------------------------------------------------------------------------------------- |
| catalogId    | number | 否   | 否   | 目录节点Id，从0开始取值。                                                                                 |
| catalogName  | string | 否   | 否   | 目录节点名称。                                                                                        |
| catalogLevel | number | 否   | 是   | 目录节点层级。例如：第一章的目录层级是0，下面有子章节，那子章节的目录层级+1，为1。如果子章节下面还有子章节，则继续+1，为2。开发者根据目录节点顺序及层级，可识别出目录之间的层级关系。 |
| playOrder    | number | 否   | 是   | 目录节点阅读顺序，从0开始取值。（预留字段，暂不支持。）                                                                   |
| idRef        | string | 否   | 是   | 目录节点对应内容资源的标识。（预留字段，暂不支持。）                                                                     |
| href         | string | 否   | 是   | 目录节点带锚点的内容资源路径。                                                                                |
| resourceFile | string | 否   | 是   | 目录节点不带锚点的内容资源路径。以EPUB书籍为例，该字段则标识着资源以/OEBPS为根目录的相对路径。                                           |

说明

CatalogItem与SpineItem的区别在于，CatalogItem对应一个目录节点，而SpineItem对应一个内容资源文件，两者并不总是一一对应的。例如：epub书籍一章下面有3个子章节，那就有4个CatalogItem。但是这4个CatalogItem有可能只对应一个SpineItem文件，两者通过CatalogItem.resourceFile及SpineItem.href进行对应。
CallbackRes
-----------

支持设备PhonePC/2in1Tablet

type CallbackRes<T, V> = (data: T) => V

书籍资源请求回调接口，在排版引擎渲染界面时调用，需配合ReaderComponentController的注册接口[on('resourceRequest')](https://developer.huawei.com/consumer/cn/doc/harmonyos-references/reader-read-core#section169541417131914)使用。如果有自定义背景及字体资源，需要在此返回对应资源。

**元服务API：**从版本5.0.4(16)开始，该接口支持在元服务中使用。

**系统能力：**SystemCapability.Reader.ReaderService.BookParser

**起始版本：**5.0.4(16)

**参数：**

| 参数名  | 类型  | 必填  | 说明                                     |
| ---- | --- | --- | -------------------------------------- |
| data | T   | 是   | 资源请求接口中的参数。例如：获取自定义字体时，该字段代表需要获取字体的名称。 |

**返回值：**

| 类型  | 说明                                           |
| --- | -------------------------------------------- |
| V   | 资源请求接口中的返回值类型。例如：获取自定义字体时，该返回值代表字体文件的二进制数据流。 |

**示例：**

1. import { bookParser, readerCore } from '@kit.ReaderKit';

2. import { hilog } from '@kit.PerformanceAnalysisKit';

3. import { BusinessError } from '@kit.BasicServicesKit';

4. import { common } from '@kit.AbilityKit';

5. private selectFontPath = 'fonts/SourceHanSerifCN-VF.ttf';

6. private async registerListener(){

7. try {

8.  let context = this.getUIContext().getHostContext() as common.UIAbilityContext;

9.  let readerComponentController: readerCore.ReaderComponentController = new readerCore.ReaderComponentController();

10.  await readerComponentController.init(context)

11.  readerComponentController.on('resourceRequest', this.resourceRequest);

12. } catch (err) {

13.  hilog.error(0x0000, 'testTag', `failed to registerListener, Code is ${err.code}, message is ${err.message}`);

14. }

15. }

16. private resourceRequest: bookParser.CallbackRes<string,ArrayBuffer> = (fileName: string): ArrayBuffer => {

17. if (this.isFont(fileName)) {

18.  let res = $rawfile(this.selectFontPath);

19.  let context = this.getUIContext().getHostContext();

20.  if (res && context) {

21.    try {

22.      // 获取资源路径下的字体数据

23.      let value: Uint8Array = context.resourceManager.getRawFileContentSync(this.selectFontPath);

24.      hilog.info(0x0000, 'testTag', 'resourceRequest : get success');

25.      return value.buffer as ArrayBuffer;

26.    } catch (error) {

27.      let code = (error as BusinessError).code;

28.      let message = (error as BusinessError).message;

29.      hilog.error(0x0000, 'testTag', `callback getRawFileContent failed, error code: ${code}, message: ${message}.`);

30.    }

31.  }

32. }

33. return new ArrayBuffer(0);

34. }

35. private isFont(filePath: string): boolean {

36. let options = [".ttf", ".woff2", ".otf"];

37. let path = filePath.toLowerCase();

38. let result = path.indexOf(options[0]) != -1 || path.indexOf(options[1]) != -1 || path.indexOf(options[2]) != -1;

39. hilog.info(0x0000, 'testTag', 'isFont = ' + result);

40. return result;

41. }

getDefaultHandler
-----------------

支持设备PhonePC/2in1Tablet

getDefaultHandler(path: string): Promise<BookParserHandler>

获取书籍默认解析器，并通过Promise方式返回执行的结果。

**元服务API：**从版本5.0.4(16)开始，该接口支持在元服务中使用。

**系统能力：**SystemCapability.Reader.ReaderService.BookParser

**起始版本：**5.0.4(16)

**参数：**

| 参数名  | 类型     | 必填  | 说明                                                                                                              |
| ---- | ------ | --- | --------------------------------------------------------------------------------------------------------------- |
| path | string | 是   | 本地书籍资源路径（仅支持当前应用下的[沙箱路径](https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/app-sandbox-directory)）。 |

**返回值：**

| 类型                                                                                                                                    | 说明                  |
| ------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| Promise<[BookParserHandler](https://developer.huawei.com/consumer/cn/doc/harmonyos-references/reader-book-parser#section59035422210)> | BookParserHandler类。 |

**错误码：**

| 错误码ID                                                                                                                                                          | 错误信息                            |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| [401](https://developer.huawei.com/consumer/cn/doc/harmonyos-references/errorcode-universal#section401-%E5%8F%82%E6%95%B0%E6%A3%80%E6%9F%A5%E5%A4%B1%E8%B4%A5) | Parameter error.                |
| [1017000999](https://developer.huawei.com/consumer/cn/doc/harmonyos-references/reader-error-code#section31031138161116)                                        | Other error.                    |
| [1017010003](https://developer.huawei.com/consumer/cn/doc/harmonyos-references/reader-error-code#section1855956131312)                                         | Book file format is unexpected. |
| [1017010004](https://developer.huawei.com/consumer/cn/doc/harmonyos-references/reader-error-code#section692725412147)                                          | File is not exist.              |

**示例：**

1. import { bookParser } from '@kit.ReaderKit';

2. import { hilog } from '@kit.PerformanceAnalysisKit';

3. private async initBookParser(){

4. try {

5.  // 当前应用下资源的沙箱路径地址

6.  let path: string = './download/ebook/abc.epub';

7.  let bookParserHandler: bookParser.BookParserHandler = await bookParser.getDefaultHandler(path);

8. } catch(err) {

9.  hilog.error(0x0000, 'testTag', `failed to initBookParser, Code is ${err.code}, message is ${err.message}`);

10. }

11. }

BookParserHandler
-----------------

支持设备PhonePC/2in1Tablet

书籍解析接口类。

**元服务API：**从版本5.0.4(16)开始，该接口支持在元服务中使用。

**系统能力：**SystemCapability.Reader.ReaderService.BookParser

**起始版本：**5.0.4(16)

### getBookInfo

支持设备PhonePC/2in1Tablet

getBookInfo(): BookInfo

获取书籍信息。

**元服务API：**从版本5.0.4(16)开始，该接口支持在元服务中使用。

**系统能力：**SystemCapability.Reader.ReaderService.BookParser

**起始版本：**5.0.4(16)

**返回值：**

| 类型                                                                                                                     | 说明      |
| ---------------------------------------------------------------------------------------------------------------------- | ------- |
| [BookInfo](https://developer.huawei.com/consumer/cn/doc/harmonyos-references/reader-book-parser#section38181821125613) | 书籍基本信息。 |

**错误码：**

| 错误码ID                                                                                                                   | 错误信息                            |
| ----------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| [1017000001](https://developer.huawei.com/consumer/cn/doc/harmonyos-references/reader-error-code#section1427915529104)  | Book parser is not initialized. |
| [1017000999](https://developer.huawei.com/consumer/cn/doc/harmonyos-references/reader-error-code#section31031138161116) | Other error.                    |
| [1017010002](https://developer.huawei.com/consumer/cn/doc/harmonyos-references/reader-error-code#section1115195931210)  | Invalid request.                |

**示例：**

1. import { bookParser } from '@kit.ReaderKit';

2. import { hilog } from '@kit.PerformanceAnalysisKit';

3. private async getBookInfo(){

4. try {

5.  // 当前应用下资源的沙箱路径地址

6.  let path: string = './download/ebook/abc.epub';

7.  let bookParserHandler: bookParser.BookParserHandler = await bookParser.getDefaultHandler(path);

8.  let bookInfo: bookParser.BookInfo = bookParserHandler.getBookInfo();

9. } catch(err) {

10.  hilog.error(0x0000, 'testTag', `failed to getBookInfo, Code is ${err.code}, message is ${err.message}`);

11. }

12. }

### getCatalogList

支持设备PhonePC/2in1Tablet

getCatalogList(): CatalogItem[]

获取书籍目录列表。

**元服务API：**从版本5.0.4(16)开始，该接口支持在元服务中使用。

**系统能力：**SystemCapability.Reader.ReaderService.BookParser

**起始版本：**5.0.4(16)

**返回值：**

| 类型                                                                                                                       | 说明      |
| ------------------------------------------------------------------------------------------------------------------------ | ------- |
| [CatalogItem](https://developer.huawei.com/consumer/cn/doc/harmonyos-references/reader-book-parser#section12325515195)[] | 目录节点列表。 |

**错误码：**

| 错误码ID                                                                                                                   | 错误信息                           |
| ----------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| [1017000001](https://developer.huawei.com/consumer/cn/doc/harmonyos-references/reader-error-code#section1427915529104)  | Book parser is not initialized |
| [1017000999](https://developer.huawei.com/consumer/cn/doc/harmonyos-references/reader-error-code#section31031138161116) | Other error                    |
| [1017010002](https://developer.huawei.com/consumer/cn/doc/harmonyos-references/reader-error-code#section1115195931210)  | Invalid request                |

**示例：**

1. import { bookParser } from '@kit.ReaderKit';

2. import { hilog } from '@kit.PerformanceAnalysisKit';

3. private async getCatalogList(){

4. try {

5.  // 当前应用下资源的沙箱路径地址

6.  let path: string = './download/ebook/abc.epub';

7.  let bookParserHandler: bookParser.BookParserHandler = await bookParser.getDefaultHandler(path);

8.  let catalogList: bookParser.CatalogItem[] = bookParserHandler.getCatalogList();

9. } catch(err) {

10.  hilog.error(0x0000, 'testTag', `failed to getCatalogList, Code is ${err.code}, message is ${err.message}`);

11. }

12. }

### getSpineList

支持设备PhonePC/2in1Tablet

getSpineList(): SpineItem[]

获取书脊内容列表。

**元服务API：**从版本5.0.4(16)开始，该接口支持在元服务中使用。

**系统能力：**SystemCapability.Reader.ReaderService.BookParser

**起始版本：**5.0.4(16)

**返回值：**

| 类型                                                                                                                       | 说明      |
| ------------------------------------------------------------------------------------------------------------------------ | ------- |
| [SpineItem](https://developer.huawei.com/consumer/cn/doc/harmonyos-references/reader-book-parser#section1029864651619)[] | 内容节点列表。 |

**错误码：**

| 错误码ID                                                                                                                   | 错误信息                            |
| ----------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| [1017000001](https://developer.huawei.com/consumer/cn/doc/harmonyos-references/reader-error-code#section1427915529104)  | Book parser is not initialized. |
| [1017000999](https://developer.huawei.com/consumer/cn/doc/harmonyos-references/reader-error-code#section31031138161116) | Other error.                    |
| [1017010002](https://developer.huawei.com/consumer/cn/doc/harmonyos-references/reader-error-code#section1115195931210)  | Invalid request.                |

**示例：**

1. import { bookParser } from '@kit.ReaderKit';

2. import { hilog } from '@kit.PerformanceAnalysisKit';

3. private async getSpineList(){

4. try {

5.  // 当前应用下资源的沙箱路径地址

6.  let path: string = './download/ebook/abc.epub';

7.  let bookParserHandler: bookParser.BookParserHandler = await bookParser.getDefaultHandler(path);

8.  let spineList: bookParser.SpineItem[] = bookParserHandler.getSpineList();

9. } catch(err) {

10.  hilog.error(0x0000, 'testTag', `failed to getSpineList, Code is ${err.code}, message is ${err.message}`);

11. }

12. }

### getSpineItemContent

支持设备PhonePC/2in1Tablet

getSpineItemContent(spineIndex: number): Promise<string>

获取单个书脊资源里的内容，当排版引擎获取资源文件对应内容时会调用。如果不需要自定义排版引擎，开发者不需要关注。

**元服务API：**从版本5.0.4(16)开始，该接口支持在元服务中使用。

**系统能力：**SystemCapability.Reader.ReaderService.BookParser

**起始版本：**5.0.4(16)

**参数：**

| 参数名        | 类型     | 必填  | 说明                                                                                                                                  |
| ---------- | ------ | --- | ----------------------------------------------------------------------------------------------------------------------------------- |
| spineIndex | number | 是   | 内容资源索引[SpineItem](https://developer.huawei.com/consumer/cn/doc/harmonyos-references/reader-book-parser#section1029864651619).index。 |

**返回值：**

| 类型              | 说明        |
| --------------- | --------- |
| Promise<string> | 单个书脊内容字串。 |

**错误码：**

| 错误码ID                                                                                                                                                          | 错误信息                                                                                      |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| [401](https://developer.huawei.com/consumer/cn/doc/harmonyos-references/errorcode-universal#section401-%E5%8F%82%E6%95%B0%E6%A3%80%E6%9F%A5%E5%A4%B1%E8%B4%A5) | Parameter error. Possible causes: 1.Incorrect parameter types; 2. Parameter out of range. |
| [1017000001](https://developer.huawei.com/consumer/cn/doc/harmonyos-references/reader-error-code#section1427915529104)                                         | Book parser is not initialized.                                                           |
| [1017000999](https://developer.huawei.com/consumer/cn/doc/harmonyos-references/reader-error-code#section31031138161116)                                        | Other error.                                                                              |
| [1017010001](https://developer.huawei.com/consumer/cn/doc/harmonyos-references/reader-error-code#section19552151617126)                                        | Invalid spine item.                                                                       |
| [1017010002](https://developer.huawei.com/consumer/cn/doc/harmonyos-references/reader-error-code#section1115195931210)                                         | Invalid request.                                                                          |

**示例：**

1. import { bookParser } from '@kit.ReaderKit';

2. import { hilog } from '@kit.PerformanceAnalysisKit';

3. private async getSpineItemContent(){

4. try {

5.  // 当前应用下资源的沙箱路径地址

6.  let path: string = './download/ebook/abc.epub';

7.  let bookParserHandler: bookParser.BookParserHandler = await bookParser.getDefaultHandler(path);

8.  let spineList: bookParser.SpineItem[] = bookParserHandler.getSpineList();

9.  let spineItemContent: string = await bookParserHandler.getSpineItemContent(spineList[0].index);

10. } catch(err) {

11.  hilog.error(0x0000, 'testTag', `failed to getSpineItemContent, Code is ${err.code}, message is ${err.message}`);

12. }

13. }

### getResourceContent

支持设备PhonePC/2in1Tablet

getResourceContent(spineIndex: number, filePath: string): ArrayBuffer

获取书籍内容资源。

说明

开发者通过此接口可获取书封资源。同时排版引擎获取书籍里的图片等资源时，会优先调用该方法，如果获取不到资源会继续调用[on('resourceRequest')](https://developer.huawei.com/consumer/cn/doc/harmonyos-references/reader-read-core#section169541417131914)获取资源。

**元服务API：**从版本5.0.4(16)开始，该接口支持在元服务中使用。

**系统能力：**SystemCapability.Reader.ReaderService.BookParser

**起始版本：**5.0.4(16)

**参数：**

| 参数名        | 类型     | 必填  | 说明                                                                                                                                                   |
| ---------- | ------ | --- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| spineIndex | number | 是   | 内容资源索引[SpineItem](https://developer.huawei.com/consumer/cn/doc/harmonyos-references/reader-book-parser#section1029864651619).index。如果传负数，如-1，代表获取书封。 |
| filePath   | string | 是   | 书籍中资源的路径。                                                                                                                                            |

**返回值：**

| 类型          | 说明          |
| ----------- | ----------- |
| ArrayBuffer | 返回文件的二进制数据。 |

**错误码：**

| 错误码ID                                                                                                                                                          | 错误信息                                                                                      |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| [401](https://developer.huawei.com/consumer/cn/doc/harmonyos-references/errorcode-universal#section401-%E5%8F%82%E6%95%B0%E6%A3%80%E6%9F%A5%E5%A4%B1%E8%B4%A5) | Parameter error. Possible causes: 1.Incorrect parameter types; 2. Parameter out of range. |
| [1017000001](https://developer.huawei.com/consumer/cn/doc/harmonyos-references/reader-error-code#section1427915529104)                                         | Book parser is not initialized.                                                           |
| [1017000999](https://developer.huawei.com/consumer/cn/doc/harmonyos-references/reader-error-code#section31031138161116)                                        | Other error.                                                                              |
| [1017010001](https://developer.huawei.com/consumer/cn/doc/harmonyos-references/reader-error-code#section19552151617126)                                        | Invalid spine item.                                                                       |
| [1017010002](https://developer.huawei.com/consumer/cn/doc/harmonyos-references/reader-error-code#section1115195931210)                                         | Invalid request.                                                                          |

**示例：**

1. import { bookParser } from '@kit.ReaderKit';

2. import { hilog } from '@kit.PerformanceAnalysisKit';

3. private async getResourceContent(){

4. try {

5.  // 当前应用下资源的沙箱路径地址

6.  let path: string = './download/ebook/abc.epub';

7.  let bookParserHandler: bookParser.BookParserHandler = await bookParser.getDefaultHandler(path);

8.  let filePath = '../images/xxxxxx.jpg'

9.  let spineList: bookParser.SpineItem[] = bookParserHandler.getSpineList();

10.  let resourceContent: ArrayBuffer = bookParserHandler.getResourceContent(spineList[0].index, filePath);

11. } catch(err) {

12.  hilog.error(0x0000, 'testTag', `failed to getResourceContent, Code is ${err.code}, message is ${err.message}`);

13. }

14. }

### getDomPosByCatalogHref

支持设备PhonePC/2in1Tablet

getDomPosByCatalogHref(href: string): string

获取阅读起始位置domPos，可用于阅读进度标识（例如：跳转到指定阅读位置）。

**元服务API：**从版本5.0.4(16)开始，该接口支持在元服务中使用。

**系统能力：**SystemCapability.Reader.ReaderService.BookParser

**起始版本：**5.0.4(16)

**参数：**

| 参数名  | 类型     | 必填  | 说明                                                                                                                                         |
| ---- | ------ | --- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| href | string | 是   | 目录节点带锚点的内容资源路径[CatalogItem](https://developer.huawei.com/consumer/cn/doc/harmonyos-references/reader-book-parser#section12325515195).href。 |

**返回值：**

| 类型     | 说明           |
| ------ | ------------ |
| string | 章节的domPos信息。 |

**错误码：**

| 错误码ID                                                                                                                                                          | 错误信息                                                                                      |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| [401](https://developer.huawei.com/consumer/cn/doc/harmonyos-references/errorcode-universal#section401-%E5%8F%82%E6%95%B0%E6%A3%80%E6%9F%A5%E5%A4%B1%E8%B4%A5) | Parameter error. Possible causes: 1.Incorrect parameter types; 2. Parameter out of range. |
| [1017000001](https://developer.huawei.com/consumer/cn/doc/harmonyos-references/reader-error-code#section1427915529104)                                         | Book parser is not initialized.                                                           |
| [1017000999](https://developer.huawei.com/consumer/cn/doc/harmonyos-references/reader-error-code#section31031138161116)                                        | Other error.                                                                              |
| [1017010002](https://developer.huawei.com/consumer/cn/doc/harmonyos-references/reader-error-code#section1115195931210)                                         | Invalid request.                                                                          |

**示例：**

1. import { bookParser } from '@kit.ReaderKit';

2. import { hilog } from '@kit.PerformanceAnalysisKit';

3. private async getDomPosByCatalogHref(){

4. try {

5.  // 当前应用下资源的沙箱路径地址

6.  let path: string = './download/ebook/abc.epub';

7.  let bookParserHandler: bookParser.BookParserHandler = await bookParser.getDefaultHandler(path);

8.  let catalogList: bookParser.CatalogItem[] = bookParserHandler.getCatalogList();

9.  let href = catalogList[1]?.href || '';

10.  let domPos: string = bookParserHandler.getDomPosByCatalogHref(href);

11. } catch(err) {

12.  hilog.error(0x0000, 'testTag', `failed to getDomPosByCatalogHref, Code is ${err.code}, message is ${err.message}`);

13. }

14. }

### getAbsoluteResourcePath

支持设备PhonePC/2in1Tablet

getAbsoluteResourcePath(spineIndex: number): string

获取资源的完整文件路径。

说明

此方法一般为排版引擎渲染资源时调用，如果不需要自定义排版引擎，开发者不需要关注。

**元服务API：**从版本5.0.4(16)开始，该接口支持在元服务中使用。

**系统能力：**SystemCapability.Reader.ReaderService.BookParser

**起始版本：**5.0.4(16)

**参数：**

| 参数名        | 类型     | 必填  | 说明                                                                                                                                  |
| ---------- | ------ | --- | ----------------------------------------------------------------------------------------------------------------------------------- |
| spineIndex | number | 是   | 内容资源索引[SpineItem](https://developer.huawei.com/consumer/cn/doc/harmonyos-references/reader-book-parser#section1029864651619).index。 |

**返回值：**

| 类型     | 说明      |
| ------ | ------- |
| string | 资源的完整路径 |

**错误码：**

| 错误码ID                                                                                                                                                          | 错误信息                                                                                      |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| [401](https://developer.huawei.com/consumer/cn/doc/harmonyos-references/errorcode-universal#section401-%E5%8F%82%E6%95%B0%E6%A3%80%E6%9F%A5%E5%A4%B1%E8%B4%A5) | Parameter error. Possible causes: 1.Incorrect parameter types; 2. Parameter out of range. |
| [1017000001](https://developer.huawei.com/consumer/cn/doc/harmonyos-references/reader-error-code#section1427915529104)                                         | Book parser is not initialized.                                                           |
| [1017000999](https://developer.huawei.com/consumer/cn/doc/harmonyos-references/reader-error-code#section31031138161116)                                        | Other error.                                                                              |
| [1017010002](https://developer.huawei.com/consumer/cn/doc/harmonyos-references/reader-error-code#section1115195931210)                                         | Invalid request.                                                                          |
| [1017010004](https://developer.huawei.com/consumer/cn/doc/harmonyos-references/reader-error-code#section692725412147)                                          | File is not exist.                                                                        |

**示例：**

1. import { bookParser } from '@kit.ReaderKit';

2. import { hilog } from '@kit.PerformanceAnalysisKit';

3. private async getAbsoluteResourcePath(){

4. try {

5.  // 当前应用下资源的沙箱路径地址

6.  let path: string = './download/ebook/abc.epub';

7.  let bookParserHandler: bookParser.BookParserHandler = await bookParser.getDefaultHandler(path);

8.  let spineList: bookParser.SpineItem[] = bookParserHandler.getSpineList();

9.  let resourcePath: string = bookParserHandler.getAbsoluteResourcePath(spineList[0].index);

10. } catch(err) {

11.  hilog.error(0x0000, 'testTag', `failed to getAbsoluteResourcePath, Code is ${err.code}, message is ${err.message}`);

12. }

13. }
