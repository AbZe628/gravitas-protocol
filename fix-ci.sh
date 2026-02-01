#!/bin/bash
# Script to update gas snapshot and prepare CI fix

# 1. Update gas snapshot
forge snapshot

# 2. Add and commit all changes except workflow (to be handled manually)
git add .
git commit -m "chore: update gas snapshots and finalize security fixes"

# 3. Push changes
git push origin main
