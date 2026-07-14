import type { Metadata } from 'next'
import { AccountSection } from '@/components/settings/account-section'
import { EquipmentManager } from '@/components/settings/equipment-manager'
import { ExportSection } from '@/components/settings/export-section'
import { GrinderManager } from '@/components/settings/grinder-manager'
import { GroupManager } from '@/components/settings/group-manager'
import { TagManager } from '@/components/settings/tag-manager'
import { getCurrentProfile } from '@/lib/auth/profile'
import { listEquipment } from '@/lib/queries/equipment'
import { listGrinders } from '@/lib/queries/grinders'
import { listMyGroups } from '@/lib/queries/groups'
import {
  listMySuggestions,
  listMyTags,
  listPendingSuggestions,
} from '@/lib/queries/tags'

export const metadata: Metadata = { title: '設定' }

// P10：帳號 / 群組（FR-10）/ 磨豆機 / 我的器材 / 我的標籤 / 匯出
export default async function SettingsPage() {
  const [
    profile,
    grinders,
    equipment,
    myTags,
    suggestions,
    groups,
    pendingSuggestions,
  ] = await Promise.all([
    getCurrentProfile(),
    listGrinders(),
    listEquipment(),
    listMyTags(),
    listMySuggestions(),
    listMyGroups(),
    listPendingSuggestions(),
  ])

  const groupOptions = groups.map((g) => ({ id: g.id, name: g.name }))
  const pickEquipment = (kind: 'dripper' | 'filter' | 'kettle') =>
    equipment[kind].map((e) => ({
      id: e.id,
      name: e.name,
      user_id: e.user_id,
      group_name: e.group_name,
    }))

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">設定</h1>
      <AccountSection
        username={profile?.username ?? ''}
        email={profile?.email ?? null}
      />
      <GroupManager
        groups={groups}
        myUserId={profile?.id ?? ''}
        pendingSuggestions={pendingSuggestions}
      />
      <GrinderManager
        grinders={grinders}
        groups={groupOptions}
        myUserId={profile?.id ?? ''}
      />
      <EquipmentManager
        equipment={{
          dripper: pickEquipment('dripper'),
          filter: pickEquipment('filter'),
          kettle: pickEquipment('kettle'),
        }}
        groups={groupOptions}
        myUserId={profile?.id ?? ''}
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
    </div>
  )
}
