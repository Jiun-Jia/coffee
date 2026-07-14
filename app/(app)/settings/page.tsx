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
import { listGroupGear, listMyGroups } from '@/lib/queries/groups'
import {
  listGroupTags,
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
    groupTags,
    groupGear,
  ] = await Promise.all([
    getCurrentProfile(),
    listGrinders({ personalOnly: true }),
    listEquipment({ personalOnly: true }),
    listMyTags(),
    listMySuggestions(),
    listMyGroups(),
    listPendingSuggestions(),
    listGroupTags(),
    listGroupGear(),
  ])

  const pickEquipment = (kind: 'dripper' | 'filter' | 'kettle') =>
    equipment[kind].map((e) => ({ id: e.id, name: e.name }))

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
        groupTags={groupTags}
        groupGear={groupGear}
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
    </div>
  )
}
