@echo off
echo Checking Environment > env_check.log
node -v >> env_check.log 2>&1
npm -v >> env_check.log 2>&1
echo Directory Content: >> env_check.log
dir >> env_check.log 2>&1
