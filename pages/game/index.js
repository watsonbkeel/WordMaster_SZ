const { fullDictionary } = require('../../utils/fullDictionary')
const { addCoins } = require('../../utils/reward')

const CONFIG_STORAGE_KEY = 'currentConfig'
const DEFAULT_CONFIG = {
  userName: '学生A',
  grade: 1,
  semester: 1
}
const MAX_HEARTS = 3
const ONE_DAY_MS = 24 * 60 * 60 * 1000
const REVIEW_PICK_WINDOW_MS = 2 * ONE_DAY_MS
const MASTERED_REVIEW_DELAY_MS = 36500 * ONE_DAY_MS

function calculateNextReviewTime(memoryLevel) {
  const reviewDaysMap = { 1: 1, 2: 2, 3: 4, 4: 7 }
  if (memoryLevel >= 5) {
    return Date.now() + MASTERED_REVIEW_DELAY_MS
  }
  const reviewDays = reviewDaysMap[memoryLevel] || 1
  return Date.now() + reviewDays * ONE_DAY_MS
}

function buildGamePrompt(wordItem) {
  const rawMeaning = (wordItem.meaning || '').trim()
  const normalizedWord = (wordItem.word || '').trim().toLowerCase()
  const meanings = rawMeaning
    .split('；')
    .map((item) => item.trim())
    .filter(Boolean)

  const hiddenMeaning = meanings.filter((item) => {
    const normalizedMeaning = item.toLowerCase()
    return !normalizedMeaning.includes(normalizedWord)
  })

  if (hiddenMeaning.length) {
    return `中文提示：${hiddenMeaning[0]}`
  }

  if (wordItem.sentence) {
    const sentenceHint = wordItem.sentence.split('（')[0].replace(new RegExp(wordItem.word, 'ig'), '____').trim()
    if (sentenceHint) {
      return `例句提示：${sentenceHint}`
    }
  }

  return '中文提示暂未生成，请根据字母和长度完成拼写' 
}


Page({
  data: {
    sourceWords: [],
    usedWordIds: [],
    currentWord: null,
    scrambledLetters: [],
    selectedLetters: [],
    letterSlots: [],
    isSuccess: false,
    hasDictionaryData: true,
    hearts: 3,
    combo: 0,
    score: 0,
    bestCombo: 0,
    showAnswerHelp: false,
    revealedWord: '',
    currentPrompt: ''
  },

  onLoad() {
    this.nextLevelTimer = null
    this.currentConfig = this.loadCurrentConfig()
    this.userProgress = this.loadUserProgress(this.currentConfig.userName)
    const sourceWords = this.pickWordsForGame()

    if (!sourceWords.length) {
      this.setData({
        hasDictionaryData: false,
        sourceWords: [],
        currentWord: null,
        scrambledLetters: [],
        selectedLetters: [],
        letterSlots: [],
        isSuccess: false,
        hearts: MAX_HEARTS,
        combo: 0,
        score: 0,
        bestCombo: 0,
        showAnswerHelp: false,
        revealedWord: '',
        currentPrompt: ''
      })
      return
    }

    this.setData({
      sourceWords,
      usedWordIds: [],
      hasDictionaryData: true,
      hearts: MAX_HEARTS,
      combo: 0,
      score: 0,
      bestCombo: 0,
      showAnswerHelp: false,
      revealedWord: '',
      currentPrompt: ''
    })

    this.loadNextRandomWord()
  },

  onHide() {
    this.clearNextLevelTimer()
  },

  onUnload() {
    this.clearNextLevelTimer()
  },

  clearNextLevelTimer() {
    if (this.nextLevelTimer) {
      clearTimeout(this.nextLevelTimer)
      this.nextLevelTimer = null
    }
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

  saveUserProgress() {
    wx.setStorageSync(this.getUserProgressStorageKey(this.currentConfig.userName), this.userProgress)
  },

  pickWordsForGame() {
    const now = Date.now()
    const currentDictionary = fullDictionary.filter((item) => item.grade === this.currentConfig.grade && item.semester === this.currentConfig.semester)
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

    return reviewWords.concat(newWords)
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

  normalizeWord(word) {
    return (word || '').replace(/\s+/g, '').toLowerCase()
  },

  buildDisplaySlots(word, selectedLetters) {
    const visibleChars = this.normalizeWord(word).split('')

    return visibleChars.map((char, index) => ({
      id: `${char}-${index}`,
      value: selectedLetters[index] ? selectedLetters[index].letter : ''
    }))
  },

  buildLetterBlocks(word) {
    return this.normalizeWord(word)
      .split('')
      .map((letter, index) => ({
        id: `${letter}-${index}`,
        letter: letter.toUpperCase()
      }))
  },

  loadNextRandomWord() {
    this.clearNextLevelTimer()

    const { sourceWords, usedWordIds } = this.data
    const availableWords = sourceWords.filter((item) => !usedWordIds.includes(item.word_id))
    const candidateWords = availableWords.length ? availableWords : sourceWords

    if (!candidateWords.length) {
      return
    }

    const randomIndex = Math.floor(Math.random() * candidateWords.length)
    const currentWord = candidateWords[randomIndex]
    const nextUsedWordIds = availableWords.length
      ? usedWordIds.concat(currentWord.word_id)
      : [currentWord.word_id]

    const scrambledLetters = this.createScrambledLetters(currentWord.word)

    this.setData({
      usedWordIds: nextUsedWordIds,
      currentWord,
      scrambledLetters,
      selectedLetters: [],
      letterSlots: this.buildDisplaySlots(currentWord.word, []),
      isSuccess: false,
      showAnswerHelp: false,
      revealedWord: '',
      currentPrompt: buildGamePrompt(currentWord)
    })
  },

  createScrambledLetters(word) {
    const shuffledBlocks = [...this.buildLetterBlocks(word)]

    for (let index = shuffledBlocks.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1))
      const temp = shuffledBlocks[index]
      shuffledBlocks[index] = shuffledBlocks[randomIndex]
      shuffledBlocks[randomIndex] = temp
    }

    return shuffledBlocks
  },

  onTapLetter(event) {
    const { id } = event.currentTarget.dataset
    const { scrambledLetters, selectedLetters, currentWord, isSuccess, hearts, combo, bestCombo, showAnswerHelp } = this.data

    if (!currentWord || isSuccess || hearts <= 0 || showAnswerHelp) {
      return
    }

    const letterIndex = scrambledLetters.findIndex((item) => item.id === id)

    if (letterIndex === -1) {
      return
    }

    const tappedLetter = scrambledLetters[letterIndex]
    const expectedWord = this.normalizeWord(currentWord.word)
    const nextExpectedLetter = expectedWord[selectedLetters.length]
    const tappedLetterValue = tappedLetter.letter.toLowerCase()

    if (tappedLetterValue !== nextExpectedLetter) {
      const nextHearts = hearts - 1
      wx.vibrateShort()
      this.setData({
        combo: 0,
        hearts: nextHearts,
        showAnswerHelp: true,
        revealedWord: currentWord.word
      })

      if (nextHearts <= 0) {
        this.handleGameOver()
      }
      return
    }

    const nextScrambledLetters = scrambledLetters.filter((item) => item.id !== id)
    const nextSelectedLetters = selectedLetters.concat(tappedLetter)
    const selectedWord = nextSelectedLetters
      .map((item) => item.letter)
      .join('')
      .toLowerCase()

    this.setData({
      scrambledLetters: nextScrambledLetters,
      selectedLetters: nextSelectedLetters,
      letterSlots: this.buildDisplaySlots(currentWord.word, nextSelectedLetters)
    })

    if (selectedWord === expectedWord) {
      const nextCombo = combo + 1
      const currentProgress = this.userProgress[currentWord.word_id] || { memoryLevel: 0, nextReviewTime: 0 }
      const nextMemoryLevel = currentProgress.memoryLevel + 1
      this.userProgress[currentWord.word_id] = {
        memoryLevel: nextMemoryLevel,
        nextReviewTime: calculateNextReviewTime(nextMemoryLevel)
      }
      this.saveUserProgress()

      this.setData({
        isSuccess: true,
        combo: nextCombo,
        score: this.data.score + 1,
        bestCombo: Math.max(bestCombo, nextCombo)
      })

      this.nextLevelTimer = setTimeout(() => {
        this.loadNextRandomWord()
      }, 1000)
    }
  },

  handleGameOver() {
    this.clearNextLevelTimer()

    const { score, bestCombo } = this.data
    const comboBonus = bestCombo >= 5 ? 5 : bestCombo >= 3 ? 2 : 0
    const coinsEarned = score * 2 + comboBonus

    if (coinsEarned > 0) {
      addCoins(this.currentConfig.userName, coinsEarned)
    }

    wx.showModal({
      title: '游戏结束',
      content: `你一共拼对了 ${score} 个单词，最高连击 ${bestCombo} 次，本次获得 ${coinsEarned} 枚金币！`,
      confirmText: '返回学习',
      cancelText: '去宠物页',
      success: (result) => {
        if (result.confirm) {
          wx.navigateBack()
          return
        }

        wx.switchTab({
          url: '/pages/pet/index'
        })
      }
    })
  },

  onTryNextWord() {
    const { hearts } = this.data

    if (hearts <= 0) {
      this.handleGameOver()
      return
    }

    this.loadNextRandomWord()
  },

  onBackToLearn() {
    wx.navigateBack()
  },

  onResetSelection() {
    this.resetCurrentSelection()
  },

  resetCurrentSelection() {
    const { currentWord, hearts, showAnswerHelp } = this.data

    if (!currentWord || hearts <= 0 || showAnswerHelp) {
      return
    }

    this.setData({
      scrambledLetters: this.createScrambledLetters(currentWord.word),
      selectedLetters: [],
      letterSlots: this.buildDisplaySlots(currentWord.word, []),
      isSuccess: false
    })
  }
})
