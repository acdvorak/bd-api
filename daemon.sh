#!/bin/bash

forever=node_modules/forever/bin/forever
script=app.js
pidfile=run/daemon.pid

mkdir -p logs run

if [ "$1" = 'stop' ]; then
    "$forever" stop "$script"
    rm -f "$pidfile"
else
    "$forever" \
        -a \
        -l logs/forever.log \
        -o logs/out.log \
        -e logs/error.log \
        --spinSleepTime 60000 \
        --pidFile "$pidfile" \
        start "$script"
fi
