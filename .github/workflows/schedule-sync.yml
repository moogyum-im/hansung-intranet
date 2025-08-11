name: Invoke Supabase Edge Functions Hourly

on:
  schedule:
    - cron: '5 * * * *'
  workflow_dispatch:

jobs:
  # 첫 번째 Job: 조경수 DB 동기화
  invoke-tree-sales-sync:
    runs-on: ubuntu-latest
    steps:
      - name: Invoke Tree Sales Sync Function
        run: |
          curl -i -X POST "${{ secrets.SUPABASE_PROJECT_URL }}/functions/v1/sync-tree-sales" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
            -H "apikey: ${{ secrets.SUPABASE_ANON_KEY }}" \
            -H "Content-Type: application/json"

  # 두 번째 Job: 공사 현황 DB 동기화
  invoke-construction-sites-sync:
    runs-on: ubuntu-latest
    steps:
      - name: Invoke Construction Sites Sync Function
        run: |
          curl -i -X POST "${{ secrets.SUPABASE_PROJECT_URL }}/functions/v1/sync-construction-sites" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
            -H "apikey: ${{ secrets.SUPABASE_ANON_KEY }}" \
            -H "Content-Type: application/json"