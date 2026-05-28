// Auto-generated Supabase types — matches 20260522000001_initial_schema.sql
// Regenerate after schema changes: `supabase gen types typescript --local > lib/supabase/types.ts`

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string | null
          avatar_url: string | null
          bio: string | null
          role: 'user' | 'admin'
          review_count: number
          tier_override: string | null
          display_tier: string | null
          created_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          role?: 'user' | 'admin'
          review_count?: number
          tier_override?: string | null
          display_tier?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          role?: 'user' | 'admin'
          review_count?: number
          tier_override?: string | null
          display_tier?: string | null
          created_at?: string
        }
        Relationships: []
      }
      shops: {
        Row: {
          id: string
          name: string
          ig_handle: string
          description: string | null
          category: string | null
          tags: string[] | null
          location: string | null
          sub_location: string | null
          website_url: string | null
          payment_methods: string[] | null
          ships_to: string[] | null
          cover_image_url: string | null
          status: 'pending' | 'approved' | 'rejected'
          is_claimed: boolean
          is_verified: boolean
          is_active: boolean
          submitted_by: string | null
          claimed_by: string | null
          created_at: string
          updated_at: string
          search_vector: string | null
          ig_handle_status: 'unchecked' | 'active' | 'broken'
          ig_handle_checked_at: string | null
        }
        Insert: {
          id?: string
          name: string
          ig_handle: string
          description?: string | null
          category?: string | null
          tags?: string[] | null
          location?: string | null
          sub_location?: string | null
          website_url?: string | null
          payment_methods?: string[] | null
          ships_to?: string[] | null
          cover_image_url?: string | null
          status?: 'pending' | 'approved' | 'rejected'
          is_claimed?: boolean
          is_verified?: boolean
          is_active?: boolean
          submitted_by?: string | null
          claimed_by?: string | null
          created_at?: string
          updated_at?: string
          // search_vector is GENERATED — omit from Insert
        }
        Update: {
          id?: string
          name?: string
          ig_handle?: string
          description?: string | null
          category?: string | null
          tags?: string[] | null
          location?: string | null
          sub_location?: string | null
          website_url?: string | null
          payment_methods?: string[] | null
          ships_to?: string[] | null
          cover_image_url?: string | null
          status?: 'pending' | 'approved' | 'rejected'
          is_claimed?: boolean
          is_verified?: boolean
          is_active?: boolean
          submitted_by?: string | null
          claimed_by?: string | null
          created_at?: string
          updated_at?: string
          // search_vector is GENERATED — omit from Update
          ig_handle_status?: 'unchecked' | 'active' | 'broken'
          ig_handle_checked_at?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          id: string
          shop_id: string
          user_id: string
          rating: 1 | 2 | 3 | 4 | 5
          title: string | null
          body: string | null
          is_verified_buyer: boolean
          helpful_count: number
          image_urls: string[]
          created_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          user_id: string
          rating: 1 | 2 | 3 | 4 | 5
          title?: string | null
          body?: string | null
          is_verified_buyer?: boolean
          helpful_count?: number
          image_urls?: string[]
          created_at?: string
        }
        Update: {
          id?: string
          shop_id?: string
          user_id?: string
          rating?: 1 | 2 | 3 | 4 | 5
          title?: string | null
          body?: string | null
          is_verified_buyer?: boolean
          helpful_count?: number
          image_urls?: string[]
          created_at?: string
        }
        Relationships: []
      }
      shop_claims: {
        Row: {
          id: string
          shop_id: string
          user_id: string
          ig_proof: string | null
          status: 'pending' | 'approved' | 'rejected'
          created_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          user_id: string
          ig_proof?: string | null
          status?: 'pending' | 'approved' | 'rejected'
          created_at?: string
        }
        Update: {
          id?: string
          shop_id?: string
          user_id?: string
          ig_proof?: string | null
          status?: 'pending' | 'approved' | 'rejected'
          created_at?: string
        }
        Relationships: []
      }
      saved_shops: {
        Row: {
          id: string
          user_id: string
          shop_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          shop_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          shop_id?: string
          created_at?: string
        }
        Relationships: []
      }
      review_helpful: {
        Row: {
          user_id: string
          review_id: string
        }
        Insert: {
          user_id: string
          review_id: string
        }
        Update: {
          user_id?: string
          review_id?: string
        }
        Relationships: []
      }
      review_flags: {
        Row: {
          id: string
          review_id: string
          user_id: string
          reason: string | null
          status: 'pending' | 'dismissed' | 'actioned'
          created_at: string
        }
        Insert: {
          id?: string
          review_id: string
          user_id: string
          reason?: string | null
          status?: 'pending' | 'dismissed' | 'actioned'
          created_at?: string
        }
        Update: {
          id?: string
          review_id?: string
          user_id?: string
          reason?: string | null
          status?: 'pending' | 'dismissed' | 'actioned'
          created_at?: string
        }
        Relationships: []
      }
      review_reactions: {
        Row: {
          user_id: string
          review_id: string
          emoji: string
          created_at: string
        }
        Insert: {
          user_id: string
          review_id: string
          emoji: string
          created_at?: string
        }
        Update: {
          user_id?: string
          review_id?: string
          emoji?: string
          created_at?: string
        }
        Relationships: []
      }
      shop_reactions: {
        Row: {
          id: string
          shop_id: string
          user_id: string
          reaction: 'recommend' | 'neutral' | 'avoid'
          created_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          user_id: string
          reaction: 'recommend' | 'neutral' | 'avoid'
          created_at?: string
        }
        Update: {
          id?: string
          shop_id?: string
          user_id?: string
          reaction?: 'recommend' | 'neutral' | 'avoid'
          created_at?: string
        }
        Relationships: []
      }
      user_follows: {
        Row: {
          follower_id: string
          following_id: string
          created_at: string
        }
        Insert: {
          follower_id: string
          following_id: string
          created_at?: string
        }
        Update: {
          follower_id?: string
          following_id?: string
          created_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: 'new_review' | 'new_follower' | 'review_reaction' | 'handle_broken'
          title: string
          body: string | null
          url: string | null
          actor_id: string | null
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'new_review' | 'new_follower' | 'review_reaction' | 'handle_broken'
          title: string
          body?: string | null
          url?: string | null
          actor_id?: string | null
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: 'new_review' | 'new_follower' | 'review_reaction'
          title?: string
          body?: string | null
          url?: string | null
          actor_id?: string | null
          read_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          id: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          endpoint?: string
          p256dh?: string
          auth?: string
          created_at?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          user_id: string
          new_review: boolean
          new_follower: boolean
          review_reaction: boolean
        }
        Insert: {
          user_id: string
          new_review?: boolean
          new_follower?: boolean
          review_reaction?: boolean
        }
        Update: {
          user_id?: string
          new_review?: boolean
          new_follower?: boolean
          review_reaction?: boolean
        }
        Relationships: []
      }
      threads: {
        Row: {
          id: string
          user_id: string
          content: string
          category: string | null
          image_url: string | null
          like_count: number
          reply_count: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          content: string
          category?: string | null
          image_url?: string | null
          like_count?: number
          reply_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          content?: string
          category?: string | null
          image_url?: string | null
          like_count?: number
          reply_count?: number
          created_at?: string
        }
        Relationships: []
      }
      thread_likes: {
        Row: {
          thread_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          thread_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          thread_id?: string
          user_id?: string
          created_at?: string
        }
        Relationships: []
      }
      thread_replies: {
        Row: {
          id: string
          thread_id: string
          user_id: string
          content: string
          image_url: string | null
          parent_reply_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          thread_id: string
          user_id: string
          content: string
          image_url?: string | null
          parent_reply_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          thread_id?: string
          user_id?: string
          content?: string
          image_url?: string | null
          parent_reply_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      thread_reactions: {
        Row: {
          thread_id: string
          user_id: string
          emoji: string
          created_at: string
        }
        Insert: {
          thread_id: string
          user_id: string
          emoji: string
          created_at?: string
        }
        Update: {
          thread_id?: string
          user_id?: string
          emoji?: string
          created_at?: string
        }
        Relationships: []
      }
      thread_reply_reactions: {
        Row: {
          reply_id: string
          user_id: string
          emoji: string
          created_at: string
        }
        Insert: {
          reply_id: string
          user_id: string
          emoji: string
          created_at?: string
        }
        Update: {
          reply_id?: string
          user_id?: string
          emoji?: string
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<never, never>
    Functions: Record<never, never>
    Enums: Record<never, never>
    CompositeTypes: Record<never, never>
  }
}

// ---------------------------------------------------------------------------
// Generic table helpers (mirrors Supabase CLI output)
// ---------------------------------------------------------------------------
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

// ---------------------------------------------------------------------------
// Convenience named types — use these in components and server actions
// ---------------------------------------------------------------------------
export type Shop        = Tables<'shops'>
export type Review      = Tables<'reviews'>
export type Profile     = Tables<'profiles'>
export type ShopClaim   = Tables<'shop_claims'>
export type SavedShop   = Tables<'saved_shops'>
export type ReviewHelpful    = Tables<'review_helpful'>
export type ReviewFlag       = Tables<'review_flags'>
export type ReviewReaction   = Tables<'review_reactions'>
export type ShopReaction     = Tables<'shop_reactions'>
export type UserFollow               = Tables<'user_follows'>
export type Notification             = Tables<'notifications'>
export type PushSubscription         = Tables<'push_subscriptions'>
export type NotificationPreferences  = Tables<'notification_preferences'>
export type Thread                   = Tables<'threads'>
export type ThreadLike               = Tables<'thread_likes'>
export type ThreadReply              = Tables<'thread_replies'>
export type ThreadReaction           = Tables<'thread_reactions'>
export type ThreadReplyReaction      = Tables<'thread_reply_reactions'>

export type ShopInsert      = TablesInsert<'shops'>
export type ReviewInsert    = TablesInsert<'reviews'>
export type ShopClaimInsert = TablesInsert<'shop_claims'>

export type ShopUpdate   = TablesUpdate<'shops'>
export type ReviewUpdate = TablesUpdate<'reviews'>

// ---------------------------------------------------------------------------
// Composite / joined types used in the UI
// ---------------------------------------------------------------------------

/** Shop row with pre-computed aggregate stats (from a view or RPC). */
export type ShopWithStats = Shop & {
  avg_rating: number | null
  review_count: number
}

/** Review row with the reviewer's public profile fields joined. */
export type ReviewWithProfile = Review & {
  profiles: Pick<Profile, 'display_name' | 'avatar_url' | 'review_count' | 'role' | 'tier_override' | 'display_tier'>
}

/** Shop card data — minimal fields needed to render a ShopCard component. */
export type ShopCardData = Pick<
  Shop,
  'id' | 'name' | 'ig_handle' | 'category' | 'location' |
  'cover_image_url' | 'is_verified' | 'is_claimed'
> & {
  avg_rating: number | null
  review_count: number
}

/** Thread with author's profile joined. */
export type ThreadWithProfile = Thread & {
  profiles: Pick<Profile, 'display_name' | 'avatar_url' | 'role' | 'review_count' | 'tier_override' | 'display_tier'>
}

/** Thread reply with author's profile joined. */
export type ThreadReplyWithProfile = ThreadReply & {
  profiles: Pick<Profile, 'display_name' | 'avatar_url' | 'role' | 'review_count' | 'tier_override' | 'display_tier'>
}

/** Aggregated reaction counts for a thread or reply, with current-user status. */
export type ReactionCount = {
  emoji: string
  count: number
  reacted: boolean
}

// ---------------------------------------------------------------------------
// Status literal unions (re-exported for use in filter/badge components)
// ---------------------------------------------------------------------------
export type ShopStatus   = Shop['status']
export type ClaimStatus  = ShopClaim['status']
export type FlagStatus   = ReviewFlag['status']
export type UserRole     = Profile['role']
