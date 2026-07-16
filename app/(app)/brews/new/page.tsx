import type { Metadata } from 'next'
import Link from 'next/link'
import { BookOpenText, Copy } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BrewForm } from '@/components/brews/brew-form'
import { RecipePicker } from '@/components/brews/recipe-picker'
import { getCurrentProfile } from '@/lib/auth/profile'
import { brewRowToFormDefaults } from '@/lib/brew-form'
import { recipeToBrewDefaults } from '@/lib/recipe-form'
import { listBeans } from '@/lib/queries/beans'
import {
  getBrew,
  getBrewPours,
  getBrewTags,
  listBrews,
} from '@/lib/queries/brews'
import { listEquipment } from '@/lib/queries/equipment'
import { listGrinders } from '@/lib/queries/grinders'
import { listMyGroups } from '@/lib/queries/groups'
import { getRecipe, listRecipes } from '@/lib/queries/recipes'
import { listFlavorTags } from '@/lib/queries/tags'

export const metadata: Metadata = { title: '新增沖煮' }

export default async function NewBrewPage({
  searchParams,
}: {
  searchParams: Promise<{
    beanId?: string
    copyFrom?: string
    recipeId?: string
  }>
}) {
  const [
    { beanId, copyFrom, recipeId },
    beans,
    grinders,
    tags,
    equipment,
    groups,
    recipes,
  ] = await Promise.all([
    searchParams,
    listBeans(),
    listGrinders(),
    listFlavorTags(),
    listEquipment(),
    listMyGroups(),
    listRecipes(),
  ])

  // BREW-15：複製既有紀錄（帶入除日期時間外的全部欄位，日期改為當下）
  let copyDefaults = undefined
  if (copyFrom) {
    const source = await getBrew(copyFrom)
    if (source?.id) {
      const [sourceTags, sourcePours] = await Promise.all([
        getBrewTags(source.id),
        getBrewPours(source.id),
      ])
      copyDefaults = brewRowToFormDefaults(
        source,
        sourceTags.map((t) => t.id),
        sourcePours,
      )
    }
  }

  // RCP-3：載入配方（copyFrom 優先——兩者同時出現時複製語意較完整）
  let recipeDefaults = undefined
  let loadedRecipeName: string | undefined
  if (!copyDefaults && recipeId) {
    const recipe = await getRecipe(recipeId)
    if (recipe) {
      recipeDefaults = recipeToBrewDefaults(recipe)
      // 配方裡的磨豆機可能已刪除：不在可選清單就退回未指定，避免存檔踩 FK
      if (
        recipeDefaults.grinder_id &&
        !grinders.some((g) => g.id === recipeDefaults!.grinder_id)
      ) {
        recipeDefaults.grinder_id = ''
        recipeDefaults.grind_setting = ''
      }
      loadedRecipeName = recipe.name
    }
  }

  // 從豆子詳情「用這包沖煮」進來時預選（僅接受存在的豆子）
  const preselect = beans.some((b) => b.id === beanId) ? beanId : undefined

  // FR-15.3：封存豆退出下拉；被複製來源/預選明確指到的豆保留
  const referencedBeanId = copyDefaults?.bean_id || preselect
  const visibleBeans = beans.filter(
    (b) => b.archived_at === null || b.id === referencedBeanId,
  )

  // FR-14.6 配方分區＋豆歸屬過濾：個人配方恆列；群組配方僅在
  // 「未選豆」或「沖該群組豆」時列出（群組配方僅可用於群組豆）
  const preselectBean = beans.find((b) => b.id === preselect)
  const pickerSections = [
    {
      key: 'personal',
      label: '個人配方',
      recipes: recipes
        .filter((r) => r.group_id === null)
        .map((r) => ({ id: r.id, name: r.name })),
    },
    ...groups
      .filter((g) => !preselectBean || preselectBean.group_id === g.id)
      .map((g) => ({
        key: g.id,
        label: `群組：${g.name}`,
        recipes: recipes
          .filter((r) => r.group_id === g.id && r.status === 'approved')
          .map((r) => ({ id: r.id, name: r.name })),
      })),
  ]

  // D13「複製上一杯」：已選豆子 → 該豆最近一筆；未選 → 最近一筆。
  // FR-10 後僅取「自己的」紀錄（複製朋友的參數請從其沖煮詳情頁操作）
  let copyLatestId: string | undefined
  if (!copyFrom) {
    const profile = await getCurrentProfile()
    const recent = (await listBrews()).filter((b) => b.user_id === profile?.id)
    const source = preselect
      ? recent.find((b) => b.bean_id === preselect)
      : recent[0]
    copyLatestId = source?.id ?? undefined
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold">
            {copyDefaults ? '複製沖煮' : '新增沖煮'}
          </h1>
          {loadedRecipeName && (
            <Badge variant="secondary">
              <BookOpenText className="size-3" />
              配方：{loadedRecipeName}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <RecipePicker
            sections={pickerSections}
            currentId={loadedRecipeName ? recipeId : undefined}
            beanId={preselect}
          />
          {copyLatestId && (
            <Button asChild variant="outline" size="sm">
              <Link
                href={`/brews/new?copyFrom=${copyLatestId}${preselect ? `&beanId=${preselect}` : ''}`}
              >
                <Copy className="size-4" />
                複製上一杯
              </Link>
            </Button>
          )}
        </div>
      </div>
      <BrewForm
        // key：同路由換 searchParams（複製上一杯/載入配方）時強制重掛，
        // 否則 useForm 的 defaultValues 只在首次 mount 生效、帶不進新值
        key={copyFrom ?? recipeId ?? preselect ?? 'new'}
        beans={visibleBeans.map((b) => ({
          id: b.id,
          name_batch: b.name_batch,
          roaster: b.roaster,
          roast_date: b.roast_date,
          group_id: b.group_id,
        }))}
        grinders={grinders.map((g) => ({
          id: g.id,
          name: g.name,
          group_id: g.group_id,
        }))}
        tagOptions={tags.map((t) => ({
          id: t.id,
          name: t.name,
          category: t.category,
        }))}
        equipmentOptions={{
          dripper: equipment.dripper.map((e) => ({
            name: e.name,
            group_id: e.group_id,
          })),
          filter: equipment.filter.map((e) => ({
            name: e.name,
            group_id: e.group_id,
          })),
          kettle: equipment.kettle.map((e) => ({
            name: e.name,
            group_id: e.group_id,
          })),
        }}
        groups={groups.map((g) => ({ id: g.id, name: g.name }))}
        defaultValues={{
          ...(copyDefaults ?? recipeDefaults),
          ...(preselect ? { bean_id: preselect } : {}),
        }}
      />
    </div>
  )
}
