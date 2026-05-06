const { fullDictionary } = require('../../utils/fullDictionary')
const { getUserGrowth, addExp, addCoins, getLevelProgress, LEVEL_EXP } = require('../../utils/reward')
const { getSharedAudioContext, playWordAudio } = require('../../utils/audio')

const DEFAULT_CONFIG = {
  userName: '学生A',
  grade: 1,
  semester: 1
}
const MIN_GRADE = 1
const MAX_GRADE = 12
const CONFIG_STORAGE_KEY = 'currentConfig'
const ONE_DAY_MS = 24 * 60 * 60 * 1000
const MASTERED_REVIEW_DELAY_MS = 36500 * ONE_DAY_MS
const DAILY_REWARD_COINS = 5
const REVIEW_PICK_WINDOW_MS = 2 * ONE_DAY_MS

function getStudyBatchSizeByGrade(grade) {
  if (grade <= 2) {
    return 5
  }

  if (grade <= 4) {
    return 6
  }

  if (grade <= 6) {
    return 7
  }

  if (grade <= 9) {
    return 8
  }

  return 10
}

Page({
  data: {
    words: [],
    currentIndex: 0,
    showMeaning: false,
    sessionRecognized: 0,
    sessionUnrecognized: 0,
    wordsLearnedThisSession: 0,
    isResting: false,
    restTriggerCount: getStudyBatchSizeByGrade(DEFAULT_CONFIG.grade),
    hasDictionaryData: true,
    isExpandedWords: false,
    growth: {
      coins: 0,
      exp: 0,
      level: 1,
      petStatus: 'happy'
    },
    levelProgress: 0,
    levelProgressPercent: 0,
    expToastText: '',
    expToastVisible: false,
    finishRewardCoins: 0,
    studyMoreCount: getStudyBatchSizeByGrade(DEFAULT_CONFIG.grade)
  },

  onLoad() {
    this.audioContext = getSharedAudioContext()
    this.currentConfig = this.loadCurrentConfig()
    this.userProgress = this.loadUserProgress(this.currentConfig.userName)
    this.refreshGrowthBoard()
    this.initializeTodayWords()
  },

  onShow() {
    this.audioContext = getSharedAudioContext()

    const latestConfig = this.loadCurrentConfig()
    const configChanged =
      !this.currentConfig ||
      latestConfig.grade !== this.currentConfig.grade ||
      latestConfig.semester !== this.currentConfig.semester ||
      latestConfig.userName !== this.currentConfig.userName

    this.currentConfig = latestConfig
    this.userProgress = this.loadUserProgress(latestConfig.userName)
    this.refreshGrowthBoard()

    if (configChanged) {
      this.initializeTodayWords()
      return
    }

    const currentWord = this.getCurrentWord()
    if (currentWord && !this.data.isResting) {
      playWordAudio(currentWord.word)
    }
  },

  onHide() {
    if (this.audioContext) {
      this.audioContext.stop()
    }
    this.clearExpToastTimer()
  },

  onUnload() {
    if (this.audioContext) {
      this.audioContext.stop()
    }

    this.audioContext = null
    this.clearExpToastTimer()
  },

  clearExpToastTimer() {
    if (this.expToastTimer) {
      clearTimeout(this.expToastTimer)
      this.expToastTimer = null
    }
  },

  loadCurrentConfig() {
    const storedConfig = wx.getStorageSync(CONFIG_STORAGE_KEY)

    if (storedConfig && typeof storedConfig === 'object') {
      return {
        userName: storedConfig.userName || DEFAULT_CONFIG.userName,
        grade: Math.min(Math.max(storedConfig.grade || DEFAULT_CONFIG.grade, MIN_GRADE), MAX_GRADE),
        semester: storedConfig.semester === 2 ? 2 : 1
      }
    }

    return DEFAULT_CONFIG
  },

  getUserProgressStorageKey(userName) {
    return `userProgress_${userName}`
  },

  loadUserProgress(userName) {
    const storageKey = this.getUserProgressStorageKey(userName)
    const storedProgress = wx.getStorageSync(storageKey)

    if (storedProgress && typeof storedProgress === 'object') {
      return storedProgress
    }

    return {}
  },

  saveUserProgress() {
    const storageKey = this.getUserProgressStorageKey(this.currentConfig.userName)
    wx.setStorageSync(storageKey, this.userProgress)
  },

  refreshGrowthBoard() {
    const growth = getUserGrowth(this.currentConfig.userName)
    const levelProgress = getLevelProgress(growth.exp)

    this.setData({
      growth,
      levelProgress,
      levelProgressPercent: (levelProgress / LEVEL_EXP) * 100
    })
  },

  showExpToast(expAmount) {
    this.clearExpToastTimer()

    this.setData({
      expToastText: `+${expAmount} EXP`,
      expToastVisible: true
    })

    this.expToastTimer = setTimeout(() => {
      this.setData({
        expToastVisible: false
      })
    }, 900)
  },

  pickWordsForSession(targetCount, forceExtra) {
    const now = Date.now()
    const currentDictionary = fullDictionary.filter((item) => {
      return (
        item.grade === this.currentConfig.grade &&
        item.semester === this.currentConfig.semester
      )
    })
    const reviewWords = []
    const newWords = []

    currentDictionary.forEach((wordItem) => {
      const progress = this.userProgress[wordItem.word_id]

      if (!progress) {
        newWords.push(wordItem)
        return
      }

      if (progress.nextReviewTime <= now + REVIEW_PICK_WINDOW_MS) {
        reviewWords.push(wordItem)
      }
    })

    const selectedWords = reviewWords.slice(0, targetCount)
    const remainingSlots = targetCount - selectedWords.length

    if (remainingSlots > 0) {
      selectedWords.push(...newWords.slice(0, remainingSlots))
    }

    const currentSemesterAllLearned =
      currentDictionary.length > 0 &&
      currentDictionary.every((wordItem) => {
        const progress = this.userProgress[wordItem.word_id]
        return progress && progress.memoryLevel >= 1
      })

    let isExpandedWords = false

    if (selectedWords.length < targetCount && (currentSemesterAllLearned || forceExtra)) {
      const selectedIds = selectedWords.map((item) => item.word_id)
      const lowerGradeWords = fullDictionary.filter((item) => {
        return (
          (item.grade < this.currentConfig.grade ||
            (item.grade === this.currentConfig.grade && item.semester < this.currentConfig.semester)) &&
          !selectedIds.includes(item.word_id)
        )
      })
      const higherGradeWords = fullDictionary.filter((item) => {
        return (
          (item.grade > this.currentConfig.grade ||
            (item.grade === this.currentConfig.grade && item.semester > this.currentConfig.semester)) &&
          !selectedIds.includes(item.word_id)
        )
      })
      const lowerPriorityWords = lowerGradeWords.filter((item) => {
        const progress = this.userProgress[item.word_id]
        return !progress || progress.memoryLevel < 3
      })
      const higherPriorityWords = higherGradeWords.filter((item) => {
        const progress = this.userProgress[item.word_id]
        return !progress || progress.memoryLevel < 3
      })
      const fallbackWords = lowerPriorityWords.concat(higherPriorityWords)

      for (let index = 0; index < fallbackWords.length && selectedWords.length < targetCount; index += 1) {
        selectedWords.push(fallbackWords[index])
      }

      if (selectedWords.length > reviewWords.length + Math.min(newWords.length, targetCount - reviewWords.length)) {
        isExpandedWords = true
      }
    }

    return {
      words: selectedWords,
      hasDictionaryData: currentDictionary.length > 0,
      isExpandedWords
    }
  },

  initializeTodayWords(forceExtra = false) {
    const studyBatchSize = getStudyBatchSizeByGrade(this.currentConfig.grade)
    const sessionData = this.pickWordsForSession(studyBatchSize, forceExtra)

    this.setData({
      words: sessionData.words,
      currentIndex: 0,
      showMeaning: false,
      sessionRecognized: 0,
      sessionUnrecognized: 0,
      wordsLearnedThisSession: 0,
      isResting: false,
      restTriggerCount: getStudyBatchSizeByGrade(this.currentConfig.grade),
      hasDictionaryData: sessionData.hasDictionaryData,
      isExpandedWords: sessionData.isExpandedWords,
      finishRewardCoins: 0,
    studyMoreCount: getStudyBatchSizeByGrade(DEFAULT_CONFIG.grade)
    })

    this.dailyRewardGranted = false

    if (sessionData.words.length > 0) {
      playWordAudio(sessionData.words[0].word)
    } else if (this.audioContext) {
      this.audioContext.stop()
    }
  },

  onStudyMore() {
    this.initializeTodayWords(true)
  },

  onPlaySound() {
    const currentWord = this.getCurrentWord()

    if (!currentWord) {
      return
    }

    playWordAudio(currentWord.word)
  },

  onShowMeaning() {
    this.setData({
      showMeaning: true
    })
  },

  onKnow() {
    const currentWord = this.getCurrentWord()

    if (!currentWord) {
      return
    }

    const currentProgress = this.userProgress[currentWord.word_id] || {
      memoryLevel: 0,
      nextReviewTime: 0
    }
    const nextMemoryLevel = currentProgress.memoryLevel + 1
    const isNewWord = !this.userProgress[currentWord.word_id]
    const gainedExp = isNewWord ? 2 : 1

    this.userProgress[currentWord.word_id] = {
      memoryLevel: nextMemoryLevel,
      nextReviewTime: this.calculateNextReviewTime(nextMemoryLevel)
    }

    this.saveUserProgress()
    this.setData({
      sessionRecognized: this.data.sessionRecognized + 1
    })

    addExp(this.currentConfig.userName, gainedExp)
    this.refreshGrowthBoard()
    this.showExpToast(gainedExp)
    this.moveToNextWord()
  },

  onDontKnow() {
    const currentWord = this.getCurrentWord()

    if (!currentWord) {
      return
    }

    this.userProgress[currentWord.word_id] = {
      memoryLevel: 0,
      nextReviewTime: Date.now() + ONE_DAY_MS
    }

    this.saveUserProgress()
    this.setData({
      sessionUnrecognized: this.data.sessionUnrecognized + 1
    })
    this.moveToNextWord()
  },

  onGoWords() {
    wx.switchTab({
      url: '/pages/words/index'
    })
  },

  onGoProfile() {
    wx.switchTab({
      url: '/pages/profile/index'
    })
  },

  onGoGame() {
    wx.navigateTo({
      url: '/pages/game/index'
    })
  },

  onContinueLearning() {
    this.setData({
      isResting: false
    })

    const currentWord = this.getCurrentWord()
    if (currentWord) {
      playWordAudio(currentWord.word)
    }
  },

  getCurrentWord() {
    const { words, currentIndex } = this.data
    return words[currentIndex]
  },

  calculateNextReviewTime(memoryLevel) {
    const reviewDaysMap = {
      1: 1,
      2: 2,
      3: 4,
      4: 7
    }

    if (memoryLevel >= 5) {
      return Date.now() + MASTERED_REVIEW_DELAY_MS
    }

    const reviewDays = reviewDaysMap[memoryLevel] || 1
    return Date.now() + reviewDays * ONE_DAY_MS
  },

  grantDailyReward() {
    if (this.dailyRewardGranted) {
      return
    }

    addCoins(this.currentConfig.userName, DAILY_REWARD_COINS)
    this.dailyRewardGranted = true
    this.refreshGrowthBoard()
    this.setData({
      finishRewardCoins: DAILY_REWARD_COINS
    })
  },

  moveToNextWord() {
    const nextIndex = this.data.currentIndex + 1
    const totalLearned = this.data.wordsLearnedThisSession + 1
    const isFinished = nextIndex >= this.data.words.length
    const shouldRest =
      !isFinished &&
      totalLearned > 0 &&
      totalLearned % this.data.restTriggerCount === 0

    this.setData({
      currentIndex: nextIndex,
      showMeaning: false,
      wordsLearnedThisSession: totalLearned,
      isResting: shouldRest
    })

    if (isFinished) {
      this.saveUserProgress()
      this.grantDailyReward()
      if (this.audioContext) {
        this.audioContext.stop()
      }
      return
    }

    if (shouldRest) {
      if (this.audioContext) {
        this.audioContext.stop()
      }
      return
    }

    const nextWord = this.data.words[nextIndex]
    if (nextWord) {
      playWordAudio(nextWord.word)
    }
  }
})
