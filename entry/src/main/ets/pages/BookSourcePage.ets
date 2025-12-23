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
import { picker } from '@kit.CoreFileKit';
import { common } from '@kit.AbilityKit';
import { fileIo } from '@kit.CoreFileKit';
import { util } from '@kit.ArkTS';
import { bookSourceManager } from '../managers/BookSourceManager';
import { BookSourceInfo as BookSourceInfoModel, BookSourceRule as BookSourceRuleModel, ImportResult } from '../models/BookSourceModel';

const TAG: string = 'BookSourcePage';

/**
 * 鹿析信息接口
 */
interface BookSource {
  id: number;
  name: string;
  url: string;
  enabled: boolean;
  description: string;
  lastUpdate: string;
  group?: string;
  comment?: string;
  type?: number;
  enabledCookieJar?: boolean;
  enabledExplore?: boolean;
  enabledReview?: boolean;
  header?: string;
  searchUrl?: string;
  exploreUrl?: string;
  bookUrlPattern?: string;
  weight?: number;
  customOrder?: number;
  ruleSearch?: BookSourceRuleModel;
  ruleExplore?: BookSourceRuleModel;
  ruleBookInfo?: BookSourceRuleModel;
  ruleToc?: BookSourceRuleModel;
  ruleContent?: BookSourceRuleModel;
  ruleReview?: BookSourceRuleModel;
}

/**
 * 页面返回参数接口
 */
interface PageReturnParams {
  action?: string;
  sourceData?: BookSourceInfoModel;
}

/**
 * 弹窗状态变化事件接口
 */
interface PopupStateChangeEvent {
  isVisible: boolean;
}

/**
 * Toast 配置选项接口
 */
interface ToastOptions {
  message: string;
  duration: number;
}

/**
 * TextDecoder 配置选项接口
 */
interface TextDecoderOptions {
  ignoreBOM?: boolean;
  fatal?: boolean;
}

/**
 * 路由选项接口
 */
interface RouterOptions {
  url: string;
  params?: RouterParams;
}

/**
 * 路由参数接口
 */
interface RouterParams {
  isEdit: boolean;
  sourceData?: BookSourceInfoModel;
}

/**
 * 弹窗状态变化监听器实现类
 */
class PopupStateChangeListenerImpl {
  /**
   * 状态变化回调方法
   * @param event 状态变化事件
   */
  onStateChange(event: PopupStateChangeEvent): void {
    hilog.info(0x0000, TAG, '弹窗状态变化: ' + event.isVisible);
  }
}

@Entry
@ComponentV2
struct BookSourcePage {
  @Local bookSources: BookSource[] = [];
  @Local isLoading: boolean = false;
  @Local showAddMenu: boolean = false;
  
  // 创建弹窗状态变化监听器实例
  private popupStateChangeListener: PopupStateChangeListenerImpl = new PopupStateChangeListenerImpl();

  /**
   * 创建空规则对象
   * @returns 空的鹿析规则对象
   */
  private createEmptyRule(): BookSourceRuleModel {
    const emptyRule: BookSourceRuleModel = {
      author: undefined,
      bookList: undefined,
      bookUrl: undefined,
      coverUrl: undefined,
      intro: undefined,
      kind: undefined,
      lastChapter: undefined,
      name: undefined,
      wordCount: undefined,
      checkKeyWord: undefined,
      chapterList: undefined,
      chapterName: undefined,
      chapterUrl: undefined,
      nextTocUrl: undefined,
      content: undefined,
      nextContentUrl: undefined,
      tocUrl: undefined,
      init: undefined
    };
    return emptyRule;
  }

  /**
   * 创建鹿析对象
   * @param source 源数据
   * @param emptyRule 空规则对象
   * @param index 索引
   * @returns 鹿析对象
   */
  private createBookSource(source: BookSourceInfoModel, emptyRule: BookSourceRuleModel, index: number): BookSource {
    // 先创建规则对象，确保类型正确
    const ruleSearch: BookSourceRuleModel = source.ruleSearch !== undefined ? source.ruleSearch : emptyRule;
    const ruleExplore: BookSourceRuleModel = source.ruleExplore !== undefined ? source.ruleExplore : emptyRule;
    const ruleBookInfo: BookSourceRuleModel = source.ruleBookInfo !== undefined ? source.ruleBookInfo : emptyRule;
    const ruleToc: BookSourceRuleModel = source.ruleToc !== undefined ? source.ruleToc : emptyRule;
    const ruleContent: BookSourceRuleModel = source.ruleContent !== undefined ? source.ruleContent : emptyRule;
    const ruleReview: BookSourceRuleModel = source.ruleReview !== undefined ? source.ruleReview : emptyRule;
    
    // 创建鹿析对象
    const bookSource: BookSource = {
      id: Number(source.lastUpdateTime ?? (Date.now() + index)),
      name: source.bookSourceName,
      url: source.bookSourceUrl,
      enabled: source.enabled,
      description: source.bookSourceComment || source.bookSourceGroup || '默认鹿析',
      lastUpdate: source.lastUpdateTime ? new Date(source.lastUpdateTime).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      group: source.bookSourceGroup,
      comment: source.bookSourceComment,
      type: source.bookSourceType,
      enabledCookieJar: source.enabledCookieJar,
      enabledExplore: source.enabledExplore,
      enabledReview: source.enabledReview,
      header: source.header,
      searchUrl: source.searchUrl,
      exploreUrl: source.exploreUrl,
      bookUrlPattern: source.bookUrlPattern,
      weight: source.weight,
      customOrder: source.customOrder,
      ruleSearch: ruleSearch,
      ruleExplore: ruleExplore,
      ruleBookInfo: ruleBookInfo,
      ruleToc: ruleToc,
      ruleContent: ruleContent,
      ruleReview: ruleReview
    };
    
    return bookSource;
  }

  /**
   * 页面显示时初始化数据
   */
  async aboutToAppear() {
    await this.initializeBookSourceManager();
    await this.loadBookSources();
    await this.handleReturnParams();
  }

  /**
   * 处理从编辑页面返回的参数
   */
  private async handleReturnParams(): Promise<void> {
    try {
      const params = router.getParams() as PageReturnParams;
      if (params && params.action && params.sourceData) {
        if (params.action === 'add') {
          await this.addNewBookSource(params.sourceData);
        } else if (params.action === 'update') {
          await this.updateBookSource(params.sourceData);
        }
      }
    } catch (error) {
      hilog.error(0x0000, TAG, '处理返回参数失败: ' + JSON.stringify(error));
    }
  }

  /**
   * 添加新鹿析
   * @param sourceData 鹿析数据
   */
  private async addNewBookSource(sourceData: BookSourceInfoModel): Promise<void> {
    try {
      // 使用BookSourceManager保存到持久化存储
      await bookSourceManager.addBookSource(sourceData);
      
      // 重新加载鹿析列表以更新UI
      await this.loadBookSources();
      
      hilog.info(0x0000, TAG, '添加新鹿析成功: ' + sourceData.bookSourceName);
      
      const successToastOptions: ToastOptions = {
        message: '鹿析添加成功',
        duration: 2000
      };
      this.getUIContext()
        .getPromptAction()
        .showToast(successToastOptions);
    } catch (error) {
      hilog.error(0x0000, TAG, '添加新鹿析失败: ' + JSON.stringify(error));
      
      const errorToastOptions: ToastOptions = {
        message: '鹿析添加失败: ' + (error as Error).message,
        duration: 2000
      };
      this.getUIContext()
        .getPromptAction()
        .showToast(errorToastOptions);
    }
  }

  /**
   * 更新鹿析
   * @param sourceData 鹿析数据
   */
  private async updateBookSource(sourceData: BookSourceInfoModel): Promise<void> {
    try {
      // 使用BookSourceManager更新鹿析
      await bookSourceManager.updateBookSource(sourceData);
      
      // 重新加载鹿析列表以更新UI
      await this.loadBookSources();
      
      hilog.info(0x0000, TAG, '更新鹿析成功: ' + sourceData.bookSourceName);
      
      const successToastOptions: ToastOptions = {
        message: '鹿析更新成功',
        duration: 2000
      };
      this.getUIContext()
        .getPromptAction()
        .showToast(successToastOptions);
    } catch (error) {
      hilog.error(0x0000, TAG, '更新鹿析失败: ' + JSON.stringify(error));
      
      const errorToastOptions: ToastOptions = {
        message: '鹿析更新失败: ' + (error as Error).message,
        duration: 2000
      };
      this.getUIContext()
        .getPromptAction()
        .showToast(errorToastOptions);
    }
  }

  /**
   * 初始化鹿析管理器
   */
  private async initializeBookSourceManager(): Promise<void> {
    try {
      this.isLoading = true;
      const context = getContext(this) as common.UIAbilityContext;
      await bookSourceManager.initialize(context);
      hilog.info(0x0000, TAG, '鹿析理器初始化成功');
    } catch (error) {
      hilog.error(0x0000, TAG, '鹿析管理器初始化失败: ' + JSON.stringify(error));
      const toastOptions: ToastOptions = {
        message: '鹿析管理器初始化失败',
        duration: 2000
      };
      this.getUIContext()
        .getPromptAction()
        .showToast(toastOptions);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * 加载鹿析数据
   */
  private async loadBookSources(): Promise<void> {
    try {
      this.isLoading = true;
      
      // 从鹿析管理器获取所有书源
      const allSources = bookSourceManager.getAllBookSources();
      
      // 转换为页面使用的BookSource格式
      const convertedSources: BookSource[] = [];
      // 创建空规则对象
      const emptyRule: BookSourceRuleModel = this.createEmptyRule();
      for (let i = 0; i < allSources.length; i++) {
        const source = allSources[i];
        const bookSource: BookSource = this.createBookSource(source, emptyRule, i);
        convertedSources.push(bookSource);
      }
      this.bookSources = convertedSources;
      
      hilog.info(0x0000, TAG, '从鹿析管理器加载了 ' + this.bookSources.length + ' 个鹿析');
    } catch (error) {
      hilog.error(0x0000, TAG, '加载鹿析数据失败: ' + JSON.stringify(error));
      // 清空鹿析数组
      this.bookSources.splice(0, this.bookSources.length);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * 导入鹿析文件
   */
  private async importBookSources(): Promise<void> {
    try {
      // 初始化文件选择器
      let documentSelectOptions = new picker.DocumentSelectOptions();
      // 设置文件类型选择
      documentSelectOptions.fileSuffixFilters = ['.json'];
      let documentPicker = new picker.DocumentViewPicker();
      let documentSelectResult = await documentPicker.select(documentSelectOptions);
      
      if (!documentSelectResult || documentSelectResult.length <= 0) {
        hilog.error(0x0000, TAG, '未选择鹿析文件');
        return;
      }
      
      // 获取文件路径
      let srcFile: string = decodeURI(documentSelectResult[0]);
      hilog.info(0x0000, TAG, '选择的鹿析文件: ' + srcFile);
      
      // 读取文件内容
      let file = fileIo.openSync(srcFile, fileIo.OpenMode.READ_ONLY);
      let buffer = new ArrayBuffer(1024 * 1024); // 1MB缓冲区
      let readLen = fileIo.readSync(file.fd, buffer);
      fileIo.closeSync(file);
      
      // 将ArrayBuffer转换为字符串
      let uint8Array = new Uint8Array(buffer, 0, readLen);
      const decoderOptions: TextDecoderOptions = {
        ignoreBOM: false,
        fatal: false
      };
      let textDecoder = util.TextDecoder.create('utf-8', decoderOptions);
      let jsonContent = textDecoder.decode(uint8Array);
      
      // 解析JSON数据
      let bookSourcesData: BookSourceInfoModel[] = JSON.parse(jsonContent) as BookSourceInfoModel[];
      
      if (!Array.isArray(bookSourcesData)) {
        hilog.error(0x0000, TAG, '鹿析文件格式错误，应为数组格式');
        const toastOptions: ToastOptions = {
          message: '鹿析文件格式错误',
          duration: 2000
        };
        this.getUIContext()
          .getPromptAction()
          .showToast(toastOptions);
        return;
      }
      
      // 使用BookSourceManager批量导入鹿析
      const importResult: ImportResult = await bookSourceManager.importBookSources(bookSourcesData);
      
      // 重新加载鹿析列表以更新UI
      await this.loadBookSources();
      
      hilog.info(0x0000, TAG, `导入完成，成功: ${importResult.success}，失败: ${importResult.failed}`);
      
      let message = `成功导入 ${importResult.success} 个鹿析`;
      if (importResult.failed > 0) {
        message += `，失败 ${importResult.failed} 个`;
      }
      
      const successToastOptions: ToastOptions = {
        message: message,
        duration: 3000
      };
      this.getUIContext()
        .getPromptAction()
        .showToast(successToastOptions);
        
    } catch (error) {
      hilog.error(0x0000, TAG, '导入鹿析失败: ' + JSON.stringify(error));
      const errorToastOptions: ToastOptions = {
        message: '导入鹿析失败',
        duration: 2000
      };
      this.getUIContext()
        .getPromptAction()
        .showToast(errorToastOptions);
    }
  }

  /**
   * 切换鹿析启用状态
   * @param source 鹿析对象
   */
  private async toggleBookSource(source: BookSource): Promise<void> {
    try {
      const newEnabled = !source.enabled;
      
      // 使用BookSourceManager保存状态变更
      await bookSourceManager.toggleBookSource(source.name, newEnabled);
      
      // 更新UI状态
      source.enabled = newEnabled;
      
      hilog.info(0x0000, TAG, `${source.name} 已${newEnabled ? '启用' : '禁用'}`);
      
      const successToastOptions: ToastOptions = {
        message: `${source.name} 已${newEnabled ? '启用' : '禁用'}`,
        duration: 1500
      };
      this.getUIContext()
        .getPromptAction()
        .showToast(successToastOptions);
    } catch (error) {
      hilog.error(0x0000, TAG, `切换鹿析状态失败: ${(error as Error).message}`);
      
      const errorToastOptions: ToastOptions = {
        message: '切换鹿析状态失败',
        duration: 2000
      };
      this.getUIContext()
        .getPromptAction()
        .showToast(errorToastOptions);
    }
  }

  /**
   * 删除鹿析
   * @param sourceId 鹿析ID
   */
  private async deleteBookSource(sourceId: number): Promise<void> {
    try {
      const index = this.bookSources.findIndex(source => source.id === sourceId);
      if (index > -1) {
        const deletedSource = this.bookSources[index];
        
        // 使用BookSourceManager从持久化存储中删除
        await bookSourceManager.removeBookSource(deletedSource.name);
        
        // 从UI列表中移除
        this.bookSources.splice(index, 1);
        
        hilog.info(0x0000, TAG, '删除鹿析成功: ' + deletedSource.name);
        
        const successToastOptions: ToastOptions = {
          message: `已删除鹿析: ${deletedSource.name}`,
          duration: 2000
        };
        this.getUIContext()
          .getPromptAction()
          .showToast(successToastOptions);
      }
    } catch (error) {
      hilog.error(0x0000, TAG, `删除鹿析失败: ${error}`);
      
      const errorToastOptions: ToastOptions = {
        message: '删除鹿析失败',
        duration: 2000
      };
      this.getUIContext()
        .getPromptAction()
        .showToast(errorToastOptions);
    }
  }

  /**
   * 跳转到新建鹿析页面
   */
  private navigateToAddSource(): void {
    try {
      // 创建路由参数对象，避免对象字面量类型错误
      const routerParams: RouterParams = {
        isEdit: false
      };
      const routerOptions: RouterOptions = {
        url: 'pages/BookSourceEditPage',
        params: routerParams
      };
      
      hilog.info(0x0000, TAG, '准备跳转到新建鹿析页面');
      router.pushUrl(routerOptions).then(() => {
        hilog.info(0x0000, TAG, '成功跳转到新建鹿析页面');
      }).catch((error: Error) => {
        hilog.error(0x0000, TAG, '跳转到新建鹿析页面失败: ' + (error as Error).message);
        // 显示错误提示
        const toastOptions: ToastOptions = {
          message: '跳转失败: ' + (error as Error).message,
          duration: 2000
        };
        this.getUIContext()
          .getPromptAction()
          .showToast(toastOptions);
      });
    } catch (error) {
      hilog.error(0x0000, TAG, '创建路由参数时发生错误: ' + JSON.stringify(error));
      const toastOptions: ToastOptions = {
        message: '页面跳转出错',
        duration: 2000
      };
      this.getUIContext()
        .getPromptAction()
        .showToast(toastOptions);
    }
  }

  /**
   * 跳转到编辑鹿析页面
   * @param source 鹿析对象
   */
  private navigateToEditSource(source: BookSource): void {
    try {
      const sourceInfo: BookSourceInfoModel = this.createBookSourceInfoForEdit(source);
      
      const routerParams: RouterParams = {
        isEdit: true,
        sourceData: sourceInfo
      };
      const routerOptions: RouterOptions = {
        url: 'pages/BookSourceEditPage',
        params: routerParams
      };
      router.pushUrl(routerOptions).catch((error: Error) => {
        hilog.error(0x0000, TAG, '跳转到编辑鹿析页面失败: ' + (error as Error).message);
      });
    } catch (error) {
      hilog.error(0x0000, TAG, '创建路由参数失败: ' + JSON.stringify(error));
    }
  }

  /**
   * 为编辑页面创建鹿析信息对象
   * @param source 鹿析对象
   * @returns 鹿析信息对象
   */
  private createBookSourceInfoForEdit(source: BookSource): BookSourceInfoModel {
    const emptyRule: BookSourceRuleModel = this.createEmptyRule();
    
    const sourceInfo: BookSourceInfoModel = {
      bookSourceName: source.name,
      bookSourceUrl: source.url,
      bookSourceGroup: source.group || '',
      bookSourceComment: source.comment || source.description,
      bookSourceType: source.type || 0,
      enabled: source.enabled,
      enabledCookieJar: source.enabledCookieJar !== false,
      enabledExplore: source.enabledExplore !== false,
      enabledReview: source.enabledReview || false,
      header: source.header || '',
      searchUrl: source.searchUrl || '',
      exploreUrl: source.exploreUrl || '',
      bookUrlPattern: source.bookUrlPattern || '',
      weight: source.weight || 0,
      customOrder: source.customOrder || 0,
      lastUpdateTime: Date.now(),
      respondTime: 0,
      ruleSearch: source.ruleSearch || emptyRule,
      ruleExplore: source.ruleExplore || emptyRule,
      ruleBookInfo: source.ruleBookInfo || emptyRule,
      ruleToc: source.ruleToc || emptyRule,
      ruleContent: source.ruleContent || emptyRule,
      ruleReview: source.ruleReview || emptyRule
    };
    
    return sourceInfo;
  }

  /**
   * 弹窗状态变化处理函数
   * @param event 状态变化事件
   */
  private handlePopupStateChange = (event: PopupStateChangeEvent) => {
    this.popupStateChangeListener.onStateChange(event);
  }

  /**
   * 返回上一页
   */
  private goBack(): void {
    this.getUIContext().getRouter().back();
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
      Text('鹿析管理')
        .fontSize(20)
        .fontWeight(FontWeight.Bold)
        .fontColor('#2D3748')
        .layoutWeight(1)
        .textAlign(TextAlign.Center)
      
      // 添加按钮
      Button() {
        Text('➕')
          .fontSize(20)
      }
      .width(40)
      .height(40)
      .backgroundColor(Color.Transparent)
      .onClick(() => {
        this.showAddMenu = !this.showAddMenu;
      })
      .bindPopup($$this.showAddMenu, {
        builder: this.popupWithButtonBuilder,
        placement: Placement.Bottom,
        maskColor: Color.Transparent,
        popupColor: Color.White,
        enableArrow: true,
        autoCancel: true,
        onStateChange: this.handlePopupStateChange
      })
    }
    //.width('100%')
    //.height(56)
    //.padding({ left: 16, right: 16, top: 0, bottom: 0 })
    //.margin({ top: 44, bottom: 0, left: 0, right: 0 })
    //.backgroundColor(Color.White)
    //.shadow({ radius: 2, color: '#10000000', offsetY: 1 })
    .width('100%')
    .height(56)
    .padding({ left: 16, right: 16 })
    .margin({ top: 44 })
    .justifyContent(FlexAlign.Start)
    .alignItems(VerticalAlign.Center)
  }

  /**
   * 构建鹿析卡片
   */
  @Builder
  private buildBookSourceCard(source: BookSource): void {
    Column() {
      // 鹿析信息行
      Row() {
        Column() {
          // 鹿析名称
          Text(source.name)
            .fontSize(16)
            .fontWeight(FontWeight.Medium)
            .fontColor('#2D3748')
            .width('100%')
            .textAlign(TextAlign.Start)
          
          // 鹿析URL
          Text(source.url)
            .fontSize(12)
            .fontColor('#718096')
            .margin({ top: 4, bottom: 0, left: 0, right: 0 })
            .width('100%')
            .textAlign(TextAlign.Start)
            .maxLines(1)
            .textOverflow({ overflow: TextOverflow.Ellipsis })
        }
        .layoutWeight(1)
        .alignItems(HorizontalAlign.Start)
        
        // 启用开关
        Toggle({ type: ToggleType.Switch, isOn: source.enabled })
          .onChange(isOn => {
            this.toggleBookSource(source);
          })
      }
      .width('100%')
      .margin({ bottom: 8, top: 0, left: 0, right: 0 })
      
      // 描述和更新时间
      Row() {
        Text(source.description)
          .fontSize(12)
          .fontColor('#4A5568')
          .layoutWeight(1)
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
        
        Text('更新: ' + (source.lastUpdate || ''))
          .fontSize(10)
          .fontColor('#A0AEC0')
      }
      .width('100%')
      .margin({ bottom: 8, top: 0, left: 0, right: 0 })
      
      // 操作按钮
      Row() {
        Button('测试')
          .fontSize(12)
          .fontColor('#3182CE')
          .backgroundColor('#EBF8FF')
          .borderRadius(16)
          .padding({ left: 12, right: 12, top: 4, bottom: 4 })
          .onClick(() => {
            hilog.info(0x0000, TAG, '测试鹿析: ' + source.name);
          })
        
        Button('编辑')
          .fontSize(12)
          .fontColor('#38A169')
          .backgroundColor('#C6F6D5')
          .borderRadius(16)
          .padding({ left: 12, right: 12, top: 4, bottom: 4 })
          .margin({ left: 8, right: 0, top: 0, bottom: 0 })
          .onClick(() => {
            this.navigateToEditSource(source);
          })
        
        Blank()
        
        Button('删除')
          .fontSize(12)
          .fontColor('#E53E3E')
          .backgroundColor('#FED7D7')
          .borderRadius(16)
          .padding({ left: 12, right: 12, top: 4, bottom: 4 })
          .onClick(() => {
            this.deleteBookSource(source.id);
          })
      }
      .width('100%')
    }
    .width('100%')
    .padding(12)
    .backgroundColor(Color.White)
    .borderRadius(8)
    .margin({bottom: 8, top: 0 })
    .shadow({ radius: 2, color: '#10000000', offsetY: 1 })
  }

  /**
   * 构建弹出菜单
   */
  @Builder
  popupWithButtonBuilder() {
    Column() {
      Row() {
        Image($r("app.media.Plus"))
          .width(20)
          .height(20)
        Text('新建鹿析')
          .fontSize(18)
      }
      .height(50)
      .width('100%')
      .justifyContent(FlexAlign.Start)
      .alignItems(VerticalAlign.Center)
      .padding({ left: 16, right: 16, top: 0, bottom: 0 })
      .onClick(() => {
        this.showAddMenu = false;
        this.navigateToAddSource();
      })
      
      Row() {
        Image($r("app.media.SignIn"))
          .width(20)
          .height(20)
        Text('导入鹿析')
          .fontSize(18)
      }
      .height(50)
      .width('100%')
      .justifyContent(FlexAlign.Start)
      .alignItems(VerticalAlign.Center)
      .padding({ left: 16, right: 16, top: 0, bottom: 0 })
      .onClick(() => {
        this.showAddMenu = false;
        this.importBookSources();
      })
    }
    .width(160)
  }

  build() {
    Column() {
      // 顶部导航栏
      this.buildHeader()
      
      // 主要内容区域
      if (this.isLoading) {
        // 加载状态
        Column() {
          Progress({ type: ProgressType.Ring, value: 0 })
            .width(40)
            .height(40)
            .color('#3182CE')
          Text('正在加载鹿析...')
            .fontSize(14)
            .fontColor('#718096')
            .margin({ top: 12, bottom: 0, left: 0, right: 0 })
        }
        .width('100%')
        .layoutWeight(1)
        .justifyContent(FlexAlign.Center)
      } else if (this.bookSources.length === 0) {
        // 空状态
        Column() {
          Text('🦌')
            .fontSize(48)
            .margin({ top: 12, bottom: 0, left: 0, right: 0 })
          Text('暂无鹿析')
            .fontSize(16)
            .fontColor('#718096')
            .margin({ bottom: 16, top: 0, left: 0, right: 0 })
          Button('添加鹿析')
            .fontSize(14)
            .fontColor(Color.White)
            .backgroundColor('#3182CE')
            .borderRadius(20)
            .padding({ left: 20, right: 20, top: 8, bottom: 8 })
            .onClick(() => {
              this.navigateToAddSource();
            })
        }
        .width('100%')
        .layoutWeight(1)
        .justifyContent(FlexAlign.Center)
      } else {
        // 鹿析列表
        List() {
          ForEach(this.bookSources, (source: BookSource) => {
            ListItem() {
              this.buildBookSourceCard(source)
            }
          })
        }
        .width('100%')
        .layoutWeight(1)
        .padding({ left: 0, right: 0, top: 8, bottom: 8 })
        .scrollBar(BarState.Off)
      }
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#F7FAFC')
  }
}

export { BookSourcePage };
