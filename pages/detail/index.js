const { fullDictionary } = require('../../utils/fullDictionary')
const { getSharedAudioContext, playWordAudio } = require('../../utils/audio')

Page({
  data: {
    wordData: null
  },

  onLoad(options) {
    this.audioContext = getSharedAudioContext()
    const { id } = options || {}
    const wordData = fullDictionary.find((item) => item.word_id === id) || null

    this.setData({
      wordData
    })

    if (wordData) {
      wx.setNavigationBarTitle({
        title: wordData.word
      })
      playWordAudio(wordData.word)
    }
  },

  onHide() {
    if (this.audioContext) {
      this.audioContext.stop()
    }
  },

  onUnload() {
    if (this.audioContext) {
      this.audioContext.stop()
    }
    this.audioContext = null
  },

  onPlaySound() {
    const { wordData } = this.data

    if (!wordData) {
      return
    }

    playWordAudio(wordData.word)
  }
})
