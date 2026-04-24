const { getUserGrowth, spendCoins, getLevelProgress } = require('../../utils/reward')

const CONFIG_STORAGE_KEY = 'currentConfig'
const DEFAULT_CONFIG = {
  userName: '学生A',
  grade: 1,
  semester: 1
}

Page({
  data: {
    growth: {
      coins: 0,
      exp: 0,
      level: 1,
      petStatus: 'happy'
    },
    levelProgress: 0,
    levelProgressPercent: 0,
    heartVisible: false,
    petAnimating: false
  },

  onShow() {
    this.currentConfig = this.loadCurrentConfig()
    this.refreshGrowth()
  },

  onHide() {
    this.clearHeartTimer()
  },

  onUnload() {
    this.clearHeartTimer()
  },

  clearHeartTimer() {
    if (this.heartTimer) {
      clearTimeout(this.heartTimer)
      this.heartTimer = null
    }
  },

  loadCurrentConfig() {
    const storedConfig = wx.getStorageSync(CONFIG_STORAGE_KEY)

    if (storedConfig && typeof storedConfig === 'object') {
      return {
        userName: storedConfig.userName || DEFAULT_CONFIG.userName,
        grade: storedConfig.grade || DEFAULT_CONFIG.grade,
        semester: storedConfig.semester || DEFAULT_CONFIG.semester
      }
    }

    return DEFAULT_CONFIG
  },

  refreshGrowth() {
    const growth = getUserGrowth(this.currentConfig.userName)
    const levelProgress = getLevelProgress(growth.exp)

    this.setData({
      growth,
      levelProgress,
      levelProgressPercent: (levelProgress / 100) * 100
    })
  },

  onGoGame() {
    wx.navigateTo({
      url: '/pages/game/index'
    })
  },

  onFeedPet() {
    const { growth } = this.data

    if (growth.coins < 10) {
      this.onGoGame()
      return
    }

    const result = spendCoins(this.currentConfig.userName, 10)

    if (!result.success) {
      wx.showToast({
        title: '金币不足，快去背单词或玩游戏赚金币吧！',
        icon: 'none'
      })
      return
    }

    wx.vibrateShort()
    this.clearHeartTimer()
    this.setData({
      growth: result.growth,
      heartVisible: true,
      petAnimating: true
    })
    this.refreshGrowth()

    wx.showToast({
      title: '喂食成功！宠物很开心！',
      icon: 'none'
    })

    this.heartTimer = setTimeout(() => {
      this.setData({
        heartVisible: false,
        petAnimating: false
      })
    }, 500)
  }
})
