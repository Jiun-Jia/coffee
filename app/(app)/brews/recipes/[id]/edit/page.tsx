import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { RecipeForm } from '@/components/brews/recipe-form'
import { recipeToFormValues } from '@/lib/recipe-form'
import { listEquipment } from '@/lib/queries/equipment'
import { listGrinders } from '@/lib/queries/grinders'
import { listMyGroups } from '@/lib/queries/groups'
import { getRecipe } from '@/lib/queries/recipes'

export const metadata: Metadata = { title: '編輯配方' }

export default async function EditRecipePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [recipe, grinders, equipment, groups] = await Promise.all([
    getRecipe(id),
    listGrinders(),
    listEquipment(),
    listMyGroups(),
  ])
  if (!recipe) notFound()

  // FR-14.5：已核可的群組配方僅建立者可編輯（成員可讀故需頁面層守衛；
  // 個人配方 RLS 已限本人，讀得到即可編）
  if (recipe.group_id) {
    const group = groups.find((g) => g.id === recipe.group_id)
    if (!group?.isOwner) notFound()
  }

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">
        編輯配方
        {recipe.groups?.name && (
          <span className="text-muted-foreground ml-2 text-base font-normal">
            群組：{recipe.groups.name}
          </span>
        )}
      </h1>
      <RecipeForm
        recipeId={recipe.id}
        defaultValues={recipeToFormValues(recipe)}
        grinders={grinders.map((g) => ({ id: g.id, name: g.name }))}
        equipmentOptions={{
          dripper: equipment.dripper.map((e) => e.name),
          filter: equipment.filter.map((e) => e.name),
          kettle: equipment.kettle.map((e) => e.name),
        }}
      />
    </div>
  )
}
