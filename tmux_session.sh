#!/bin/bash

# tmux session script for Android Bitmap Font Editor development
# Creates a session with nvim, opencode, expo start, and lazygit

SESSION_NAME="android-font-editor"

# Check if session already exists
if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    echo "Session '$SESSION_NAME' already exists. Attaching..."
    tmux attach-session -t "$SESSION_NAME"
    exit 0
fi

# Create new session
tmux new-session -d -s "$SESSION_NAME"

# Window 1: nvim (left) and opencode (right)
tmux rename-window -t "$SESSION_NAME:0" "editor"
tmux send-keys -t "$SESSION_NAME:0" "nvim ." C-m
tmux split-window -h -t "$SESSION_NAME:0"
tmux send-keys -t "$SESSION_NAME:0.1" "opencode" C-m

# Window 2: expo start
tmux new-window -t "$SESSION_NAME:1" -n "expo"
tmux send-keys -t "$SESSION_NAME:1" "pnpm expo start" C-m

# Window 3: lazygit
tmux new-window -t "$SESSION_NAME:2" -n "git"
tmux send-keys -t "$SESSION_NAME:2" "lazygit" C-m

# Select first window and attach
tmux select-window -t "$SESSION_NAME:0"
tmux attach-session -t "$SESSION_NAME"

echo "Session '$SESSION_NAME' created and attached!"