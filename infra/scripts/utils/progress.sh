#!/bin/bash
# Stylish progress bar utility

progress_bar() {
    local wait_secs=$1
    local check_cmd=$2
    local ready=0
    local width=30   # width of the bar

    for i in $(seq 1 $wait_secs); do
        if eval "$check_cmd" >/dev/null 2>&1; then
            ready=1
        fi

        if [ "$ready" -eq 1 ]; then
            # instantly fill bar to 100%
            local bar=$(printf '█%.0s' $(seq 1 $width))
            echo -ne "\r\033[1;32m[${bar}] 100%\033[0m\n"
            return 0
        fi

        local percent=$(( i * 100 / wait_secs ))
        local filled=$(( i * width / wait_secs ))

        local bar=$(printf '█%.0s' $(seq 1 $filled))
        local spaces=$(printf '░%.0s' $(seq 1 $((width - filled))))

        # color transition: <50% yellow, >=50% green
        if [ "$percent" -lt 50 ]; then
            color="\033[1;33m" # yellow
        else
            color="\033[1;32m" # green
        fi

        echo -ne "\r${color}[${bar}${spaces}] ${percent}%\033[0m"
        sleep 1
    done

    echo ""
    return 1
}
