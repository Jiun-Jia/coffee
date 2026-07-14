import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BrewForm } from '@/components/brews/brew-form'
import { brewRowToFormDefaults } from '@/lib/brew-form'
import { listBeans } from '@/lib/queries/beans'
import { getBrew, getBrewPours, getBrewTags } from '@/lib/queries/brews'
import { listEquipment } from '@/lib/queries/equipment'
import { listGrinders } from '@/lib/queries/grinders'
import { listMyGroups } from '@/lib/queries/groups'
import { listFlavorTags } from '@/lib/queries/tags'

export const metadata: Metadata = { title: '編輯沖煮' }

// BREW-10：重用 BrewForm，defaultValues 由 brewRowToFormDefaults 映射
export default async function EditBrewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const brew = await getBrew(id) // RLS：非本人拿到 null
  if (!brew?.id) notFound()

  const [beans, grinders, tags, brewTags, brewPours, equipment, groups] =
    await Promise.all([
      listBeans(),
      listGrinders(),
      listFlavorTags(),
      getBrewTags(brew.id),
      getBrewPours(brew.id),
      listEquipment(),
      listMyGroups(),
    ])

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">編輯沖煮</h1>
      <BrewForm
        brewId={brew.id}
        brewedAtISO={brew.brewed_at ?? undefined}
        defaultValues={brewRowToFormDefaults(
          brew,
          brewTags.map((t) => t.id),
          brewPours,
        )}
        beans={beans.map((b) => ({
          id: b.id,
          name_batch: b.name_batch,
          roaster: b.roaster,
          roast_date: b.roast_date,
        }))}
        grinders={grinders.map((g) => ({ id: g.id, name: g.name }))}
        tagOptions={tags.map((t) => ({
          id: t.id,
          name: t.name,
          category: t.category,
        }))}
        equipmentOptions={{
          dripper: equipment.dripper.map((e) => e.name),
          filter: equipment.filter.map((e) => e.name),
          kettle: equipment.kettle.map((e) => e.name),
        }}
        groups={groups.map((g) => ({ id: g.id, name: g.name }))}
      />
    </div>
  )
}
