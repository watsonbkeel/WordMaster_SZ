let sharedAudioContext = null
let endedCallbackBound = false
let currentEndedHandler = null

function getSharedAudioContext() {
  if (!sharedAudioContext) {
    sharedAudioContext = wx.createInnerAudioContext()
    sharedAudioContext.autoplay = false
    sharedAudioContext.obeyMuteSwitch = true
  }

  if (!endedCallbackBound) {
    sharedAudioContext.onEnded(() => {
      if (typeof currentEndedHandler === 'function') {
        currentEndedHandler()
      }
    })
    endedCallbackBound = true
  }

  return sharedAudioContext
}

function setAudioEndedHandler(handler) {
  getSharedAudioContext()
  currentEndedHandler = typeof handler === 'function' ? handler : null
}

function clearAudioEndedHandler() {
  currentEndedHandler = null
}

function playWordAudio(word) {
  const audioContext = getSharedAudioContext()

  if (!word) {
    return audioContext
  }

  audioContext.stop()
  audioContext.src = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=1`
  audioContext.play()
  return audioContext
}

function stopWordAudio() {
  const audioContext = getSharedAudioContext()
  audioContext.stop()
  return audioContext
}

module.exports = {
  getSharedAudioContext,
  setAudioEndedHandler,
  clearAudioEndedHandler,
  playWordAudio,
  stopWordAudio
}
