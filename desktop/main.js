const { app, BrowserWindow, Tray, Menu, nativeImage, screen, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const DASHBOARD_URL = 'https://web-rho-tan-51.vercel.app';
const WIN_WIDTH = 420;
const WIN_HEIGHT = 600;
const PREFS_PATH = path.join(app.getPath('userData'), 'window-prefs.json');

let win = null;
let tray = null;
let isPinned = false;
let savedPosition = null; // { x, y }

// ── 위치 저장/복원 ──

function loadPrefs() {
  try {
    const data = JSON.parse(fs.readFileSync(PREFS_PATH, 'utf8'));
    if (data.x !== undefined && data.y !== undefined) savedPosition = { x: data.x, y: data.y };
    if (data.pinned) isPinned = data.pinned;
  } catch { /* 첫 실행 */ }
}

function savePrefs() {
  const pos = win.getPosition();
  const data = { x: pos[0], y: pos[1], pinned: isPinned };
  try { fs.writeFileSync(PREFS_PATH, JSON.stringify(data)); } catch {}
}

// Dock 아이콘 숨김 — 순수 메뉴바 앱
app.dock?.hide();

function createWindow() {
  win = new BrowserWindow({
    width: WIN_WIDTH,
    height: WIN_HEIGHT,
    show: false,
    frame: false,
    resizable: false,
    movable: true,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    transparent: true,
    vibrancy: 'popover',
    visualEffectState: 'active',
    roundedCorners: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // 로컬 상태 페이지 로드
  win.loadFile(path.join(__dirname, 'status.html'));

  // 창 이동 시 위치 저장
  win.on('moved', () => {
    savePrefs();
  });

  // 포커스 잃으면 자동 숨김 (핀 안 됐을 때만)
  win.on('blur', () => {
    if (!isPinned) {
      savePrefs();
      win.hide();
    }
  });

  // 핀 상태를 렌더러에 전달 (페이지 로드 후)
  win.webContents.on('did-finish-load', () => {
    win.webContents.send('pin-state', isPinned);
  });
}

function createTray() {
  const trayIcon = nativeImage.createFromPath(
    path.join(__dirname, 'trayIcon.png')
  );
  trayIcon.setTemplateImage(true);

  tray = new Tray(trayIcon);
  tray.setToolTip('ARC Monitor');

  // 좌클릭 → 팝업 토글
  tray.on('click', () => {
    toggleWindow();
  });

  // 우클릭 → 컨텍스트 메뉴
  tray.on('right-click', () => {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: '대시보드 열기',
        click: () => shell.openExternal(DASHBOARD_URL),
      },
      { type: 'separator' },
      {
        label: '종료',
        click: () => {
          savePrefs();
          app.isQuitting = true;
          app.quit();
        },
      },
    ]);
    tray.popUpContextMenu(contextMenu);
  });
}

// IPC
ipcMain.on('open-external', (_e, url) => {
  shell.openExternal(url);
});

ipcMain.on('set-pin', (_e, value) => {
  isPinned = value;
  savePrefs();
});

ipcMain.on('resize-height', (_e, height) => {
  const clamped = Math.min(Math.max(height, 120), 800);
  win.setSize(WIN_WIDTH, clamped, true);
});

function toggleWindow() {
  if (win.isVisible()) {
    savePrefs();
    win.hide();
  } else {
    showWindow();
  }
}

function showWindow() {
  if (savedPosition) {
    // 저장된 위치가 현재 화면 안에 있는지 확인
    const display = screen.getDisplayNearestPoint(savedPosition);
    const { x: wx, y: wy, width: ww, height: wh } = display.workArea;
    const x = Math.max(wx, Math.min(savedPosition.x, wx + ww - WIN_WIDTH));
    const y = Math.max(wy, Math.min(savedPosition.y, wy + wh - WIN_HEIGHT));
    win.setPosition(x, y, false);
  } else {
    // 첫 실행: 트레이 아이콘 아래 중앙
    const trayBounds = tray.getBounds();
    const display = screen.getDisplayNearestPoint({ x: trayBounds.x, y: trayBounds.y });
    const x = Math.round(trayBounds.x + trayBounds.width / 2 - WIN_WIDTH / 2);
    const y = trayBounds.y + trayBounds.height + 4;
    const clampedX = Math.max(
      display.workArea.x,
      Math.min(x, display.workArea.x + display.workArea.width - WIN_WIDTH)
    );
    win.setPosition(clampedX, y, false);
  }

  win.show();
  win.focus();
}

app.whenReady().then(() => {
  loadPrefs();
  createWindow();
  createTray();
});

app.on('before-quit', () => {
  savePrefs();
  app.isQuitting = true;
});

app.on('window-all-closed', () => {
  // macOS: 트레이에서 계속 실행
});
