import type { Metadata } from 'next'
import Link from 'next/link'
import { BookOpenText, CupSoda, Plus, UsersRound } from 'lucide-react'
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
import { CopyRecipeDialog } from '@/components/brews/copy-recipe-dialog'
import { RecipeActions } from '@/components/brews/recipe-actions'
import { SubmitRecipeDialog } from '@/components/brews/submit-recipe-dialog'
import { parseRecipePours, recipeSummary } from '@/lib/recipe-form'
import { listMyGroups } from '@/lib/queries/groups'
import { listRecipes } from '@/lib/queries/recipes'
import { BREW_TYPE_LABELS } from '@/lib/validations/enums'

export const metadata: Metadata = { title: '配方' }

/** RCP-4／FR-14.6：配方管理（沖煮頁子分頁），個人／各群組分區列示。 */
export default async function RecipesPage() {
  const [recipes, groups] = await Promise.all([listRecipes(), listMyGroups()])

  const personal = recipes.filter((r) => r.group_id === null)
  const groupSections = groups
    .map((g) => ({
      group: g,
      recipes: recipes.filter(
        (r) => r.group_id === g.id && r.status === 'approved',
      ),
    }))
    .filter((s) => s.recipes.length > 0)

  const groupOptions = groups.map((g) => ({ id: g.id, name: g.name }))

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

      {personal.length === 0 && groupSections.length === 0 ? (
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
          {/* ── 個人配方 ─────────────────────────── */}
          <section className="space-y-2">
            <h2 className="text-sm font-medium">
              個人配方
              <span className="text-muted-foreground ml-1 font-normal">
                （{personal.length}）
              </span>
            </h2>
            {personal.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                還沒有個人配方。到沖煮詳情按「存成配方」建立。
              </p>
            ) : (
              <>
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
                      {personal.map((recipe) => {
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
                              <div className="flex items-center justify-end">
                                <SubmitRecipeDialog
                                  recipeId={recipe.id}
                                  recipeName={recipe.name}
                                  groups={groupOptions}
                                />
                                <RecipeActions
                                  recipeId={recipe.id}
                                  recipeName={recipe.name}
                                />
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* 手機：卡片 */}
                <div className="grid gap-3 md:hidden">
                  {personal.map((recipe) => {
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
                          <div className="flex items-center justify-between">
                            <SubmitRecipeDialog
                              recipeId={recipe.id}
                              recipeName={recipe.name}
                              groups={groupOptions}
                            />
                            <RecipeActions
                              recipeId={recipe.id}
                              recipeName={recipe.name}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </>
            )}
          </section>

          {/* ── 群組配方（FR-14.6：分區列示；審核在群組內頁）────── */}
          {groupSections.map(({ group, recipes: groupRecipes }) => (
            <section key={group.id} className="space-y-2">
              <h2 className="flex items-center gap-1 text-sm font-medium">
                <UsersRound className="size-4" />
                {group.name}
                <span className="text-muted-foreground font-normal">
                  （{groupRecipes.length}）
                </span>
              </h2>
              <div className="space-y-2">
                {groupRecipes.map((recipe) => (
                  <div
                    key={recipe.id}
                    className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {recipe.name}
                      </p>
                      <p className="text-muted-foreground truncate text-xs">
                        {[
                          recipeSummary(recipe),
                          `推薦者 ${recipe.profiles?.username ?? '（未知）'}`,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/brews/new?recipeId=${recipe.id}`}>
                          <CupSoda className="size-4" />
                          沖煮
                        </Link>
                      </Button>
                      <CopyRecipeDialog
                        recipeId={recipe.id}
                        recipeName={recipe.name}
                      />
                      {group.isOwner && (
                        <RecipeActions
                          recipeId={recipe.id}
                          recipeName={recipe.name}
                          hideBrew
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-muted-foreground text-xs">
                群組配方僅在沖「{group.name}」的群組豆時可載入；審核與管理在
                <Link href={`/groups/${group.id}`} className="underline">
                  群組內頁
                </Link>
                。
              </p>
            </section>
          ))}
        </>
      )}
    </div>
  )
}
