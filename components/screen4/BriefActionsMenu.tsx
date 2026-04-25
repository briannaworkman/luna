'use client'
import { EllipsisVertical, Download, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface BriefActionsMenuProps {
  onReset: () => void
}

export function BriefActionsMenu({ onReset }: BriefActionsMenuProps) {
  return (
    <div className="flex items-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={onReset}>
        New query
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label="Brief actions"
          >
            <EllipsisVertical size={14} strokeWidth={1.5} />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="min-w-[180px]">
          <DropdownMenuItem disabled>
            <Download size={13} strokeWidth={1.5} />
            Export PDF
            <span className="ml-auto font-mono text-[10px] text-luna-fg-4 tracking-wider uppercase">
              soon
            </span>
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            <FileText size={13} strokeWidth={1.5} />
            Export Markdown
            <span className="ml-auto font-mono text-[10px] text-luna-fg-4 tracking-wider uppercase">
              soon
            </span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
