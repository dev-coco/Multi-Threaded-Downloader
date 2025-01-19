const downloadBtn = document.getElementById('download-btn')
const url = document.getElementById('url')
const status = document.getElementById('status')
const progressBar = document.getElementsByClassName('progress-bar')[0]

const init = () => {
  downloadBtn.disabled = false
  progressBar.style.width = '0%'
  progressBar.textContent = '0%'
}

const visibilityChangeHandler = async (event, visibility) => {
  if (visibility === 'visible' && !downloadBtn.disabled) {
    const text = await navigator.clipboard.readText().then(result => result.match(/.+/g)[0])
    if (/https:\/\/[-A-Za-z0-9+&@#/%?=~_|!:,.;]+[-A-Za-z0-9+&@#/%=~_|]/i.test(text)) {
      url.value = text
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  visibilityChangeHandler(null, 'visible')
})

window.electronAPI.onWindowVisibilityChange(visibilityChangeHandler)

window.addEventListener('beforeunload', () => {
  window.electronAPI.removeWindowVisibilityChangeListener(visibilityChangeHandler)
})

downloadBtn.addEventListener('click', () => {
  if (!/https:\/\/[-A-Za-z0-9+&@#/%?=~_|!:,.;]+[-A-Za-z0-9+&@#/%=~_|]/i.test(url.value)) {
    alert('链接格式错误。')
    return
  }
  init()
  status.textContent = '开始下载...'
  downloadBtn.disabled = true
  window.electronAPI.download(url.value).then(() => {
    console.log('下载请求已发送')
  })

  window.electronAPI.onDownloadProgress((event, data) => {
    try {
      if (data.includes('Download Progress Summary')) {
        const downloadSpeed = data.match(/(?<= DL:).*?(?= ETA)/g)[0]
        const progress = data.match(/(?<=\().*?(?=\) CN)/g)[0]
        const leftTime = data.match(/(?<=ETA:).*?(?=\])/g)[0]
        progressBar.style.width = progress
        progressBar.textContent = progress
        status.textContent = `下载速度 ${downloadSpeed}    剩余时间: ${leftTime}`
      }
    } catch {
      console.log(data)
    }
  })

  window.electronAPI.onDownloadComplete((event, data) => {
    status.textContent = data
    init()
  })

  window.electronAPI.onDownloadError((event, data) => {
    status.textContent = data
    init()
  })
})
