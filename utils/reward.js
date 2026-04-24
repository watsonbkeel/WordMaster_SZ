const GROWTH_STORAGE_PREFIX = 'userGrowth_'
const DEFAULT_GROWTH = {
  coins: 0,
  exp: 0,
  level: 1,
  petStatus: 'happy'
}
const LEVEL_EXP = 100

function getGrowthStorageKey(userName) {
  return `${GROWTH_STORAGE_PREFIX}${userName}`
}

function normalizeGrowth(growth) {
  return {
    coins: Number(growth.coins) || 0,
    exp: Number(growth.exp) || 0,
    level: Math.max(Number(growth.level) || 1, 1),
    petStatus: growth.petStatus || 'happy'
  }
}

function recalculateLevel(growth) {
  const safeGrowth = normalizeGrowth(growth)
  const level = Math.max(Math.floor(safeGrowth.exp / LEVEL_EXP) + 1, 1)

  return {
    ...safeGrowth,
    level
  }
}

function getUserGrowth(userName) {
  const storedGrowth = wx.getStorageSync(getGrowthStorageKey(userName))

  if (storedGrowth && typeof storedGrowth === 'object') {
    return recalculateLevel(storedGrowth)
  }

  return { ...DEFAULT_GROWTH }
}

function saveUserGrowth(userName, growth) {
  const nextGrowth = recalculateLevel(growth)
  wx.setStorageSync(getGrowthStorageKey(userName), nextGrowth)
  return nextGrowth
}

function addExp(userName, expAmount) {
  const currentGrowth = getUserGrowth(userName)
  const nextGrowth = {
    ...currentGrowth,
    exp: currentGrowth.exp + Math.max(expAmount, 0)
  }

  return saveUserGrowth(userName, nextGrowth)
}

function addCoins(userName, coinAmount) {
  const currentGrowth = getUserGrowth(userName)
  const nextGrowth = {
    ...currentGrowth,
    coins: currentGrowth.coins + Math.max(coinAmount, 0)
  }

  return saveUserGrowth(userName, nextGrowth)
}

function spendCoins(userName, coinAmount) {
  const currentGrowth = getUserGrowth(userName)
  const safeAmount = Math.max(coinAmount, 0)

  if (currentGrowth.coins < safeAmount) {
    return {
      success: false,
      growth: currentGrowth
    }
  }

  const nextGrowth = saveUserGrowth(userName, {
    ...currentGrowth,
    coins: currentGrowth.coins - safeAmount
  })

  return {
    success: true,
    growth: nextGrowth
  }
}

function getLevelProgress(exp) {
  const safeExp = Math.max(Number(exp) || 0, 0)
  return safeExp % LEVEL_EXP
}

module.exports = {
  LEVEL_EXP,
  getUserGrowth,
  saveUserGrowth,
  addExp,
  addCoins,
  spendCoins,
  getLevelProgress
}
