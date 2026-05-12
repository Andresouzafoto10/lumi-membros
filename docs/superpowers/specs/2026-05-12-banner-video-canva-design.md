# Banner Media: Video Upload + Canva Embed Support

**Date:** 2026-05-12
**Status:** Approved design, ready for implementation plan

## Problem

`CourseBanner` only supports static images via `<img src>`. Pasting a Canva design URL (`https://www.canva.com/design/.../view`) into the banner image field yields a blank preview because the URL points to an HTML page, not a raw image. Admins want richer banner media: short videos and animated Canva designs as the cover/banner at the top of `/cursos`.

## Goals

1. Allow MP4/WebM video upload as banner media, autoplaying muted+looped in carousel.
2. Allow Canva design URL as banner media, rendered via iframe embed.
3. Preserve existing image banners with zero migration breakage.

## Non-goals

- Server-side video transcoding/compression.
- Video controls in carousel (banners are decorative, no user playback).
- Vimeo/YouTube embed (only Canva for now).

## Data model

### Migration

New migration file `supabase/migrations/20260512000001_banner_media_type.sql`:

```sql
ALTER TABLE public.course_banners
  ADD COLUMN media_type text NOT NULL DEFAULT 'image'
  CHECK (media_type IN ('image', 'video', 'embed'));
```

Existing rows auto-set to `image` via the `DEFAULT`. Also update `supabase/migrations/001_initial_schema.sql` to reflect the new column (project convention from CLAUDE.md).

### Type change

`src/types/course.ts`:

```ts
export type CourseBannerMediaType = "image" | "video" | "embed";

export type CourseBanner = {
  // ...existing fields
  mediaType: CourseBannerMediaType;
  // imageUrl keeps its name; semantically holds the media URL for all types
};
```

`src/lib/database.types.ts` auto-regen after migration.

## Component changes

### `FileUpload`

File: `src/components/ui/FileUpload.tsx`.

- Extend default `accept` to `image/*,video/mp4,video/webm` (caller can override).
- New prop signature change:
  ```ts
  onChange: (url: string, mediaType: CourseBannerMediaType) => void;
  ```
- Internal helper `detectMediaType(file | url): CourseBannerMediaType`:
  - File: `file.type.startsWith("video/")` → `video`; else `image`.
  - URL: regex `^https?://(www\.)?canva\.com/design/[^/]+/[^/]+` → `embed`; URL ending `.mp4`/`.webm`/`.mov` → `video`; else `image`.
- Skip image optimization when video file (don't pass `preset`; upload raw via `useR2Upload`).
- Enforce 50MB cap pre-upload (current `maxSizeMB` prop default bumped or specifically passed in).
- Preview branches:
  - `image` → `<img>` (current).
  - `video` → `<video src controls muted className="w-full h-full object-cover" />`.
  - `embed` → small iframe preview (`<iframe className="aspect-video">`).
- URL input handler `handleUrlConfirm`:
  - Detect type; if Canva, normalize to `https://www.canva.com/design/{id}/{token}/view?embed`.
  - Call `onChange(normalizedUrl, mediaType)`.

### `AdminCoursesPage` banner dialog

File: `src/pages/admin/AdminCoursesPage.tsx`.

- `BannerFormState` gains `mediaType: CourseBannerMediaType` (default `image`).
- `openBannerEdit` reads `banner.mediaType`.
- `FileUpload onChange` handler stores both `imageUrl` and `mediaType`.
- `handleSaveBanner` payload includes `mediaType`.

### `useCourses` hook

File: `src/hooks/useCourses.ts`.

- `createBanner` insert: include `media_type`.
- `updateBanner` update: include `media_type`.
- Mapper from DB row → `CourseBanner`: read `media_type` (fallback `'image'`).

### `CourseBannersCarousel`

File: `src/components/courses/CourseBannersCarousel.tsx`.

In the slide render block (currently `<img src={banner.imageUrl}...>`), branch on `banner.mediaType ?? 'image'`:

- `image` → existing `<img>` unchanged.
- `video`:
  ```tsx
  <video
    src={banner.imageUrl}
    autoPlay
    muted
    loop
    playsInline
    className="h-full w-full object-cover select-none pointer-events-none"
  />
  ```
- `embed`:
  ```tsx
  <iframe
    src={banner.imageUrl}
    className="h-full w-full pointer-events-none"
    allow="autoplay; fullscreen"
    sandbox="allow-scripts allow-same-origin allow-presentation"
    loading="lazy"
  />
  ```
  Iframe is `pointer-events-none` (same pattern as image/video) so pointer events bubble to the carousel track and swipe/drag continues to work. Banner is decorative — interaction with the Canva embed is intentionally blocked.

The gradient overlay + title/button overlay stay above all media types.

## Backward compatibility

- DB default `'image'` sets existing rows automatically.
- Mapper fallback ensures rows without `media_type` still render.
- `imageUrl` field name retained (no field rename, no DB rename) — semantic only.

## Validation / edge cases

- File > 50MB → toast error before upload (existing `maxSizeMB` logic).
- Non-Canva HTTPS URL ending unknown extension → treated as `image` (current behavior — broken preview, user warned via existing error opacity).
- Canva URL variations (`/view`, `/view?utm_*`, `/edit`) → regex captures id+token, rebuilds with `?embed`.
- Mobile autoplay requires `muted + playsInline` (both set).
- Iframe sandbox blocks navigation away from Canva preview while allowing scripts (Canva needs them).

## Test plan

1. Upload MP4 (<50MB) → banner saves, carousel loops video, swipe works.
2. Paste `https://www.canva.com/design/DAGbt8qQbDs/jokrBi_pqS-gPENyvwci7A/view` → preview shows embedded iframe; saved banner renders iframe in carousel; swipe still navigates.
3. Existing image banner → still renders unchanged.
4. Upload 51MB MP4 → toast error, no upload.
5. Carousel autoplay across types (4s rotation) → still works.
6. Multiple banners mixing all 3 types → all render correctly in same carousel.

## Out of scope (follow-ups)

- Per-banner mute/controls toggle.
- Video poster image while loading.
- Generic OEmbed support beyond Canva (Figma, etc).
