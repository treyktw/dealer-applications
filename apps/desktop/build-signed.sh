#!/bin/bash

export VITE_WEB_URL_PROD="https://dealer.universalautobrokers.net"
export VITE_CLERK_PUBLISHABLE_KEY="pk_test_dGhvcm91Z2gtZWFnbGUtMTcuY2xlcmsuYWNjb3VudHMuZGV2JA"
export VITE_CONVEX_URL="https://greedy-kingfisher-79.convex.cloud"

export ENABLE_CODE_SIGNING=true
export APPLE_SIGNING_IDENTITY="Developer ID Application: Trey Murray (3DY9RS58P2)"
export APPLE_ID="tonystrax@gmail.com"
export APPLE_PASSWORD="bntr-bjnz-htlf-sezz"  # Your app-specific password
export APPLE_TEAM_ID="3DY9RS58P2"

pnpm tauri build