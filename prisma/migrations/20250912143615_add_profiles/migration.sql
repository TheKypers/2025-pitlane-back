-- Ensure auth schema and users table exist for CI environments
-- CREATE SCHEMA IF NOT EXISTS auth;

-- CREATE TABLE IF NOT EXISTS auth.users (
--     instance_id uuid null,
--     id uuid not null,
--     aud character varying(255) null,
--     role character varying(255) null,
--     email character varying(255) null,
--     encrypted_password character varying(255) null,
--     email_confirmed_at timestamp with time zone null,
--     invited_at timestamp with time zone null,
--     confirmation_token character varying(255) null,
--     confirmation_sent_at timestamp with time zone null,
--     recovery_token character varying(255) null,
--     recovery_sent_at timestamp with time zone null,
--     email_change_token_new character varying(255) null,
--     email_change character varying(255) null,
--     email_change_sent_at timestamp with time zone null,
--     last_sign_in_at timestamp with time zone null,
--     raw_app_meta_data jsonb null,
--     raw_user_meta_data jsonb null,
--     is_super_admin boolean null,
--     created_at timestamp with time zone null,
--     updated_at timestamp with time zone null,
--     phone text null default null::character varying,
--     phone_confirmed_at timestamp with time zone null,
--     phone_change text null default ''::character varying,
--     phone_change_token character varying(255) null default ''::character varying,
--     phone_change_sent_at timestamp with time zone null,
--     confirmed_at timestamp with time zone GENERATED ALWAYS as (LEAST(email_confirmed_at, phone_confirmed_at)) STORED null,
--     email_change_token_current character varying(255) null default ''::character varying,
--     email_change_confirm_status smallint null default 0,
--     banned_until timestamp with time zone null,
--     reauthentication_token character varying(255) null default ''::character varying,
--     reauthentication_sent_at timestamp with time zone null,
--     is_sso_user boolean not null default false,
--     deleted_at timestamp with time zone null,
--     is_anonymous boolean not null default false,
--     constraint users_pkey primary key (id),
--     constraint users_phone_key unique (phone),
--     constraint users_email_change_confirm_status_check check (
--         (
--             (email_change_confirm_status >= 0)
--             and (email_change_confirm_status <= 2)
--         )
--     )
-- ) TABLESPACE pg_default;

/*  
  Warnings:

  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_DietaryRestrictionToUser` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_PreferenceToUser` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[name]` on the table `Food` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "public"."_DietaryRestrictionToUser" DROP CONSTRAINT "_DietaryRestrictionToUser_A_fkey";

-- DropForeignKey
ALTER TABLE "public"."_DietaryRestrictionToUser" DROP CONSTRAINT "_DietaryRestrictionToUser_B_fkey";

-- DropForeignKey
ALTER TABLE "public"."_PreferenceToUser" DROP CONSTRAINT "_PreferenceToUser_A_fkey";

-- DropForeignKey
ALTER TABLE "public"."_PreferenceToUser" DROP CONSTRAINT "_PreferenceToUser_B_fkey";

-- DropTable
DROP TABLE "public"."User";

-- DropTable
DROP TABLE "public"."_DietaryRestrictionToUser";

-- DropTable
DROP TABLE "public"."_PreferenceToUser";

-- CreateTable
CREATE TABLE "public"."Profile" (
    "id" UUID NOT NULL,
    "username" TEXT,
    "avatar_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_PreferenceToProfile" (
    "A" INTEGER NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_PreferenceToProfile_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "public"."_DietaryRestrictionToProfile" (
    "A" INTEGER NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_DietaryRestrictionToProfile_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Profile_username_key" ON "public"."Profile"("username");

-- CreateIndex
CREATE INDEX "_PreferenceToProfile_B_index" ON "public"."_PreferenceToProfile"("B");

-- CreateIndex
CREATE INDEX "_DietaryRestrictionToProfile_B_index" ON "public"."_DietaryRestrictionToProfile"("B");

-- CreateIndex
CREATE UNIQUE INDEX "Food_name_key" ON "public"."Food"("name");

-- AddForeignKey
ALTER TABLE "public"."_PreferenceToProfile" ADD CONSTRAINT "_PreferenceToProfile_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Preference"("PreferenceID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_PreferenceToProfile" ADD CONSTRAINT "_PreferenceToProfile_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_DietaryRestrictionToProfile" ADD CONSTRAINT "_DietaryRestrictionToProfile_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."DietaryRestriction"("DietaryRestrictionID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_DietaryRestrictionToProfile" ADD CONSTRAINT "_DietaryRestrictionToProfile_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- create or replace function public.handle_new_user()
-- returns trigger as $$
-- begin
--     insert into public.profiles (id, username)
--     values (new.id, new.email);
--     return new;
-- end;
-- $$ language plpgsql security definer;

-- create trigger on_auth_user_created
-- after insert on auth.users
-- for each row execute procedure public.handle_new_user();