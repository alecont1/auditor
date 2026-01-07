#!/bin/bash
TOKEN="eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJjOGRhYzZjOC04ODVkLTQyMjctYmQxZi03NTc3YmYyNzcxMzgiLCJlbWFpbCI6ImFkbWluQHRlc3Rjb21wYW55LmNvbSIsInJvbGUiOiJBRE1JTiIsImNvbXBhbnlJZCI6InRlc3QtY29tcGFueS0xIiwiaWF0IjoxNzY3ODE0Nzg5LCJpc3MiOiJhdWRpdGVuZy1hcGkiLCJhdWQiOiJhdWRpdGVuZy13ZWIiLCJleHAiOjE3Njg0MTk1ODl9.GgRanKNnjWcuxM2FvKl_uR54960O8rzhURXvkuFEAwk"

echo "Testing rate limiting with 12 requests..."
echo ""

for i in 1 2 3 4 5 6 7 8 9 10 11 12; do
  STATUS=$(curl -s -o /tmp/ratelimit_response.txt -w "%{http_code}" http://localhost:3001/api/analysis -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"filename": "test.pdf", "testType": "GROUNDING", "pdfSizeBytes": 50000}')
  BODY=$(cat /tmp/ratelimit_response.txt)
  echo "Request $i: HTTP $STATUS"
  if [ "$STATUS" = "429" ]; then
    echo "  Response: $BODY"
  fi
done
