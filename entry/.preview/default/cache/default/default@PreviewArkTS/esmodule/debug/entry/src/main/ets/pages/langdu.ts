if (!("finalizeConstruction" in ViewPU.prototype)) {
    Reflect.set(ViewPU.prototype, "finalizeConstruction", () => { });
}
interface SmartReadUI_Params {
    currentChapter?: string;
    voiceOptions?: Array<string>;
    currentVoice?: string;
    progress?: number;
}
class SmartReadUI extends ViewPU {
    constructor(parent, params, __localStorage, elmtId = -1, paramsLambda = undefined, extraInfo) {
        super(parent, __localStorage, elmtId, extraInfo);
        if (typeof paramsLambda === "function") {
            this.paramsGenerator_ = paramsLambda;
        }
        this.__currentChapter = new ObservedPropertySimplePU('第147章 别小瞧我们的羁绊！投…', this, "currentChapter");
        this.__voiceOptions = new ObservedPropertyObjectPU(['成熟大叔音', '甜美少女音', '开朗青年音'], this, "voiceOptions");
        this.__currentVoice = new ObservedPropertySimplePU('成熟大叔音', this, "currentVoice");
        this.__progress = new ObservedPropertySimplePU(0.5, this, "progress");
        this.setInitiallyProvidedValue(params);
        this.finalizeConstruction();
    }
    setInitiallyProvidedValue(params: SmartReadUI_Params) {
        if (params.currentChapter !== undefined) {
            this.currentChapter = params.currentChapter;
        }
        if (params.voiceOptions !== undefined) {
            this.voiceOptions = params.voiceOptions;
        }
        if (params.currentVoice !== undefined) {
            this.currentVoice = params.currentVoice;
        }
        if (params.progress !== undefined) {
            this.progress = params.progress;
        }
    }
    updateStateVars(params: SmartReadUI_Params) {
    }
    purgeVariableDependenciesOnElmtId(rmElmtId) {
        this.__currentChapter.purgeDependencyOnElmtId(rmElmtId);
        this.__voiceOptions.purgeDependencyOnElmtId(rmElmtId);
        this.__currentVoice.purgeDependencyOnElmtId(rmElmtId);
        this.__progress.purgeDependencyOnElmtId(rmElmtId);
    }
    aboutToBeDeleted() {
        this.__currentChapter.aboutToBeDeleted();
        this.__voiceOptions.aboutToBeDeleted();
        this.__currentVoice.aboutToBeDeleted();
        this.__progress.aboutToBeDeleted();
        SubscriberManager.Get().delete(this.id__());
        this.aboutToBeDeletedInternal();
    }
    private __currentChapter: ObservedPropertySimplePU<string>;
    get currentChapter() {
        return this.__currentChapter.get();
    }
    set currentChapter(newValue: string) {
        this.__currentChapter.set(newValue);
    }
    private __voiceOptions: ObservedPropertyObjectPU<Array<string>>;
    get voiceOptions() {
        return this.__voiceOptions.get();
    }
    set voiceOptions(newValue: Array<string>) {
        this.__voiceOptions.set(newValue);
    }
    private __currentVoice: ObservedPropertySimplePU<string>;
    get currentVoice() {
        return this.__currentVoice.get();
    }
    set currentVoice(newValue: string) {
        this.__currentVoice.set(newValue);
    }
    private __progress: ObservedPropertySimplePU<number>; // 添加滑块进度状态变量
    get progress() {
        return this.__progress.get();
    }
    set progress(newValue: number) {
        this.__progress.set(newValue);
    }
    initialRender(): void {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.debugLine("entry/src/main/ets/pages/langdu.ets(14:5)", "entry");
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 顶部状态栏
            Row.create();
            Row.debugLine("entry/src/main/ets/pages/langdu.ets(16:7)", "entry");
            // 顶部状态栏
            Row.height(50);
            // 顶部状态栏
            Row.backgroundColor(Color.Gray);
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('智能朗读');
            Text.debugLine("entry/src/main/ets/pages/langdu.ets(17:9)", "entry");
            Text.fontSize(20);
            Text.fontWeight(FontWeight.Bold);
            Text.width('100%');
            Text.textAlign(TextAlign.Center);
        }, Text);
        Text.pop();
        // 顶部状态栏
        Row.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 小说封面与标题区域
            Stack.create();
            Stack.debugLine("entry/src/main/ets/pages/langdu.ets(27:7)", "entry");
            // 小说封面与标题区域
            Stack.width('100%');
            // 小说封面与标题区域
            Stack.height(300);
        }, Stack);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Image.create('novel_cover.png');
            Image.debugLine("entry/src/main/ets/pages/langdu.ets(28:9)", "entry");
            Image.width('90%');
            Image.height(300);
            Image.objectFit(ImageFit.Cover);
            Image.backgroundColor(Color.Gray);
            Image.shadow({ radius: 10 });
        }, Image);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.debugLine("entry/src/main/ets/pages/langdu.ets(34:9)", "entry");
            Column.width('90%');
            Column.height(300);
            Column.backgroundColor(Color.Gray);
            Column.opacity(0.8);
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('木叶：别小瞧我们的羁绊！投降输一');
            Text.debugLine("entry/src/main/ets/pages/langdu.ets(35:11)", "entry");
            Text.fontSize(24);
            Text.fontWeight(FontWeight.Bold);
            Text.width('90%');
            Text.textAlign(TextAlign.Center);
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('木叶：吃下闪闪果实，接管第七班！');
            Text.debugLine("entry/src/main/ets/pages/langdu.ets(40:11)", "entry");
            Text.fontSize(18);
            Text.width('90%');
            Text.textAlign(TextAlign.Center);
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('海底的秘密/著');
            Text.debugLine("entry/src/main/ets/pages/langdu.ets(44:11)", "entry");
            Text.fontSize(14);
            Text.width('90%');
            Text.textAlign(TextAlign.Center);
        }, Text);
        Text.pop();
        Column.pop();
        // 小说封面与标题区域
        Stack.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 播放进度条
            Row.create();
            Row.debugLine("entry/src/main/ets/pages/langdu.ets(58:7)", "entry");
            // 播放进度条
            Row.height(50);
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('06:25');
            Text.debugLine("entry/src/main/ets/pages/langdu.ets(59:9)", "entry");
            Text.fontSize(16);
            Text.width(50);
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Slider.create();
            Slider.debugLine("entry/src/main/ets/pages/langdu.ets(62:9)", "entry");
            Slider.width('80%');
        }, Slider);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('09:09');
            Text.debugLine("entry/src/main/ets/pages/langdu.ets(64:9)", "entry");
            Text.fontSize(16);
            Text.width(50);
        }, Text);
        Text.pop();
        // 播放进度条
        Row.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 播放控制按钮
            Row.create();
            Row.debugLine("entry/src/main/ets/pages/langdu.ets(71:7)", "entry");
            // 播放控制按钮
            Row.height(50);
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Button.createWithLabel('上一章');
            Button.debugLine("entry/src/main/ets/pages/langdu.ets(72:9)", "entry");
            Button.width(50);
            Button.height(50);
        }, Button);
        Button.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Button.createWithLabel('播放/暂停');
            Button.debugLine("entry/src/main/ets/pages/langdu.ets(75:9)", "entry");
            Button.width(50);
            Button.height(50);
        }, Button);
        Button.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Button.createWithLabel('下一章');
            Button.debugLine("entry/src/main/ets/pages/langdu.ets(78:9)", "entry");
            Button.width(50);
            Button.height(50);
        }, Button);
        Button.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Button.createWithLabel('快进15秒');
            Button.debugLine("entry/src/main/ets/pages/langdu.ets(81:9)", "entry");
            Button.width(50);
            Button.height(50);
        }, Button);
        Button.pop();
        // 播放控制按钮
        Row.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 功能按钮区域
            Row.create();
            Row.debugLine("entry/src/main/ets/pages/langdu.ets(88:7)", "entry");
            // 功能按钮区域
            Row.height(50);
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Button.createWithLabel('目录');
            Button.debugLine("entry/src/main/ets/pages/langdu.ets(89:9)", "entry");
            Button.width(50);
            Button.height(50);
        }, Button);
        Button.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Button.createWithLabel('定时');
            Button.debugLine("entry/src/main/ets/pages/langdu.ets(92:9)", "entry");
            Button.width(50);
            Button.height(50);
        }, Button);
        Button.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Button.createWithLabel('1.5x');
            Button.debugLine("entry/src/main/ets/pages/langdu.ets(95:9)", "entry");
            Button.width(50);
            Button.height(50);
        }, Button);
        Button.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Button.createWithLabel('加入书架');
            Button.debugLine("entry/src/main/ets/pages/langdu.ets(98:9)", "entry");
            Button.width(50);
            Button.height(50);
        }, Button);
        Button.pop();
        // 功能按钮区域
        Row.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 当前章节提示
            Row.create();
            Row.debugLine("entry/src/main/ets/pages/langdu.ets(105:7)", "entry");
            // 当前章节提示
            Row.height(50);
            // 当前章节提示
            Row.backgroundColor(Color.Gray);
            // 当前章节提示
            Row.opacity(0.8);
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('边听边读');
            Text.debugLine("entry/src/main/ets/pages/langdu.ets(106:9)", "entry");
            Text.fontSize(16);
            Text.width(100);
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(this.currentChapter);
            Text.debugLine("entry/src/main/ets/pages/langdu.ets(109:9)", "entry");
            Text.fontSize(16);
            Text.width('70%');
            Text.textAlign(TextAlign.Center);
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Button.createWithLabel('下一章');
            Button.debugLine("entry/src/main/ets/pages/langdu.ets(113:9)", "entry");
            Button.width(50);
            Button.height(50);
        }, Button);
        Button.pop();
        // 当前章节提示
        Row.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 声音选项按钮
            Row.create();
            Row.debugLine("entry/src/main/ets/pages/langdu.ets(122:7)", "entry");
            // 声音选项按钮
            Row.height(50);
            // 声音选项按钮
            Row.backgroundColor(Color.Gray);
            // 声音选项按钮
            Row.opacity(0.8);
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Button.createWithLabel(this.voiceOptions[0]);
            Button.debugLine("entry/src/main/ets/pages/langdu.ets(123:9)", "entry");
            Button.width('33%');
            Button.height(50);
            Button.onClick(() => { this.currentVoice = this.voiceOptions[0]; });
        }, Button);
        Button.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Button.createWithLabel(this.voiceOptions[1]);
            Button.debugLine("entry/src/main/ets/pages/langdu.ets(127:9)", "entry");
            Button.width('33%');
            Button.height(50);
            Button.onClick(() => { this.currentVoice = this.voiceOptions[1]; });
        }, Button);
        Button.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Button.createWithLabel(this.voiceOptions[2]);
            Button.debugLine("entry/src/main/ets/pages/langdu.ets(131:9)", "entry");
            Button.width('33%');
            Button.height(50);
            Button.onClick(() => { this.currentVoice = this.voiceOptions[2]; });
        }, Button);
        Button.pop();
        // 声音选项按钮
        Row.pop();
        Column.pop();
    }
    rerender() {
        this.updateDirtyElements();
    }
    static getEntryName(): string {
        return "SmartReadUI";
    }
}
registerNamedRoute(() => new SmartReadUI(undefined, {}), "", { bundleName: "liubai.yuedu.hos", moduleName: "entry", pagePath: "pages/langdu", pageFullPath: "entry/src/main/ets/pages/langdu", integratedHsp: "false", moduleType: "followWithHap" });
