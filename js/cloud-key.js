// Supabase publishable key — bewust LEEG in de broncode.
//
// De echte sleutel staat in de GitHub Actions-secret `SUPABASE_ANON_KEY` en
// wordt tijdens het deployen (zie .github/workflows/deploy.yml) in dit bestand
// geschreven. Zo staat de sleutel niet in de git-historie. Lokaal blijft dit
// leeg, waardoor de online functies simpelweg uit staan.
export const RUNTIME_ANON_KEY = '';
