#!/bin/sh

script_dir="$( cd "$( dirname "$0"  )" && pwd  )"
project_dir=$(dirname "$script_dir")
systype=$(uname -s)

cd $project_dir;
app_ver=$(node -p "require('./package.json').version")
git_committish=$(git log --format="%h" -n 1)

pack_dist() {
  rm -rf ./tmp/ && mkdir -p ./tmp/ && \
  zip -r ./tmp/Rabby_v${app_ver}_debug.${git_committish}.zip ./dist
}

build() {
  yarn build:debug;
}

if [ "$1" = "--pack-only" ]; then
  pack_dist;
else
  build && pack_dist;
fi

case $systype in
  "Darwin")
    open ./tmp/
    ;;
  MSYS_NT*|MINGW*)
    start "" .\\tmp
    ;;
esac