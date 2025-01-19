const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const { spawn } = require('child_process')

let mainWindow
let aria2Process

function createWindow () {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 350,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  mainWindow.loadFile('index.html')
  // mainWindow.webContents.openDevTools()

  mainWindow.on('focus', () => {
    console.log('Window focused (visible)')
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('window-visibility-change', 'visible')
    }
  })

  mainWindow.on('blur', () => {
    console.log('Window blurred (hidden)')
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('window-visibility-change', 'hidden')
    }
  })

  mainWindow.on('close', () => {
    if (aria2Process) {
      aria2Process.removeAllListeners('exit')
      aria2Process.removeAllListeners('error')
      aria2Process.stdout.removeAllListeners('data')
      aria2Process.stderr.removeAllListeners('data')
      aria2Process.kill('SIGINT')
      aria2Process = null
    }
    mainWindow = null
  })
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('before-quit', (event) => {
  console.log('app before-quit event')
  if (aria2Process) {
    console.log('Force killing aria2c process...')
    aria2Process.kill('SIGKILL')
    event.preventDefault()
    aria2Process.on('exit', () => {
      app.exit()
    })
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

ipcMain.handle('download', async (event, url) => {
  const aria2cPath = path.join(process.resourcesPath, 'bin', 'aria2c')
  const downloadDir = app.getPath('downloads')

  const args = [
    '--console-log-level=info',
    '--summary-interval=1',
    '-s', '64',
    '-x', '16',
    '-k', '5M',
    '-j', '5',
    '--file-allocation=none',
    '--max-tries=5',
    '--retry-wait=5',
    '--enable-http-pipelining=true',
    '--disk-cache=512M',
    '--dir', downloadDir,
    url
  ]

  try {
    aria2Process = spawn(aria2cPath, args)

    aria2Process.stdout.on('data', (data) => {
      console.log(`aria2c stdout: ${data}`)
      if (mainWindow && !mainWindow.isDestroyed()) {
        try {
          event.sender.send('download-progress', data.toString())
        } catch (error) {
          console.error('Error sending message to renderer:', error)
        }
      }
    })

    aria2Process.stderr.on('data', (data) => {
      console.error(`aria2c stderr: ${data}`)
      if (mainWindow && !mainWindow.isDestroyed()) {
        try {
          event.sender.send('download-error', data.toString())
        } catch (error) {
          console.error('Error sending message to renderer:', error)
        }
      }
    })

    aria2Process.on('close', (code) => {
      console.log(`aria2c process exited with code ${code}`)
      if (mainWindow && !mainWindow.isDestroyed()) {
        if (code === 0) {
          event.sender.send('download-complete', '下载完成')
        } else {
          event.sender.send('download-error', `下载失败, 错误代码 ${code}`)
        }
      }
      aria2Process = null
    })

    aria2Process.on('error', (err) => {
      console.error('Failed to start aria2c:', err)
      if (mainWindow && !mainWindow.isDestroyed()) {
        event.sender.send('download-error', `启动aria2c出错：${err.message}`)
      }
      aria2Process = null
    })
  } catch (error) {
    console.error('Error starting aria2c:', error)
    if (mainWindow && !mainWindow.isDestroyed()) {
      event.sender.send('download-error', 'Error starting aria2c')
    }
    aria2Process = null
  }
})
