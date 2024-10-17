#!/usr/bin/env bash

script_dir="$( cd "$( dirname "$0"  )" && pwd  )"
project_dir=$(dirname "$script_dir")
systype=$(uname -s)
build_type="debug"

. $script_dir/fns.sh --source-only

cd $project_dir;
app_ver=$(node -p "require('./package.json').version")

pack_dist() {
  rm -rf ./tmp/*.zip && mkdir -p ./tmp/

  local git_committish=$(git log --format="%h" -n 1)
  local target_file=$project_dir/tmp/Rabby_v${app_ver}_debug.${git_committish}.zip
  local git_utc0_time_linux=$(TZ=UTC0 git show --quiet --date='format-local:%Y-%m-%dT%H:%M:%S+00:00' --format="%cd")

  node $script_dir/fns.js $project_dir/dist $target_file $git_utc0_time_linux;

  get_md5 $target_file;
  echo ""
  echo "[pack] (md5: $target_file) $last_md5_value";
}

build() {
  yarn build:${build_type};
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