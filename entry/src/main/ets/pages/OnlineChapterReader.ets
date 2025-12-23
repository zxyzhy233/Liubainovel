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
import { fileIo as fs } from '@kit.CoreFileKit';
import { common } from '@kit.AbilityKit';
import { router } from '@kit.ArkUI';
import { util } from '@kit.ArkTS';
import { settingsManager } from '../utils/SettingsManager';
import { onlineBookDataManager } from '../utils/OnlineBookDataManager';
import { ChapterInfo } from '../models/BookSourceModel';
import { ChapterDownloadInfo } from '../models/OnlineBookModel';
import { bookSourceManager } from '../managers/BookSourceManager';
import { BookSourceParser } from '../managers/BookSourceParser';
import { textToSpeech } from '@kit.CoreSpeechKit';
import { BusinessError } from '@kit.BasicServicesKit';
import PcmPlayer from '../model/PcmPlayer';
import { backgroundTaskManager } from '@kit.BackgroundTasksKit';

const TAG: string = 'OnlineChapterReader';

/**
 * 页面参数接口
 */
interface PageParams {
  bookId: number; // 在线书籍ID
  bookTitle: string; // 书籍标题
  chapterIndex: number; // 当前章节索引
  chapters: ChapterInfo[]; // 章节列表
}

@Entry
@ComponentV2
struct OnlineChapterReader {
  @Local bookId: number = 0;
  @Local bookTitle: string = '';
  @Local bookCoverUrl: string = ''; // 书籍封面URL
  @Local currentChapterIndex: number = 0;
  @Local chapters: ChapterInfo[] = [];
  @Local chapterContent: string = '';
  @Local isLoading: boolean = true;
  @Local errorMessage: string = '';
  @Local showCatalog: boolean = false;
  @Local showSettings: boolean = false;
  @Local showToolbar: boolean = false;
  @Local showDebugDialog: boolean = false;
  @Local debugContent: string = '';
  // 阅读设置
  @Local fontSize: number = 18;
  @Local lineHeight: number = 1.9;
  @Local fontFamily: string = 'system';
  @Local fontColor: string = '#000000';
  @Local backgroundColorValue: string = '#FFFFFF';
  @Local themeSelectIndex: number = 0;
  @Local selectFontPath: string = '';
  @Local flipMode: string = '0';
  // 主题配置
  @Local themeList: string[] = [
    'white', 'yellow', 'pink', 'green', 'dark', 'whiteSky', 'darkSky'
  ];
  private THEME_BUTTON_BACKGROUND: Record<string, Resource> = {
    'white': $r('app.color.ic_white_theme_button_background'),
    'yellow': $r('app.color.ic_yellow_theme_button_background'),
    'pink': $r('app.color.ic_pink_theme_button_background'),
    'green': $r('app.color.ic_green_theme_button_background'),
    'dark': $r('app.color.ic_dark_theme_button_background'),
    'whiteSky': $r('app.color.ic_white_theme_button_background'),
    'darkSky': $r('app.color.ic_dark_theme_button_background')
  };
  private THEME_PAGE_COLOR: Record<string, string> = {
    'white': '#FFFFFF',
    'yellow': '#BD9063',
    'pink': '#FFE4E5',
    'green': '#C5E7CE',
    'dark': '#202224',
    'whiteSky': '#FFFFFF',
    'darkSky': '#202224'
  };
  private themeBorderColor: Record<number, Resource> = {
    0: $r('app.color.ic_border_select_white'),
    1: $r('app.color.ic_border_select_yellow'),
    2: $r('app.color.ic_border_select_pink'),
    3: $r('app.color.ic_border_select_green'),
    4: $r('app.color.ic_border_select_white'),
    5: $r('app.color.ic_border_select_white'),
    6: $r('app.color.ic_border_select_white')
  };
  private catalogScroller: Scroller = new Scroller();
  private contentScroller: Scroller = new Scroller();
  
  // TTS语音朗读相关状态
  @Local ttsEngine: textToSpeech.TextToSpeechEngine | null = null;
  @Local isTTSEngineCreated: boolean = false;
  @Local isTTSPlaying: boolean = false;
  @Local isTTSAutoPlay: boolean = false;
  @Local ttsText: string = '';
  @Local pcmPlayer: PcmPlayer = new PcmPlayer();
  @Local showTTSPage: boolean = false;
  @Local currentSpeakingChapter: number = -1;
  @Local pcmData: Map<number, Uint8Array> = new Map();
  @Local bufferLength: number = 0;
  @Local showTimerSheet: boolean = false;
  @Local showSpeedSheet: boolean = false;
  @Local timerMinutes: number = 0;
  @Local ttsSpeed: number = 1;
  private timerInterval: number = -1;
  @Local remainingTime: number = 0;
  private backgroundTaskId: number = -1;
  @Local isBackgroundTaskActive: boolean = false;

  async aboutToAppear() {
    hilog.info(0x0000, TAG, '=== OnlineChapterReader aboutToAppear 开始 ===');

    try {
      const params = router.getParams() as PageParams;
      hilog.info(0x0000, TAG, `接收到的参数: bookId=${params?.bookId}, chapterIndex=${params?.chapterIndex}`);

      if (!params || !params.bookId) {
        hilog.error(0x0000, TAG, '未接收到有效页面参数！');
        this.errorMessage = '页面参数错误';
        this.isLoading = false;
        return;
      }

      this.bookId = params.bookId;
      this.bookTitle = params.bookTitle || '在线阅读';
      this.currentChapterIndex = params.chapterIndex || 0;
      this.chapters = params.chapters || [];

      hilog.info(0x0000, TAG,
        `初始化阅读器: bookId=${this.bookId}, chapter=${this.currentChapterIndex}, chapters数量=${this.chapters.length}`);

      // 初始化数据管理器
      const context = this.getUIContext().getHostContext() as common.UIAbilityContext;
      await onlineBookDataManager.init(context);

      // 加载书籍信息（包括封面）
      await this.loadBookInfo();

      // 加载阅读设置
      await this.loadSettings();

      // 加载当前章节
      await this.loadChapter(this.currentChapterIndex);

      hilog.info(0x0000, TAG, '=== OnlineChapterReader aboutToAppear 完成 ===');
    } catch (error) {
      hilog.error(0x0000, TAG, '页面初始化失败: ' + JSON.stringify(error));
      this.errorMessage = '页面初始化失败: ' + (error instanceof Error ? error.message : '未知错误');
      this.isLoading = false;
    }
  }

  /**
   * 加载书籍信息
   */
  private async loadBookInfo(): Promise<void> {
    try {
      const allBooks = await onlineBookDataManager.queryAllOnlineBooks();
      const onlineBook = allBooks.find((book) => book.id === this.bookId);
      if (onlineBook && onlineBook.cover) {
        this.bookCoverUrl = onlineBook.cover;
        hilog.info(0x0000, TAG, `加载书籍封面: ${this.bookCoverUrl}`);
      }
    } catch (error) {
      hilog.error(0x0000, TAG, '加载书籍信息失败: ' + JSON.stringify(error));
    }
  }

  /**
   * 加载阅读设置
   */
  private async loadSettings(): Promise<void> {
    try {
      const context = this.getUIContext().getHostContext() as common.UIAbilityContext;
      await settingsManager.init(context);
      const settings = await settingsManager.loadSettings();

      this.fontSize = settings.fontSize;
      this.lineHeight = settings.lineHeight;
      this.fontFamily = settings.fontName === '系统字体' ? 'system' : settings.fontName;
      this.selectFontPath = settings.fontPath;
      this.flipMode = settings.flipMode;

      // 应用主题
      this.themeSelectIndex = this.themeList.indexOf(settings.theme);
      this.applyTheme(settings.theme, this.themeSelectIndex);

      hilog.info(0x0000, TAG, `加载设置成功: fontSize=${this.fontSize}, theme=${settings.theme}`);
    } catch (error) {
      hilog.error(0x0000, TAG, '加载设置失败: ' + JSON.stringify(error));
    }
  }

  /**
   * 应用主题
   */
  private applyTheme(theme: string, index: number): void {
    this.backgroundColorValue = this.THEME_PAGE_COLOR[theme];

    if (index === 5 || index === 6) {
      this.fontColor = index === 5 ? '#000000' : '#FFFFFF';
    } else if (index === 4) {
      this.fontColor = '#FFFFFF';
    } else {
      this.fontColor = '#000000';
    }
  }

  /**
   * 加载章节内容
   */
  private async loadChapter(chapterIndex: number): Promise<void> {
    try {
      this.isLoading = true;
      this.errorMessage = '';

      if (chapterIndex < 0 || chapterIndex >= this.chapters.length) {
        throw new Error('章节索引超出范围');
      }

      const chapter = this.chapters[chapterIndex];
      hilog.info(0x0000, TAG, `开始加载章节: ${chapter.title}`);

      // 优先从本地缓存读取
      const cachedChapter = await onlineBookDataManager.queryChapterDownload(this.bookId, chapterIndex);

      if (cachedChapter && cachedChapter.isDownloaded && cachedChapter.content) {
        this.currentChapterIndex = chapterIndex;
        this.chapterContent = cachedChapter.content;
        this.isLoading = false;

        hilog.info(0x0000, TAG, `从缓存加载章节成功: ${chapter.title}, 长度: ${cachedChapter.content.length}`);
        this.saveReadingProgress();
        
        // 延迟滚动到内容顶部，确保内容已渲染
        setTimeout(() => {
          this.contentScroller.scrollEdge(Edge.Top);
        }, 100);
        return;
      }

      // 缓存不存在或无效，从网络获取
      hilog.info(0x0000, TAG, `缓存未找到，从网络获取: ${chapter.title}, URL: ${chapter.url}`);

      const allBooks = await onlineBookDataManager.queryAllOnlineBooks();
      const onlineBook = allBooks.find((book) => book.id === this.bookId);
      if (!onlineBook) {
        throw new Error('未找到在线书籍信息');
      }

      const allSources = await bookSourceManager.getAllBookSources();
      const bookSource = allSources.find((source) => onlineBook.bookUrl.includes(source.bookSourceUrl));
      if (!bookSource) {
        throw new Error('未找到对应的书源');
      }

      const parser = new BookSourceParser(bookSource);
      const result = await parser.parseChapterContent(chapter.url);

      if (!result.success || !result.data) {
        throw new Error(result.error || '获取章节内容失败');
      }

      const contentData = result.data || '';
      this.currentChapterIndex = chapterIndex;
      this.chapterContent = contentData;
      this.isLoading = false;

      hilog.info(0x0000, TAG, `从网络加载章节成功: ${chapter.title}, 长度: ${contentData.length}`);

      this.saveReadingProgress();
      await this.updateChapterDownload(chapterIndex, contentData);
      
      // 延迟滚动到内容顶部，确保内容已渲染
      setTimeout(() => {
        this.contentScroller.scrollEdge(Edge.Top);
      }, 100);
    } catch (error) {
      hilog.error(0x0000, TAG, '加载章节失败: ' + JSON.stringify(error));
      this.errorMessage = `加载失败: ${error instanceof Error ? error.message : '未知错误'}`;
      this.isLoading = false;
    }
  }

  /**
   * 更新章节下载记录
   */
  private async updateChapterDownload(chapterIndex: number, content: string): Promise<void> {
    try {
      const chapter = this.chapters[chapterIndex];
      const context = this.getUIContext().getHostContext() as common.UIAbilityContext;
      const cacheDir = context.cacheDir;
      const fileName = `${this.bookTitle}_${this.bookId}_${chapterIndex}.txt`;
      const filePath = `${cacheDir}/chapters/${fileName}`;

      const dirPath = `${cacheDir}/chapters`;
      if (!fs.accessSync(dirPath)) {
        fs.mkdirSync(dirPath, true);
      }

      const file = fs.openSync(filePath, fs.OpenMode.CREATE | fs.OpenMode.TRUNC | fs.OpenMode.WRITE_ONLY);
      const encoder = new util.TextEncoder();
      const uint8Array = encoder.encodeInto(content);
      fs.writeSync(file.fd, uint8Array.buffer);
      fs.closeSync(file);

      const chapterDownloadInfo: ChapterDownloadInfo = {
        id: 0,
        bookId: this.bookId,
        chapterIndex: chapterIndex,
        chapterTitle: chapter.title,
        chapterUrl: chapter.url,
        content: content,
        isDownloaded: true,
        downloadTime: Date.now(),
        filePath: filePath
      };
      await onlineBookDataManager.saveChapterDownload(chapterDownloadInfo);

      hilog.info(0x0000, TAG, `章节下载记录已更新: ${chapter.title}`);
    } catch (error) {
      hilog.error(0x0000, TAG, '更新章节下载记录失败: ' + JSON.stringify(error));
    }
  }

  /**
   * 保存阅读进度
   */
  private async saveReadingProgress(): Promise<void> {
    if (this.bookId > 0 && this.currentChapterIndex >= 0 && this.chapters.length > 0) {
      const chapterTitle = this.chapters[this.currentChapterIndex]?.title || '';

      try {
        await onlineBookDataManager.updateReadingProgress(
          this.bookId,
          this.currentChapterIndex,
          chapterTitle
        );
        hilog.info(0x0000, TAG,
          `保存阅读进度成功: 章节${this.currentChapterIndex + 1}/${this.chapters.length} - ${chapterTitle}`);
      } catch (error) {
        hilog.error(0x0000, TAG, '保存阅读进度失败: ' + JSON.stringify(error));
      }
    }
  }

  /**
   * 上一章
   */
  private async previousChapter(): Promise<void> {
    if (this.currentChapterIndex > 0) {
      await this.loadChapter(this.currentChapterIndex - 1);
    } else {
      this.getUIContext().getPromptAction().showToast({ message: '已经是第一章了', duration: 2000 });
    }
  }

  /**
   * 下一章
   */
  private async nextChapter(): Promise<void> {
    if (this.currentChapterIndex < this.chapters.length - 1) {
      await this.loadChapter(this.currentChapterIndex + 1);
    } else {
      this.getUIContext().getPromptAction().showToast({ message: '已经是最后一章了', duration: 2000 });
    }
  }

  /**
   * 跳转到指定章节
   */
  private async jumpToChapter(chapterIndex: number): Promise<void> {
    this.showCatalog = false;
    this.showSettings = false;
    this.showToolbar = false;
    await this.loadChapter(chapterIndex);
  }

  /**
   * 切换工具栏显示
   */
  private toggleToolbar(): void {
    // 如果有弹窗显示，先关闭弹窗
    if (this.showCatalog || this.showSettings || this.showDebugDialog) {
      this.showCatalog = false;
      this.showSettings = false;
      this.showDebugDialog = false;
      return;
    }
    // 切换工具栏状态
    this.showToolbar = !this.showToolbar;
  }

  /**
   * 返回上一页
   */
  private goBack(): void {
    router.back();
  }

  /**
   * 保存设置
   */
  private async saveSettings(): Promise<void> {
    try {
      await settingsManager.saveSettings({
        fontName: this.fontFamily,
        fontPath: this.selectFontPath,
        fontSize: this.fontSize,
        lineHeight: this.lineHeight,
        theme: this.themeList[this.themeSelectIndex],
        flipMode: this.flipMode
      });
    } catch (error) {
      hilog.error(0x0000, TAG, '保存设置失败: ' + JSON.stringify(error));
    }
  }

  /**
   * 创建TTS引擎
   */
  private async createTTSEngine(): Promise<void> {
    if (this.isTTSEngineCreated && this.ttsEngine) {
      return;
    }
    
    return new Promise<void>((resolve, reject) => {
      let extraParam: Record<string, Object> = { 
        "style": 'interaction-broadcast', 
        "locate": 'CN', 
        "name": 'EngineName' 
      }
      let initParamsInfo: textToSpeech.CreateEngineParams = {
        language: 'zh-CN',
        person: 0,
        online: 1,
        extraParams: extraParam
      };
      
      try {
        hilog.info(0x0000, TAG, 'TTS引擎开始创建...');
        
        textToSpeech.createEngine(initParamsInfo, async (err: BusinessError, textToSpeechEngine: textToSpeech.TextToSpeechEngine) => {
          if (!err) {
            hilog.info(0x0000, TAG, 'TTS createEngine is success');
            this.ttsEngine = textToSpeechEngine;
            this.isTTSEngineCreated = true;
            
            const context = this.getUIContext().getHostContext() as common.UIAbilityContext;
            try {
              await this.pcmPlayer.prepare(16000, 1, undefined, undefined, context);
              hilog.info(0x0000, TAG, 'PcmPlayer AVSession initialized successfully');
            } catch (error) {
              hilog.error(0x0000, TAG, 'Failed to initialize PcmPlayer AVSession: ' + JSON.stringify(error));
            }
            
            resolve();
          } else {
            hilog.error(0x0000, TAG, "TTS createEngine errCode is " + JSON.stringify(err.code));
            hilog.error(0x0000, TAG, "TTS createEngine errMessage is " + JSON.stringify(err.message));
            
            let errorMsg = 'TTS引擎创建失败';
            if (err.code === 1002300001) {
              errorMsg = 'TTS服务不可用，请检查系统设置';
            } else if (err.code === 1002300002) {
              errorMsg = 'TTS参数错误，请重试';
            } else if (err.code === 1002300003) {
              errorMsg = 'TTS初始化失败，请重启应用';
            }
            
            this.getUIContext()
              .getPromptAction()
              .showToast({ 
                message: errorMsg, 
                duration: 3000 
              });
            
            reject(new Error(errorMsg));
          }
        });
      } catch (error) {
        let message = (error as BusinessError).message;
        let code = (error as BusinessError).code;
        hilog.error(0x0000, TAG, `TTS createEngine failed, error code: ${code}, message: ${message}.`);
        
        this.getUIContext()
          .getPromptAction()
          .showToast({ 
            message: 'TTS引擎创建异常，请重试', 
            duration: 3000 
          });
        
        reject(error);
      }
    });
  }

  /**
   * 开始TTS朗读
   */
  private async startTTS(): Promise<void> {
    if (!this.isTTSEngineCreated || !this.ttsEngine) {
      hilog.info(0x0000, TAG, 'TTS引擎未创建，正在创建...');
      await this.createTTSEngine();
      if (!this.isTTSEngineCreated || !this.ttsEngine) {
        hilog.error(0x0000, TAG, 'TTS引擎创建失败');
        return;
      }
    }
    
    if (this.isTTSPlaying) {
      this.stopTTS();
      return;
    }
    
    this.isTTSAutoPlay = true;
    
    try {
      const content = this.chapterContent;
      if (content && content.length > 0) {
        this.ttsText = content;
        this.speakText();
        hilog.info(0x0000, TAG, 'TTS朗读已开始');
      } else {
        hilog.warn(0x0000, TAG, '没有找到章节内容');
      }
    } catch (error) {
      hilog.error(0x0000, TAG, '获取章节内容失败: ' + JSON.stringify(error));
    }
  }

  /**
   * TTS朗读文本
   */
  private speakText(): void {
    if (!this.ttsEngine || !this.ttsText || this.ttsText.length === 0) {
      return;
    }
    
    let speakListener: textToSpeech.SpeakListener = {
      onStart: (requestId: string, response: textToSpeech.StartResponse) => {
        console.info(`onStart, requestId: ${requestId} response: ${JSON.stringify(response)}`);
        this.isTTSPlaying = true;
        this.currentSpeakingChapter = this.currentChapterIndex;
        this.requestBackgroundTask();
      },
      onComplete: (requestId: string, response: textToSpeech.CompleteResponse) => {
        console.info(`onComplete, requestId: ${requestId} response: ${JSON.stringify(response)}`);
        this.isTTSPlaying = false;
        this.pcmData.clear();
        this.bufferLength = 0;
        
        if (this.isTTSAutoPlay && this.currentChapterIndex < this.chapters.length - 1) {
          this.nextChapter();
          setTimeout(() => {
            this.startTTS();
          }, 1000);
        } else {
          this.cancelBackgroundTask();
        }
      },
      onStop: (requestId: string, response: textToSpeech.StopResponse) => {
        console.info(`onStop, requestId: ${requestId} response: ${JSON.stringify(response)}`);
        this.isTTSPlaying = false;
        this.pcmData.clear();
        this.bufferLength = 0;
        this.cancelBackgroundTask();
      },
      onData: (requestId: string, audio: ArrayBuffer, response: textToSpeech.SynthesisResponse) => {
        console.info(`onData, requestId: ${requestId} sequence: ${JSON.stringify(response)} audio: ${JSON.stringify(audio)}`);
        let uint8Array: Uint8Array = new Uint8Array(audio);
        this.pcmData.set(response.sequence, uint8Array);
        this.bufferLength += 1;
      },
      onError: (requestId: string, errorCode: number, errorMessage: string) => {
        if (errorCode === 1002300007) {
          this.isTTSEngineCreated = false;
        }
        console.error(`onError, requestId: ${requestId} errorCode: ${errorCode} errorMessage: ${errorMessage}`);
        this.isTTSPlaying = false;
      }
    };
    
    this.ttsEngine.setListener(speakListener);
    
    let extraParam: Record<string, Object> = {
      "queueMode": 0, 
      "speed": this.ttsSpeed, 
      "volume": 2, 
      "pitch": 1, 
      "languageContext": 'zh-CN', 
      "audioType": "pcm", 
      "soundChannel": 3, 
      "playType":1
    }
    let speakParams: textToSpeech.SpeakParams = {
      requestId: '123456' + Date.now(),
      extraParams: extraParam
    };
    
    this.ttsEngine.speak(this.ttsText, speakParams);
  }

  /**
   * 停止TTS朗读
   */
  private stopTTS(): void {
    if (this.ttsEngine) {
      try {
        if (this.isTTSPlaying) {
          this.ttsEngine.stop();
        }
        this.isTTSPlaying = false;
        this.isTTSAutoPlay = false;
        console.info("TTS朗读已停止");
      } catch (error) {
        console.error("停止TTS失败: " + error);
        this.isTTSPlaying = false;
        this.isTTSAutoPlay = false;
      }
    }
  }

  /**
   * 设置定时器
   */
  private setTimer(minutes: number): void {
    if (this.timerInterval !== -1) {
      clearInterval(this.timerInterval);
      this.timerInterval = -1;
    }
    
    this.timerMinutes = minutes;
    this.showTimerSheet = false;
    
    if (minutes > 0) {
      this.remainingTime = minutes * 60;
      
      this.timerInterval = setInterval(() => {
        this.remainingTime--;
        
        if (this.remainingTime <= 0) {
          this.stopTTS();
          this.timerMinutes = 0;
          clearInterval(this.timerInterval);
          this.timerInterval = -1;
          
          this.getUIContext()
            .getPromptAction()
            .showToast({ message: '定时朗读结束', duration: 2000 });
        }
      }, 1000);
      
      hilog.info(0x0000, TAG, `设置定时器: ${minutes}分钟`);
    } else {
      this.remainingTime = 0;
      hilog.info(0x0000, TAG, '关闭定时器');
    }
  }

  /**
   * 设置TTS朗读速度
   */
  private setTTSSpeed(speed: number): void {
    this.ttsSpeed = speed;
    this.showSpeedSheet = false;
    
    if (this.isTTSPlaying) {
      const wasAutoPlay = this.isTTSAutoPlay;
      this.isTTSAutoPlay = false;
      this.stopTTS();
      
      setTimeout(() => {
        this.isTTSAutoPlay = wasAutoPlay;
        this.startTTS();
      }, 500);
    }
    
    hilog.info(0x0000, TAG, `设置朗读速度: ${speed}x`);
  }

  /**
   * 申请后台任务
   */
  private async requestBackgroundTask(): Promise<void> {
    if (this.isBackgroundTaskActive) {
      hilog.info(0x0000, TAG, '后台任务已激活，无需重复申请');
      return;
    }

    try {
      const context = this.getUIContext().getHostContext() as common.UIAbilityContext;
      
      const delayInfo = await backgroundTaskManager.requestSuspendDelay('TTS_READING', () => {
        hilog.info(0x0000, TAG, '后台任务即将到期，准备续期');
        if (this.isTTSPlaying) {
          this.requestBackgroundTask();
        }
      });
      this.backgroundTaskId = delayInfo.requestId;

      this.isBackgroundTaskActive = true;
      hilog.info(0x0000, TAG, '后台延迟挂起任务申请成功');
    } catch (error) {
      hilog.error(0x0000, TAG, '申请后台任务失败: ' + JSON.stringify(error));
      hilog.warn(0x0000, TAG, 'TTS功能将在前台正常工作，但可能在应用切换到后台时被暂停');
    }
  }

  /**
   * 取消后台任务
   */
  private async cancelBackgroundTask(): Promise<void> {
    if (!this.isBackgroundTaskActive) {
      return;
    }

    try {
      if (this.backgroundTaskId !== -1) {
        backgroundTaskManager.cancelSuspendDelay(this.backgroundTaskId);
        this.backgroundTaskId = -1;
        hilog.info(0x0000, TAG, '延迟挂起任务已取消');
      }

      this.isBackgroundTaskActive = false;
      hilog.info(0x0000, TAG, '后台任务已取消');
    } catch (error) {
      hilog.error(0x0000, TAG, '取消后台任务失败: ' + JSON.stringify(error));
    }
  }

  /**
   * 构建目录列表
   */
  @Builder
  private buildCatalog(): void {
    Column() {
      Row() {
        Text('章节目录')
          .fontSize(18)
          .fontWeight(FontWeight.Medium)
          .fontColor('#2D3748')
          .layoutWeight(1)
          .textAlign(TextAlign.Center)

        Button() {
          SymbolGlyph($r('sys.symbol.xmark'))
            .fontColor(['#666666'])
            .fontSize(18)
        }
        .width(40)
        .height(40)
        .backgroundColor(Color.Transparent)
        .onClick(() => {
          this.showCatalog = false;
        })
      }
      .width('100%')
      .height(56)
      .padding({ left: 16, right: 16 })

      if (this.chapters.length > 0) {
        List({ scroller: this.catalogScroller }) {
          ForEach(this.chapters, (chapter: ChapterInfo, index: number) => {
            ListItem() {
              Row() {
                Text(`${index + 1}.`)
                  .fontSize(14)
                  .fontColor('#718096')
                  .width(40)

                Text(chapter.title)
                  .fontSize(14)
                  .fontColor(index === this.currentChapterIndex ? Color.Red : '#2D3748')
                  .fontWeight(index === this.currentChapterIndex ? FontWeight.Bold : FontWeight.Normal)
                  .layoutWeight(1)
                  .maxLines(1)
                  .textOverflow({ overflow: TextOverflow.Ellipsis })
              }
              .width('100%')
              .padding({
                left: 12,
                right: 12,
                top: 12,
                bottom: 12
              })
              .backgroundColor(index === this.currentChapterIndex ? '#FFF5F5' : '#F7FAFC')
              .borderRadius(8)
              .margin({ bottom: 8 })
              .onClick(() => {
                this.jumpToChapter(index);
              })
            }
          })
        }
        .height(520)
        .scrollBar(BarState.Auto)
        .padding({ left: 16, right: 16 })
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
    .padding({ top: 20, bottom: 20 })
    .backgroundColor(Color.White)
    .borderRadius({ topLeft: 16, topRight: 16 })
  }

  /**
   * 构建TTS朗读页面
   */
  @Builder
  private buildTTSPage(): void {
    Column() {
      Row() {
        Button() {
          SymbolGlyph($r('sys.symbol.chevron_left'))
            .width(32)
            .height(32)
            .fontColor(['#E6000000'])
        }
        .width(40)
        .height(40)
        .backgroundColor(Color.Transparent)
        .onClick(() => {
          this.showTTSPage = false;
        })
        
        Text('智能朗读')
          .fontSize(18)
          .fontWeight(FontWeight.Bold)
          .fontColor('#E6000000')
          .layoutWeight(1)
          .textAlign(TextAlign.Center)
        
        Button()
          .width(40)
          .height(40)
          .backgroundColor(Color.Transparent)
      }
      .width('100%')
      .height(108)
      .backgroundColor(Color.White)
      .padding({ left: 16, right: 16 })
      .justifyContent(FlexAlign.SpaceBetween)
      .alignItems(VerticalAlign.Bottom - 18)
      
      Column() {
        // 书籍封面
        Stack() {
          if (this.bookCoverUrl) {
            Image(this.bookCoverUrl)
              .draggable(false)
              .width(120)
              .aspectRatio(3 / 4)
              .borderRadius(8)
              .alt($r('app.media.zwfm'))
              .backgroundColor($r('sys.color.ohos_id_color_background'))
              .objectFit(ImageFit.Cover)
          } else {
            Image($r('app.media.zwfm'))
              .draggable(false)
              .width(120)
              .aspectRatio(3 / 4)
              .borderRadius(8)
              .backgroundColor($r('sys.color.ohos_id_color_background'))
              .objectFit(ImageFit.Cover)
          }
          
          // 添加书脊效果
          Image($r('app.media.spines'))
            .draggable(false)
            .aspectRatio(3 / 4)
            .width(120)
            .borderRadius(8)
            .position({ x: 0, y: 0 })
          
          // 添加阴影效果
          Image($r('app.media.cover_shadow'))
            .draggable(false)
            .width(120)
            .opacity(0.7)
            .aspectRatio(3)
            .position({ x: 0, y: 120 / 3 / 4 - 120 / 9 })
        }
        .width(120)
        .height(160)
        .margin({ top: 30, bottom: 30 })
        .shadow({ radius: 18, color: "#4D000000" })
        .borderRadius(8)
        
        // 书籍信息
        Column() {
          Text(this.bookTitle)
            .fontSize(18)
            .fontWeight(FontWeight.Bold)
            .maxLines(2)
            .textOverflow({ overflow: TextOverflow.Ellipsis })
            .margin({ bottom: 8 })
        }
        .width('80%')
        .margin({ bottom: 30 })
        
        Column() {
          Text(`当前章节: ${this.currentChapterIndex >= 0 ? this.chapters[this.currentChapterIndex]?.title || '' : '未开始'}`)
            .fontSize(14)
            .fontColor(Color.Gray)
            .margin({ bottom: 8 })
            .width('80%')
            .maxLines(2)
            .textOverflow({ overflow: TextOverflow.Ellipsis })
          
          Progress({
            value: this.currentChapterIndex >= 0 ? (this.currentChapterIndex + 1) / this.chapters.length * 100 : 0,
            total: 100,
            type: ProgressType.Linear
          })
            .width('80%')
            .height(8)
            .backgroundColor('#F1F3F5')
            .color(Color.Red)
        }
        .width('100%')
        .margin({ bottom: 40 })
        
        Row() {
          Button('上一章')
            .fontSize(14)
            .fontColor('#E6000000')
            .backgroundColor('#F7FAFC')
            .width(80)
            .height(40)
            .onClick(() => {
              this.previousChapter();
              if (this.isTTSPlaying) {
                this.stopTTS();
                setTimeout(() => {
                  this.startTTS();
                }, 500);
              }
            })
          
          Button(this.timerMinutes > 0 ? `定时${this.timerMinutes}分` : '定时')
            .fontSize(14)
            .fontColor(this.timerMinutes > 0 ? Color.White : '#E6000000')
            .backgroundColor(this.timerMinutes > 0 ? Color.Red : '#F7FAFC')
            .width(80)
            .height(40)
            .onClick(() => {
              this.showTimerSheet = true;
            })
          
          Button(`${this.ttsSpeed}x倍速`)
            .fontSize(14)
            .fontColor(this.ttsSpeed !== 1 ? Color.White : '#E6000000')
            .backgroundColor(this.ttsSpeed !== 1 ? Color.Red : '#F7FAFC')
            .width(80)
            .height(40)
            .onClick(() => {
              this.showSpeedSheet = true;
            })
          
          Button('下一章')
            .fontSize(14)
            .fontColor('#E6000000')
            .backgroundColor('#F7FAFC')
            .width(80)
            .height(40)
            .onClick(() => {
              this.nextChapter();
              if (this.isTTSPlaying) {
                this.stopTTS();
                setTimeout(() => {
                  this.startTTS();
                }, 500);
              }
            })
        }
        .width('100%')
        .justifyContent(FlexAlign.SpaceEvenly)
        .margin({ bottom: 40 })
        
        Button(this.isTTSPlaying ? '暂停朗读' : '开始朗读')
          .fontSize(16)
          .fontColor(Color.White)
          .backgroundColor(this.isTTSPlaying ? Color.Red : Color.Red)
          .width(160)
          .height(50)
          .onClick(() => {
            if (this.isTTSPlaying) {
              this.stopTTS();
            } else {
              this.startTTS();
            }
          })
      }
      .width('100%')
      .flexGrow(1)
      .alignItems(HorizontalAlign.Center)
    }
    .width('100%')
    .height('100%')
    .backgroundColor(Color.White)
    .zIndex(10)
    .bindSheet($$this.showTimerSheet, this.buildTimerSheet(), {
      height: 300,
      dragBar: true,
      backgroundColor: Color.White
    })
    .bindSheet($$this.showSpeedSheet, this.buildSpeedSheet(), {
      height: 250,
      dragBar: true,
      backgroundColor: Color.White
    })
  }

  /**
   * 构建定时器弹窗
   */
  @Builder
  private buildTimerSheet(): void {
    Column() {
      Text('定时朗读')
        .fontSize(18)
        .fontWeight(FontWeight.Medium)
        .fontColor('#2D3748')
        .margin({ bottom: 20 })
      
      Column() {
        Row() {
          Button('关闭定时')
            .fontSize(16)
            .fontColor(this.timerMinutes === 0 ? Color.White : '#2D3748')
            .backgroundColor(this.timerMinutes === 0 ? Color.Red : '#F7FAFC')
            .borderRadius(8)
            .width('45%')
            .height(44)
            .onClick(() => {
              this.setTimer(0);
            })
          
          Button('30分钟')
            .fontSize(16)
            .fontColor(this.timerMinutes === 30 ? Color.White : '#2D3748')
            .backgroundColor(this.timerMinutes === 30 ? Color.Red : '#F7FAFC')
            .borderRadius(8)
            .width('45%')
            .height(44)
            .onClick(() => {
              this.setTimer(30);
            })
        }
        .width('100%')
        .justifyContent(FlexAlign.SpaceBetween)
        .margin({ bottom: 16 })
        
        Row() {
          Button('60分钟')
            .fontSize(16)
            .fontColor(this.timerMinutes === 60 ? Color.White : '#2D3748')
            .backgroundColor(this.timerMinutes === 60 ? Color.Red : '#F7FAFC')
            .borderRadius(8)
            .width('45%')
            .height(44)
            .onClick(() => {
              this.setTimer(60);
            })
          
          Button('90分钟')
            .fontSize(16)
            .fontColor(this.timerMinutes === 90 ? Color.White : '#2D3748')
            .backgroundColor(this.timerMinutes === 90 ? Color.Red : '#F7FAFC')
            .borderRadius(8)
            .width('45%')
            .height(44)
            .onClick(() => {
              this.setTimer(90);
            })
        }
        .width('100%')
        .justifyContent(FlexAlign.SpaceBetween)
      }
      
      if (this.timerMinutes > 0 && this.remainingTime > 0) {
        Text(`剩余时间: ${Math.floor(this.remainingTime / 60)}分${this.remainingTime % 60}秒`)
          .fontSize(14)
          .fontColor('#718096')
          .margin({ top: 20 })
      }
    }
    .padding(20)
    .backgroundColor(Color.White)
    .borderRadius({ topLeft: 16, topRight: 16 })
  }

  /**
   * 构建倍速弹窗
   */
  @Builder
  private buildSpeedSheet(): void {
    Column() {
      Text('朗读倍速')
        .fontSize(18)
        .fontWeight(FontWeight.Medium)
        .fontColor('#2D3748')
        .margin({ bottom: 20 })
      
      Scroll() {
        Row({ space: 12 }) {
          ForEach([0.5, 0.75, 1, 1.25, 1.5, 2], (speed: number) => {
            Button(`${speed}x`)
              .fontSize(16)
              .fontColor(this.ttsSpeed === speed ? Color.White : '#2D3748')
              .backgroundColor(this.ttsSpeed === speed ? Color.Red : '#F7FAFC')
              .borderRadius(8)
              .width(80)
              .height(44)
              .onClick(() => {
                this.setTTSSpeed(speed);
              })
          })
        }
        .padding({ left: 8, right: 8 })
      }
      .scrollable(ScrollDirection.Horizontal)
      .scrollBar(BarState.Off)
      .width('100%')
      .margin({ bottom: 16 })
      
      Text('选择朗读速度，1x为正常速度')
        .fontSize(12)
        .fontColor('#A0AEC0')
        .textAlign(TextAlign.Center)
    }
    .padding(20)
    .backgroundColor(Color.White)
    .borderRadius({ topLeft: 16, topRight: 16 })
  }

  /**
   * 构建设置面板
   */
  @Builder
  private buildSettings(): void {
    Column() {
      Row() {
        Text('阅读设置')
          .fontSize(18)
          .fontWeight(FontWeight.Medium)
          .fontColor('#2D3748')
          .layoutWeight(1)
          .textAlign(TextAlign.Center)

        Button() {
          SymbolGlyph($r('sys.symbol.xmark'))
            .fontColor(['#666666'])
            .fontSize(18)
        }
        .width(40)
        .height(40)
        .backgroundColor(Color.Transparent)
        .onClick(() => {
          this.showSettings = false;
        })
      }
      .width('100%')
      .height(56)
      .padding({ left: 16, right: 16 })
      .margin({ bottom: 20 })

      // 字体大小
      Row() {
        Text('字体大小')
          .fontSize(14)

        Blank()

        Button('-')
          .fontSize(18)
          .width(40)
          .height(40)
          .onClick(() => {
            if (this.fontSize > 12) {
              this.fontSize--;
              this.saveSettings();
            }
          })

        Text(this.fontSize.toString())
          .fontSize(16)
          .width(40)
          .textAlign(TextAlign.Center)

        Button('+')
          .fontSize(18)
          .width(40)
          .height(40)
          .onClick(() => {
            if (this.fontSize < 32) {
              this.fontSize++;
              this.saveSettings();
            }
          })
      }
      .width('100%')
      .margin({ bottom: 16 })
      .padding({ left: 16, right: 16 })

      // 行间距
      Row() {
        Text('行间距')
          .fontSize(14)

        Blank()

        Button('-')
          .fontSize(18)
          .width(40)
          .height(40)
          .onClick(() => {
            if (this.lineHeight > 1.0) {
              this.lineHeight = Math.round((this.lineHeight - 0.1) * 10) / 10;
              this.saveSettings();
            }
          })

        Text(this.lineHeight.toFixed(1))
          .fontSize(16)
          .width(40)
          .textAlign(TextAlign.Center)

        Button('+')
          .fontSize(18)
          .width(40)
          .height(40)
          .onClick(() => {
            if (this.lineHeight < 3.0) {
              this.lineHeight = Math.round((this.lineHeight + 0.1) * 10) / 10;
              this.saveSettings();
            }
          })
      }
      .width('100%')
      .margin({ bottom: 16 })
      .padding({ left: 16, right: 16 })

      Text()
        .width('92%')
        .height(1)
        .margin({ top: 12, bottom: 12 })
        .backgroundColor($r('app.color.ic_bg_grey'))

      // 主题选择
      Scroll() {
        Row({ space: 12 }) {
          ForEach(this.themeList, (item: string, index: number) => {
            Stack() {
              Row()
                .width('100%')
                .height(40)
                .borderWidth(this.themeSelectIndex !== index ? 1 : 2)
                .borderColor(this.themeSelectIndex !== index ? $r('app.color.ic_border_unselect') :
                  this.themeBorderColor[this.themeSelectIndex])
                .backgroundColor(this.THEME_BUTTON_BACKGROUND[item.toString()])
                .borderRadius(20)
            }
            .width(`calc((100% - ${(Number(this.themeList.length) - 1) * 12}vp) / ${Number(this.themeList.length)})`)
            .constraintSize({
              minWidth: 60
            })
            .borderRadius(30)
            .borderStyle(BorderStyle.Solid)
            .onClick(async () => {
              this.themeSelectIndex = index;
              this.applyTheme(item, index);
              await this.saveSettings();
            })
          })
        }
        .constraintSize({
          minWidth: '100%'
        })
        .padding({
          left: 12,
          right: 12,
          top: 12,
          bottom: 12
        })
      }
      .margin({ top: 8 })
      .scrollable(ScrollDirection.Horizontal)
      .scrollBar(BarState.Off)
      .edgeEffect(EdgeEffect.Spring)
    }
    .padding({ top: 20, bottom: 20 })
    .backgroundColor(Color.White)
    .borderRadius({ topLeft: 16, topRight: 16 })
  }

  build() {
    Stack() {
      // 主内容区域
      Column() {
        // 顶部标题栏（条件显示）
        if (this.showToolbar) {
          Row() {
            Button() {
              SymbolGlyph($r('sys.symbol.chevron_left'))
                .fontColor([this.fontColor])
                .fontSize(24)
            }
            .width(40)
            .height(40)
            .backgroundColor(Color.Transparent)
            .onClick(() => {
              this.goBack();
            })

            Text(this.bookTitle)
              .fontSize(16)
              .fontColor(this.fontColor)
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
          .height(88)
          .padding({
            left: 16,
            right: 16,
            top: 36,
            bottom: 12
          })
          .backgroundColor('rgba(255, 255, 255, 0.95)')
          .backdropBlur(10)
          .shadow({
            radius: 8,
            color: 'rgba(0, 0, 0, 0.1)',
            offsetX: 0,
            offsetY: 2
          })
          .expandSafeArea([SafeAreaType.SYSTEM], [SafeAreaEdge.TOP])
        }

        // 主要内容区域
        if (this.isLoading) {
          // 加载状态
          Column() {
            LoadingProgress()
              .width(50)
              .height(50)
              .color(Color.Blue)

            Text('正在加载章节内容...')
              .fontSize(14)
              .fontColor('#666666')
              .margin({ top: 16 })
          }
          .width('100%')
          .layoutWeight(1)
          .justifyContent(FlexAlign.Center)
          .backgroundColor(this.backgroundColorValue)
        } else if (this.errorMessage) {
          // 错误状态
          Column() {
            Text('😞')
              .fontSize(48)
              .margin({ bottom: 16 })

            Text(this.errorMessage)
              .fontSize(14)
              .fontColor('#E53E3E')
              .textAlign(TextAlign.Center)
              .margin({ bottom: 24 })

            Button('重新加载')
              .fontSize(14)
              .fontColor(Color.White)
              .backgroundColor(Color.Blue)
              .onClick(() => {
                this.loadChapter(this.currentChapterIndex);
              })
          }
          .width('100%')
          .layoutWeight(1)
          .justifyContent(FlexAlign.Center)
          .padding(32)
          .backgroundColor(this.backgroundColorValue)
        } else {
          // 正常内容显示
          Scroll(this.contentScroller) {
            Column() {
              // 章节标题
              if (this.chapters[this.currentChapterIndex]) {
                Text(this.chapters[this.currentChapterIndex].title)
                  .fontSize(20)
                  .fontWeight(FontWeight.Bold)
                  .fontColor(this.fontColor)
                  .textAlign(TextAlign.Center)
                  .width('100%')
                  .margin({ bottom: 24 })
              }

              // 章节内容
              Text(this.chapterContent)
                .fontSize(this.fontSize)
                .fontColor(this.fontColor)
                .lineHeight(this.fontSize * this.lineHeight)
                .width('100%')
                .textAlign(TextAlign.Start)
                .fontFamily(this.fontFamily)
            }
            .width('100%')
            .padding({
              left: 20,
              right: 20,
              top: 20,
              bottom: 20
            })
          }
          .width('100%')
          .layoutWeight(1)
          .backgroundColor(this.backgroundColorValue)
          .scrollBar(BarState.Auto)
          .edgeEffect(EdgeEffect.Spring)
          .onClick(() => {
            this.toggleToolbar();
          })
        }

        // 底部工具栏（条件显示）
        if (this.showToolbar) {
          Stack() {
            Row() {
              Button('上一章')
                .fontSize(14)
                .fontColor(this.currentChapterIndex > 0 ? '#E6000000' : '#99000000')
                .backgroundColor('#F7FAFC')
                .enabled(this.currentChapterIndex > 0)
                .layoutWeight(1)
                .height(48)
                .onClick(() => {
                  this.previousChapter();
                })

              Button('目录')
                .fontSize(14)
                .fontColor('#E6000000')
                .backgroundColor('#F7FAFC')
                .layoutWeight(1)
                .height(48)
                .margin({ left: 8, right: 8 })
                .onClick(() => {
                  this.showCatalog = true;
                  // 延迟滚动到当前章节，确保目录已渲染
                  setTimeout(() => {
                    this.catalogScroller.scrollToIndex(this.currentChapterIndex, true, ScrollAlign.CENTER);
                  }, 100);
                })

              Button('设置')
                .fontSize(14)
                .fontColor('#E6000000')
                .backgroundColor('#F7FAFC')
                .layoutWeight(1)
                .height(48)
                .margin({ right: 8 })
                .onClick(() => {
                  this.showSettings = true;
                })

              Button('下一章')
                .fontSize(14)
                .fontColor(this.currentChapterIndex < this.chapters.length - 1 ? '#E6000000' : '#99000000')
                .backgroundColor('#F7FAFC')
                .enabled(this.currentChapterIndex < this.chapters.length - 1)
                .layoutWeight(1)
                .height(48)
                .onClick(() => {
                  this.nextChapter();
                })
            }
            .width('100%')
            .height(80)
            .padding({
              left: 16,
              right: 16,
              top: 16,
              bottom: 16
            })
            .backgroundColor('rgba(255, 255, 255, 0.95)')
            .backdropBlur(10)
            .shadow({
              radius: 8,
              color: 'rgba(0, 0, 0, 0.1)',
              offsetX: 0,
              offsetY: -2
            })
            .expandSafeArea([SafeAreaType.SYSTEM], [SafeAreaEdge.BOTTOM])
            
            // 悬浮朗读按钮 - 放在工具栏右上角
            Button() {
              Image($r('app.media.headset'))
                .width(24)
                .height(24)
            }
            .width(56)
            .height(56)
            .borderRadius(28)
            .backgroundColor(Color.White)
            .position({ x: '83%', y: -64 })
            .zIndex(5)
            .shadow({ radius: 8, color: 'rgba(0, 122, 255, 0.4)', offsetX: 0, offsetY: 2 })
            .onClick(() => {
              this.showTTSPage = true;
            })
          }
          .alignContent(Alignment.TopEnd)
        }
      }
      .width('100%')
      .height('100%')

      // 目录弹窗
      if (this.showCatalog) {
        Column() {
          Blank()
          this.buildCatalog()
        }
        .width('100%')
        .height('100%')
        .backgroundColor('rgba(0, 0, 0, 0.5)')
        .onClick(() => {
          this.showCatalog = false;
        })
      }

      // 设置弹窗
      if (this.showSettings) {
        Column() {
          Blank()
          this.buildSettings()
        }
        .width('100%')
        .height('100%')
        .backgroundColor('rgba(0, 0, 0, 0.5)')
        .onClick(() => {
          this.showSettings = false;
        })
      }

      // TTS朗读页面
      if (this.showTTSPage) {
        this.buildTTSPage()
      }
    }
  }
}
