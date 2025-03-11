const { BrowserWindow, ipcMain } = require("electron");

class WindowNotification {
  constructor(options) {
    this.options = options;
    this.window = null;
  }

  show() {
    if (this.window) {
      this.window.focus();
      return;
    }

    // 动态计算窗口高度
    const windowHeight = this.calculateHeight();

    // 创建通知窗口
    this.window = new BrowserWindow({
      width: 300,
      height: windowHeight, // 使用动态计算的高度
      show: false, // 初始时不显示
      frame: false, // 无边框窗口
      resizable: false,
      alwaysOnTop: true, // 始终置顶
      hasShadow: false,
      transparent: true,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
    });

    // 加载通知内容
    this.window.loadURL(
      `data:text/html;charset=UTF-8,${encodeURIComponent(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Notification</title>
        <style>
        html{
        border-radius: 10px;
        }
          body {
            margin: 0;
            padding: 15px;
            font-family: Arial, sans-serif;
            background-color: #f2f2f2;
            color: #333;
            border-radius: 10px;
            cursor: pointer;
            overflow:hidden;
          }
          body::-webkit-scrollbar {
            display: none; /* Chrome Safari */
          }
          img {
            width: 32px;
            height: 32px;
            border-radius: 50%;
          }
          .notification {
            display: flex;
            align-items: center;
            gap: 10px;
            position: relative;
            width: 100%;
            height: 100%;
          }
          .notification::-webkit-scrollbar {
            display: none; /* Chrome Safari */
          }
          .icon {
            flex-shrink: 0;
          }
          .content {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            word-wrap: break-word;
          }
          .title {
            font-weight: bold;
            font-size: 14px;
            margin-bottom: 5px;
          }
          .body {
            font-size: 12px;
            border-radius:20px;
            color: #666;
            white-space: pre-wrap; /* 允许换行 */
          }
          .close-btn {
            position: absolute;
            top: 5px;
            right: 5px;
            border: none;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            color: #666;
            font-size: 14px;
            line-height: 1;
            padding: 0;
            transition: background-color 0.2s, color 0.2s;
            opacity: 0;
            visibility: hidden;
            position:absolute;
            right:-5px;
            top:-5px;
          }
          .notification:hover .close-btn {
            opacity: 1;
            visibility: visible;
            color:black
          }
          .close-btn:hover {
            background-color: rgba(0, 0, 0, 0.2);
            color: #333;
          }
        </style>
      </head>
      <body>
        <div class="notification">
          ${
            this.options.icon
              ? `<img src="data:image/png;base64,${this.options.icon}" class="icon" />`
              : ""
          }
          <div class="content">
            <div class="title">${this.options.title || "Notification"}</div>
            <div class="body">${
              this.options.body || "This is a notification."
            }</div>
          </div>
          <button class="close-btn" onclick="window.closeWindow()">×</button>
        </div>
        <script>
          window.closeWindow = () => {
            window.electron.closeNotification();
          };

          // 点击通知窗口时触发事件
          document.querySelector('.notification').addEventListener('click', () => {
            window.electron.notificationClicked();
          });
        </script>
      </body>
      </html>
    `)}`
    );

    // 监听关闭事件
    ipcMain.on("close-notification", () => {
      this.close();
    });

    // 监听点击事件
    ipcMain.on("notification-clicked", () => {
      if (this.options.onClick) {
        this.options.onClick();
      }
    });

    // 将 electron API 暴露给渲染进程
    this.window.webContents.executeJavaScript(`
      window.electron = {
        closeNotification: () => { require('electron').ipcRenderer.send('close-notification'); },
        notificationClicked: () => { require('electron').ipcRenderer.send('notification-clicked'); }
      };
    `);

    // 显示窗口
    this.window.once("ready-to-show", () => {
      this.window.show();
      this.positionWindow();
    });

    // 关闭窗口时清理
    this.window.on("closed", () => {
      if (this.options.onClose) {
        this.options.onClose(); // 触发关闭回调
      }
      this.window = null;
    });
  }

  calculateHeight() {
    // 基础高度
    const baseHeight = 56; // 基础高度（标题 + 内边距）

    // 计算内容高度
    const bodyText = this.options.body || "";
    const lineHeight = 11; // 每行文字的高度（根据字体大小调整）
    const maxWidth = 250; // 内容区域的最大宽度（根据窗口宽度和内边距调整）
    const words = bodyText.split(" ");
    let lines = 1;
    let currentLineLength = 0;

    // 模拟换行逻辑
    words.forEach((word) => {
      currentLineLength += word.length + 1; // 单词长度 + 空格
      if (currentLineLength > maxWidth / 8) {
        // 假设每个字符宽度为 8px
        lines++;
        currentLineLength = word.length;
      }
    });

    // 计算总高度
    const contentHeight = lines * lineHeight;
    const totalHeight = baseHeight + contentHeight;

    return Math.min(totalHeight, 400); // 限制最大高度为 400px
  }

  positionWindow() {
    if (!this.window) return;

    // 获取屏幕尺寸
    const { width, height } =
      require("electron").screen.getPrimaryDisplay().workAreaSize;

    // 设置窗口位置（右下角）
    const windowWidth = this.window.getSize()[0];
    const windowHeight = this.window.getSize()[1];
    const x = width - windowWidth - 20; // 20px 边距
    const y = height - windowHeight - 20; // 20px 边距

    this.window.setPosition(x, y);
  }

  close() {
    if (this.window) {
      this.window.close(); // 主动关闭窗口
    }
  }
}

module.exports = WindowNotification;
