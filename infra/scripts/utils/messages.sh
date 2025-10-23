#!/bin/bash

RESET='\033[0m'
BOLD='\033[1m'

FG_GREEN='\033[38;5;82m'
FG_BLUE='\033[38;5;39m'
FG_YELLOW='\033[38;5;220m'
FG_RED='\033[38;5;196m'
FG_GREY='\033[38;5;245m'

# Core framed log printer (dynamic width)
log() {
    local label="$1"
    local color_fg="$2"
    shift 2
    local message="$*"

    # full text = label + message
    local text="${label} ${message}"
    local width=${#text}

    # draw frame dynamically
    local line=$(printf '═%.0s' $(seq 1 $((width+2))))

    echo -e "${color_fg}${BOLD}╔${line}╗${RESET}"
    echo -e "${color_fg}${BOLD}║ ${RESET}${color_fg}${text}${RESET}${color_fg}${BOLD} ║${RESET}"
    echo -e "${color_fg}${BOLD}╚${line}╝${RESET}"
}

success()    { log "SUCCESS" "$FG_GREEN"  "$@"; }
info()       { log "INFO   " "$FG_BLUE"   "$@"; }
warning()    { log "WARNING" "$FG_YELLOW" "$@"; }
error()      { log "ERROR  " "$FG_RED"    "$@"; }

system_up()   { log "SYSTEM " "$FG_GREEN"  "System is up and running"; }
system_down() { log "SYSTEM " "$FG_YELLOW" "System stopped"; }
building()    { log "BUILD  " "$FG_BLUE"   "Building services..."; }

debug()       { log "DEBUG  " "$FG_GREY"   "$@"; }

