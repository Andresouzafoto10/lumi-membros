---
name: Upload storage decision
description: Use Supabase Storage for file uploads instead of Cloudflare R2 until further notice
type: project
---

Uploads de arquivos (imagens, vídeos, materiais) usam **Supabase Storage** por enquanto.

**Why:** Cloudflare R2 ainda não está configurado. Fundador vai avisar quando estiver pronto para migrar.

**How to apply:** Ao implementar qualquer feature de upload (avatares, capas, banners, materiais de aula), usar Supabase Storage buckets. Não referenciar R2. Quando o fundador informar que R2 está configurado, migrar a camada de storage.
