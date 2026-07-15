import {
  Bean,
  ChartScatter,
  Coffee,
  House,
  Settings,
  Users,
  type LucideIcon,
} from 'lucide-react'

export type NavItem = {
  title: string
  href: string
  icon: LucideIcon
}

export const NAV_ITEMS: NavItem[] = [
  { title: '首頁', href: '/dashboard', icon: House },
  { title: '沖煮', href: '/brews', icon: Coffee },
  { title: '豆子', href: '/beans', icon: Bean },
  { title: '群組', href: '/groups', icon: Users },
  { title: '分析', href: '/analytics', icon: ChartScatter },
  { title: '設定', href: '/settings', icon: Settings },
]
