import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft, Coffee, Plus, Trophy } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  GearSection,
  HeaderActions,
  InviteCode,
  MemberSection,
  TagSection,
} from '@/components/groups/group-detail-sections'
import {
  GroupRecipeSection,
  type GroupRecipeItem,
} from '@/components/groups/group-recipe-section'
import { getCurrentProfile } from '@/lib/auth/profile'
import { listBeans } from '@/lib/queries/beans'
import {
  listGroupBrews,
  listGroupGear,
  listGroupJoinRequests,
  listMyGroups,
} from '@/lib/queries/groups'
import { listGroupRecipes } from '@/lib/queries/recipes'
import { recipeSummary } from '@/lib/recipe-form'
import { listGroupTags, listPendingSuggestions } from '@/lib/queries/tags'

export const metadata: Metadata = { title: '群組' }

// FR-10 群組內頁：成員（含入群審核）/ 邀請碼 / 共用器材 / 群組豆 / 標籤 / 最近沖煮
export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [
    profile,
    groups,
    gear,
    tags,
    pendingTags,
    joinRequests,
    beans,
    groupBrews,
    groupRecipes,
  ] = await Promise.all([
    getCurrentProfile(),
    listMyGroups(),
    listGroupGear(),
    listGroupTags(),
    listPendingSuggestions(),
    listGroupJoinRequests(),
    listBeans(),
    listGroupBrews(id),
    listGroupRecipes(id),
  ])

  const group = groups.find((g) => g.id === id)
  if (!group) notFound()

  const groupBeans = beans.filter((b) => b.group_id === id)
  const recentBrews = groupBrews.slice(0, 10)

  // 每支豆的「誰沖得最好」：各成員在該豆的最高整體評分，由高到低取前 3
  function beanRanking(beanId: string) {
    const best = new Map<string, number>()
    for (const brew of groupBrews) {
      if (brew.bean_id !== beanId || brew.overall == null) continue
      const name = brew.brewer_username ?? '（未知）'
      if ((best.get(name) ?? 0) < brew.overall) best.set(name, brew.overall)
    }
    return [...best.entries()]
      .map(([username, score]) => ({ username, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="space-y-2">
        <Link
          href="/groups"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
        >
          <ChevronLeft className="size-4" />
          群組列表
        </Link>
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold">
            {group.name}
            <Badge variant="outline" className="ml-2 align-middle">
              {group.isOwner ? '建立者' : group.isManager ? '副組長' : '成員'}
            </Badge>
          </h1>
          <HeaderActions group={group} />
        </div>
        <InviteCode group={group} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            成員（{group.members.length}）
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MemberSection
            group={group}
            joinRequests={joinRequests.filter((r) => r.group_id === id)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">群組豆</CardTitle>
            <Button asChild variant="outline" size="sm">
              <Link href={`/beans/new?groupId=${id}`}>
                <Plus className="size-4" />
                新增豆子
              </Link>
            </Button>
          </div>
          <CardDescription>全員可見，各自對它記錄沖煮</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {groupBeans.length === 0 && (
            <p className="text-muted-foreground text-sm">
              還沒有群組豆。新增豆子時把歸屬設為這個群組即可。
            </p>
          )}
          {groupBeans.map((bean) => {
            const ranking = beanRanking(bean.id)
            return (
              <div
                key={bean.id}
                className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
              >
                <div className="min-w-0">
                  <Link
                    href={`/beans/${bean.id}`}
                    className="text-sm font-medium hover:underline"
                  >
                    {bean.name_batch}
                  </Link>
                  <p className="text-muted-foreground truncate text-xs">
                    {bean.roaster} · 烘焙 {bean.roast_date} · {bean.brew_count}{' '}
                    筆沖煮
                  </p>
                  {ranking.length > 0 && (
                    <p className="text-muted-foreground mt-0.5 flex items-center gap-1 truncate text-xs">
                      <Trophy className="size-3 shrink-0 text-amber-500" />
                      {ranking
                        .map((r) => `${r.username} ${r.score}`)
                        .join(' · ')}
                    </p>
                  )}
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/brews/new?beanId=${bean.id}`}>
                    <Coffee className="size-4" />
                    沖煮
                  </Link>
                </Button>
              </div>
            )
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">共用器材</CardTitle>
          <CardDescription>
            全員沖煮群組豆時可選用；成員新增的器材由建立者或副組長核可後生效
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GearSection
            group={group}
            gear={gear.filter((g) => g.group_id === id)}
            myUserId={profile?.id ?? ''}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">群組配方</CardTitle>
          <CardDescription>
            成員自「沖煮 → 配方」推薦、管理者核可後全員沖群組豆可載入（FR-14.5）
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GroupRecipeSection
            recipes={groupRecipes.map(
              (r): GroupRecipeItem => ({
                id: r.id,
                name: r.name,
                summary: recipeSummary(r),
                status: r.status === 'pending' ? 'pending' : 'approved',
                user_id: r.user_id,
                submitter: r.profiles?.username ?? '（未知）',
              }),
            )}
            isManager={group.isManager}
            isOwner={group.isOwner}
            myUserId={profile?.id ?? ''}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">群組標籤</CardTitle>
          <CardDescription>
            核可後全員的沖煮表單皆可選用（FR-5.6）
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TagSection
            group={group}
            tags={tags.filter((t) => t.group_id === id)}
            pending={pendingTags.filter((s) => s.group_id === id)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">最近沖煮</CardTitle>
          <CardDescription>群組豆上所有成員的最新紀錄</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {recentBrews.length === 0 && (
            <p className="text-muted-foreground text-sm">
              還沒有人用群組豆沖煮。
            </p>
          )}
          {recentBrews.map((brew) => (
            <Link
              key={brew.id ?? ''}
              href={`/brews/${brew.id}`}
              className="hover:bg-accent/50 flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm transition-colors"
            >
              <span className="min-w-0 truncate">
                <span className="text-muted-foreground">
                  {brew.brewed_at?.slice(0, 10)}
                </span>{' '}
                <span className="font-medium">
                  {brew.brewer_username ?? '（未知）'}
                </span>{' '}
                沖了 {brew.name_batch}
              </span>
              <span className="text-muted-foreground shrink-0">
                整體 {brew.overall}/5
              </span>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
