const gradeOptions = Array.from({ length: 12 }, (_, index) => `${index + 1}年级`)
const semesterOptions = ['上学期', '下学期']
const DEFAULT_CONFIG = {
  userName: '学生A',
  grade: 1,
  semester: 1
}
const CONFIG_STORAGE_KEY = 'currentConfig'
const ACCOUNT_LIST_KEY = 'localAccounts'

Page({
  data: {
    userName: '学生A',
    avatarText: 'A',
    gradeOptions,
    semesterOptions,
    gradeIndex: 0,
    semesterIndex: 0,
    accountList: []
  },

  onLoad() {
    this.loadCurrentConfig()
  },

  onShow() {
    this.loadCurrentConfig()
  },

  getUserProgressStorageKey(userName) {
    return `userProgress_${userName}`
  },

  getUserGrowthStorageKey(userName) {
    return `userGrowth_${userName}`
  },

  getAccountList() {
    const accountList = wx.getStorageSync(ACCOUNT_LIST_KEY)

    if (Array.isArray(accountList) && accountList.length) {
      return [...new Set(accountList)]
    }

    return [DEFAULT_CONFIG.userName]
  },

  saveAccountList(accountList) {
    const uniqueAccounts = [...new Set(accountList.filter(Boolean))]
    wx.setStorageSync(ACCOUNT_LIST_KEY, uniqueAccounts)
    return uniqueAccounts
  },

  ensureAccountExists(userName) {
    const accountList = this.getAccountList()

    if (!accountList.includes(userName)) {
      accountList.push(userName)
    }

    const nextList = this.saveAccountList(accountList)
    this.setData({
      accountList: nextList
    })
  },

  loadCurrentConfig() {
    const storedConfig = wx.getStorageSync(CONFIG_STORAGE_KEY) || DEFAULT_CONFIG
    const grade = storedConfig.grade || 1
    const semester = storedConfig.semester || 1
    const userName = storedConfig.userName || '学生A'
    const accountList = this.getAccountList()

    if (!accountList.includes(userName)) {
      accountList.push(userName)
    }

    const nextAccountList = this.saveAccountList(accountList)

    this.setData({
      userName,
      avatarText: userName.slice(-1),
      gradeIndex: Math.min(Math.max(grade - 1, 0), gradeOptions.length - 1),
      semesterIndex: semester === 2 ? 1 : 0,
      accountList: nextAccountList
    })
  },

  getCurrentConfig() {
    return {
      userName: this.data.userName,
      grade: this.data.gradeIndex + 1,
      semester: this.data.semesterIndex + 1
    }
  },

  saveCurrentConfig() {
    const currentConfig = this.getCurrentConfig()
    wx.setStorageSync(CONFIG_STORAGE_KEY, currentConfig)
    this.ensureAccountExists(currentConfig.userName)
  },

  migrateUserData(oldUserName, newUserName) {
    if (!oldUserName || !newUserName || oldUserName === newUserName) {
      return
    }

    const oldProgressKey = this.getUserProgressStorageKey(oldUserName)
    const newProgressKey = this.getUserProgressStorageKey(newUserName)
    const oldGrowthKey = this.getUserGrowthStorageKey(oldUserName)
    const newGrowthKey = this.getUserGrowthStorageKey(newUserName)

    const oldProgress = wx.getStorageSync(oldProgressKey)
    const oldGrowth = wx.getStorageSync(oldGrowthKey)
    const newProgress = wx.getStorageSync(newProgressKey)
    const newGrowth = wx.getStorageSync(newGrowthKey)

    if (oldProgress && typeof oldProgress === 'object' && !newProgress) {
      wx.setStorageSync(newProgressKey, oldProgress)
    }

    if (oldGrowth && typeof oldGrowth === 'object' && !newGrowth) {
      wx.setStorageSync(newGrowthKey, oldGrowth)
    }

    wx.removeStorageSync(oldProgressKey)
    wx.removeStorageSync(oldGrowthKey)
  },

  switchToAccount(userName) {
    if (!userName) {
      return
    }

    const currentConfig = this.getCurrentConfig()
    const nextConfig = {
      ...currentConfig,
      userName
    }

    wx.setStorageSync(CONFIG_STORAGE_KEY, nextConfig)
    this.ensureAccountExists(userName)
    this.loadCurrentConfig()
  },

  promptNewAccount(callback) {
    wx.showModal({
      title: '新建学生',
      editable: true,
      placeholderText: '请输入新的学生昵称',
      success: (result) => {
        if (!result.confirm) {
          return
        }

        const inputName = (result.content || '').trim()

        if (!inputName) {
          wx.showToast({
            title: '昵称不能为空',
            icon: 'none'
          })
          return
        }

        callback(inputName)
      }
    })
  },

  onEditName() {
    const oldUserName = this.data.userName

    wx.showModal({
      title: '修改昵称',
      editable: true,
      placeholderText: '请输入新的学生昵称',
      content: oldUserName,
      success: (result) => {
        if (!result.confirm) {
          return
        }

        const newUserName = (result.content || '').trim()

        if (!newUserName) {
          wx.showToast({
            title: '昵称不能为空',
            icon: 'none'
          })
          return
        }

        if (newUserName === oldUserName) {
          return
        }

        this.migrateUserData(oldUserName, newUserName)

        const accountList = this.getAccountList().map((name) => {
          return name === oldUserName ? newUserName : name
        })
        this.saveAccountList(accountList)

        wx.setStorageSync(CONFIG_STORAGE_KEY, {
          ...this.getCurrentConfig(),
          userName: newUserName
        })

        this.loadCurrentConfig()
        wx.showToast({
          title: '昵称已更新',
          icon: 'success'
        })
      }
    })
  },

  onManageAccounts() {
    const accountList = this.getAccountList()
    const currentUserName = this.data.userName
    const displayItems = accountList.map((name) => {
      return name === currentUserName ? `✅ ${name}` : name
    })
    const itemList = displayItems.concat('+ 添加新学生')

    wx.showActionSheet({
      itemList,
      success: (result) => {
        const selectedItem = itemList[result.tapIndex]

        if (selectedItem === '+ 添加新学生') {
          this.promptNewAccount((userName) => {
            this.ensureAccountExists(userName)
            this.switchToAccount(userName)
            wx.showToast({
              title: '已切换新账号',
              icon: 'success'
            })
          })
          return
        }

        const targetUserName = accountList[result.tapIndex]
        this.switchToAccount(targetUserName)
        wx.showToast({
          title: '已切换账号',
          icon: 'success'
        })
      }
    })
  },

  onGradeChange(event) {
    const gradeIndex = Number(event.detail.value)

    this.setData({
      gradeIndex
    })

    this.saveCurrentConfig()
  },

  onSemesterChange(event) {
    const semesterIndex = Number(event.detail.value)

    this.setData({
      semesterIndex
    })

    this.saveCurrentConfig()
  },

  onClearProgress() {
    wx.showModal({
      title: '确认清除',
      content: '确定要清除当前账号的学习进度吗？此操作仅用于测试重置。',
      confirmColor: '#e86d5a',
      success: (result) => {
        if (!result.confirm) {
          return
        }

        wx.removeStorageSync(this.getUserProgressStorageKey(this.data.userName))
        wx.removeStorageSync(this.getUserGrowthStorageKey(this.data.userName))
        wx.showToast({
          title: '已重置',
          icon: 'success'
        })
        this.loadCurrentConfig()
      }
    })
  }
})
