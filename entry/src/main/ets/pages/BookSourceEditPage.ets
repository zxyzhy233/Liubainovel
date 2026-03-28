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

const TAG: string = 'BookSourceEditPage';

/**
 * 鹿析规则接口
 */
interface BookSourceRule {
  author?: string;
  bookList?: string;
  bookUrl?: string;
  coverUrl?: string;
  intro?: string;
  kind?: string;
  lastChapter?: string;
  name?: string;
  wordCount?: string;
  checkKeyWord?: string;
  chapterList?: string;
  chapterName?: string;
  chapterUrl?: string;
  nextTocUrl?: string;
  content?: string;
  nextContentUrl?: string;
  replaceRegex?: string;
  tocUrl?: string;
  init?: string;
  status?: string;
  updateTime?: string;
  // JSON API 相关字段
  apiUrl?: string;
  apiBookPath?: string;
  apiChapterListPath?: string;
  apiChapterPath?: string;
  jsonTitle?: string;
  jsonAuthor?: string;
  jsonIntro?: string;
  jsonCover?: string;
  jsonCategory?: string;
  jsonStatus?: string;
  jsonLastChapter?: string;
  jsonUpdateTime?: string;
  jsonChapterList?: string;
  jsonChapterName?: string;
  jsonContent?: string;
}

/**
 * 完整鹿析信息接口
 */
interface BookSourceInfo {
  bookSourceName: string;
  bookSourceUrl: string;
  bookSourceGroup: string;
  bookSourceComment: string;
  bookSourceType: number;
  enabled: boolean;
  enabledCookieJar: boolean;
  enabledExplore: boolean;
  enabledReview: boolean;
  header: string;
  searchUrl: string;
  exploreUrl: string;
  bookUrlPattern: string;
  ruleSearch: BookSourceRule;
  ruleExplore: BookSourceRule;
  ruleBookInfo: BookSourceRule;
  ruleToc: BookSourceRule;
  ruleContent: BookSourceRule;
  ruleReview: BookSourceRule;
  weight: number;
  customOrder: number;
  lastUpdateTime?: number;
  respondTime?: number;
  loginUrl?: string;
  concurrentRate?: string;
  loginCheckJs?: string;
  loginUi?: string;
  variableComment?: string;
}

/**
 * 页面参数接口
 */
interface PageParams {
  isEdit?: boolean;
  sourceData?: BookSourceInfo;
}

@Entry
@ComponentV2
struct BookSourceEditPage {
  @Local isEdit: boolean = false; // 是否为编辑模式
  @Local currentTab: number = 0; // 当前选中的标签页
  
  // 基本信息
  @Local bookSourceName: string = '';
  @Local bookSourceUrl: string = '';
  @Local bookSourceGroup: string = '';
  @Local bookSourceComment: string = '';
  @Local bookSourceType: number = 0;
  @Local sourceEnabled: boolean = true;
  @Local enabledCookieJar: boolean = true;
  @Local enabledExplore: boolean = true;
  @Local enabledReview: boolean = false;
  @Local header: string = '';
  @Local searchUrl: string = '';
  @Local exploreUrl: string = '';
  @Local bookUrlPattern: string = '';
  @Local weight: number = 0;
  @Local customOrder: number = 0;
  
  // 搜索规则
  @Local searchAuthor: string = '';
  @Local searchBookList: string = '';
  @Local searchBookUrl: string = '';
  @Local searchCoverUrl: string = '';
  @Local searchName: string = '';
  @Local searchLastChapter: string = '';
  @Local searchKind: string = '';
  @Local searchWordCount: string = '';
  @Local searchCheckKeyWord: string = '';
  
  // 发现规则
  @Local exploreAuthor: string = '';
  @Local exploreBookList: string = '';
  @Local exploreBookUrl: string = '';
  @Local exploreCoverUrl: string = '';
  @Local exploreName: string = '';
  @Local exploreLastChapter: string = '';
  @Local exploreKind: string = '';
  @Local exploreWordCount: string = '';
  
  // 书籍信息规则
  @Local bookInfoAuthor: string = '';
  @Local bookInfoCoverUrl: string = '';
  @Local bookInfoIntro: string = '';
  @Local bookInfoKind: string = '';
  @Local bookInfoLastChapter: string = '';
  @Local bookInfoName: string = '';
  @Local bookInfoTocUrl: string = '';
  @Local bookInfoWordCount: string = '';
  @Local bookInfoInit: string = '';
  
  // 目录规则
  @Local tocChapterList: string = '';
  @Local tocChapterName: string = '';
  @Local tocChapterUrl: string = '';
  @Local tocNextTocUrl: string = '';
  
  // 内容规则
  @Local contentContent: string = '';
  @Local contentNextContentUrl: string = '';
  @Local contentReplaceRegex: string = '';

  // JSON API 字段 - 书籍信息
  @Local bookInfoApiUrl: string = '';
  @Local bookInfoApiBookPath: string = '';
  @Local bookInfoJsonTitle: string = '';
  @Local bookInfoJsonAuthor: string = '';
  @Local bookInfoJsonIntro: string = '';
  @Local bookInfoJsonCover: string = '';
  @Local bookInfoJsonCategory: string = '';
  @Local bookInfoJsonStatus: string = '';
  @Local bookInfoJsonLastChapter: string = '';
  @Local bookInfoJsonUpdateTime: string = '';

  // JSON API 字段 - 目录规则
  @Local tocApiUrl: string = '';
  @Local tocApiChapterListPath: string = '';
  @Local tocJsonChapterList: string = '';
  @Local tocJsonChapterName: string = '';

  // JSON API 字段 - 内容规则
  @Local contentApiUrl: string = '';
  @Local contentApiChapterPath: string = '';
  @Local contentJsonContent: string = '';

  /**
   * 页面显示时初始化数据
   */
  async aboutToAppear() {
    try {
      const params = router.getParams() as PageParams;
      if (params) {
        this.isEdit = params.isEdit || false;
        if (this.isEdit && params.sourceData) {
          this.loadSourceData(params.sourceData);
        }
      }
      hilog.info(0x0000, TAG, `页面初始化完成，编辑模式: ${this.isEdit}`);
    } catch (error) {
      hilog.error(0x0000, TAG, '页面初始化失败: ' + JSON.stringify(error));
    }
  }

  /**
   * 加载鹿析数据到表单
   * @param sourceData 鹿析数据
   */
  private loadSourceData(sourceData: BookSourceInfo): void {
    // 基本信息
    this.bookSourceName = sourceData.bookSourceName || '';
    this.bookSourceUrl = sourceData.bookSourceUrl || '';
    this.bookSourceGroup = sourceData.bookSourceGroup || '';
    this.bookSourceComment = sourceData.bookSourceComment || '';
    this.bookSourceType = sourceData.bookSourceType || 0;
    this.sourceEnabled = sourceData.enabled !== false;
    this.enabledCookieJar = sourceData.enabledCookieJar !== false;
    this.enabledExplore = sourceData.enabledExplore !== false;
    this.enabledReview = sourceData.enabledReview || false;
    this.header = sourceData.header || '';
    this.searchUrl = sourceData.searchUrl || '';
    this.exploreUrl = sourceData.exploreUrl || '';
    this.bookUrlPattern = sourceData.bookUrlPattern || '';
    this.weight = sourceData.weight || 0;
    this.customOrder = sourceData.customOrder || 0;
    
    // 搜索规则
    if (sourceData.ruleSearch) {
      this.searchAuthor = sourceData.ruleSearch.author || '';
      this.searchBookList = sourceData.ruleSearch.bookList || '';
      this.searchBookUrl = sourceData.ruleSearch.bookUrl || '';
      this.searchCoverUrl = sourceData.ruleSearch.coverUrl || '';
      this.searchName = sourceData.ruleSearch.name || '';
      this.searchLastChapter = sourceData.ruleSearch.lastChapter || '';
      this.searchKind = sourceData.ruleSearch.kind || '';
      this.searchWordCount = sourceData.ruleSearch.wordCount || '';
      this.searchCheckKeyWord = sourceData.ruleSearch.checkKeyWord || '';
    }
    
    // 发现规则
    if (sourceData.ruleExplore) {
      this.exploreAuthor = sourceData.ruleExplore.author || '';
      this.exploreBookList = sourceData.ruleExplore.bookList || '';
      this.exploreBookUrl = sourceData.ruleExplore.bookUrl || '';
      this.exploreCoverUrl = sourceData.ruleExplore.coverUrl || '';
      this.exploreName = sourceData.ruleExplore.name || '';
      this.exploreLastChapter = sourceData.ruleExplore.lastChapter || '';
      this.exploreKind = sourceData.ruleExplore.kind || '';
      this.exploreWordCount = sourceData.ruleExplore.wordCount || '';
    }
    
    // 书籍信息规则
    if (sourceData.ruleBookInfo) {
      this.bookInfoAuthor = sourceData.ruleBookInfo.author || '';
      this.bookInfoCoverUrl = sourceData.ruleBookInfo.coverUrl || '';
      this.bookInfoIntro = sourceData.ruleBookInfo.intro || '';
      this.bookInfoKind = sourceData.ruleBookInfo.kind || '';
      this.bookInfoLastChapter = sourceData.ruleBookInfo.lastChapter || '';
      this.bookInfoName = sourceData.ruleBookInfo.name || '';
      this.bookInfoTocUrl = sourceData.ruleBookInfo.tocUrl || '';
      this.bookInfoWordCount = sourceData.ruleBookInfo.wordCount || '';
      this.bookInfoInit = sourceData.ruleBookInfo.init || '';
    }
    
    // 目录规则
    if (sourceData.ruleToc) {
      this.tocChapterList = sourceData.ruleToc.chapterList || '';
      this.tocChapterName = sourceData.ruleToc.chapterName || '';
      this.tocChapterUrl = sourceData.ruleToc.chapterUrl || '';
      this.tocNextTocUrl = sourceData.ruleToc.nextTocUrl || '';
    }
    
    // 内容规则
    if (sourceData.ruleContent) {
      this.contentContent = sourceData.ruleContent.content || '';
      this.contentNextContentUrl = sourceData.ruleContent.nextContentUrl || '';
      this.contentReplaceRegex = sourceData.ruleContent.replaceRegex || '';
      // JSON API 字段
      this.contentApiUrl = sourceData.ruleContent.apiUrl || '';
      this.contentApiChapterPath = sourceData.ruleContent.apiChapterPath || '';
      this.contentJsonContent = sourceData.ruleContent.jsonContent || '';
    }

    // JSON API 字段 - 书籍信息
    if (sourceData.ruleBookInfo) {
      this.bookInfoApiUrl = sourceData.ruleBookInfo.apiUrl || '';
      this.bookInfoApiBookPath = sourceData.ruleBookInfo.apiBookPath || '';
      this.bookInfoJsonTitle = sourceData.ruleBookInfo.jsonTitle || '';
      this.bookInfoJsonAuthor = sourceData.ruleBookInfo.jsonAuthor || '';
      this.bookInfoJsonIntro = sourceData.ruleBookInfo.jsonIntro || '';
      this.bookInfoJsonCover = sourceData.ruleBookInfo.jsonCover || '';
      this.bookInfoJsonCategory = sourceData.ruleBookInfo.jsonCategory || '';
      this.bookInfoJsonStatus = sourceData.ruleBookInfo.jsonStatus || '';
      this.bookInfoJsonLastChapter = sourceData.ruleBookInfo.jsonLastChapter || '';
      this.bookInfoJsonUpdateTime = sourceData.ruleBookInfo.jsonUpdateTime || '';
    }

    // JSON API 字段 - 目录规则
    if (sourceData.ruleToc) {
      this.tocApiUrl = sourceData.ruleToc.apiUrl || '';
      this.tocApiChapterListPath = sourceData.ruleToc.apiChapterListPath || '';
      this.tocJsonChapterList = sourceData.ruleToc.jsonChapterList || '';
      this.tocJsonChapterName = sourceData.ruleToc.jsonChapterName || '';
    }
  }

  /**
   * 保存鹿析数据
   */
  private saveBookSource(): void {
    // 验证必填字段
    if (!this.bookSourceName.trim()) {
      hilog.warn(0x0000, TAG, '鹿析名称不能为空');
      return;
    }
    if (!this.bookSourceUrl.trim()) {
      hilog.warn(0x0000, TAG, '鹿析URL不能为空');
      return;
    }
    
    // 构建鹿析数据
    const sourceData: BookSourceInfo = {
      bookSourceName: this.bookSourceName.trim(),
      bookSourceUrl: this.bookSourceUrl.trim(),
      bookSourceGroup: this.bookSourceGroup.trim(),
      bookSourceComment: this.bookSourceComment.trim(),
      bookSourceType: this.bookSourceType,
      enabled: this.sourceEnabled,
      enabledCookieJar: this.enabledCookieJar,
      enabledExplore: this.enabledExplore,
      enabledReview: this.enabledReview,
      header: this.header.trim(),
      searchUrl: this.searchUrl.trim(),
      exploreUrl: this.exploreUrl.trim(),
      bookUrlPattern: this.bookUrlPattern.trim(),
      weight: this.weight,
      customOrder: this.customOrder,
      lastUpdateTime: Date.now(),
      respondTime: 0,
      ruleSearch: {
        author: this.searchAuthor.trim(),
        bookList: this.searchBookList.trim(),
        bookUrl: this.searchBookUrl.trim(),
        coverUrl: this.searchCoverUrl.trim(),
        name: this.searchName.trim(),
        lastChapter: this.searchLastChapter.trim(),
        kind: this.searchKind.trim(),
        wordCount: this.searchWordCount.trim(),
        checkKeyWord: this.searchCheckKeyWord.trim()
      },
      ruleExplore: {
        author: this.exploreAuthor.trim(),
        bookList: this.exploreBookList.trim(),
        bookUrl: this.exploreBookUrl.trim(),
        coverUrl: this.exploreCoverUrl.trim(),
        name: this.exploreName.trim(),
        lastChapter: this.exploreLastChapter.trim(),
        kind: this.exploreKind.trim(),
        wordCount: this.exploreWordCount.trim()
      },
      ruleBookInfo: {
        author: this.bookInfoAuthor.trim(),
        coverUrl: this.bookInfoCoverUrl.trim(),
        intro: this.bookInfoIntro.trim(),
        kind: this.bookInfoKind.trim(),
        lastChapter: this.bookInfoLastChapter.trim(),
        name: this.bookInfoName.trim(),
        tocUrl: this.bookInfoTocUrl.trim(),
        wordCount: this.bookInfoWordCount.trim(),
        init: this.bookInfoInit.trim(),
        // JSON API 字段
        apiUrl: this.bookInfoApiUrl.trim(),
        apiBookPath: this.bookInfoApiBookPath.trim(),
        jsonTitle: this.bookInfoJsonTitle.trim(),
        jsonAuthor: this.bookInfoJsonAuthor.trim(),
        jsonIntro: this.bookInfoJsonIntro.trim(),
        jsonCover: this.bookInfoJsonCover.trim(),
        jsonCategory: this.bookInfoJsonCategory.trim(),
        jsonStatus: this.bookInfoJsonStatus.trim(),
        jsonLastChapter: this.bookInfoJsonLastChapter.trim(),
        jsonUpdateTime: this.bookInfoJsonUpdateTime.trim()
      },
      ruleToc: {
        chapterList: this.tocChapterList.trim(),
        chapterName: this.tocChapterName.trim(),
        chapterUrl: this.tocChapterUrl.trim(),
        nextTocUrl: this.tocNextTocUrl.trim(),
        // JSON API 字段
        apiUrl: this.tocApiUrl.trim(),
        apiChapterListPath: this.tocApiChapterListPath.trim(),
        jsonChapterList: this.tocJsonChapterList.trim(),
        jsonChapterName: this.tocJsonChapterName.trim()
      },
      ruleContent: {
        content: this.contentContent.trim(),
        nextContentUrl: this.contentNextContentUrl.trim(),
        replaceRegex: this.contentReplaceRegex.trim(),
        // JSON API 字段
        apiUrl: this.contentApiUrl.trim(),
        apiChapterPath: this.contentApiChapterPath.trim(),
        jsonContent: this.contentJsonContent.trim()
      },
      ruleReview: {}
    };
    
    hilog.info(0x0000, TAG, `${this.isEdit ? '更新' : '保存'}鹿析: ${sourceData.bookSourceName}`);
    
    // 返回上一页并传递数据
    try {
      router.replaceUrl({
        url: 'pages/BookSourcePage',
        params: {
          action: this.isEdit ? 'update' : 'add',
          sourceData: sourceData
        }
      }).then(() => {
        hilog.info(0x0000, TAG, '成功返回鹿析管理页面');
      }).catch((error: Error) => {
        hilog.error(0x0000, TAG, '返回鹿析管理页面失败: ' + error.message);
        // 如果replaceUrl失败，尝试使用back
        router.back();
      });
    } catch (error) {
      hilog.error(0x0000, TAG, '页面跳转出错: ' + JSON.stringify(error));
      // 最后的备选方案，直接返回
      router.back();
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
        Text('👈')
          .fontSize(20)
      }
      .width(40)
      .height(40)
      .backgroundColor(Color.Transparent)
      .onClick(() => {
        this.goBack();
      })
      
      // 标题
      Text(this.isEdit ? '编辑鹿析' : '新建鹿析')
        .fontSize(20)
        .fontWeight(FontWeight.Bold)
        .fontColor('#2D3748')
        .layoutWeight(1)
        .textAlign(TextAlign.Center)
      
      // 保存按钮
      Button('保存')
        .fontSize(16)
        .fontColor('#3182CE')
        .backgroundColor(Color.Transparent)
        .onClick(() => {
          this.saveBookSource();
        })
    }
    .width('100%')
    .height(56)
    .padding({ left: 16, right: 16 })
    .margin({ top: 44 })
    .justifyContent(FlexAlign.Start)
    .alignItems(VerticalAlign.Center)
  }

  /**
   * 构建标签页导航
   */
  @Builder
  private buildTabBar(): void {
    Scroll() {
      Row() {
        ForEach(['基本信息', '搜索规则', '发现规则', '书籍信息', '目录规则', '内容规则'], (tab: string, index: number) => {
          Text(tab)
            .fontSize(14)
            .fontColor(this.currentTab === index ? '#3182CE' : '#718096')
            .fontWeight(this.currentTab === index ? FontWeight.Medium : FontWeight.Normal)
            .padding({ left: 12, right: 12, top: 8, bottom: 8 })
            .borderRadius(16)
            .backgroundColor(this.currentTab === index ? '#EBF8FF' : Color.Transparent)
            .margin({ right: 8 })
            .onClick(() => {
              this.currentTab = index;
            })
        })
      }
      .justifyContent(FlexAlign.Start)
    }
    .scrollable(ScrollDirection.Horizontal)
    .scrollBar(BarState.Off)
    .width('100%')
    .padding({ left: 16, right: 16, top: 12, bottom: 12 })
    .backgroundColor(Color.White)
  }

  /**
   * 构建输入框
   */
  @Builder
  private buildInputField(label: string, placeholder: string, value: string, onValueChange: (value: string) => void, multiline: boolean = false): void {
    Column() {
      Text(label)
        .fontSize(14)
        .fontColor('#4A5568')
        .width('100%')
        .textAlign(TextAlign.Start)
        .margin({ bottom: 8 })
      
      if (multiline) {
        TextArea({ placeholder: placeholder, text: value })
          .fontSize(16)
          .backgroundColor('#F7FAFC')
          .borderRadius(8)
          .padding({ left: 12, right: 12, top: 12, bottom: 12 })
          .height(80)
          .onChange((value: string) => {
            onValueChange(value);
          })
      } else {
        TextInput({ placeholder: placeholder, text: value })
          .fontSize(16)
          .backgroundColor('#F7FAFC')
          .borderRadius(8)
          .padding({ left: 12, right: 12, top: 12, bottom: 12 })
          .onChange((value: string) => {
            onValueChange(value);
          })
      }
    }
    .width('100%')
    .margin({ bottom: 16 })
  }

  /**
   * 构建开关控件
   */
  @Builder
  private buildSwitchField(label: string, description: string, value: boolean, onValueChange: (value: boolean) => void): void {
    Row() {
      Column() {
        Text(label)
          .fontSize(14)
          .fontColor('#4A5568')
          .width('100%')
          .textAlign(TextAlign.Start)
        
        if (description) {
          Text(description)
            .fontSize(12)
            .fontColor('#718096')
            .width('100%')
            .textAlign(TextAlign.Start)
            .margin({ top: 4 })
        }
      }
      .layoutWeight(1)
      .alignItems(HorizontalAlign.Start)
      
      Toggle({ type: ToggleType.Switch, isOn: value })
        .onChange((isOn: boolean) => {
          onValueChange(isOn);
        })
    }
    .width('100%')
    .margin({ bottom: 16 })
  }

  /**
   * 构建基本信息标签页
   */
  @Builder
  private buildBasicInfoTab(): void {
    Column() {
      this.buildInputField('鹿析名称 *', '请输入鹿析名称', this.bookSourceName, (value: string) => {
        this.bookSourceName = value;
      })
      
      this.buildInputField('鹿析URL *', '请输入鹿析URL', this.bookSourceUrl, (value: string) => {
        this.bookSourceUrl = value;
      })
      
      this.buildInputField('鹿析分组', '请输入鹿析分组', this.bookSourceGroup, (value: string) => {
        this.bookSourceGroup = value;
      })
      
      this.buildInputField('鹿析注释', '请输入鹿析注释', this.bookSourceComment, (value: string) => {
        this.bookSourceComment = value;
      }, true)
      
      this.buildInputField('搜索URL', '请输入搜索URL', this.searchUrl, (value: string) => {
        this.searchUrl = value;
      })
      
      this.buildInputField('发现URL', '请输入发现URL', this.exploreUrl, (value: string) => {
        this.exploreUrl = value;
      })
      
      this.buildInputField('书籍URL模式', '请输入书籍URL模式', this.bookUrlPattern, (value: string) => {
        this.bookUrlPattern = value;
      })
      
      this.buildInputField('请求头', '请输入请求头（JSON格式）', this.header, (value: string) => {
        this.header = value;
      }, true)
      
      this.buildSwitchField('启用鹿析', '是否启用此鹿析', this.sourceEnabled, (value: boolean) => {
        this.sourceEnabled = value;
      })
      
      this.buildSwitchField('启用Cookie', '是否启用Cookie管理', this.enabledCookieJar, (value: boolean) => {
        this.enabledCookieJar = value;
      })
      
      this.buildSwitchField('启用发现', '是否启用发现功能', this.enabledExplore, (value: boolean) => {
        this.enabledExplore = value;
      })
      
      this.buildSwitchField('启用评论', '是否启用评论功能', this.enabledReview, (value: boolean) => {
        this.enabledReview = value;
      })
    }
    .padding(16)
  }

  /**
   * 构建搜索规则标签页
   */
  @Builder
  private buildSearchRuleTab(): void {
    Column() {
      this.buildInputField('书籍列表', '书籍列表选择器', this.searchBookList, (value: string) => {
        this.searchBookList = value;
      })
      
      this.buildInputField('书籍名称 *', '书籍名称选择器', this.searchName, (value: string) => {
        this.searchName = value;
      })
      
      this.buildInputField('作者 *', '作者选择器', this.searchAuthor, (value: string) => {
        this.searchAuthor = value;
      })
      
      this.buildInputField('书籍URL *', '书籍URL选择器', this.searchBookUrl, (value: string) => {
        this.searchBookUrl = value;
      })
      
      this.buildInputField('封面URL *', '封面URL选择器', this.searchCoverUrl, (value: string) => {
        this.searchCoverUrl = value;
      })
      
      this.buildInputField('最新章节', '最新章节选择器', this.searchLastChapter, (value: string) => {
        this.searchLastChapter = value;
      })
      
      this.buildInputField('分类', '分类选择器', this.searchKind, (value: string) => {
        this.searchKind = value;
      })
      
      this.buildInputField('字数', '字数选择器', this.searchWordCount, (value: string) => {
        this.searchWordCount = value;
      })
      
      this.buildInputField('关键词验证', '关键词验证规则', this.searchCheckKeyWord, (value: string) => {
        this.searchCheckKeyWord = value;
      })
    }
    .padding(16)
  }

  /**
   * 构建发现规则标签页
   */
  @Builder
  private buildExploreRuleTab(): void {
    Column() {
      this.buildInputField('书籍列表', '书籍列表选择器', this.exploreBookList, (value: string) => {
        this.exploreBookList = value;
      })
      
      this.buildInputField('书籍名称', '书籍名称选择器', this.exploreName, (value: string) => {
        this.exploreName = value;
      })
      
      this.buildInputField('作者', '作者选择器', this.exploreAuthor, (value: string) => {
        this.exploreAuthor = value;
      })
      
      this.buildInputField('书籍URL', '书籍URL选择器', this.exploreBookUrl, (value: string) => {
        this.exploreBookUrl = value;
      })
      
      this.buildInputField('封面URL', '封面URL选择器', this.exploreCoverUrl, (value: string) => {
        this.exploreCoverUrl = value;
      })
      
      this.buildInputField('最新章节', '最新章节选择器', this.exploreLastChapter, (value: string) => {
        this.exploreLastChapter = value;
      })
      
      this.buildInputField('分类', '分类选择器', this.exploreKind, (value: string) => {
        this.exploreKind = value;
      })
      
      this.buildInputField('字数', '字数选择器', this.exploreWordCount, (value: string) => {
        this.exploreWordCount = value;
      })
    }
    .padding(16)
  }

  /**
   * 构建鹿析信息规则标签页
   */
  @Builder
  private buildBookInfoRuleTab(): void {
    Column() {
      if (this.bookSourceType === 3) {
        // JSON API 模式
        this.buildInputField('API基础URL', 'JSON API 基础URL，如 https://api.example.com', this.bookInfoApiUrl, (value: string) => {
          this.bookInfoApiUrl = value;
        })

        this.buildInputField('书籍详情API路径', '书籍详情API路径模板，如 book?id={{bookId}}', this.bookInfoApiBookPath, (value: string) => {
          this.bookInfoApiBookPath = value;
        })

        this.buildInputField('书名字段映射', 'JSON中书名字段名，如 title', this.bookInfoJsonTitle, (value: string) => {
          this.bookInfoJsonTitle = value;
        })

        this.buildInputField('作者字段映射', 'JSON中作者字段名，如 author', this.bookInfoJsonAuthor, (value: string) => {
          this.bookInfoJsonAuthor = value;
        })

        this.buildInputField('简介字段映射', 'JSON中简介字段名，如 intro', this.bookInfoJsonIntro, (value: string) => {
          this.bookInfoJsonIntro = value;
        })

        this.buildInputField('封面字段映射', 'JSON中封面字段名，如 cover', this.bookInfoJsonCover, (value: string) => {
          this.bookInfoJsonCover = value;
        })

        this.buildInputField('分类字段映射', 'JSON中分类字段名，如 category', this.bookInfoJsonCategory, (value: string) => {
          this.bookInfoJsonCategory = value;
        })

        this.buildInputField('状态字段映射', 'JSON中状态字段名，如 status', this.bookInfoJsonStatus, (value: string) => {
          this.bookInfoJsonStatus = value;
        })

        this.buildInputField('最新章节字段映射', 'JSON中最新章节字段名，如 lastChapter', this.bookInfoJsonLastChapter, (value: string) => {
          this.bookInfoJsonLastChapter = value;
        })

        this.buildInputField('更新时间字段映射', 'JSON中更新时间字段名，如 updateTime', this.bookInfoJsonUpdateTime, (value: string) => {
          this.bookInfoJsonUpdateTime = value;
        })
      } else {
        // CSS/正则模式
        this.buildInputField('书籍名称 *', '书籍名称选择器', this.bookInfoName, (value: string) => {
          this.bookInfoName = value;
        })

        this.buildInputField('作者 *', '作者选择器', this.bookInfoAuthor, (value: string) => {
          this.bookInfoAuthor = value;
        })

        this.buildInputField('封面URL *', '封面URL选择器', this.bookInfoCoverUrl, (value: string) => {
          this.bookInfoCoverUrl = value;
        })

        this.buildInputField('简介 *', '简介选择器', this.bookInfoIntro, (value: string) => {
          this.bookInfoIntro = value;
        })

        this.buildInputField('分类 *', '分类选择器', this.bookInfoKind, (value: string) => {
          this.bookInfoKind = value;
        })

        this.buildInputField('最新章节', '最新章节选择器', this.bookInfoLastChapter, (value: string) => {
          this.bookInfoLastChapter = value;
        })

        this.buildInputField('目录URL', '目录URL选择器', this.bookInfoTocUrl, (value: string) => {
          this.bookInfoTocUrl = value;
        })

        this.buildInputField('字数', '字数选择器', this.bookInfoWordCount, (value: string) => {
          this.bookInfoWordCount = value;
        })

        this.buildInputField('初始化', '初始化脚本', this.bookInfoInit, (value: string) => {
          this.bookInfoInit = value;
        }, true)
      }
    }
    .padding(16)
  }

  /**
   * 构建目录规则标签页
   */
  @Builder
  private buildTocRuleTab(): void {
    Column() {
      if (this.bookSourceType === 3) {
        // JSON API 模式
        this.buildInputField('API基础URL', 'JSON API 基础URL（如书籍信息中未设置）', this.tocApiUrl, (value: string) => {
          this.tocApiUrl = value;
        })

        this.buildInputField('章节列表API路径', '章节列表API路径模板，如 chapters?bookId={{bookId}}', this.tocApiChapterListPath, (value: string) => {
          this.tocApiChapterListPath = value;
        })

        this.buildInputField('章节列表字段映射', 'JSON中章节列表字段名，如 list', this.tocJsonChapterList, (value: string) => {
          this.tocJsonChapterList = value;
        })

        this.buildInputField('章节名称字段映射', 'JSON中章节名字段名，如 name', this.tocJsonChapterName, (value: string) => {
          this.tocJsonChapterName = value;
        })
      } else {
        // CSS/正则模式
        this.buildInputField('章节列表 *', '章节列表选择器', this.tocChapterList, (value: string) => {
          this.tocChapterList = value;
        })

        this.buildInputField('章节名称 *', '章节名称选择器', this.tocChapterName, (value: string) => {
          this.tocChapterName = value;
        })

        this.buildInputField('章节URL *', '章节URL选择器', this.tocChapterUrl, (value: string) => {
          this.tocChapterUrl = value;
        })

        this.buildInputField('下一页URL', '下一页URL选择器', this.tocNextTocUrl, (value: string) => {
          this.tocNextTocUrl = value;
        })
      }
    }
    .justifyContent(FlexAlign.Start)
    .padding(16)
  }

  /**
   * 构建内容规则标签页
   */
  @Builder
  private buildContentRuleTab(): void {
    Column() {
      if (this.bookSourceType === 3) {
        // JSON API 模式
        this.buildInputField('API基础URL', 'JSON API 基础URL（如前面未设置）', this.contentApiUrl, (value: string) => {
          this.contentApiUrl = value;
        })

        this.buildInputField('章节内容API路径', '章节内容API路径模板，如 content?id={{chapterId}}', this.contentApiChapterPath, (value: string) => {
          this.contentApiChapterPath = value;
        })

        this.buildInputField('正文字段映射', 'JSON中正文字段名，如 txt', this.contentJsonContent, (value: string) => {
          this.contentJsonContent = value;
        })
      } else {
        // CSS/正则模式
        this.buildInputField('正文内容', '正文内容选择器', this.contentContent, (value: string) => {
          this.contentContent = value;
        })

        this.buildInputField('下一页URL', '下一页URL选择器', this.contentNextContentUrl, (value: string) => {
          this.contentNextContentUrl = value;
        })

        this.buildInputField('替换规则', '内容替换正则表达式', this.contentReplaceRegex, (value: string) => {
          this.contentReplaceRegex = value;
        }, true)
      }
    }
    .justifyContent(FlexAlign.Start)
    .padding(16)
  }

  build() {
    Column() {
      // 顶部导航栏
      this.buildHeader()
      
      // 标签页导航
      this.buildTabBar()
      
      // 内容区域
      Scroll() {
        Column() {
          if (this.currentTab === 0) {
            this.buildBasicInfoTab()
          } else if (this.currentTab === 1) {
            this.buildSearchRuleTab()
          } else if (this.currentTab === 2) {
            this.buildExploreRuleTab()
          } else if (this.currentTab === 3) {
            this.buildBookInfoRuleTab()
          } else if (this.currentTab === 4) {
            this.buildTocRuleTab()
          } else if (this.currentTab === 5) {
            this.buildContentRuleTab()
          }
        }
      }
      .layoutWeight(1)
      .scrollBar(BarState.Off)
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#F7FAFC')
  }
}

export { BookSourceEditPage };
