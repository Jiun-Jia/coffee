import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { RecipeForm } from '@/components/brews/recipe-form'
import { recipeToFormValues } from '@/lib/recipe-form'
import { listEquipment } from '@/lib/queries/equipment'
import { listGrinders } from '@/lib/queries/grinders'
import { getRecipe } from '@/lib/queries/recipes'

export const metadata: Metadata = { title: '編輯配方' }

export default async function EditRecipePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [recipe, grinders, equipment] = await Promise.all([
    getRecipe(id),
    listGrinders(),
    listEquipment(),
  ])
  if (!recipe) notFound()

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">編輯配方</h1>
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
