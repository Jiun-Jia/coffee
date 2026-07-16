import type { Metadata } from 'next'
import { AccountSection } from '@/components/settings/account-section'
import { EquipmentManager } from '@/components/settings/equipment-manager'
import { ExportSection } from '@/components/settings/export-section'
import { GrinderManager } from '@/components/settings/grinder-manager'
import { TagManager } from '@/components/settings/tag-manager'
import { getCurrentProfile } from '@/lib/auth/profile'
import { listEquipment } from '@/lib/queries/equipment'
import { listGrinders } from '@/lib/queries/grinders'
import { getPhotoUsage } from '@/lib/queries/photos'
import { listMySuggestions, listMyTags } from '@/lib/queries/tags'

export const metadata: Metadata = { title: '設定' }

// P10：帳號 / 磨豆機 / 我的器材 / 我的標籤 / 匯出（皆為個人；群組管理在「群組」頁）
export default async function SettingsPage() {
  const [profile, grinders, equipment, myTags, suggestions] = await Promise.all(
    [
      getCurrentProfile(),
      listGrinders({ personalOnly: true }),
      listEquipment({ personalOnly: true }),
      listMyTags(),
      listMySuggestions(),
    ],
  )
  const photoUsage = profile ? await getPhotoUsage(profile.id) : null

  const pickEquipment = (kind: 'dripper' | 'filter' | 'kettle') =>
    equipment[kind].map((e) => ({ id: e.id, name: e.name }))

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">設定</h1>
      <AccountSection
        username={profile?.username ?? ''}
        email={profile?.email ?? null}
      />
      <GrinderManager grinders={grinders} />
      <EquipmentManager
        equipment={{
          dripper: pickEquipment('dripper'),
          filter: pickEquipment('filter'),
          kettle: pickEquipment('kettle'),
        }}
      />
      <TagManager
        tags={myTags.map((t) => ({
          id: t.id,
          name: t.name,
          usage_count: t.usage_count,
        }))}
        suggestions={suggestions.map((s) => ({
          id: s.id,
          name: s.name,
          status: s.status,
          group_name: s.group_name,
        }))}
      />
      <ExportSection />
      {photoUsage && photoUsage.count > 0 && (
        <p className="text-muted-foreground text-sm">
          照片空間：{photoUsage.count} 張，約{' '}
          {Math.round((photoUsage.bytes / 1024 / 1024) * 10) / 10} MB
          （免費層共 1GB，FR-22.4）
        </p>
      )}
    </div>
  )
}
