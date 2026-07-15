import type { Metadata } from 'next'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { CreateJoinSection, MyRequests } from '@/components/groups/create-join'
import { listBeans } from '@/lib/queries/beans'
import {
  listGroupGear,
  listGroupJoinRequests,
  listMyGroups,
  listMyJoinRequests,
} from '@/lib/queries/groups'
import { listPendingSuggestions } from '@/lib/queries/tags'

export const metadata: Metadata = { title: '群組' }

// FR-10 群組列表：加入的群組（含身分與待審核提示）＋申請中＋建立/申請入口
export default async function GroupsPage() {
  const [groups, myRequests, joinRequests, groupGear, pendingTags, beans] =
    await Promise.all([
      listMyGroups(),
      listMyJoinRequests(),
      listGroupJoinRequests(),
      listGroupGear(),
      listPendingSuggestions(),
      listBeans(),
    ])

  // 建立者卡片上的待辦數：入群申請＋器材提案＋標籤提交
  const pendingCount = (groupId: string) =>
    joinRequests.filter((r) => r.group_id === groupId).length +
    groupGear.filter((g) => g.group_id === groupId && g.status === 'pending')
      .length +
    pendingTags.filter((s) => s.group_id === groupId).length

  const beanCount = (groupId: string) =>
    beans.filter((b) => b.group_id === groupId).length

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">群組</h1>

      {groups.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          還沒有群組。建立一個把邀請碼分享給朋友，或輸入朋友給的邀請碼申請加入。
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {groups.map((group) => {
            const pending = group.isManager ? pendingCount(group.id) : 0
            return (
              <Link
                key={group.id}
                href={`/groups/${group.id}`}
                className="hover:bg-accent/50 block rounded-lg border p-4 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-medium">{group.name}</p>
                  <Badge variant="outline">
                    {group.isOwner
                      ? '建立者'
                      : group.isManager
                        ? '副組長'
                        : '成員'}
                  </Badge>
                </div>
                <p className="text-muted-foreground mt-1 text-sm">
                  成員 {group.members.length} · 群組豆 {beanCount(group.id)}
                </p>
                {pending > 0 && (
                  <Badge className="mt-2">待審核 {pending}</Badge>
                )}
              </Link>
            )
          })}
        </div>
      )}

      <MyRequests requests={myRequests} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">建立或加入</CardTitle>
          <CardDescription>
            和朋友共有同一包豆：群組豆全員可見、各自記錄沖煮並互相比較（可看不可改）。
            輸入邀請碼後由群組建立者核可才會加入。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateJoinSection />
        </CardContent>
      </Card>
    </div>
  )
}
