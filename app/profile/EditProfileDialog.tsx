'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ProfileForm } from './ProfileForm'
import type { Profile } from '@/lib/supabase/types'

export function EditProfileDialog({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Edit Profile</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>
        <ProfileForm profile={profile} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
