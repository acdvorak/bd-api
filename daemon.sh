#!/bin/bash

node_modules/forever/bin/forever \
    -l logs/forever.log \
    -o logs/out.log \
    -e logs/error.log \
    --spinSleepTime 60000 \
    start app.js
