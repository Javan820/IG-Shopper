'use client'

import Link from 'next/link'

// Matches @[uuid:displayName] — user mentions inserted by MentionTextarea
// Matches @handle — legacy shop mentions
const COMBINED_RE = /@\[([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}):([^\]]+)\]|@([a-zA-Z0-9._]{1,30})/g

export function MentionText({ content }: { content: string }) {
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  COMBINED_RE.lastIndex = 0

  let match: RegExpExecArray | null
  while ((match = COMBINED_RE.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index))
    }

    if (match[1] !== undefined) {
      // User mention: @[userId:displayName]
      parts.push(
        <Link
          key={match.index}
          href={`/users/${match[1]}`}
          className="text-primary font-medium hover:underline"
        >
          @{match[2]}
        </Link>,
      )
    } else if (match[3] !== undefined) {
      // Shop mention: @handle
      parts.push(
        <Link
          key={match.index}
          href={`/shops/${match[3]}`}
          className="text-primary font-medium hover:underline"
        >
          @{match[3]}
        </Link>,
      )
    }

    lastIndex = match.index + match[0].length
  }

  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex))
  }

  return <>{parts}</>
}
