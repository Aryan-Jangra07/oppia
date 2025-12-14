#!/bin/bash

echo "Stopping Redis (6379)..."
sudo kill -9 $(sudo lsof -t -i:6379) 2>/dev/null

echo "Stopping Datastore Emulator (8089)..."
sudo kill -9 $(sudo lsof -t -i:8089) 2>/dev/null

echo "All Oppia ports freed!"
