# Banner Media (Video + Canva Embed) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow `course_banners` to be an image, MP4/WebM video, or Canva iframe embed; carousel renders the right element per banner.

**Architecture:** Add `media_type` column to `course_banners`. Extend `FileUpload` to detect file MIME type / URL pattern (Canva), emit type to the caller. Admin form stores both URL + type. Carousel branches `<img>` / `<video>` / `<iframe>` on `mediaType`. Existing banners default to `image` via DB default.

**Tech Stack:** React 18 + TypeScript (strict), Supabase Postgres + RLS, Cloudflare R2 for media storage, TanStack Query.

**Verification approach:** No automated test suite in this repo. Each task is verified by `npm run build` (runs `tsc -b && vite build`), `npm run lint`, and explicit manual checks in the browser. The plan calls out what to verify and how, after every meaningful change.

**Reference spec:** `docs/superpowers/specs/2026-05-12-banner-video-canva-design.md`

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `supabase/migrations/20260512000006_banner_media_type.sql` | Create | Add `media_type` column with check constraint |
| `supabase/migrations/001_initial_schema.sql` | Modify (lines 256–270) | Mirror new column in initial schema |
| `src/types/course.ts` | Modify (lines 153–168) | Add `CourseBannerMediaType` + extend `CourseBanner` |
| `src/lib/database.types.ts` | Modify | Add `media_type` to `course_banners` Row/Insert/Update types |
| `src/lib/canvaEmbed.ts` | Create | Pure helpers: detect media type, normalize Canva URL |
| `src/hooks/useCourses.ts` | Modify (lines 121–141, 691–740) | Map `media_type` in fetch + create + update banner |
| `src/components/ui/FileUpload.tsx` | Modify | Accept video, branch preview, change `onChange` signature, normalize Canva URLs |
| `src/pages/admin/AdminCoursesPage.tsx` | Modify (lines 73–93, 156–207, 426–440) | `BannerFormState.mediaType`, save payload, hooked up to FileUpload callback |
| `src/components/courses/CourseBannersCarousel.tsx` | Modify (lines 124–135) | Render `<img>` / `<video>` / `<iframe>` by `mediaType` |

---

## Task 1: Database migration

**Files:**
- Create: `supabase/migrations/20260512000006_banner_media_type.sql`
- Modify: `supabase/migrations/001_initial_schema.sql:256-270`

- [ ] **Step 1: Write the migration file**

Create `supabase/migrations/20260512000006_banner_media_type.sql`:

```sql
-- Add media_type column to course_banners for video / canva embed support.
alter table public.course_banners
  add column if not exists media_type text not null default 'image'
  check (media_type in ('image', 'video', 'embed'));
```

- [ ] **Step 2: Apply migration to remote Supabase project `gdbkbeurjjtjgmrmfngk`**

Use the Supabase MCP `apply_migration` tool with `project_id = "gdbkbeurjjtjgmrmfngk"`, `name = "banner_media_type"`, and the SQL body from Step 1.

Expected: tool returns success.

If MCP fails, fallback: open https://supabase.com/dashboard/project/gdbkbeurjjtjgmrmfngk/sql, paste the SQL, run it.

- [ ] **Step 3: Verify the column exists**

Run via Supabase MCP `execute_sql` on project `gdbkbeurjjtjgmrmfngk`:

```sql
select column_name, data_type, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'course_banners'
  and column_name = 'media_type';
```

Expected: one row with `data_type = 'text'`, `column_default = "'image'::text"`.

- [ ] **Step 4: Verify existing banners got the default**

```sql
select count(*) filter (where media_type = 'image') as images,
       count(*) filter (where media_type is null) as nulls
from public.course_banners;
```

Expected: `nulls = 0`. `images` equals existing banner count.

- [ ] **Step 5: Mirror change in `001_initial_schema.sql`**

In `supabase/migrations/001_initial_schema.sql`, find the `course_banners` definition (line ~256) and insert after `image_url` and before `is_active`:

```sql
  image_url         text not null,
  media_type        text not null default 'image'
                      check (media_type in ('image','video','embed')),
  is_active         boolean not null default true,
```

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260512000006_banner_media_type.sql supabase/migrations/001_initial_schema.sql
git commit -m "feat(db): add media_type to course_banners for video/embed support"
```

---

## Task 2: Type extensions

**Files:**
- Modify: `src/types/course.ts:153-168`
- Modify: `src/lib/database.types.ts`

- [ ] **Step 1: Extend `CourseBanner` type**

In `src/types/course.ts`, replace the block starting at `export type CourseBannerTargetType` (line 153) with:

```ts
export type CourseBannerTargetType = "none" | "course" | "url";
export type CourseBannerMediaType = "image" | "video" | "embed";

export type CourseBanner = {
  id: string;
  title: string | null;
  subtitle: string | null;
  buttonLabel: string | null;
  targetType: CourseBannerTargetType;
  targetCourseId: string | null;
  targetUrl: string | null;
  imageUrl: string;
  mediaType: CourseBannerMediaType;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
};
```

- [ ] **Step 2: Update `database.types.ts`**

In `src/lib/database.types.ts`, find the `course_banners` block (search for `course_banners:`). Add `media_type` to all three nested objects (`Row`, `Insert`, `Update`):

```ts
course_banners: {
  Row: {
    // ...existing fields...
    image_url: string;
    media_type: string;   // add this
    is_active: boolean;
    // ...
  };
  Insert: {
    // ...existing fields...
    image_url: string;
    media_type?: string;  // add this (optional, DB has default)
    is_active?: boolean;
    // ...
  };
  Update: {
    // ...existing fields...
    image_url?: string;
    media_type?: string;  // add this
    is_active?: boolean;
    // ...
  };
};
```

If `database.types.ts` is auto-generated via `mcp__supabase__generate_typescript_types`, regenerate it instead of editing manually. If regenerating, run the MCP tool with `project_id = "gdbkbeurjjtjgmrmfngk"` and overwrite the file.

- [ ] **Step 3: Run TypeScript compile to verify nothing broke yet**

```bash
npm run build
```

Expected: PASS. If failures appear in `useCourses.ts`, `AdminCoursesPage.tsx`, or `CourseBannersCarousel.tsx`, those are the spots the next tasks touch — let them stand until then. If TS complains anywhere else (unexpected), fix it before continuing.

- [ ] **Step 4: Commit**

```bash
git add src/types/course.ts src/lib/database.types.ts
git commit -m "feat(types): add CourseBannerMediaType + mediaType field to CourseBanner"
```

---

## Task 3: Canva URL normalizer + media-type detection helpers

**Files:**
- Create: `src/lib/canvaEmbed.ts`

- [ ] **Step 1: Create the helpers**

Create `src/lib/canvaEmbed.ts`:

```ts
import type { CourseBannerMediaType } from "@/types/course";

const CANVA_DESIGN_RE = /^https?:\/\/(?:www\.)?canva\.com\/design\/([A-Za-z0-9_-]+)\/([A-Za-z0-9_-]+)(?:\/[^?#]*)?(?:[?#].*)?$/;
const VIDEO_EXT_RE = /\.(mp4|webm|mov)(?:[?#].*)?$/i;
const IMAGE_EXT_RE = /\.(png|jpe?g|gif|webp|avif|svg)(?:[?#].*)?$/i;

export function isCanvaDesignUrl(url: string): boolean {
  return CANVA_DESIGN_RE.test(url);
}

export function normalizeCanvaEmbedUrl(url: string): string {
  const match = url.match(CANVA_DESIGN_RE);
  if (!match) return url;
  const [, id, token] = match;
  return `https://www.canva.com/design/${id}/${token}/view?embed`;
}

export function detectMediaTypeFromUrl(url: string): CourseBannerMediaType {
  if (isCanvaDesignUrl(url)) return "embed";
  if (VIDEO_EXT_RE.test(url)) return "video";
  if (IMAGE_EXT_RE.test(url)) return "image";
  // R2 URLs without extension default to image (legacy)
  return "image";
}

export function detectMediaTypeFromFile(file: File): CourseBannerMediaType {
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("image/")) return "image";
  return "image";
}
```

- [ ] **Step 2: Compile**

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/canvaEmbed.ts
git commit -m "feat: add Canva embed + media-type detection helpers"
```

---

## Task 4: `useCourses` — map `media_type` in fetch + create + update

**Files:**
- Modify: `src/hooks/useCourses.ts:121-141`
- Modify: `src/hooks/useCourses.ts:691-740`

- [ ] **Step 1: Add `mediaType` to the fetch mapper**

Locate `fetchBanners()` (line ~121). Replace the `return (data ?? []).map(...)` block with:

```ts
return (data ?? []).map((b) => ({
  id: b.id,
  title: b.title,
  subtitle: b.subtitle,
  buttonLabel: b.button_label,
  targetType: b.target_type as CourseBanner["targetType"],
  targetCourseId: b.target_course_id,
  targetUrl: b.target_url,
  imageUrl: b.image_url,
  mediaType: (b.media_type ?? "image") as CourseBanner["mediaType"],
  isActive: b.is_active,
  displayOrder: b.display_order,
  createdAt: b.created_at,
  updatedAt: b.updated_at,
}));
```

- [ ] **Step 2: Include `media_type` in `createBanner` insert payload**

In `createBanner` (line ~693), inside `.insert({ ... })`, after the `image_url: data.imageUrl,` line, add:

```ts
        media_type: data.mediaType,
```

- [ ] **Step 3: Include `media_type` in `updateBanner` patch**

In `updateBanner` (line ~713), inside the `.update({ ... })` spread object, after the `imageUrl` line add:

```ts
          ...(patch.mediaType !== undefined && { media_type: patch.mediaType }),
```

- [ ] **Step 4: Compile**

```bash
npm run build
```

Expected: PASS. Failures should now only be in `AdminCoursesPage.tsx` (BannerFormState missing `mediaType`) and `CourseBannersCarousel.tsx` is fine (it reads existing fields). Continue.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useCourses.ts
git commit -m "feat(hooks): wire media_type through banner CRUD in useCourses"
```

---

## Task 5: `FileUpload` — accept video, detect type, normalize Canva URLs, new `onChange` signature

**Files:**
- Modify: `src/components/ui/FileUpload.tsx`

- [ ] **Step 1: Update imports + props signature**

At the top of `FileUpload.tsx`, after the existing imports add:

```ts
import {
  detectMediaTypeFromFile,
  detectMediaTypeFromUrl,
  normalizeCanvaEmbedUrl,
  isCanvaDesignUrl,
} from "@/lib/canvaEmbed";
import type { CourseBannerMediaType } from "@/types/course";
```

Replace the `onChange` prop declaration in `FileUploadProps`. Second arg is `mediaType?` (optional) so all existing call sites elsewhere in the app — avatars, covers, certificates, materials, community covers — continue to type-check without modification:

```ts
  /** Called with the new public URL + detected media type, or "" / "image" on remove */
  onChange: (url: string, mediaType?: CourseBannerMediaType) => void;
```

Update the default `accept` value in the destructured props:

```ts
  accept = "image/*,video/mp4,video/webm",
```

- [ ] **Step 2: Branch image-preset skipping for video uploads**

In `handleFile` (line ~89), replace the `uploadFile({...})` call with:

```ts
      const mediaType = detectMediaTypeFromFile(file);
      try {
        const url = await uploadFile({
          file,
          folder,
          previousUrl: value,
          preset: mediaType === "video" ? undefined : imagePreset,
          errorMessage: "Erro no upload. Tente novamente.",
        });
        onChange(url, mediaType);
        toast.success("Upload concluido!");
      } catch {
        // useR2Upload already reports the error to the user
      }
```

Remove the old `onChange(url)` call inside the try block (replaced above).

- [ ] **Step 3: Update remove handler**

Replace the line `onChange("");` near the end of `handleRemoveConfirmed` (line ~169) with:

```ts
    onChange("", "image");
```

- [ ] **Step 4: Update URL confirm handler — normalize Canva + emit type**

Replace `handleUrlConfirm` (line ~173) entirely with:

```ts
  const handleUrlConfirm = useCallback(() => {
    const trimmed = urlDraft.trim();
    if (!trimmed) return;
    const finalUrl = isCanvaDesignUrl(trimmed)
      ? normalizeCanvaEmbedUrl(trimmed)
      : trimmed;
    const mediaType = detectMediaTypeFromUrl(finalUrl);
    if (value && isR2Url(value)) {
      deleteFromR2(value).catch(() => {});
    }
    onChange(finalUrl, mediaType);
    setUrlDraft("");
    setShowUrlInput(false);
  }, [urlDraft, value, onChange]);
```

- [ ] **Step 5: Add a media-type prop so the preview renders correctly**

In `FileUploadProps`, add:

```ts
  /** Current media type for preview rendering (default: detected from URL) */
  mediaType?: CourseBannerMediaType;
```

Destructure it with a fallback:

```ts
  mediaType,
```

Compute the effective preview type just below `const previewSrc = ...`:

```ts
  const effectiveMediaType: CourseBannerMediaType =
    mediaType ?? (value ? detectMediaTypeFromUrl(value) : "image");
```

- [ ] **Step 6: Branch preview rendering**

In the `value ? (...)` JSX block (line ~211), replace the `isImage ? <img/> : <FileUp/>` ternary with:

```tsx
          {effectiveMediaType === "video" ? (
            <video
              src={value}
              controls
              muted
              playsInline
              className="w-full h-full object-cover bg-black"
            />
          ) : effectiveMediaType === "embed" ? (
            <iframe
              src={value}
              className="w-full h-full pointer-events-none"
              allow="autoplay; fullscreen"
              sandbox="allow-scripts allow-same-origin allow-presentation"
              loading="lazy"
              title="Preview"
            />
          ) : isImage ? (
            <img
              src={previewSrc}
              alt="Preview"
              className={cn(
                "w-full",
                previewMaxHeight ? "h-auto object-contain" : "h-full object-cover"
              )}
              crossOrigin="anonymous"
              onError={(e) => { e.currentTarget.style.opacity = '0.3'; }}
            />
          ) : (
            <div className="flex items-center justify-center h-full min-h-[80px] p-4">
              <FileUp className="h-8 w-8 text-muted-foreground mr-2" />
              <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                {value.split("/").pop()}
              </span>
            </div>
          )}
```

- [ ] **Step 7: Compile**

```bash
npm run build
```

Expected: PASS. The optional second arg means all existing `FileUpload` callers (avatars, covers, certificate backgrounds, community covers, lesson materials) still type-check without touching them.

- [ ] **Step 8: Commit**

```bash
git add src/components/ui/FileUpload.tsx
git commit -m "feat(FileUpload): support video upload + Canva URL embed with type detection"
```

---

## Task 6: AdminCoursesPage — wire `mediaType` through banner form

**Files:**
- Modify: `src/pages/admin/AdminCoursesPage.tsx:15` (import)
- Modify: `src/pages/admin/AdminCoursesPage.tsx:73-93`
- Modify: `src/pages/admin/AdminCoursesPage.tsx:156-207`
- Modify: `src/pages/admin/AdminCoursesPage.tsx:427-440`

- [ ] **Step 1: Update import**

Replace line 15:

```ts
import type { CourseBanner, CourseBannerMediaType, CourseBannerTargetType } from "@/types/course";
```

- [ ] **Step 2: Extend `BannerFormState` + `emptyBannerForm`**

Replace lines 73–93:

```ts
type BannerFormState = {
  imageUrl: string;
  mediaType: CourseBannerMediaType;
  title: string;
  subtitle: string;
  buttonLabel: string;
  targetType: CourseBannerTargetType;
  targetCourseId: string;
  targetUrl: string;
  isActive: boolean;
};

const emptyBannerForm: BannerFormState = {
  imageUrl: "",
  mediaType: "image",
  title: "",
  subtitle: "",
  buttonLabel: "",
  targetType: "none",
  targetCourseId: "",
  targetUrl: "",
  isActive: true,
};
```

- [ ] **Step 3: Hydrate `mediaType` in `openBannerEdit`**

In `openBannerEdit` (line ~162), inside the `setBannerForm({ ... })` object, after `imageUrl: banner.imageUrl,` add:

```ts
      mediaType: banner.mediaType ?? "image",
```

- [ ] **Step 4: Include `mediaType` in save payload**

In `handleSaveBanner` (line ~177), inside the `payload` object, after `imageUrl: bannerForm.imageUrl.trim(),` add:

```ts
      mediaType: bannerForm.mediaType,
```

- [ ] **Step 5: Update `FileUpload` `onChange` handler in dialog**

Locate the `FileUpload` block (line ~428). Replace the `onChange` prop and add `mediaType`:

```tsx
                <FileUpload
                  value={bannerForm.imageUrl}
                  mediaType={bannerForm.mediaType}
                  onChange={(url, mediaType) =>
                    setBannerForm({
                      ...bannerForm,
                      imageUrl: url,
                      mediaType: mediaType ?? "image",
                    })
                  }
                  folder="banners"
                  imagePreset="banner"
                  allowUrl={true}
                  aspectRatio="21/9"
                  maxSizeMB={50}
                  placeholder="Arraste imagem/video ou cole URL do Canva"
                />
```

(`maxSizeMB` bumped to 50 to match the 50MB video cap from the spec.)

- [ ] **Step 6: Compile + lint**

```bash
npm run build && npm run lint
```

Expected: both PASS.

- [ ] **Step 7: Commit**

```bash
git add src/pages/admin/AdminCoursesPage.tsx
git commit -m "feat(admin): banner form stores + persists mediaType"
```

---

## Task 7: CourseBannersCarousel — render by `mediaType`

**Files:**
- Modify: `src/components/courses/CourseBannersCarousel.tsx:124-135`

- [ ] **Step 1: Replace the slide media element**

In the `.map((banner, idx) => ...)` block (line ~124), replace just the `<img ...>` element (currently lines 130–135) with:

```tsx
            {(banner.mediaType ?? "image") === "video" ? (
              <video
                src={banner.imageUrl}
                autoPlay
                muted
                loop
                playsInline
                className="h-full w-full object-cover select-none pointer-events-none"
              />
            ) : (banner.mediaType ?? "image") === "embed" ? (
              <iframe
                src={banner.imageUrl}
                title={banner.title ?? "Banner"}
                className="h-full w-full pointer-events-none"
                allow="autoplay; fullscreen"
                sandbox="allow-scripts allow-same-origin allow-presentation"
                loading="lazy"
              />
            ) : (
              <img
                src={banner.imageUrl}
                alt={banner.title ?? ""}
                className="h-full w-full object-cover select-none pointer-events-none"
                draggable={false}
              />
            )}
```

- [ ] **Step 2: Compile**

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/courses/CourseBannersCarousel.tsx
git commit -m "feat(carousel): render video and embed banner media types"
```

---

## Task 8: Manual browser verification

No automated tests in this repo — verify the full feature in the browser.

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

Expected: server running on http://localhost:5174.

- [ ] **Step 2: Login as owner** (`fotografoandresouza@gmail.com`). Open `/admin/cursos`.

- [ ] **Step 3: Test image banner (regression)**

Open an existing banner, save without changes → confirm it still appears unchanged on `/cursos`.

Expected: image renders as before. Carousel swipes. Buttons work.

- [ ] **Step 4: Test video banner**

Click "Novo banner" → upload an MP4 file ≤50MB. Preview shows `<video controls>`. Save. Navigate to `/cursos`.

Expected: banner shows MP4 autoplaying muted+looped, no controls visible, fills the carousel area. Swipe still navigates between banners.

- [ ] **Step 5: Test 50MB+ video rejection**

Try uploading a >50MB MP4.

Expected: toast `Arquivo muito grande. Maximo: 50MB`. No upload, no save.

- [ ] **Step 6: Test Canva embed banner**

Click "Novo banner" → click "Usar URL externa" → paste `https://www.canva.com/design/DAGbt8qQbDs/jokrBi_pqS-gPENyvwci7A/view` → click OK. Preview shows the Canva design in an iframe. Save. Open `/cursos`.

Expected: banner shows Canva design rendering inside the carousel slot. Carousel swipe still works (iframe is `pointer-events-none`). Title/button overlay appears above the iframe.

- [ ] **Step 7: Test mixed carousel**

Have at least one image, one video, one embed banner active simultaneously. Wait through one auto-rotation cycle on `/cursos`.

Expected: all three types render correctly. Auto-rotation works. Swipe + nav buttons work for all three. No console errors.

- [ ] **Step 8: Test mobile autoplay**

Open `/cursos` on a mobile device or with devtools mobile emulation.

Expected: video autoplays without tapping (works because `muted + playsInline` set).

- [ ] **Step 9: If any step fails**

Stop and debug. Common issues:
- Video doesn't autoplay → confirm `muted` + `playsInline` attributes set.
- Canva iframe blank → check the URL was normalized to `…/view?embed` (inspect element on `<iframe src>`).
- Swipe doesn't work over iframe → confirm `pointer-events-none` class on iframe.
- TS error on `banner.mediaType` → confirm Task 2 type extension was committed.

---

## Task 9: Final review + push

- [ ] **Step 1: Run lint + build one more time**

```bash
npm run lint && npm run build
```

Expected: both PASS.

- [ ] **Step 2: Verify git log**

```bash
git log --oneline -8
```

Expected: 7 feature commits (one per implementation task) following the order in this plan.

- [ ] **Step 3: Push (if user approves)**

Wait for the user to confirm before pushing. The user runs:

```bash
git push
```

---

## Spec coverage check

| Spec section | Covered by |
|---|---|
| DB column + check constraint | Task 1 |
| `001_initial_schema.sql` mirror update | Task 1 step 5 |
| `CourseBannerMediaType` type + extended `CourseBanner` | Task 2 |
| `database.types.ts` update | Task 2 step 2 |
| Canva URL normalizer + media-type detection | Task 3 |
| `useCourses` create/update/fetch wiring | Task 4 |
| `FileUpload` accept video, preview branches, callback signature, Canva normalization | Task 5 |
| AdminCoursesPage form state + payload | Task 6 |
| Carousel `<img>`/`<video>`/`<iframe>` branching | Task 7 |
| Mobile autoplay (`muted` + `playsInline`) | Task 7 step 1 + Task 8 step 8 |
| Iframe sandbox + pointer-events-none | Task 5 step 6, Task 7 step 1 |
| 50MB cap | Task 6 step 5 |
| Backward compat for existing image banners | DB default (Task 1) + `?? "image"` fallback (Tasks 4, 6, 7) |
| Mixed-type carousel verification | Task 8 step 7 |
