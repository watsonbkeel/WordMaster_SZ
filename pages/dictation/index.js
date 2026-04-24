const { fullDictionary } = require('../../utils/fullDictionary')
const {
  getSharedAudioContext,
  setAudioEndedHandler,
  clearAudioEndedHandler,
  playWordAudio,
  stopWordAudio
} = require('../../utils/audio')

Page({
  data: {
    wordList: [],
    currentIndex: 0,
    isPlaying: false,
    intervalSeconds: 8,
    intervalOptions: [5, 8, 10, 12],
    intervalIndex: 1,
    isFinished: false,
    countdown: 0
  },

  onLoad(options) {
    this.audioContext = getSharedAudioContext()
    this.autoTimer = null
    this.currentConfig = null
    const ids = decodeURIComponent((options && options.ids) || '')
    const idList = ids ? ids.split(',').filter(Boolean) : []
    const wordList = fullDictionary.filter((item) => idList.includes(item.word_id))

    this.setData({
      wordList,
      currentIndex: 0,
      isPlaying: false,
      isFinished: false,
      countdown: 0
    })

    setAudioEndedHandler(() => {
      if (!this.data.isPlaying || this.data.isFinished) {
        return
      }

      this.startCountdownAfterEnded()
    })

    wx.setKeepScreenOn({
      keepScreenOn: true
    })
  },

  onHide() {
    this.stopDictation()
    wx.setKeepScreenOn({
      keepScreenOn: false
    })
  },

  onUnload() {
    this.stopDictation()
    clearAudioEndedHandler()
    wx.setKeepScreenOn({
      keepScreenOn: false
    })
    this.audioContext = null
  },

  clearTimer() {
    if (this.autoTimer) {
      clearTimeout(this.autoTimer)
      this.autoTimer = null
    }
  },

  stopDictation() {
    this.clearTimer()
    stopWordAudio()
    this.setData({
      isPlaying: false,
      countdown: 0
    })
  },

  playCurrentWord() {
    const currentWord = this.data.wordList[this.data.currentIndex]

    if (!currentWord) {
      return
    }

    this.clearTimer()
    this.setData({
      countdown: 0
    })
    playWordAudio(currentWord.word)
  },

  startCountdownAfterEnded() {
    this.clearTimer()

    const tick = () => {
      if (!this.data.isPlaying || this.data.isFinished) {
        return
      }

      const nextCountdown = this.data.countdown - 1

      if (nextCountdown <= 0) {
        this.setData({
          countdown: 0
        })
        this.goNextWord(true)
        return
      }

      this.setData({
        countdown: nextCountdown
      })

      this.autoTimer = setTimeout(tick, 1000)
    }

    this.setData({
      countdown: this.data.intervalSeconds
    })

    this.autoTimer = setTimeout(tick, 1000)
  },

  startDictation() {
    if (!this.data.wordList.length || this.data.isFinished) {
      return
    }

    this.setData({
      isPlaying: true,
      countdown: 0
    })
    this.playCurrentWord()
  },

  pauseDictation() {
    this.stopDictation()
  },

  onTogglePlay() {
    if (this.data.isPlaying) {
      this.pauseDictation()
      return
    }

    this.startDictation()
  },

  onReplayWord() {
    if (!this.data.wordList.length || this.data.isFinished) {
      return
    }

    this.playCurrentWord()
  },

  goPrevWord(fromAuto = false) {
    if (!this.data.wordList.length) {
      return
    }

    const nextIndex = Math.max(this.data.currentIndex - 1, 0)
    this.setData({
      currentIndex: nextIndex,
      isFinished: false,
      countdown: 0
    })

    if (!fromAuto) {
      this.playCurrentWord()
    }
  },

  goNextWord(fromAuto = false) {
    if (!this.data.wordList.length) {
      return
    }

    const nextIndex = this.data.currentIndex + 1

    if (nextIndex >= this.data.wordList.length) {
      this.finishDictation()
      return
    }

    this.setData({
      currentIndex: nextIndex,
      countdown: 0
    })

    this.playCurrentWord()
  },

  finishDictation() {
    this.stopDictation()
    this.setData({
      isFinished: true,
      countdown: 0
    })

    wx.showModal({
      title: '听写完成',
      content: '听写完成！请核对你的拼写。',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  onPrevWord() {
    this.goPrevWord(false)
  },

  onNextWord() {
    this.goNextWord(false)
  },

  onIntervalChange(event) {
    const intervalIndex = Number(event.detail.value)
    const intervalSeconds = this.data.intervalOptions[intervalIndex]

    this.setData({
      intervalIndex,
      intervalSeconds,
      countdown: 0
    })

    if (this.data.isPlaying) {
      this.playCurrentWord()
    }
  }
})
