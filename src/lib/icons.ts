/**
 * JNP주택관리 도메인 아이콘 매핑 (P20-10).
 *
 * 모든 lucide-react 아이콘을 의미별 별칭으로 등록.
 * 페이지에서는 `<Icons.building />` 처럼 사용.
 * 아이콘 교체 시 본 파일 한 곳만 수정.
 *
 * 박성혁 실행 원칙 #5 (lib/* 분리), #6 (lucide-react 고정).
 */

import {
  // 건물·자산
  Building2,
  Building,
  Home,
  HomeIcon,
  Hotel,
  Warehouse,
  Store,
  // 계약·문서
  FileSignature,
  FileText,
  FileCheck,
  FileWarning,
  FileSearch,
  FileDown,
  Folder,
  ClipboardList,
  ClipboardCheck,
  // 통화·결제
  Wallet,
  CreditCard,
  Banknote,
  Receipt,
  Calculator,
  Coins,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  // 사람·역할
  User,
  UserCircle,
  Users,
  UserCheck,
  UserPlus,
  UserSquare,
  UserCog,
  Handshake,
  // 위치·지도
  MapPin,
  Map,
  Navigation,
  Compass,
  // 통신·알림
  Phone,
  Mail,
  MessageCircle,
  MessageSquare,
  Bell,
  BellRing,
  Send,
  // 시간·일정
  Calendar,
  CalendarDays,
  Clock,
  Timer,
  CalendarClock,
  History,
  // 상태·표시
  CheckCircle2,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  // 액션·도구
  Search,
  Filter,
  Plus,
  Edit,
  Pencil,
  Trash2,
  Copy,
  Download,
  Upload,
  Share2,
  Settings,
  Wrench,
  Hammer,
  // 네비게이션
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  ExternalLink,
  // 레이아웃·UI
  LayoutDashboard,
  Grid3X3,
  List,
  Menu,
  X,
  MoreHorizontal,
  MoreVertical,
  // 분쟁·법무
  Scale,
  Gavel,
  BookOpen,
  // 차트·통계
  BarChart3,
  LineChart,
  PieChart,
  // 즐겨찾기·태그
  Heart,
  Star,
  Bookmark,
  Tag,
  Pin,
  // 미디어
  Image,
  Camera,
  QrCode,
  // 기타
  Sparkles,
  Award,
  Megaphone,
  HelpCircle,
  Activity,
  Zap,
  Sun,
  Moon,
  Monitor,
  Loader2,
  type LucideIcon,
} from "lucide-react";

export type IconType = LucideIcon;

/**
 * 도메인 의미별 매핑.
 *
 * 사용:
 *   import { Icons } from "@/lib/icons";
 *   <Icons.building className="h-4 w-4" />
 */
export const Icons = {
  // ─── 부동산·건물 ───
  building: Building2,
  buildingAlt: Building,
  apartment: Building,
  officetel: Building2,
  villa: Home,
  house: Home,
  home: HomeIcon,
  hotel: Hotel,
  warehouse: Warehouse,
  commercial: Store,
  unit: HomeIcon,           // 호실

  // ─── 계약·서류 ───
  contract: FileSignature,
  contractSigned: FileCheck,
  contractWarning: FileWarning,
  document: FileText,
  documentSearch: FileSearch,
  documentDownload: FileDown,
  folder: Folder,
  checklist: ClipboardList,
  checklistDone: ClipboardCheck,

  // ─── 임대료·정산 ───
  rent: Banknote,
  payment: CreditCard,
  wallet: Wallet,
  receipt: Receipt,
  calculator: Calculator,
  coins: Coins,
  income: TrendingUp,
  expense: TrendingDown,
  savings: PiggyBank,

  // ─── 사람·역할 ───
  user: User,
  profile: UserCircle,
  tenants: Users,
  approved: UserCheck,
  newUser: UserPlus,
  landlord: UserSquare,
  agency: Handshake,         // 부동산 회원
  admin: UserCog,

  // ─── 위치 ───
  location: MapPin,
  map: Map,
  directions: Navigation,
  compass: Compass,

  // ─── 통신·알림 ───
  phone: Phone,
  email: Mail,
  chat: MessageCircle,
  message: MessageSquare,
  notification: Bell,
  alarm: BellRing,
  send: Send,

  // ─── 일정·시간 ───
  date: Calendar,
  calendar: CalendarDays,
  clock: Clock,
  timer: Timer,
  duration: CalendarClock,
  history: History,
  expiring: CalendarClock,

  // ─── 상태 ───
  success: CheckCircle2,
  failure: XCircle,
  warning: AlertTriangle,
  alert: AlertCircle,
  info: Info,
  secure: ShieldCheck,
  insecure: ShieldAlert,
  locked: Lock,
  unlocked: Unlock,
  visible: Eye,
  hidden: EyeOff,

  // ─── 액션 ───
  search: Search,
  filter: Filter,
  add: Plus,
  edit: Edit,
  pencil: Pencil,
  delete: Trash2,
  copy: Copy,
  download: Download,
  upload: Upload,
  share: Share2,
  settings: Settings,
  tools: Wrench,
  repair: Hammer,

  // ─── 네비게이션 ───
  arrowRight: ArrowRight,
  arrowLeft: ArrowLeft,
  arrowUp: ArrowUp,
  arrowDown: ArrowDown,
  chevronRight: ChevronRight,
  chevronLeft: ChevronLeft,
  chevronUp: ChevronUp,
  chevronDown: ChevronDown,
  externalLink: ExternalLink,

  // ─── 레이아웃 ───
  dashboard: LayoutDashboard,
  grid: Grid3X3,
  list: List,
  menu: Menu,
  close: X,
  more: MoreHorizontal,
  moreVertical: MoreVertical,

  // ─── 분쟁·법무 (도메인 특화) ───
  dispute: Scale,            // HUG 대위변제·세입자 분쟁
  legal: Gavel,
  guide: BookOpen,

  // ─── 차트·통계 ───
  chartBar: BarChart3,
  chartLine: LineChart,
  chartPie: PieChart,

  // ─── 즐겨찾기·태그 ───
  favorite: Heart,
  star: Star,
  bookmark: Bookmark,
  tag: Tag,
  pin: Pin,

  // ─── 미디어 ───
  image: Image,
  camera: Camera,
  qr: QrCode,

  // ─── 브랜드·강조 ───
  sparkles: Sparkles,
  award: Award,
  announcement: Megaphone,
  help: HelpCircle,
  activity: Activity,
  energy: Zap,

  // ─── 시스템 ───
  themeLight: Sun,
  themeDark: Moon,
  themeSystem: Monitor,
  loading: Loader2,
} as const satisfies Record<string, LucideIcon>;

/**
 * 부동산 유형별 아이콘 (DB type 컬럼 → 아이콘 자동 매핑)
 */
export const PROPERTY_TYPE_ICON: Record<string, LucideIcon> = {
  officetel: Building2,
  apartment: Building,
  villa: Home,
  commercial: Store,
};

/**
 * 상태별 아이콘 (계약·청구·민원 등 status → 아이콘)
 */
export const STATUS_ICON: Record<string, LucideIcon> = {
  // 계약
  draft:     FileText,
  active:    CheckCircle2,
  expiring:  CalendarClock,
  expired:   XCircle,
  renewed:   FileCheck,
  cancelled: XCircle,
  // 청구
  unpaid:    AlertCircle,
  partial:   Activity,
  paid:      CheckCircle2,
  overdue:   AlertTriangle,
  // 민원
  received:    AlertCircle,
  in_progress: Activity,
  completed:   CheckCircle2,
  closed:      XCircle,
  // 부동산 회원
  pending:   Clock,
  approved:  CheckCircle2,
  rejected:  XCircle,
};
