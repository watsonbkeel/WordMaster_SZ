const { fullDictionary } = require('../../utils/fullDictionary')

const CONFIG_STORAGE_KEY = 'currentConfig'
const DEFAULT_CONFIG = {
  userName: '学生A',
  grade: 1,
  semester: 1
}
const NEAR_REVIEW_WINDOW_MS = 2 * 24 * 60 * 60 * 1000
const ONE_DAY_MS = 24 * 60 * 60 * 1000

Page({
  data: {
    activeTab: 'review',
    reviewList: [],
    masteredList: [],
    hasDictionaryData: true
  },

  onShow() {
    this.loadWordLists()
  },

  loadWordLists() {
    const currentConfig = this.loadCurrentConfig()
    const userProgress = this.loadUserProgress(currentConfig.userName)
    const now = Date.now()
    const reviewList = []
    const masteredList = []
    const currentDictionary = fullDictionary.filter((item) => {
      return item.grade === currentConfig.grade && item.semester === currentConfig.semester
    })

    currentDictionary.forEach((wordItem) => {
      const progress = userProgress[wordItem.word_id]

      if (!progress) {
        return
      }

      const safeLevel = Math.min(progress.memoryLevel || 0, 5)
      const wordData = {
        ...wordItem,
        memoryLevel: progress.memoryLevel,
        nextReviewTime: progress.nextReviewTime,
        stars: '⭐'.repeat(safeLevel),
        reviewLabel: this.formatReviewTime(progress.nextReviewTime)
      }

      if (progress.memoryLevel >= 3) {
        masteredList.push(wordData)
        return
      }

      if (
        progress.memoryLevel === 0 ||
        progress.nextReviewTime <= now + NEAR_REVIEW_WINDOW_MS
      ) {
        reviewList.push(wordData)
      }
    })

    this.setData({
      reviewList,
      masteredList,
      hasDictionaryData: currentDictionary.length > 0
    })
  },

  loadCurrentConfig() {
    const storedConfig = wx.getStorageSync(CONFIG_STORAGE_KEY)

    if (storedConfig && typeof storedConfig === 'object') {
      return {
        userName: storedConfig.userName || DEFAULT_CONFIG.userName,
        grade: Math.min(Math.max(storedConfig.grade || DEFAULT_CONFIG.grade, 1), 12),
        semester: storedConfig.semester === 2 ? 2 : 1
      }
    }

    return DEFAULT_CONFIG
  },

  getUserProgressStorageKey(userName) {
    return `userProgress_${userName}`
  },

  loadUserProgress(userName) {
    const storedProgress = wx.getStorageSync(this.getUserProgressStorageKey(userName))

    if (storedProgress && typeof storedProgress === 'object') {
      return storedProgress
    }

    return {}
  },

  formatReviewTime(timestamp) {
    if (!timestamp) {
      return '等待安排复习'
    }

    const now = new Date()
    const targetDate = new Date(timestamp)
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const targetStart = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate()
    ).getTime()
    const diffDays = Math.round((targetStart - todayStart) / ONE_DAY_MS)

    if (diffDays === 1) {
      return '明天复习'
    }

    if (diffDays === 2) {
      return '后天复习'
    }

    if (diffDays <= 0) {
      return '今天可复习'
    }

    const month = targetDate.getMonth() + 1
    const day = targetDate.getDate()
    return `${month}月${day}日复习`
  },

  onSwitchTab(event) {
    const { tab } = event.currentTarget.dataset

    this.setData({
      activeTab: tab
    })
  },

  onOpenDetail(event) {
    const { id } = event.currentTarget.dataset

    wx.navigateTo({
      url: `/pages/detail/index?id=${id}`
    })
  },

  onStartDictation() {
    const list = this.data.activeTab === 'review' ? this.data.reviewList : this.data.masteredList

    if (!list.length) {
      wx.showToast({
        title: '当前列表没有可听写单词',
        icon: 'none'
      })
      return
    }

    const ids = list.map((item) => item.word_id).join(',')
    wx.navigateTo({
      url: `/pages/dictation/index?ids=${encodeURIComponent(ids)}`
    })
  }
})
