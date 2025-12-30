#!/bin/bash
cd /home/kavia/workspace/code-generation/simple-to-do-list-app-302026-302056/frontend_app
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

