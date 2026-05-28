-- ============================================================
-- Migration 001: Initial Schema
-- IG Shop Directory
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES (must exist before shops — both reference auth.users)
-- ============================================================
CREATE TABLE profiles (
  id            uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  display_name  text,
  avatar_url    text,
  bio           text,
  role          text DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at    timestamptz DEFAULT now()
);

-- Auto-create a profile row whenever a new auth user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- SHOPS
-- Note: `status` added (not in original brief) to support the
-- admin approval queue (pending → approved | rejected).
-- `is_active` defaults to false so submissions are never
-- publicly visible before admin approval.
-- ============================================================
CREATE TABLE shops (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            text NOT NULL,
  ig_handle       text NOT NULL UNIQUE,
  description     text,
  category        text,
  tags            text[],
  location        text,
  sub_location    text,
  website_url     text,
  payment_methods text[],
  ships_to        text[],
  cover_image_url text,
  status          text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  is_claimed      boolean DEFAULT false,
  is_verified     boolean DEFAULT false,
  is_active       boolean DEFAULT false,
  submitted_by    uuid REFERENCES auth.users ON DELETE SET NULL,
  claimed_by      uuid REFERENCES auth.users ON DELETE SET NULL,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  search_vector   tsvector
);

CREATE OR REPLACE FUNCTION update_shop_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector = to_tsvector('english',
    coalesce(NEW.name, '') || ' ' ||
    coalesce(NEW.ig_handle, '') || ' ' ||
    coalesce(NEW.description, '') || ' ' ||
    coalesce(NEW.category, '') || ' ' ||
    coalesce(array_to_string(NEW.tags, ' '), '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER shops_search_vector_update
  BEFORE INSERT OR UPDATE ON shops
  FOR EACH ROW EXECUTE FUNCTION update_shop_search_vector();

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER shops_updated_at
  BEFORE UPDATE ON shops
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- REVIEWS
-- ============================================================
CREATE TABLE reviews (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id           uuid REFERENCES shops(id) ON DELETE CASCADE NOT NULL,
  user_id           uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  rating            int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title             text,
  body              text,
  is_verified_buyer boolean DEFAULT false,
  helpful_count     int DEFAULT 0,
  created_at        timestamptz DEFAULT now(),
  UNIQUE (shop_id, user_id)
);

-- ============================================================
-- SHOP CLAIMS
-- ============================================================
CREATE TABLE shop_claims (
  id        uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id   uuid REFERENCES shops(id) ON DELETE CASCADE NOT NULL,
  user_id   uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  ig_proof  text,
  status    text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- SAVED SHOPS (bookmarks join table)
-- ============================================================
CREATE TABLE saved_shops (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  shop_id    uuid REFERENCES shops(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, shop_id)
);

-- ============================================================
-- REVIEW HELPFUL (join table — prevents duplicate votes)
-- ============================================================
CREATE TABLE review_helpful (
  user_id   uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  review_id uuid REFERENCES reviews(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (user_id, review_id)
);

-- Keep reviews.helpful_count in sync via triggers
CREATE OR REPLACE FUNCTION increment_helpful_count()
RETURNS trigger AS $$
BEGIN
  UPDATE reviews SET helpful_count = helpful_count + 1 WHERE id = NEW.review_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_helpful_count()
RETURNS trigger AS $$
BEGIN
  UPDATE reviews SET helpful_count = GREATEST(0, helpful_count - 1) WHERE id = OLD.review_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER review_helpful_insert
  AFTER INSERT ON review_helpful
  FOR EACH ROW EXECUTE FUNCTION increment_helpful_count();

CREATE TRIGGER review_helpful_delete
  AFTER DELETE ON review_helpful
  FOR EACH ROW EXECUTE FUNCTION decrement_helpful_count();

-- ============================================================
-- REVIEW FLAGS (admin moderation queue)
-- ============================================================
CREATE TABLE review_flags (
  id        uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id uuid REFERENCES reviews(id) ON DELETE CASCADE NOT NULL,
  user_id   uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  reason    text,
  status    text DEFAULT 'pending' CHECK (status IN ('pending', 'dismissed', 'actioned')),
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, review_id)
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX shops_search_idx    ON shops USING GIN (search_vector);
CREATE INDEX shops_category_idx  ON shops (category);
CREATE INDEX shops_location_idx  ON shops (location);
CREATE INDEX shops_status_idx    ON shops (status);
CREATE INDEX reviews_shop_id_idx ON reviews (shop_id);
CREATE INDEX saved_shops_user_idx    ON saved_shops (user_id);
CREATE INDEX shop_claims_status_idx  ON shop_claims (status);
CREATE INDEX review_flags_status_idx ON review_flags (status);
