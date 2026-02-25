import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription
} from '@renderer/components/ui/dialog'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import { useDeleteNamespace } from '@renderer/api'

interface DeleteNamespaceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  namespaceName: string
  onDeleted: () => void
}

export function DeleteNamespaceDialog({
  open,
  onOpenChange,
  namespaceName,
  onDeleted
}: DeleteNamespaceDialogProps) {
  const [confirmInput, setConfirmInput] = useState('')
  const deleteNamespace = useDeleteNamespace()

  const isMatch = confirmInput === namespaceName

  useEffect(() => {
    if (!open) {
      setConfirmInput('')
    }
  }, [open])

  const handleDelete = async () => {
    if (!isMatch) return

    try {
      await deleteNamespace.mutateAsync(namespaceName)
      toast.success(`Namespace "${namespaceName}" deleted`)
      onOpenChange(false)
      onDeleted()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete namespace')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete namespace</DialogTitle>
          <DialogDescription>
            This will permanently delete the namespace{' '}
            <span className="font-mono font-semibold text-foreground break-all">
              {namespaceName}
            </span>{' '}
            and all its data. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="confirm-namespace">
            Type <span className="font-mono font-semibold">{namespaceName}</span> to confirm
          </Label>
          <Input
            id="confirm-namespace"
            value={confirmInput}
            onChange={(e) => setConfirmInput(e.target.value)}
            placeholder={namespaceName}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && isMatch) handleDelete()
            }}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!isMatch || deleteNamespace.isPending}
          >
            {deleteNamespace.isPending ? 'Deleting...' : 'Delete namespace'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
