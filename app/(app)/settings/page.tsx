import type { Metadata } from 'next'
import { AccountSection } from '@/components/settings/account-section'
import { GrinderManager } from '@/components/settings/grinder-manager'
import { getCurrentProfile } from '@/lib/auth/profile'
import { listGrinders } from '@/lib/queries/grinders'

export const metadata: Metadata = { title: '設定' }

// P10：帳號（AUTH-11）✔ / 磨豆機（BEAN-8）✔ / 我的標籤（BREW-17）/ 匯出（VIZ-12）
export default async function SettingsPage() {
  const [profile, grinders] = await Promise.all([
    getCurrentProfile(),
    listGrinders(),
  ])

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">設定</h1>
      <AccountSection
        username={profile?.username ?? ''}
        email={profile?.email ?? null}
      />
      <GrinderManager grinders={grinders} />
      {/* BREW-17：我的標籤區塊 */}
      {/* VIZ-12：CSV 匯出區塊 */}
    </div>
  )
}
