import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

/** VIZ-12：資料匯出區塊（FR-8）。 */
export function ExportSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>資料</CardTitle>
        <CardDescription>
          匯出你的全部沖煮紀錄（含豆子履歷與風味標籤），可作為手動備份
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild variant="outline">
          <a href="/api/export/brews" download>
            <Download className="size-4" />
            匯出 CSV
          </a>
        </Button>
      </CardContent>
    </Card>
  )
}
