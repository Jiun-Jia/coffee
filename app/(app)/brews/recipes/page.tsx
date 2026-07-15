import type { Metadata } from 'next'
import Link from 'next/link'
import { BookOpenText, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { BrewsTabs } from '@/components/brews/brews-tabs'
import { RecipeActions } from '@/components/brews/recipe-actions'
import { calcRatioValue, formatRatio, formatSecondsToMSS } from '@/lib/format'
import { parseRecipePours, type RecipeRow } from '@/lib/recipe-form'
import { listRecipes } from '@/lib/queries/recipes'
import { BREW_TYPE_LABELS } from '@/lib/validations/enums'

export const metadata: Metadata = { title: '配方' }

/** 一行式參數摘要：92°C · 15g / 225g（1:15）· 悶蒸 0:30 · 總 2:30 */
function recipeSummary(recipe: RecipeRow): string {
  const parts: string[] = []
  if (recipe.water_temp != null) parts.push(`${recipe.water_temp}°C`)
  if (recipe.dose_g != null && recipe.water_g != null) {
    const ratio = calcRatioValue(
      recipe.water_g,
      recipe.dose_g,
      recipe.ice_g,
      recipe.ratio_include_ice,
    )
    parts.push(
      `${recipe.dose_g}g / ${recipe.water_g}g${ratio != null ? `（${formatRatio(ratio)}）` : ''}`,
    )
  }
  if (recipe.bloom_time_sec != null)
    parts.push(`悶蒸 ${formatSecondsToMSS(recipe.bloom_time_sec)}`)
  if (recipe.total_time_sec != null)
    parts.push(`總 ${formatSecondsToMSS(recipe.total_time_sec)}`)
  return parts.join(' · ')
}

/** RCP-4：配方管理（沖煮頁子分頁，§6 決議-1）。 */
export default async function RecipesPage() {
  const recipes = await listRecipes()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">沖煮紀錄</h1>
        <Button asChild>
          <Link href="/brews/new">
            <Plus className="size-4" />
            新增沖煮
          </Link>
        </Button>
      </div>

      <BrewsTabs active="recipes" />

      {recipes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <BookOpenText className="text-muted-foreground size-10" />
            <p className="text-muted-foreground max-w-md text-sm">
              還沒有配方。到某筆沖煮的詳情頁按「存成配方」，
              就能把那杯的器材、變因與注水分段存起來，之後一鍵載入重現。
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="text-muted-foreground text-sm">
            共 {recipes.length} 個配方
          </p>
          {/* 桌面：表格 */}
          <div className="hidden rounded-md border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名稱</TableHead>
                  <TableHead>參數摘要</TableHead>
                  <TableHead>器材</TableHead>
                  <TableHead className="text-right">分段</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recipes.map((recipe) => {
                  const pourCount = parseRecipePours(recipe.pours).length
                  return (
                    <TableRow key={recipe.id}>
                      <TableCell className="font-medium">
                        {recipe.name}
                        {recipe.brew_type !== 'pour_over' && (
                          <span className="text-muted-foreground ml-1 text-xs">
                            {BREW_TYPE_LABELS[recipe.brew_type]}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {recipeSummary(recipe) || '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {[recipe.dripper, recipe.grinders?.name]
                          .filter(Boolean)
                          .join(' · ') || '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        {pourCount > 0 ? `${pourCount} 段` : '—'}
                      </TableCell>
                      <TableCell>
                        <RecipeActions
                          recipeId={recipe.id}
                          recipeName={recipe.name}
                        />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {/* 手機：卡片 */}
          <div className="grid gap-3 md:hidden">
            {recipes.map((recipe) => {
              const pourCount = parseRecipePours(recipe.pours).length
              return (
                <Card key={recipe.id}>
                  <CardContent className="space-y-2 py-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{recipe.name}</span>
                      {recipe.brew_type !== 'pour_over' && (
                        <span className="text-muted-foreground text-xs">
                          {BREW_TYPE_LABELS[recipe.brew_type]}
                        </span>
                      )}
                    </div>
                    <p className="text-muted-foreground text-sm">
                      {[
                        recipeSummary(recipe),
                        pourCount > 0 ? `${pourCount} 段` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ') || '尚未填參數'}
                    </p>
                    <RecipeActions
                      recipeId={recipe.id}
                      recipeName={recipe.name}
                    />
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
