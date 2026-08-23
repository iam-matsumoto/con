import { useEffect, useMemo, useState } from 'react'
import {
  Bell,
  Download,
  FileSpreadsheet,
  Menu,
  BriefcaseBusiness,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Home,
  MapPin,
  Pencil,
  Plus,
  Search,
  Settings,
  Trash2,
  UserRoundPlus,
  Users,
  LogIn,
  LogOut,
  ShieldCheck,
  KeyRound,
  X,
  Database,
  Wifi,
  WifiOff,
  FileUp,
  FileText,
  ExternalLink,
} from 'lucide-react'
import './App.css'
import { getSupabaseConfig, testSupabaseConnection } from './lib/supabaseConfig'
import { createCloudSchedule, deleteCloudSchedule, fetchCloudSchedules, updateCloudSchedule, uploadSchedulesToCloud } from './lib/scheduleCloud'
import { createCloudNotice, createCloudSite, deleteCloudNotice, deleteCloudSite, fetchCloudEmployees, fetchCloudNotices, fetchCloudSites, updateCloudNotice, updateCloudSite, uploadMasterData } from './lib/masterDataCloud'
import { type AuthProfile, fetchAuthProfile, getAccessToken, restoreAuthSession, signInWithEmail, signOutCloud } from './lib/authCloud'
import { createScheduleNotifications, fetchMyNotifications, markAllNotificationsRead, markNotificationRead, type PersonalNotification } from './lib/notificationCloud'
import { subscribeCompanyRealtime } from './lib/realtimeCloud'
import { deleteScheduleAttachment, fetchScheduleAttachments, getScheduleAttachmentUrl, uploadScheduleAttachment, type ScheduleAttachment } from './lib/attachmentCloud'

type ScheduleColor =
  | 'blue'
  | 'green'
  | 'orange'
  | 'purple'
  | 'cyan'
  | 'gray'
  | 'red'

type Employee = {
  id: string
  name: string
  email: string
  role: UserRole
  active: boolean
}

type ExternalContractor = {
  companyName: string
  people: number
}

type Schedule = {
  id: number
  date: string
  title: string
  employeeIds: string[]
  externalContractors: ExternalContractor[]
  place: string
  color: ScheduleColor
}

type Attendance = {
  workers: string[]
  holidays: string[]
}

type CalendarRow = {
  date: string
  day: string
}

type Site = {
  id: number
  name: string
  active: boolean
}

type Notice = {
  id: number
  date: string
  title: string
  body: string
  important: boolean
}

type AppSettings = {
  companyName: string
  systemName: string
  showLogoOnHome: boolean
  compactCalendar: boolean
}

type UserRole = 'admin' | 'employee'

type AppUser = {
  id: number
  username: string
  password: string
  displayName: string
  role: UserRole
  active: boolean
}

type Page = 'home' | 'calendar' | 'employees' | 'sites' | 'notices' | 'settings' | 'users'

const EMPLOYEES_KEY = 'boardflow-employees-v3'
const SCHEDULES_KEY = 'boardflow-schedules-v3'
const ATTENDANCE_KEY = 'boardflow-attendance-v3'
const SITES_KEY = 'company-schedule-sites-v4'
const NOTICES_KEY = 'company-schedule-notices-v1'
const SETTINGS_KEY = 'company-schedule-settings-v1'
const USERS_KEY = 'company-schedule-users-v1'
const SESSION_KEY = 'company-schedule-session-v1'
const CLOUD_SCHEDULE_SYNC_KEY = 'company-schedule-cloud-schedules-v1'
const CLOUD_MASTER_SYNC_KEY = 'company-schedule-cloud-master-v1'

const initialUsers: AppUser[] = [
  { id: 1, username: 'admin', password: 'admin123', displayName: '管理者', role: 'admin', active: true },
  { id: 2, username: 'staff', password: 'staff123', displayName: '一般社員', role: 'employee', active: true },
]

const initialEmployees: Employee[] = []

const initialSites: Site[] = [
  { id: 1, name: '本社', active: true },
  { id: 2, name: '現場A', active: true },
  { id: 3, name: '現場B', active: true },
  { id: 4, name: '工場', active: true },
  { id: 5, name: '本社会議室', active: true },
]


const initialNotices: Notice[] = [
  { id: 1, date: '2026-08-10', title: '安全会議のお知らせ', body: '15時から本社会議室で行います。', important: true },
  { id: 2, date: '2026-08-13', title: '夏季休暇について', body: '8月13日〜16日は夏季休暇です。', important: false },
]

const initialAppSettings: AppSettings = {
  companyName: '有限会社 松本興業',
  systemName: '会社予定管理システム',
  showLogoOnHome: true,
  compactCalendar: false,
}

const initialSchedules: Schedule[] = [
  {
    id: 1,
    date: '2026-08-01',
    title: '現場A 足場設置',
    employeeIds: [],
    externalContractors: [],
    place: '現場A',
    color: 'blue',
  },
  {
    id: 2,
    date: '2026-08-01',
    title: '健康診断',
    employeeIds: [],
    externalContractors: [],
    place: '本社会議室',
    color: 'purple',
  },
  {
    id: 3,
    date: '2026-08-03',
    title: '現場B 作業',
    employeeIds: [],
    externalContractors: [],
    place: '現場B',
    color: 'green',
  },
  {
    id: 4,
    date: '2026-08-04',
    title: '設備点検',
    employeeIds: [],
    externalContractors: [],
    place: '工場',
    color: 'orange',
  },
]

const colorOptions: { value: ScheduleColor; label: string; className: string }[] = [
  { value: 'blue', label: '青', className: 'color-blue' },
  { value: 'green', label: '緑', className: 'color-green' },
  { value: 'orange', label: 'オレンジ', className: 'color-orange' },
  { value: 'purple', label: '紫', className: 'color-purple' },
  { value: 'cyan', label: '水色', className: 'color-cyan' },
  { value: 'gray', label: 'グレー', className: 'color-gray' },
  { value: 'red', label: '赤', className: 'color-red' },
]

const loadStorage = <T,>(key: string, fallback: T): T => {
  try {
    const saved = localStorage.getItem(key)
    return saved ? (JSON.parse(saved) as T) : fallback
  } catch {
    return fallback
  }
}

const createMonthRows = (year: number, month: number): CalendarRow[] => {
  const lastDate = new Date(year, month, 0).getDate()
  const dayNames = ['日', '月', '火', '水', '木', '金', '土']

  return Array.from({ length: lastDate }, (_, index) => {
    const dayNumber = index + 1
    const dateObject = new Date(year, month - 1, dayNumber)
    return {
      date: `${year}-${String(month).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`,
      day: dayNames[dateObject.getDay()],
    }
  })
}

function App() {
  const [page, setPage] = useState<Page>('home')
  const [currentYear, setCurrentYear] = useState(2026)
  const [currentMonth, setCurrentMonth] = useState(8)

  const [employees, setEmployees] = useState<Employee[]>(() =>
    loadStorage(EMPLOYEES_KEY, initialEmployees),
  )
  const [schedules, setSchedules] = useState<Schedule[]>(() =>
    loadStorage(SCHEDULES_KEY, initialSchedules),
  )
  const [attendance, setAttendance] = useState<Record<string, Attendance>>(() =>
    loadStorage(ATTENDANCE_KEY, {}),
  )
  const [sites, setSites] = useState<Site[]>(() => loadStorage(SITES_KEY, initialSites))
  const [notices, setNotices] = useState<Notice[]>(() => loadStorage(NOTICES_KEY, initialNotices))
  const [appSettings, setAppSettings] = useState<AppSettings>(() => loadStorage(SETTINGS_KEY, initialAppSettings))
  const [users, setUsers] = useState<AppUser[]>(() => loadStorage(USERS_KEY, initialUsers))
  const [currentUserId, setCurrentUserId] = useState<number | null>(() => loadStorage<number | null>(SESSION_KEY, null))
  const [loginUsername, setLoginUsername] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [authProfile, setAuthProfile] = useState<AuthProfile | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [loginBusy, setLoginBusy] = useState(false)
  const [userModalOpen, setUserModalOpen] = useState(false)
  const [editingUserId, setEditingUserId] = useState<number | null>(null)
  const [userUsername, setUserUsername] = useState('')
  const [userPassword, setUserPassword] = useState('')
  const [userDisplayName, setUserDisplayName] = useState('')
  const [userRole, setUserRole] = useState<UserRole>('employee')

  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
  const [searchModalOpen, setSearchModalOpen] = useState(false)
  const [editingScheduleId, setEditingScheduleId] = useState<number | null>(null)
  const [selectedDate, setSelectedDate] = useState('2026-08-01')
  const [scheduleTitle, setScheduleTitle] = useState('')
  const [schedulePlace, setSchedulePlace] = useState('')
  const [scheduleColor, setScheduleColor] = useState<ScheduleColor>('blue')
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([])
  const [employeePickerSearch, setEmployeePickerSearch] = useState('')
  const [externalContractors, setExternalContractors] = useState<ExternalContractor[]>([])
  const [contractorCompanyName, setContractorCompanyName] = useState('')
  const [contractorPeople, setContractorPeople] = useState(1)
  const [scheduleAttachments, setScheduleAttachments] = useState<ScheduleAttachment[]>([])
  const [pendingDrawingFiles, setPendingDrawingFiles] = useState<File[]>([])
  const [drawingBusy, setDrawingBusy] = useState(false)
  const [drawingMessage, setDrawingMessage] = useState('')

  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false)
  const [attendanceDate, setAttendanceDate] = useState('')
  const [workerIds, setWorkerIds] = useState<string[]>([])
  const [holidayIds, setHolidayIds] = useState<string[]>([])

  const [employeeModalOpen, setEmployeeModalOpen] = useState(false)
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null)
  const [employeeName, setEmployeeName] = useState('')
  const [employeeSearch, setEmployeeSearch] = useState('')

  const [siteModalOpen, setSiteModalOpen] = useState(false)
  const [editingSiteId, setEditingSiteId] = useState<number | null>(null)
  const [siteName, setSiteName] = useState('')
  const [siteSearch, setSiteSearch] = useState('')
  const [scheduleEmployeeFilter, setScheduleEmployeeFilter] = useState('')
  const [scheduleSiteFilter, setScheduleSiteFilter] = useState('')
  const [scheduleDateFrom, setScheduleDateFrom] = useState('')
  const [scheduleDateTo, setScheduleDateTo] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [noticeModalOpen, setNoticeModalOpen] = useState(false)
  const [editingNoticeId, setEditingNoticeId] = useState<number | null>(null)
  const [noticeDate, setNoticeDate] = useState('')
  const [noticeTitle, setNoticeTitle] = useState('')
  const [noticeBody, setNoticeBody] = useState('')
  const [noticeImportant, setNoticeImportant] = useState(false)
  const [personalNotifications, setPersonalNotifications] = useState<PersonalNotification[]>([])
  const [notificationBusy, setNotificationBusy] = useState(false)
  const [supabaseStatus, setSupabaseStatus] = useState<'idle' | 'testing' | 'connected' | 'error'>(() =>
    getSupabaseConfig().configured ? 'idle' : 'error',
  )
  const [supabaseMessage, setSupabaseMessage] = useState(() =>
    getSupabaseConfig().configured
      ? '接続確認を実行してください。'
      : '.env.local にSupabaseのURLとPublishable Keyを設定してください。',
  )
  const [cloudScheduleSyncEnabled, setCloudScheduleSyncEnabled] = useState(() =>
    loadStorage(CLOUD_SCHEDULE_SYNC_KEY, false),
  )
  const [cloudScheduleBusy, setCloudScheduleBusy] = useState(false)
  const [cloudScheduleMessage, setCloudScheduleMessage] = useState(() =>
    loadStorage(CLOUD_SCHEDULE_SYNC_KEY, false)
      ? '予定の追加・編集・削除をSupabaseへ保存します。'
      : 'まだ予定データはこのPCだけに保存されています。',
  )
  const [cloudMasterSyncEnabled, setCloudMasterSyncEnabled] = useState(() => loadStorage(CLOUD_MASTER_SYNC_KEY, false))
  const [cloudMasterBusy, setCloudMasterBusy] = useState(false)
  const [cloudMasterMessage, setCloudMasterMessage] = useState(() =>
    loadStorage(CLOUD_MASTER_SYNC_KEY, false)
      ? '社員・現場・お知らせをSupabaseへ保存します。'
      : '社員・現場・お知らせはまだこのPCだけに保存されています。',
  )

  const checkSupabaseConnection = async () => {
    setSupabaseStatus('testing')
    setSupabaseMessage('Supabaseへ接続しています…')
    const result = await testSupabaseConnection()
    setSupabaseStatus(result.ok ? 'connected' : 'error')
    setSupabaseMessage(result.message)
  }

  useEffect(() => localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(employees)), [employees])
  useEffect(() => localStorage.setItem(SCHEDULES_KEY, JSON.stringify(schedules)), [schedules])
  useEffect(() => localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(attendance)), [attendance])
  useEffect(() => localStorage.setItem(SITES_KEY, JSON.stringify(sites)), [sites])
  useEffect(() => localStorage.setItem(NOTICES_KEY, JSON.stringify(notices)), [notices])
  useEffect(() => localStorage.setItem(SETTINGS_KEY, JSON.stringify(appSettings)), [appSettings])
  useEffect(() => localStorage.setItem(USERS_KEY, JSON.stringify(users)), [users])
  useEffect(() => localStorage.setItem(SESSION_KEY, JSON.stringify(currentUserId)), [currentUserId])
  useEffect(() => localStorage.setItem(CLOUD_SCHEDULE_SYNC_KEY, JSON.stringify(cloudScheduleSyncEnabled)), [cloudScheduleSyncEnabled])
  useEffect(() => localStorage.setItem(CLOUD_MASTER_SYNC_KEY, JSON.stringify(cloudMasterSyncEnabled)), [cloudMasterSyncEnabled])

  const currentUser = authProfile
  const isAdmin = currentUser?.role === 'admin'

  useEffect(() => {
    let cancelled = false
    const restore = async () => {
      try {
        const session = await restoreAuthSession()
        if (!session || cancelled) return
        const profile = await fetchAuthProfile(session.user.id, session.user.email ?? '')
        if (!cancelled) setAuthProfile(profile)
      } catch (error) {
        if (!cancelled) setLoginError(error instanceof Error ? error.message : 'ログイン状態の確認に失敗しました。')
      } finally {
        if (!cancelled) setAuthLoading(false)
      }
    }
    restore()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!authProfile) {
      setPersonalNotifications([])
      return
    }
    let cancelled = false
    fetchMyNotifications(authProfile.id)
      .then((items) => { if (!cancelled) setPersonalNotifications(items) })
      .catch((error) => { if (!cancelled) console.error('通知の読み込みに失敗しました。', error) })
    return () => { cancelled = true }
  }, [authProfile])

  useEffect(() => {
    if (!authProfile) return
    let cancelled = false
    fetchCloudEmployees()
      .then((profiles) => { if (!cancelled) setEmployees(profiles) })
      .catch((error) => { if (!cancelled) setCloudMasterMessage(error instanceof Error ? error.message : 'profilesの読み込みに失敗しました。') })
    return () => { cancelled = true }
  }, [authProfile])

  // Ver.11 Step1.2: ログイン後は予定をSupabaseから自動読込する。
  // PC/スマホのlocalStorageではなく、同じschedulesテーブルを正として扱う。
  useEffect(() => {
    if (!authProfile) return
    let cancelled = false
    setCloudScheduleBusy(true)
    setCloudScheduleMessage('Supabaseから予定を読み込んでいます…')
    fetchCloudSchedules()
      .then((cloudSchedules) => {
        if (cancelled) return
        setSchedules(cloudSchedules)
        setCloudScheduleSyncEnabled(true)
        setCloudScheduleMessage(`予定を${cloudSchedules.length}件読み込みました。以後の追加・編集・削除はSupabaseへ保存されます。`)
      })
      .catch((error) => {
        if (cancelled) return
        setCloudScheduleMessage(error instanceof Error ? error.message : '予定の読み込みに失敗しました。')
      })
      .finally(() => { if (!cancelled) setCloudScheduleBusy(false) })
    return () => { cancelled = true }
  }, [authProfile])

  // Ver.11 Step1.5: 予定と個人通知をSupabase Realtimeで同期する。
  useEffect(() => {
    if (!authProfile || !cloudScheduleSyncEnabled) return

    const accessToken = getAccessToken()
    if (!accessToken) return

    let disposed = false
    let unsubscribe: (() => Promise<void>) | null = null
    let scheduleTimer: ReturnType<typeof setTimeout> | null = null
    let notificationTimer: ReturnType<typeof setTimeout> | null = null

    const refreshSchedules = () => {
      if (scheduleTimer) clearTimeout(scheduleTimer)
      scheduleTimer = setTimeout(() => {
        fetchCloudSchedules()
          .then((items) => { if (!disposed) setSchedules(items) })
          .catch((error) => console.error('Realtime予定同期に失敗しました。', error))
      }, 120)
    }

    const refreshNotifications = () => {
      if (notificationTimer) clearTimeout(notificationTimer)
      notificationTimer = setTimeout(() => {
        fetchMyNotifications(authProfile.id)
          .then((items) => { if (!disposed) setPersonalNotifications(items) })
          .catch((error) => console.error('Realtime通知同期に失敗しました。', error))
      }, 120)
    }

    subscribeCompanyRealtime({
      accessToken,
      profileId: authProfile.id,
      onSchedulesChanged: refreshSchedules,
      onNotificationsChanged: refreshNotifications,
    })
      .then((stop) => {
        if (disposed) void stop()
        else unsubscribe = stop
      })
      .catch((error) => console.error('Realtime接続に失敗しました。', error))

    return () => {
      disposed = true
      if (scheduleTimer) clearTimeout(scheduleTimer)
      if (notificationTimer) clearTimeout(notificationTimer)
      if (unsubscribe) void unsubscribe()
    }
  }, [authProfile, cloudScheduleSyncEnabled])

  const activeEmployees = useMemo(() => employees.filter((employee) => employee.active), [employees])
  const unreadNotificationCount = useMemo(() => personalNotifications.filter((item) => !item.read).length, [personalNotifications])
  const activeSites = useMemo(() => sites.filter((site) => site.active), [sites])
  const employeeMap = useMemo(
    () => new Map(employees.map((employee) => [employee.id, employee.name])),
    [employees],
  )

  const calendarRows = useMemo(
    () => createMonthRows(currentYear, currentMonth),
    [currentYear, currentMonth],
  )
  const middleIndex = Math.ceil(calendarRows.length / 2)
  const leftRows = calendarRows.slice(0, middleIndex)
  const rightRows = calendarRows.slice(middleIndex)

  const filteredSchedules = useMemo(() => {
    return schedules.filter((schedule) => {
      const employeeMatch = !scheduleEmployeeFilter || schedule.employeeIds.includes(scheduleEmployeeFilter)
      const siteMatch = !scheduleSiteFilter || schedule.place === scheduleSiteFilter
      const fromMatch = !scheduleDateFrom || schedule.date >= scheduleDateFrom
      const toMatch = !scheduleDateTo || schedule.date <= scheduleDateTo
      return employeeMatch && siteMatch && fromMatch && toMatch
    })
  }, [schedules, scheduleEmployeeFilter, scheduleSiteFilter, scheduleDateFrom, scheduleDateTo])

  const schedulesByDate = useMemo(() => {
    return filteredSchedules.reduce<Record<string, Schedule[]>>((result, schedule) => {
      ;(result[schedule.date] ??= []).push(schedule)
      return result
    }, {})
  }, [filteredSchedules])

  const getAttendance = (date: string, day: string): Attendance => {
    const saved = attendance[date]
    if (saved) return saved
    if (day === '日') return { workers: [], holidays: activeEmployees.map((employee) => employee.id) }
    return { workers: activeEmployees.map((employee) => employee.id), holidays: [] }
  }

  const employeeNames = (ids: string[]) =>
    ids.map((id) => employeeMap.get(id)).filter(Boolean).join('・') || '未設定'

  const contractorSummary = (items: ExternalContractor[] = []) =>
    items.map((item) => `${item.companyName} ${item.people}名`).join('・')

  const toggleId = (id: string, values: string[], setter: (next: string[]) => void) => {
    setter(values.includes(id) ? values.filter((value) => value !== id) : [...values, id])
  }

  const openAddSchedule = (date?: string) => {
    if (!isAdmin) return
    const firstDay = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`
    setEditingScheduleId(null)
    setSelectedDate(date ?? firstDay)
    setScheduleTitle('')
    setSchedulePlace('')
    setScheduleColor('blue')
    setSelectedEmployeeIds([])
    setEmployeePickerSearch('')
    setExternalContractors([])
    setContractorCompanyName('')
    setContractorPeople(1)
    setScheduleAttachments([])
    setPendingDrawingFiles([])
    setDrawingMessage('')
    setScheduleModalOpen(true)
  }

  const openEditSchedule = (schedule: Schedule) => {
    setEditingScheduleId(schedule.id)
    setSelectedDate(schedule.date)
    setScheduleTitle(schedule.title)
    setSchedulePlace(schedule.place)
    setScheduleColor(schedule.color)
    setSelectedEmployeeIds(schedule.employeeIds)
    setEmployeePickerSearch('')
    setExternalContractors(schedule.externalContractors ?? [])
    setContractorCompanyName('')
    setContractorPeople(1)
    setScheduleAttachments([])
    setPendingDrawingFiles([])
    setDrawingMessage('図面を読み込んでいます…')
    setScheduleModalOpen(true)
    fetchScheduleAttachments(schedule.id)
      .then((items) => { setScheduleAttachments(items); setDrawingMessage('') })
      .catch((error) => setDrawingMessage(error instanceof Error ? error.message : '図面の読み込みに失敗しました。'))
  }

  const addExternalContractor = () => {
    if (!isAdmin) return
    const companyName = contractorCompanyName.trim()
    if (!companyName) {
      alert('外部業者の会社名を入力してください。')
      return
    }
    setExternalContractors((current) => [...current, { companyName, people: contractorPeople }])
    setContractorCompanyName('')
    setContractorPeople(1)
  }

  const removeExternalContractor = (index: number) => {
    if (!isAdmin) return
    setExternalContractors((current) => current.filter((_, currentIndex) => currentIndex !== index))
  }

  const chooseDrawingFiles = (files: FileList | null) => {
    if (!isAdmin) return
    if (!files) return
    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.dwg', '.dxf']
    const next = Array.from(files).filter((file) => {
      const lower = file.name.toLowerCase()
      if (!allowedExtensions.some((ext) => lower.endsWith(ext))) {
        alert(`${file.name} は対応していない形式です。`)
        return false
      }
      if (file.size > 20 * 1024 * 1024) {
        alert(`${file.name} は20MBを超えています。`)
        return false
      }
      return true
    })
    setPendingDrawingFiles((current) => [...current, ...next])
  }

  const uploadPendingDrawings = async (scheduleId: number) => {
    if (pendingDrawingFiles.length === 0) return
    setDrawingBusy(true)
    setDrawingMessage('図面をアップロードしています…')
    try {
      const uploaded: ScheduleAttachment[] = []
      for (const file of pendingDrawingFiles) uploaded.push(await uploadScheduleAttachment(scheduleId, file))
      setScheduleAttachments((current) => [...current, ...uploaded])
      setPendingDrawingFiles([])
      setDrawingMessage(`図面を${uploaded.length}件アップロードしました。`)
    } finally {
      setDrawingBusy(false)
    }
  }

  const openDrawing = async (attachment: ScheduleAttachment) => {
    try {
      const url = await getScheduleAttachmentUrl(attachment)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (error) {
      alert(error instanceof Error ? error.message : '図面を開けませんでした。')
    }
  }

  const downloadDrawing = async (attachment: ScheduleAttachment) => {
    try {
      const url = await getScheduleAttachmentUrl(attachment)
      const response = await fetch(url)
      if (!response.ok) throw new Error('図面のダウンロードに失敗しました。')
      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = attachment.fileName
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(objectUrl)
    } catch (error) {
      alert(error instanceof Error ? error.message : '図面をダウンロードできませんでした。')
    }
  }

  const removeDrawing = async (attachment: ScheduleAttachment) => {
    if (!isAdmin) return
    if (!confirm(`「${attachment.fileName}」を削除しますか？`)) return
    try {
      setDrawingBusy(true)
      await deleteScheduleAttachment(attachment)
      setScheduleAttachments((current) => current.filter((item) => item.id !== attachment.id))
    } catch (error) {
      alert(error instanceof Error ? error.message : '図面の削除に失敗しました。')
    } finally {
      setDrawingBusy(false)
    }
  }

  const saveSchedule = async () => {
    if (!isAdmin) return
    if (!scheduleTitle.trim()) {
      alert('予定名を入力してください。')
      return
    }

    const values = {
      date: selectedDate,
      title: scheduleTitle.trim(),
      place: schedulePlace.trim() || '未設定',
      color: scheduleColor,
      employeeIds: selectedEmployeeIds,
      externalContractors,
    }

    try {
      if (cloudScheduleSyncEnabled) {
        setCloudScheduleBusy(true)
        if (editingScheduleId === null) {
          const created = await createCloudSchedule(values)
          setSchedules((current) => [...current, created])
          try { await uploadPendingDrawings(created.id) } catch (drawingError) { console.error('予定は保存されましたが図面アップロードに失敗しました。', drawingError); alert(drawingError instanceof Error ? drawingError.message : '図面アップロードに失敗しました。') }
          try {
            await createScheduleNotifications(created.employeeIds, 'schedule_created', { id: created.id, date: created.date, title: created.title, place: created.place })
          } catch (notificationError) {
            console.error('予定は保存されましたが通知作成に失敗しました。', notificationError)
          }
        } else {
          const updated = await updateCloudSchedule({ id: editingScheduleId, ...values })
          setSchedules((current) => current.map((schedule) => schedule.id === editingScheduleId ? updated : schedule))
          try { await uploadPendingDrawings(updated.id) } catch (drawingError) { console.error('予定は更新されましたが図面アップロードに失敗しました。', drawingError); alert(drawingError instanceof Error ? drawingError.message : '図面アップロードに失敗しました。') }
          try {
            await createScheduleNotifications(updated.employeeIds, 'schedule_updated', { id: updated.id, date: updated.date, title: updated.title, place: updated.place })
          } catch (notificationError) {
            console.error('予定は更新されましたが通知作成に失敗しました。', notificationError)
          }
        }
        setCloudScheduleMessage('予定をSupabaseへ保存しました。')
      } else {
        setSchedules((current) =>
          editingScheduleId === null
            ? [...current, { id: Date.now(), ...values }]
            : current.map((schedule) => schedule.id === editingScheduleId ? { ...schedule, ...values } : schedule),
        )
      }
      setScheduleModalOpen(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : '予定の保存に失敗しました。'
      setCloudScheduleMessage(message)
      alert(message)
    } finally {
      setCloudScheduleBusy(false)
    }
  }

  const removeSchedule = async (id: number, askConfirmation = true) => {
    if (!isAdmin) return
    const target = schedules.find((schedule) => schedule.id === id)
    if (!target) return
    if (askConfirmation && !confirm(`「${target.title}」を削除しますか？`)) return

    try {
      if (cloudScheduleSyncEnabled) {
        setCloudScheduleBusy(true)
        try {
          const drawings = await fetchScheduleAttachments(id)
          for (const drawing of drawings) await deleteScheduleAttachment(drawing)
        } catch (drawingError) {
          console.warn('予定削除前の図面クリーンアップに失敗しました。', drawingError)
        }
        await deleteCloudSchedule(id)
        try {
          await createScheduleNotifications(target.employeeIds, 'schedule_deleted', { id: null, date: target.date, title: target.title, place: target.place })
        } catch (notificationError) {
          console.error('予定は削除されましたが通知作成に失敗しました。', notificationError)
        }
        setCloudScheduleMessage('予定をSupabaseから削除しました。')
      }
      setSchedules((current) => current.filter((schedule) => schedule.id !== id))
    } catch (error) {
      const message = error instanceof Error ? error.message : '予定の削除に失敗しました。'
      setCloudScheduleMessage(message)
      alert(message)
    } finally {
      setCloudScheduleBusy(false)
    }
  }

  const deleteSchedule = async () => {
    if (editingScheduleId === null) return
    await removeSchedule(editingScheduleId)
    setScheduleModalOpen(false)
  }

  const loadSchedulesFromCloud = async () => {
    try {
      setCloudScheduleBusy(true)
      setCloudScheduleMessage('Supabaseから予定を読み込んでいます…')
      const cloudSchedules = await fetchCloudSchedules()
      setSchedules(cloudSchedules)
      setCloudScheduleSyncEnabled(true)
      setCloudScheduleMessage(`Supabaseから予定を${cloudSchedules.length}件読み込みました。以後の予定変更もクラウドへ保存されます。`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'クラウド予定の読み込みに失敗しました。'
      setCloudScheduleMessage(message)
      alert(`${message}
先に supabase/step2_schedules.sql をSQL Editorで実行してください。`)
    } finally {
      setCloudScheduleBusy(false)
    }
  }

  const migrateLocalSchedulesToCloud = async () => {
    if (!confirm(`このPCの予定${schedules.length}件をSupabaseへ送信しますか？`)) return
    try {
      setCloudScheduleBusy(true)
      setCloudScheduleMessage('このPCの予定をSupabaseへ送信しています…')
      await uploadSchedulesToCloud(schedules)
      const cloudSchedules = await fetchCloudSchedules()
      setSchedules(cloudSchedules)
      setCloudScheduleSyncEnabled(true)
      setCloudScheduleMessage(`移行完了：Supabaseに予定が${cloudSchedules.length}件あります。`)
    } catch (error) {
      const message = error instanceof Error ? error.message : '予定のクラウド移行に失敗しました。'
      setCloudScheduleMessage(message)
      alert(`${message}
先に supabase/step2_schedules.sql をSQL Editorで実行してください。`)
    } finally {
      setCloudScheduleBusy(false)
    }
  }

  const openAttendance = (date: string, day: string) => {
    const current = getAttendance(date, day)
    setAttendanceDate(date)
    setWorkerIds(current.workers)
    setHolidayIds(current.holidays)
    setAttendanceModalOpen(true)
  }

  const changeWorker = (id: string) => {
    if (workerIds.includes(id)) {
      setWorkerIds(workerIds.filter((value) => value !== id))
    } else {
      setWorkerIds([...workerIds, id])
      setHolidayIds(holidayIds.filter((value) => value !== id))
    }
  }

  const changeHoliday = (id: string) => {
    if (holidayIds.includes(id)) {
      setHolidayIds(holidayIds.filter((value) => value !== id))
    } else {
      setHolidayIds([...holidayIds, id])
      setWorkerIds(workerIds.filter((value) => value !== id))
    }
  }

  const saveAttendance = () => {
    setAttendance((current) => ({
      ...current,
      [attendanceDate]: { workers: workerIds, holidays: holidayIds },
    }))
    setAttendanceModalOpen(false)
  }

  const openEmployeeModal = (employee?: Employee) => {
    setEditingEmployeeId(employee?.id ?? null)
    setEmployeeName(employee?.name ?? '')
    setEmployeeModalOpen(true)
  }

  const saveEmployee = () => alert('社員はSupabase Authentication / profilesで管理してください。')

  const toggleEmployeeActive = () => alert('社員はSupabase Authentication / profilesで管理してください。')

  const deleteEmployee = () => alert('社員はSupabase Authentication / profilesで管理してください。')


  const openSiteModal = (site?: Site) => {
    setEditingSiteId(site?.id ?? null)
    setSiteName(site?.name ?? '')
    setSiteModalOpen(true)
  }

  const saveSite = async () => {
    const name = siteName.trim()
    if (!name) { alert('現場名を入力してください。'); return }
    if (sites.some(site => site.name === name && site.id !== editingSiteId)) { alert('同じ現場名が登録されています。'); return }
    try { setCloudMasterBusy(true)
      if (cloudMasterSyncEnabled) {
        if (editingSiteId === null) { const created = await createCloudSite({ name, active: true }); setSites(current => [...current, created]) }
        else { const target = sites.find(site => site.id === editingSiteId); if (!target) return; const updated = await updateCloudSite({ ...target, name }); setSites(current => current.map(site => site.id === editingSiteId ? updated : site)) }
        setCloudMasterMessage('現場データをSupabaseへ保存しました。')
      } else setSites(current => editingSiteId === null ? [...current, { id: Date.now(), name, active: true }] : current.map(site => site.id === editingSiteId ? { ...site, name } : site))
      setSiteModalOpen(false)
    } catch (error) { const message = error instanceof Error ? error.message : '現場の保存に失敗しました。'; setCloudMasterMessage(message); alert(message) }
    finally { setCloudMasterBusy(false) }
  }
  const toggleSiteActive = async (id: number) => { const target = sites.find(s => s.id === id); if (!target) return; const changed={...target,active:!target.active}; try { setCloudMasterBusy(true); const saved=cloudMasterSyncEnabled?await updateCloudSite(changed):changed; setSites(current=>current.map(s=>s.id===id?saved:s)) } catch(error){alert(error instanceof Error?error.message:'現場状態の更新に失敗しました。')} finally{setCloudMasterBusy(false)} }
  const deleteSite = async (id: number) => { const site=sites.find(item=>item.id===id); if(!site||!confirm(`「${site.name}」を削除しますか？`))return; try{setCloudMasterBusy(true);if(cloudMasterSyncEnabled)await deleteCloudSite(id);setSites(current=>current.filter(item=>item.id!==id))}catch(error){alert(error instanceof Error?error.message:'現場の削除に失敗しました。')}finally{setCloudMasterBusy(false)} }


  const openNoticeModal = (notice?: Notice) => {
    setEditingNoticeId(notice?.id ?? null)
    setNoticeDate(notice?.date ?? todayKey)
    setNoticeTitle(notice?.title ?? '')
    setNoticeBody(notice?.body ?? '')
    setNoticeImportant(notice?.important ?? false)
    setNoticeModalOpen(true)
  }

  const saveNotice = async () => {
    if (!noticeDate || !noticeTitle.trim()) { alert('日付とタイトルを入力してください。'); return }
    const values = { date: noticeDate, title: noticeTitle.trim(), body: noticeBody.trim(), important: noticeImportant }
    try { setCloudMasterBusy(true)
      if (cloudMasterSyncEnabled) {
        if (editingNoticeId === null) { const created=await createCloudNotice(values); setNotices(current=>[...current,created]) }
        else { const updated=await updateCloudNotice({id:editingNoticeId,...values}); setNotices(current=>current.map(n=>n.id===editingNoticeId?updated:n)) }
        setCloudMasterMessage('お知らせをSupabaseへ保存しました。')
      } else setNotices(current=>editingNoticeId===null?[...current,{id:Date.now(),...values}]:current.map(n=>n.id===editingNoticeId?{...n,...values}:n))
      setNoticeModalOpen(false)
    } catch(error){const message=error instanceof Error?error.message:'お知らせの保存に失敗しました。';setCloudMasterMessage(message);alert(message)} finally{setCloudMasterBusy(false)}
  }
  const deleteNotice = async (id:number) => { const notice=notices.find(item=>item.id===id);if(!notice||!confirm(`「${notice.title}」を削除しますか？`))return;try{setCloudMasterBusy(true);if(cloudMasterSyncEnabled)await deleteCloudNotice(id);setNotices(current=>current.filter(item=>item.id!==id))}catch(error){alert(error instanceof Error?error.message:'お知らせの削除に失敗しました。')}finally{setCloudMasterBusy(false)} }

  const loadMasterDataFromCloud = async () => {
    try { setCloudMasterBusy(true); setCloudMasterMessage('ユーザー・現場・お知らせを読み込んでいます…'); const [cloudEmployees,cloudSites,cloudNotices]=await Promise.all([fetchCloudEmployees(),fetchCloudSites(),fetchCloudNotices()]); setEmployees(cloudEmployees);setSites(cloudSites);setNotices(cloudNotices);setCloudMasterSyncEnabled(true);setCloudMasterMessage(`読み込み完了：ユーザー${cloudEmployees.length}名、現場${cloudSites.length}件、お知らせ${cloudNotices.length}件`) }
    catch(error){const message=error instanceof Error?error.message:'マスターデータの読み込みに失敗しました。';setCloudMasterMessage(message);alert(`${message}
先に supabase/step3_master_data.sql を実行してください。`)}finally{setCloudMasterBusy(false)}
  }
  const migrateMasterDataToCloud = async () => {
    if(!confirm(`現場${sites.length}件、お知らせ${notices.length}件をSupabaseへ送信しますか？`))return
    try{setCloudMasterBusy(true);setCloudMasterMessage('マスターデータをSupabaseへ送信しています…');await uploadMasterData(employees,sites,notices);await loadMasterDataFromCloud()}catch(error){const message=error instanceof Error?error.message:'マスターデータの移行に失敗しました。';setCloudMasterMessage(message);alert(`${message}
先に supabase/step3_master_data.sql を実行してください。`)}finally{setCloudMasterBusy(false)}
  }

  const resetAppSettings = () => {
    if (!confirm('表示設定を初期状態に戻しますか？')) return
    setAppSettings(initialAppSettings)
  }


  const login = async () => {
    const email = loginUsername.trim()
    if (!email || !loginPassword) { setLoginError('メールアドレスとパスワードを入力してください。'); return }
    try {
      setLoginBusy(true)
      setLoginError('')
      const session = await signInWithEmail(email, loginPassword)
      const profile = await fetchAuthProfile(session.user.id, session.user.email ?? email)
      setAuthProfile(profile)
      setLoginPassword('')
      setPage('home')
      setCloudScheduleSyncEnabled(true)
      setCloudMasterSyncEnabled(true)
    } catch (error) {
      await signOutCloud()
      setAuthProfile(null)
      setLoginError(error instanceof Error ? error.message : 'ログインに失敗しました。')
    } finally {
      setLoginBusy(false)
    }
  }

  const logout = async () => {
    await signOutCloud()
    setAuthProfile(null)
    setCurrentUserId(null)
    setLoginUsername('')
    setLoginPassword('')
    setMobileMenuOpen(false)
  }

  const openUserModal = (user?: AppUser) => {
    setEditingUserId(user?.id ?? null)
    setUserUsername(user?.username ?? '')
    setUserPassword(user?.password ?? '')
    setUserDisplayName(user?.displayName ?? '')
    setUserRole(user?.role ?? 'employee')
    setUserModalOpen(true)
  }

  const saveUser = () => {
    const username = userUsername.trim()
    const displayName = userDisplayName.trim()
    if (!username || !displayName || !userPassword) { alert('表示名、ユーザー名、パスワードを入力してください。'); return }
    if (users.some((user) => user.username === username && user.id !== editingUserId)) { alert('同じユーザー名が登録されています。'); return }
    setUsers((current) => editingUserId === null
      ? [...current, { id: Date.now(), username, password: userPassword, displayName, role: userRole, active: true }]
      : current.map((user) => user.id === editingUserId ? { ...user, username, password: userPassword, displayName, role: userRole } : user))
    setUserModalOpen(false)
  }

  const toggleUserActive = (id: number) => {
    if (id === currentUserId) { alert('ログイン中のユーザーは無効にできません。'); return }
    setUsers((current) => current.map((user) => user.id === id ? { ...user, active: !user.active } : user))
  }

  const deleteUser = (id: number) => {
    if (id === currentUserId) { alert('ログイン中のユーザーは削除できません。'); return }
    if (!confirm('このユーザーを削除しますか？')) return
    setUsers((current) => current.filter((user) => user.id !== id))
  }

  const downloadBlob = (content: BlobPart, type: string, filename: string) => {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const exportCsv = () => {
    const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`
    const rows = [
      ['日付', '予定名', '社員名', '現場・場所', '色'],
      ...filteredSchedules
        .slice()
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((schedule) => [schedule.date, schedule.title, employeeNames(schedule.employeeIds), contractorSummary(schedule.externalContractors ?? []), schedule.place, schedule.color]),
    ]
    const csv = '\uFEFF' + rows.map((row) => row.map((value) => escapeCsv(String(value))).join(',')).join('\r\n')
    downloadBlob(csv, 'text/csv;charset=utf-8', `予定一覧_${currentYear}-${String(currentMonth).padStart(2, '0')}.csv`)
  }

  const exportExcel = () => {
    const escapeHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const rows = filteredSchedules
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((schedule) => `<tr><td>${escapeHtml(schedule.date)}</td><td>${escapeHtml(schedule.title)}</td><td>${escapeHtml(employeeNames(schedule.employeeIds))}</td><td>${escapeHtml(contractorSummary(schedule.externalContractors ?? []))}</td><td>${escapeHtml(schedule.place)}</td><td>${escapeHtml(schedule.color)}</td></tr>`)
      .join('')
    const html = `\uFEFF<html><head><meta charset="UTF-8"></head><body><table border="1"><thead><tr><th>日付</th><th>予定名</th><th>社員名</th><th>現場・場所</th><th>色</th></tr></thead><tbody>${rows}</tbody></table></body></html>`
    downloadBlob(html, 'application/vnd.ms-excel;charset=utf-8', `予定一覧_${currentYear}-${String(currentMonth).padStart(2, '0')}.xls`)
  }

  const clearScheduleFilters = () => {
    setScheduleEmployeeFilter('')
    setScheduleSiteFilter('')
    setScheduleDateFrom('')
    setScheduleDateTo('')
  }

  const openPersonalNotification = async (item: PersonalNotification) => {
    if (item.read) return
    try {
      setNotificationBusy(true)
      await markNotificationRead(item.id)
      setPersonalNotifications((current) => current.map((value) => value.id === item.id ? { ...value, read: true } : value))
    } catch (error) {
      alert(error instanceof Error ? error.message : '通知を既読にできませんでした。')
    } finally {
      setNotificationBusy(false)
    }
  }

  const readAllPersonalNotifications = async () => {
    if (!authProfile || unreadNotificationCount === 0) return
    try {
      setNotificationBusy(true)
      await markAllNotificationsRead(authProfile.id)
      setPersonalNotifications((current) => current.map((item) => ({ ...item, read: true })))
    } catch (error) {
      alert(error instanceof Error ? error.message : '通知を既読にできませんでした。')
    } finally {
      setNotificationBusy(false)
    }
  }

  const goPreviousMonth = () => {
    if (currentMonth === 1) {
      setCurrentYear((year) => year - 1)
      setCurrentMonth(12)
    } else setCurrentMonth((month) => month - 1)
  }

  const goNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentYear((year) => year + 1)
      setCurrentMonth(1)
    } else setCurrentMonth((month) => month + 1)
  }

  const filteredEmployees = employees.filter((employee) =>
    `${employee.name} ${employee.email}`.toLowerCase().includes(employeeSearch.toLowerCase()),
  )
  const filteredSites = sites.filter((site) =>
    site.name.toLowerCase().includes(siteSearch.toLowerCase()),
  )

  const today = new Date()
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const todayDay = ['日', '月', '火', '水', '木', '金', '土'][today.getDay()]
  const todayAttendance = getAttendance(todayKey, todayDay)
  const todaySchedules = schedulesByDate[todayKey] ?? []
  const todayPlaces = Array.from(
    new Set(todaySchedules.map((schedule) => schedule.place).filter((place) => place && place !== '未設定')),
  )
  const todayLabel = new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(today)

  const renderHome = () => (
    <>
      <header className="home-hero">
        <div>
          <p className="home-eyebrow">{appSettings.companyName}</p>
          <h1>{appSettings.systemName}</h1>
          <p className="home-date">{todayLabel}</p>
        </div>
        {appSettings.showLogoOnHome && <img src="/matsumoto-logo.jpg" alt="有限会社松本興業 ロゴ" className="home-logo" />}
      </header>

      <section className="summary-grid">
        <article className="summary-card">
          <div className="summary-icon"><Users size={22} /></div>
          <div><span>今日の出勤</span><strong>{todayAttendance.workers.length}<small>名</small></strong></div>
        </article>
        <article className="summary-card">
          <div className="summary-icon holiday"><Home size={22} /></div>
          <div><span>今日の休み</span><strong>{todayAttendance.holidays.length}<small>名</small></strong></div>
        </article>
        <article className="summary-card">
          <div className="summary-icon site"><MapPin size={22} /></div>
          <div><span>今日の現場</span><strong>{todayPlaces.length}<small>件</small></strong></div>
        </article>
        <article className="summary-card">
          <div className="summary-icon schedule"><CalendarDays size={22} /></div>
          <div><span>今日の予定</span><strong>{todaySchedules.length}<small>件</small></strong></div>
        </article>
      </section>

      <section className="home-content-grid">
        <article className="dashboard-panel">
          <div className="panel-heading"><div><BriefcaseBusiness size={20} /><h2>今日の予定・現場</h2></div><button type="button" onClick={() => { setPage('calendar'); setMobileMenuOpen(false) }}>カレンダーを見る</button></div>
          {todaySchedules.length ? (
            <div className="today-schedule-list">
              {todaySchedules.map((schedule) => (
                <button type="button" key={schedule.id} className="today-schedule-row" onClick={() => openEditSchedule(schedule)}>
                  <span className={`today-color schedule-${schedule.color}`} />
                  <span className="today-schedule-main"><strong>{schedule.title}</strong><small>{employeeNames(schedule.employeeIds)}</small>{(schedule.externalContractors?.length ?? 0) > 0 && <small>外部：{contractorSummary(schedule.externalContractors)}</small>}</span>
                  <span className="today-place"><MapPin size={15} />{schedule.place}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="empty-panel"><CalendarDays size={32} /><strong>今日の予定はありません</strong><span>カレンダーから予定を追加できます。</span><button type="button" className="primary-button" onClick={() => openAddSchedule(todayKey)}><Plus size={17} />今日の予定を追加</button></div>
          )}
        </article>

        <article className="dashboard-panel">
          <div className="panel-heading"><div><Users size={20} /><h2>今日の勤務状況</h2></div><button type="button" onClick={() => openAttendance(todayKey, todayDay)}>編集</button></div>
          <div className="attendance-summary-block">
            <h3>出勤</h3>
            <p>{employeeNames(todayAttendance.workers)}</p>
          </div>
          <div className="attendance-summary-block holiday-block">
            <h3>休み</h3>
            <p>{employeeNames(todayAttendance.holidays)}</p>
          </div>
        </article>
      </section>

      <section className="dashboard-panel notice-preview">
        <div className="panel-heading"><div><Bell size={20} /><h2>お知らせ</h2></div></div>
        {notices.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4).map((notice) => (
          <button type="button" className={`notice-row notice-row-button ${notice.important ? 'notice-important' : ''}`} key={notice.id} onClick={() => setPage('notices')}>
            <span className="notice-date">{notice.date.slice(5).replace('-', '/')}</span><strong>{notice.title}</strong><span>{notice.body || '詳細はありません。'}</span>
          </button>
        ))}
        {notices.length === 0 && <div className="empty-list">お知らせはありません。</div>}
      </section>
    </>
  )

  const renderCalendarTable = (rows: CalendarRow[], label: string) => (
    <section className="calendar-half">
      <div className="calendar-half-title">{label}</div>
      <div className="schedule-table-wrap">
        <table className="schedule-table">
          <thead>
            <tr>
              <th className="date-column">日付</th>
              <th className="workers-column">出勤者</th>
              <th className="holiday-column">休み</th>
              <th>その日にあること</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const daySchedules = schedulesByDate[row.date] ?? []
              const dayAttendance = getAttendance(row.date, row.day)
              return (
                <tr key={row.date} onDoubleClick={() => { if (isAdmin) openAddSchedule(row.date) }}>
                  <td className={`date-cell ${row.day === '日' ? 'date-sunday' : ''} ${row.day === '土' ? 'date-saturday' : ''}`}>
                    <button type="button" className="date-button" onClick={() => { if (isAdmin) openAttendance(row.date, row.day) }}>
                      <span className="date-number">{Number(row.date.slice(-2))}</span>
                      <span className="date-day">{row.day}</span>
                    </button>
                  </td>
                  <td className="workers-cell editable-cell" onClick={() => { if (isAdmin) openAttendance(row.date, row.day) }}>
                    {dayAttendance.workers.length ? (
                      <span className="worker-name">{employeeNames(dayAttendance.workers)}</span>
                    ) : (
                      <span className="empty-text">出勤者なし</span>
                    )}
                  </td>
                  <td className="holiday-cell editable-cell" onClick={() => { if (isAdmin) openAttendance(row.date, row.day) }}>
                    {dayAttendance.holidays.length ? (
                      <span className="holiday-name">{employeeNames(dayAttendance.holidays)}</span>
                    ) : (
                      <span className="empty-text">なし</span>
                    )}
                  </td>
                  <td className="schedule-cell">
                    <div className="schedule-list">
                      {daySchedules.map((schedule) => (
                        <button
                          type="button"
                          key={schedule.id}
                          className={`schedule-card schedule-${schedule.color}`}
                          onClick={(event) => {
                            event.stopPropagation()
                            openEditSchedule(schedule)
                          }}
                        >
                          <span className="schedule-card-title">{schedule.title}</span>
                          <span className="schedule-card-meta">
                            <span>{employeeNames(schedule.employeeIds)}</span>
                            <span>{schedule.place}</span>
                          </span>
                          {(schedule.externalContractors?.length ?? 0) > 0 && <span className="schedule-card-contractors">外部：{contractorSummary(schedule.externalContractors)}</span>}
                        </button>
                      ))}
                      {isAdmin && <button type="button" className="row-add-button" onClick={() => openAddSchedule(row.date)}>
                        <Plus size={14} />追加
                      </button>}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )

  if (authLoading) {
    return <div className="login-page"><section className="login-card"><h1>会社予定管理システム</h1><p>安全なログイン状態を確認しています…</p></section></div>
  }

  if (!currentUser) {
    return (
      <div className="login-page">
        <section className="login-card">
          <img src="/matsumoto-logo.jpg" alt="松本興業" className="login-logo" />
          <h1>{appSettings.companyName}</h1>
          <p>{appSettings.systemName}</p>
          <div className="login-form">
            <label><span>メールアドレス</span><div className="login-input"><Users size={18} /><input type="email" value={loginUsername} onChange={(event) => setLoginUsername(event.target.value)} placeholder="name@example.com" autoFocus autoComplete="email" /></div></label>
            <label><span>パスワード</span><div className="login-input"><KeyRound size={18} /><input type="password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') login() }} placeholder="パスワード" /></div></label>
            {loginError && <div className="login-error">{loginError}</div>}
            <button type="button" className="primary-button login-button" onClick={login} disabled={loginBusy}><LogIn size={18} />{loginBusy ? 'ログイン中…' : 'ログイン'}</button>
          </div>
          <div className="login-demo"><strong>会社専用・招待制</strong><span>管理者がSupabaseに登録したアカウントだけ利用できます。</span></div>
        </section>
      </div>
    )
  }

  return (
    <div className={`app-shell ${appSettings.compactCalendar ? 'compact-calendar' : ''}`}>
      <aside className={`sidebar ${mobileMenuOpen ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <img src="/matsumoto-logo.jpg" alt="松本興業" className="brand-logo" />
          <div><div className="brand-title">{appSettings.companyName}</div><div className="brand-subtitle">{appSettings.systemName}</div></div>
        </div>
        <nav className="sidebar-nav">
          <button type="button" className={`nav-button ${page === 'home' ? 'nav-button-active' : ''}`} onClick={() => { setPage('home'); setMobileMenuOpen(false) }}><Home size={19} />ホーム</button>
          <button type="button" className={`nav-button ${page === 'calendar' ? 'nav-button-active' : ''}`} onClick={() => { setPage('calendar'); setMobileMenuOpen(false) }}><CalendarDays size={19} />カレンダー</button>
          {isAdmin && <button type="button" className={`nav-button ${page === 'employees' ? 'nav-button-active' : ''}`} onClick={() => { setPage('employees'); setMobileMenuOpen(false) }}><Users size={19} />ユーザー一覧</button>}
          {isAdmin && <button type="button" className={`nav-button ${page === 'sites' ? 'nav-button-active' : ''}`} onClick={() => { setPage('sites'); setMobileMenuOpen(false) }}><MapPin size={19} />現場管理</button>}
          <button type="button" className={`nav-button ${page === 'notices' ? 'nav-button-active' : ''}`} onClick={() => { setPage('notices'); setMobileMenuOpen(false) }}><Bell size={19} />お知らせ{unreadNotificationCount > 0 && <span className="notification-badge">{unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}</span>}</button>
          {isAdmin && <button type="button" className={`nav-button ${page === 'settings' ? 'nav-button-active' : ''}`} onClick={() => { setPage('settings'); setMobileMenuOpen(false) }}><Settings size={19} />設定</button>}
        </nav>
        <div className="sidebar-account"><div><strong>{currentUser.displayName}</strong><span>{isAdmin ? '管理者' : '一般社員'}</span></div><button type="button" onClick={logout} title="ログアウト"><LogOut size={18} /></button></div>
      </aside>

      {mobileMenuOpen && <button type="button" className="sidebar-overlay" onClick={() => setMobileMenuOpen(false)} aria-label="メニューを閉じる" />}

      <main className="main-content">
        <button type="button" className="mobile-menu-button" onClick={() => setMobileMenuOpen(true)} aria-label="メニューを開く"><Menu size={22} /></button>
        {page === 'home' ? renderHome() : page === 'calendar' ? (
          <>
            <header className="topbar">
              <div><h1>勤務・予定カレンダー</h1><p>出勤者、休み、現場予定を月ごとに確認できます。</p></div>
              <div className="topbar-actions">
                {isAdmin && <button type="button" className="primary-button" onClick={() => openAddSchedule()}><Plus size={18} />予定を追加</button>}
                <button type="button" className="secondary-button search-open-button" onClick={() => setSearchModalOpen(true)}><Search size={18} />予定検索</button>
              </div>
            </header>
            <section className="calendar-toolbar">
              <div className="month-switcher">
                <button type="button" onClick={goPreviousMonth}><ChevronLeft size={20} /></button>
                <strong>{currentYear}年{currentMonth}月</strong>
                <button type="button" onClick={goNextMonth}><ChevronRight size={20} /></button>
                <button type="button" className="today-button" onClick={() => { const now = new Date(); setCurrentYear(now.getFullYear()); setCurrentMonth(now.getMonth() + 1) }}>今月</button>
              </div>
              <div className="toolbar-note">{isAdmin ? '日付・出勤者・休みをクリックすると編集できます' : '閲覧専用でログインしています'}</div>
            </section>
            <div className="two-column-calendar">
              {renderCalendarTable(leftRows, `1日〜${leftRows.length}日`)}
              {renderCalendarTable(rightRows, `${middleIndex + 1}日〜${calendarRows.length}日`)}
            </div>
          </>
        ) : page === 'employees' ? (
          <>
            <header className="topbar"><div><h1>ユーザー一覧</h1><p>Supabase Authentication と profiles に登録された社内メンバーです。</p></div><button type="button" className="secondary-button" onClick={loadMasterDataFromCloud}><Database size={18} />再読み込み</button></header>
            <section className="employee-panel">
              <div className="employee-toolbar"><div className="search-box"><Search size={18} /><input value={employeeSearch} onChange={(event) => setEmployeeSearch(event.target.value)} placeholder="名前・メールで検索" /></div><span>登録 {employees.length}名／有効 {activeEmployees.length}名</span></div>
              <div className="employee-list">{filteredEmployees.map((employee) => <article className="employee-card" key={employee.id}><div className="employee-avatar">{employee.name.slice(0,1)}</div><div className="employee-info"><strong>{employee.name}</strong><span>{employee.email}</span><span>{employee.role === 'admin' ? '管理者' : '一般社員'} ・ {employee.active ? '有効' : '無効'}</span></div></article>)}{filteredEmployees.length===0&&<div className="empty-list">該当するユーザーがいません。</div>}</div>
            </section>
          </>
        ) : page === 'sites' ? (
          <>
            <header className="topbar">
              <div><h1>現場管理</h1><p>予定登録で選択する現場・場所を管理します。</p></div>
              <button type="button" className="primary-button" onClick={() => openSiteModal()}><Plus size={18} />現場を追加</button>
            </header>
            <section className="employee-panel">
              <div className="employee-toolbar">
                <div className="search-box"><Search size={18} /><input value={siteSearch} onChange={(event) => setSiteSearch(event.target.value)} placeholder="現場名で検索" /></div>
                <span>登録 {sites.length}件／使用中 {activeSites.length}件</span>
              </div>
              <div className="employee-list">
                {filteredSites.map((site) => (
                  <article className="employee-card" key={site.id}>
                    <div className="employee-avatar site-avatar"><MapPin size={20} /></div>
                    <div className="employee-info"><strong>{site.name}</strong><span className={site.active ? 'status-active' : 'status-inactive'}>{site.active ? '使用中' : '非表示'}</span></div>
                    <div className="employee-actions">
                      <button type="button" className="small-button" onClick={() => toggleSiteActive(site.id)}>{site.active ? '非表示にする' : '使用する'}</button>
                      <button type="button" className="icon-button" onClick={() => openSiteModal(site)}><Pencil size={17} /></button>
                      <button type="button" className="icon-button danger" onClick={() => deleteSite(site.id)}><Trash2 size={17} /></button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </>
        ) : page === 'notices' ? (
          <>
            <header className="topbar">
              <div><h1>お知らせ</h1><p>社内へ共有する連絡事項を登録・編集できます。</p></div>
              {isAdmin && <button type="button" className="primary-button" onClick={() => openNoticeModal()}><Plus size={18} />お知らせを追加</button>}
            </header>
            <section className="notice-management-panel personal-notification-panel">
              <div className="notice-management-summary notification-summary-row"><span>あなたへの予定通知 <strong>{personalNotifications.length}件</strong>{unreadNotificationCount > 0 && <em>未読 {unreadNotificationCount}件</em>}</span>{unreadNotificationCount > 0 && <button type="button" className="small-button" onClick={readAllPersonalNotifications} disabled={notificationBusy}>すべて既読</button>}</div>
              <div className="notice-management-list">
                {personalNotifications.map((item) => (
                  <button type="button" className={`personal-notification-card ${item.read ? 'notification-read' : 'notification-unread'}`} key={item.id} onClick={() => openPersonalNotification(item)}>
                    <span className="notification-state-dot" aria-hidden="true" />
                    <span className="personal-notification-content"><strong>{item.title}</strong><span>{item.body}</span><small>{new Date(item.createdAt).toLocaleString('ja-JP')}</small></span>
                  </button>
                ))}
                {personalNotifications.length === 0 && <div className="empty-list">あなた宛ての予定通知はありません。</div>}
              </div>
            </section>
            <section className="notice-management-panel">
              <div className="notice-management-summary">会社からのお知らせ <strong>{notices.length}件</strong></div>
              <div className="notice-management-list">
                {notices.slice().sort((a, b) => b.date.localeCompare(a.date)).map((notice) => (
                  <article className={`notice-management-card ${notice.important ? 'notice-card-important' : ''}`} key={notice.id}>
                    <div className="notice-management-date">{notice.date}</div>
                    <div className="notice-management-content">
                      <div className="notice-title-line"><strong>{notice.title}</strong>{notice.important && <span>重要</span>}</div>
                      <p>{notice.body || '詳細はありません。'}</p>
                    </div>
                    {isAdmin && <div className="notice-management-actions">
                      <button type="button" className="small-button" onClick={() => openNoticeModal(notice)}><Pencil size={16} />編集</button>
                      <button type="button" className="icon-button danger" onClick={() => deleteNotice(notice.id)}><Trash2 size={17} /></button>
                    </div>}
                  </article>
                ))}
                {notices.length === 0 && <div className="empty-list">お知らせはまだ登録されていません。</div>}
              </div>
            </section>
          </>
        ) : page === 'users' ? (
          <>
            <header className="topbar"><div><h1>ユーザー管理</h1><p>ログインアカウントと権限を管理します。</p></div><button type="button" className="primary-button" onClick={() => openUserModal()}><UserRoundPlus size={18} />ユーザーを追加</button></header>
            <section className="employee-panel"><div className="employee-toolbar"><span>登録ユーザー {users.length}名</span></div><div className="employee-list">{users.map((user) => <article className="employee-card" key={user.id}><div className="employee-avatar">{user.displayName.slice(0, 1)}</div><div className="employee-info"><strong>{user.displayName}</strong><span>{user.username} ・ {user.role === 'admin' ? '管理者' : '一般社員'}</span><span className={user.active ? 'status-active' : 'status-inactive'}>{user.active ? '使用中' : '無効'}</span></div><div className="employee-actions"><button type="button" className="small-button" onClick={() => toggleUserActive(user.id)}>{user.active ? '無効にする' : '有効にする'}</button><button type="button" className="icon-button" onClick={() => openUserModal(user)}><Pencil size={17} /></button><button type="button" className="icon-button danger" onClick={() => deleteUser(user.id)}><Trash2 size={17} /></button></div></article>)}</div></section>
          </>
        ) : (
          <>
            <header className="topbar"><div><h1>設定</h1><p>会社名やホーム画面、カレンダーの表示を設定します。</p></div></header>
            <section className="settings-grid">
              <article className="settings-card">
                <div className="settings-card-heading"><Settings size={20} /><div><h2>基本設定</h2><p>画面に表示する名称を変更できます。</p></div></div>
                <label className="form-field"><span>会社名</span><input value={appSettings.companyName} onChange={(event) => setAppSettings((current) => ({ ...current, companyName: event.target.value }))} /></label>
                <label className="form-field"><span>システム名</span><input value={appSettings.systemName} onChange={(event) => setAppSettings((current) => ({ ...current, systemName: event.target.value }))} /></label>
              </article>
              <article className="settings-card">
                <div className="settings-card-heading"><Home size={20} /><div><h2>表示設定</h2><p>利用する画面に合わせて表示を調整します。</p></div></div>
                <label className="setting-toggle"><span><strong>ホームに会社ロゴを表示</strong><small>ホーム画面右上のロゴを表示します。</small></span><input type="checkbox" checked={appSettings.showLogoOnHome} onChange={(event) => setAppSettings((current) => ({ ...current, showLogoOnHome: event.target.checked }))} /></label>
                <label className="setting-toggle"><span><strong>カレンダーをコンパクト表示</strong><small>1行の高さを抑えて、より多くの日付を表示します。</small></span><input type="checkbox" checked={appSettings.compactCalendar} onChange={(event) => setAppSettings((current) => ({ ...current, compactCalendar: event.target.checked }))} /></label>
              </article>
              <article className="settings-card supabase-card">
                <div className="settings-card-heading"><Database size={20} /><div><h2>クラウド同期（Supabase）</h2><p>会社PC・スマホ・自宅PCで同じデータを使うための接続設定です。</p></div></div>
                <div className={`supabase-status supabase-status-${supabaseStatus}`}>
                  {supabaseStatus === 'connected' ? <Wifi size={20} /> : <WifiOff size={20} />}
                  <div><strong>{supabaseStatus === 'connected' ? '接続済み' : supabaseStatus === 'testing' ? '接続確認中' : '未接続'}</strong><span>{supabaseMessage}</span></div>
                </div>
                <button type="button" className="primary-button" onClick={checkSupabaseConnection} disabled={supabaseStatus === 'testing'}>
                  <Database size={18} />{supabaseStatus === 'testing' ? '接続確認中…' : '接続を確認'}
                </button>
                <small className="supabase-help">設定方法はプロジェクト内の「SUPABASE_SETUP.md」を確認してください。</small>
                <div className={`cloud-schedule-status ${cloudScheduleSyncEnabled ? 'cloud-schedule-enabled' : ''}`}>
                  <strong>予定データ：{cloudScheduleSyncEnabled ? 'クラウド同期中' : 'このPCのみ'}</strong>
                  <span>{cloudScheduleMessage}</span>
                </div>
                <div className="cloud-schedule-actions">
                  <button type="button" className="secondary-button" onClick={loadSchedulesFromCloud} disabled={cloudScheduleBusy || !getSupabaseConfig().configured}>
                    <Download size={17} />{cloudScheduleBusy ? '処理中…' : 'クラウド予定を読み込む'}
                  </button>
                  <button type="button" className="primary-button" onClick={migrateLocalSchedulesToCloud} disabled={cloudScheduleBusy || !getSupabaseConfig().configured}>
                    <Database size={17} />このPCの予定をクラウドへ移行
                  </button>
                </div>
                <small className="supabase-help">最初に「supabase/step2_schedules.sql」をSupabaseのSQL Editorで実行してください。</small>
                <div className={`cloud-schedule-status ${cloudMasterSyncEnabled ? 'cloud-schedule-enabled' : ''}`}>
                  <strong>社員・現場・お知らせ：{cloudMasterSyncEnabled ? 'クラウド同期中' : 'このPCのみ'}</strong><span>{cloudMasterMessage}</span>
                </div>
                <div className="cloud-schedule-actions">
                  <button type="button" className="secondary-button" onClick={loadMasterDataFromCloud} disabled={cloudMasterBusy || !getSupabaseConfig().configured}><Download size={17} />{cloudMasterBusy ? '処理中…' : 'クラウドデータを読み込む'}</button>
                  <button type="button" className="primary-button" onClick={migrateMasterDataToCloud} disabled={cloudMasterBusy || !getSupabaseConfig().configured}><Database size={17} />社員・現場・お知らせを移行</button>
                </div>
                <small className="supabase-help">最初に「supabase/step3_master_data.sql」をSQL Editorで実行してください。</small>
              </article>
              <article className="settings-card settings-danger-zone">
                <div className="settings-card-heading"><Settings size={20} /><div><h2>設定の初期化</h2><p>会社名と表示設定だけを初期状態へ戻します。</p></div></div>
                <button type="button" className="secondary-button" onClick={resetAppSettings}>表示設定を初期化</button>
              </article>
            </section>
          </>
        )}
      </main>

      {searchModalOpen && (
        <div className="modal-backdrop" onMouseDown={() => setSearchModalOpen(false)}>
          <section className="schedule-modal search-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div><h2><Search size={20} />予定検索</h2><p>社員名・現場名・日付で予定を絞り込めます。</p></div>
              <button type="button" className="close-button" onClick={() => setSearchModalOpen(false)}><X size={21} /></button>
            </div>
            <div className="schedule-search-grid search-modal-grid">
              <label><span>社員名</span><select value={scheduleEmployeeFilter} onChange={(event) => setScheduleEmployeeFilter(event.target.value)}><option value="">すべて</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label>
              <label><span>現場名</span><select value={scheduleSiteFilter} onChange={(event) => setScheduleSiteFilter(event.target.value)}><option value="">すべて</option>{sites.map((site) => <option key={site.id} value={site.name}>{site.name}</option>)}</select></label>
              <label><span>開始日</span><input type="date" value={scheduleDateFrom} onChange={(event) => setScheduleDateFrom(event.target.value)} /></label>
              <label><span>終了日</span><input type="date" value={scheduleDateTo} onChange={(event) => setScheduleDateTo(event.target.value)} /></label>
            </div>
            <div className="search-modal-toolbar">
              <strong>検索結果：{filteredSchedules.length}件</strong>
              <div>
                <button type="button" className="secondary-button" onClick={clearScheduleFilters}>条件をクリア</button>
                <button type="button" className="secondary-button" onClick={exportCsv}><Download size={17} />CSV出力</button>
                <button type="button" className="primary-button" onClick={exportExcel}><FileSpreadsheet size={17} />Excel出力</button>
              </div>
            </div>
            <div className="search-results">
              {filteredSchedules.length === 0 ? <div className="search-empty">該当する予定はありません。</div> : filteredSchedules.map((schedule) => (
                <article className="search-result-card" key={schedule.id}>
                  <div className={`search-result-color schedule-${schedule.color}`} />
                  <div className="search-result-main">
                    <strong>{schedule.date}　{schedule.title}</strong>
                    <span>社内：{employeeNames(schedule.employeeIds) || '未選択'}</span>
                    {(schedule.externalContractors?.length ?? 0) > 0 && <span>外部：{contractorSummary(schedule.externalContractors)}</span>}
                    <span>現場：{schedule.place || '未入力'}</span>
                  </div>
                  <div className="search-result-actions">
                    <button type="button" className="small-button" onClick={() => { setSearchModalOpen(false); openEditSchedule(schedule) }}><Pencil size={16} />編集</button>
                    <button type="button" className="icon-button danger" aria-label="予定を削除" onClick={() => removeSchedule(schedule.id)}><Trash2 size={17} /></button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}


      {noticeModalOpen && (
        <div className="modal-backdrop" onMouseDown={() => setNoticeModalOpen(false)}>
          <section className="schedule-modal notice-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-header"><div><h2>{editingNoticeId === null ? 'お知らせを追加' : 'お知らせを編集'}</h2><p>ホーム画面にも最新のお知らせが表示されます。</p></div><button type="button" className="close-button" onClick={() => setNoticeModalOpen(false)}><X size={21} /></button></div>
            <div className="form-grid">
              <label className="form-field"><span>掲載日</span><input type="date" value={noticeDate} onChange={(event) => setNoticeDate(event.target.value)} /></label>
              <label className="form-field form-field-full"><span>タイトル</span><input value={noticeTitle} onChange={(event) => setNoticeTitle(event.target.value)} placeholder="例：安全会議のお知らせ" /></label>
              <label className="form-field form-field-full"><span>内容</span><textarea value={noticeBody} onChange={(event) => setNoticeBody(event.target.value)} placeholder="社内へ共有する内容を入力してください" rows={5} /></label>
              <label className="setting-toggle form-field-full"><span><strong>重要なお知らせ</strong><small>赤い目印を付けて目立たせます。</small></span><input type="checkbox" checked={noticeImportant} onChange={(event) => setNoticeImportant(event.target.checked)} /></label>
            </div>
            <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setNoticeModalOpen(false)}>キャンセル</button><button type="button" className="primary-button" onClick={saveNotice}>保存</button></div>
          </section>
        </div>
      )}

      {scheduleModalOpen && (
        <div className="modal-backdrop" onMouseDown={() => setScheduleModalOpen(false)}>
          <section className={`schedule-modal schedule-detail-modal ${isAdmin ? 'admin-mode' : 'viewer-mode'}`} onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-header schedule-detail-header">
              <div>
                <div className={`mode-badge ${isAdmin ? 'mode-admin' : 'mode-viewer'}`}>{isAdmin ? '編集モード' : '閲覧モード（編集はできません）'}</div>
                <h2>{editingScheduleId === null ? '予定を追加' : '予定詳細'}</h2>
              </div>
              <button type="button" className="close-button" onClick={() => setScheduleModalOpen(false)}><X size={21} /></button>
            </div>

            {!isAdmin && editingScheduleId !== null ? (
              <div className="viewer-detail-body">
                <div className="detail-card">
                  <div className="detail-row"><span>日付</span><strong>{selectedDate.replaceAll('-', '/')}</strong></div>
                  <div className="detail-row"><span>予定名</span><strong>{scheduleTitle || '未設定'}</strong></div>
                  <div className="detail-row"><span>場所・現場</span><strong>{schedulePlace || '未設定'}</strong></div>
                  <div className="detail-row detail-row-stack"><span>社内メンバー</span><div className="detail-members">{selectedEmployeeIds.length > 0 ? selectedEmployeeIds.map((id) => { const employee = employees.find((item) => item.id === id); return employee ? <div className="detail-member" key={id}><strong>{employee.name}</strong><small>{employee.email}</small></div> : null }) : <strong>未登録</strong>}</div></div>
                  <div className="detail-row detail-row-stack"><span>外部業者</span><div>{externalContractors.length > 0 ? externalContractors.map((contractor, index) => <div key={`${contractor.companyName}-${index}`}><strong>{contractor.companyName}</strong> <small>／ {contractor.people}名</small></div>) : <strong>会社名：未登録 ／ 人数：0名</strong>}</div></div>
                  <div className="detail-row"><span>色ラベル</span><strong className="detail-color"><i className={`detail-color-dot schedule-${scheduleColor}`} />{colorOptions.find((option) => option.value === scheduleColor)?.label ?? scheduleColor}</strong></div>
                </div>
                <div className="drawing-section viewer-drawing-section">
                  <span>添付図面（{scheduleAttachments.length}件）</span>
                  {scheduleAttachments.length > 0 ? <div className="drawing-list">{scheduleAttachments.map((attachment) => <div className="drawing-item" key={attachment.id}><FileText size={20} /><span><strong>{attachment.fileName}</strong><small>{attachment.sizeBytes ? `${(attachment.sizeBytes / 1024 / 1024).toFixed(1)} MB` : '図面ファイル'}</small></span><div className="drawing-actions"><button type="button" className="small-button" onClick={() => openDrawing(attachment)}><ExternalLink size={15} />プレビュー</button><button type="button" className="small-button" onClick={() => downloadDrawing(attachment)}><Download size={15} />ダウンロード</button></div></div>)}</div> : <div className="empty-drawings">添付図面はありません。</div>}
                  {drawingMessage && <small className="drawing-message">{drawingMessage}</small>}
                </div>
                <div className="viewer-close-actions"><button type="button" className="secondary-button" onClick={() => setScheduleModalOpen(false)}>← 戻る</button></div>
              </div>
            ) : (
              <>
                <div className="form-grid">
                  <label className="form-field"><span>日付</span><input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} /></label>
                  <label className="form-field form-field-full"><span>予定名</span><input value={scheduleTitle} onChange={(event) => setScheduleTitle(event.target.value)} placeholder="例：現場A 足場設置" /></label>
                  <label className="form-field form-field-full"><span>場所・現場</span><select value={activeSites.some((site) => site.name === schedulePlace) ? schedulePlace : '__custom__'} onChange={(event) => { const value = event.target.value; setSchedulePlace(value === '__custom__' ? '' : value) }}><option value="">選択してください</option>{activeSites.map((site) => <option key={site.id} value={site.name}>{site.name}</option>)}<option value="__custom__">直接入力する</option></select>{!activeSites.some((site) => site.name === schedulePlace) && <input value={schedulePlace} onChange={(event) => setSchedulePlace(event.target.value)} placeholder="現場名を直接入力" />}</label>
                  <div className="form-field form-field-full participant-section"><span>社内メンバー</span><div className="search-box participant-search"><Search size={18} /><input value={employeePickerSearch} onChange={(event) => setEmployeePickerSearch(event.target.value)} placeholder="名前・メールで検索" /></div><div className="checkbox-grid">{activeEmployees.filter((employee) => `${employee.name} ${employee.email}`.toLowerCase().includes(employeePickerSearch.toLowerCase())).map((employee) => <label className="check-card" key={employee.id}><input type="checkbox" checked={selectedEmployeeIds.includes(employee.id)} onChange={() => toggleId(employee.id, selectedEmployeeIds, setSelectedEmployeeIds)} /><span><strong>{employee.name}</strong><small>{employee.email}</small></span></label>)}</div></div>
                  <div className="form-field form-field-full contractor-section"><span>外部業者</span><small className="field-help">会社名と人数だけ登録します。</small><div className="contractor-entry"><input value={contractorCompanyName} onChange={(event) => setContractorCompanyName(event.target.value)} placeholder="会社名（例：株式会社○○設備）" /><div className="people-stepper"><button type="button" onClick={() => setContractorPeople((value) => Math.max(1, value - 1))}>−</button><strong>{contractorPeople}名</strong><button type="button" onClick={() => setContractorPeople((value) => Math.min(99, value + 1))}>＋</button></div><button type="button" className="secondary-button" onClick={addExternalContractor}><Plus size={16} />追加</button></div>{externalContractors.length > 0 && <div className="contractor-list">{externalContractors.map((contractor, index) => <div className="contractor-item" key={`${contractor.companyName}-${index}`}><span><strong>{contractor.companyName}</strong><small>{contractor.people}名</small></span><button type="button" className="icon-button danger" onClick={() => removeExternalContractor(index)}><Trash2 size={16} /></button></div>)}</div>}</div>
                  <div className="form-field form-field-full drawing-section"><span>添付図面（{scheduleAttachments.length + pendingDrawingFiles.length}件）</span><label className="drawing-upload-button"><FileUp size={18} />図面を追加<input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.dwg,.dxf,application/pdf,image/jpeg,image/png" onChange={(event) => { chooseDrawingFiles(event.target.files); event.currentTarget.value = '' }} /></label>{pendingDrawingFiles.length > 0 && <div className="drawing-list pending-drawings">{pendingDrawingFiles.map((file, index) => <div className="drawing-item" key={`${file.name}-${file.lastModified}-${index}`}><FileText size={18} /><span><strong>{file.name}</strong><small>保存時にアップロード</small></span><button type="button" className="icon-button danger" onClick={() => setPendingDrawingFiles((current) => current.filter((_, currentIndex) => currentIndex !== index))}><Trash2 size={16} /></button></div>)}</div>}{scheduleAttachments.length > 0 && <div className="drawing-list">{scheduleAttachments.map((attachment) => <div className="drawing-item" key={attachment.id}><FileText size={18} /><span><strong>{attachment.fileName}</strong><small>{attachment.sizeBytes ? `${(attachment.sizeBytes / 1024 / 1024).toFixed(1)} MB` : '図面ファイル'}</small></span><div className="drawing-actions"><button type="button" className="small-button" onClick={() => openDrawing(attachment)}><ExternalLink size={15} />プレビュー</button><button type="button" className="icon-button danger" onClick={() => removeDrawing(attachment)} disabled={drawingBusy}><Trash2 size={16} /></button></div></div>)}</div>}{drawingMessage && <small className="drawing-message">{drawingMessage}</small>}</div>
                  <div className="form-field form-field-full"><span>色ラベル</span><div className="color-selector">{colorOptions.map((option) => <button key={option.value} type="button" className={`color-option ${option.className} ${scheduleColor === option.value ? 'color-option-selected' : ''}`} onClick={() => setScheduleColor(option.value)}><span className="color-dot" />{option.label}</button>)}</div></div>
                </div>
                <div className="modal-actions modal-actions-between">{editingScheduleId !== null ? <button type="button" className="danger-button" onClick={deleteSchedule}><Trash2 size={17} />削除</button> : <span />}<div><button type="button" className="secondary-button" onClick={() => setScheduleModalOpen(false)}>キャンセル</button><button type="button" className="primary-button" onClick={saveSchedule} disabled={cloudScheduleBusy || drawingBusy}>{cloudScheduleBusy || drawingBusy ? '保存中…' : '保存'}</button></div></div>
              </>
            )}
          </section>
        </div>
      )}

      {attendanceModalOpen && (
        <div className="modal-backdrop" onMouseDown={() => setAttendanceModalOpen(false)}>
          <section className="schedule-modal attendance-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-header"><div><h2>出勤・休みを編集</h2><p>{attendanceDate}</p></div><button type="button" className="close-button" onClick={() => setAttendanceModalOpen(false)}><X size={21} /></button></div>
            <div className="attendance-editor">
              {activeEmployees.map((employee) => (
                <div className="attendance-row" key={employee.id}><strong>{employee.name}</strong><label><input type="checkbox" checked={workerIds.includes(employee.id)} onChange={() => changeWorker(employee.id)} />出勤</label><label className="holiday-choice"><input type="checkbox" checked={holidayIds.includes(employee.id)} onChange={() => changeHoliday(employee.id)} />休み</label></div>
              ))}
            </div>
            <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setAttendanceModalOpen(false)}>キャンセル</button><button type="button" className="primary-button" onClick={saveAttendance}>保存</button></div>
          </section>
        </div>
      )}


      {userModalOpen && (
        <div className="modal-backdrop" onMouseDown={() => setUserModalOpen(false)}>
          <section className="mini-modal user-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-header"><div><h2>{editingUserId === null ? 'ユーザーを追加' : 'ユーザーを編集'}</h2><p>管理者と一般社員で利用できる機能が変わります。</p></div><button type="button" className="close-button" onClick={() => setUserModalOpen(false)}><X size={21} /></button></div>
            <div className="mini-modal-body user-form-grid">
              <label className="form-field"><span>表示名</span><input value={userDisplayName} onChange={(event) => setUserDisplayName(event.target.value)} placeholder="例：田中 太郎" /></label>
              <label className="form-field"><span>ユーザー名</span><input value={userUsername} onChange={(event) => setUserUsername(event.target.value)} placeholder="例：tanaka" /></label>
              <label className="form-field"><span>パスワード</span><input type="text" value={userPassword} onChange={(event) => setUserPassword(event.target.value)} placeholder="パスワード" /></label>
              <label className="form-field"><span>権限</span><select value={userRole} onChange={(event) => setUserRole(event.target.value as UserRole)}><option value="employee">一般社員</option><option value="admin">管理者</option></select></label>
            </div>
            <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setUserModalOpen(false)}>キャンセル</button><button type="button" className="primary-button" onClick={saveUser}>保存</button></div>
          </section>
        </div>
      )}

      {siteModalOpen && (
        <div className="modal-backdrop" onMouseDown={() => setSiteModalOpen(false)}>
          <section className="mini-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-header"><div><h2>{editingSiteId === null ? '現場を追加' : '現場名を編集'}</h2></div><button type="button" className="close-button" onClick={() => setSiteModalOpen(false)}><X size={21} /></button></div>
            <div className="mini-modal-body"><label className="form-field"><span>現場名・場所名</span><input autoFocus value={siteName} onChange={(event) => setSiteName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') saveSite() }} placeholder="例：豊田工場" /></label></div>
            <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setSiteModalOpen(false)}>キャンセル</button><button type="button" className="primary-button" onClick={saveSite}>保存</button></div>
          </section>
        </div>
      )}
    </div>
  )
}

export default App
