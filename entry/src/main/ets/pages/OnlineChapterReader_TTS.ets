// 这是一个临时文件，包含需要添加到 OnlineChapterReader.ets 的TTS方法
// 请将以下方法添加到 OnlineChapterReader.ets 的 saveSettings() 方法之后

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
