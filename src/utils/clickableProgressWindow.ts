import { ProgressWindowHelper } from "zotero-plugin-toolkit/dist/helpers/progressWindow";

// 用以点击的progresswindow窗口，不要设置closeTime，否则会在自动消失后也回调close
export class clickableProgressWindow {
  public window: ProgressWindowHelper;

  private originalCloseCallback: VoidFunction;
  private clickCallback: VoidFunction;

  public constructor(
    title: string,
    options: {
      type?: string;
      icon?: string;
      text?: string;
      progress?: number;
      idx?: number;
    },
    clickCallback: VoidFunction,
  ) {
    this.window = new ztoolkit.ProgressWindow(title, {
      closeOnClick: true,
    }).createLine(options);
    this.originalCloseCallback = this.window.close;
    this.clickCallback = clickCallback;
    window.addEventListener(
      "close",
      (e: Event) => {
        if (this.window) {
          this.window.close = this.originalCloseCallback;
        }
      },
      false,
    );
  }

  public show() {
    this.originalCloseCallback = this.window.close;
    this.window.close = () => {
      this.originalCloseCallback();
      this.clickCallback();
    };
    this.window.show(-1);
  }

  public close() {
    this.window.close = this.originalCloseCallback;
    this.window.close();
  }
}
