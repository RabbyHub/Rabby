#!/bin/sh

script_dir="$( cd "$( dirname "$0"  )" && pwd  )"
project_dir=$(dirname "$script_dir")
systype=$(uname -s)
if [ -z $build_type ]; then
  build_type="debug"
fi

cd $project_dir;
app_ver=$(node -p "require('./package.json').version")
git_committish=$(git log --format="%h" -n 1)
# e.g. '2024-01-01 01:01:01 +0000'
git_tz_time_linux=$(git log --format="%cd" -n 1 --date=format:'%Y-%m-%d %H:%M:%S %z')
# SetFile format, e.g. '01/01/2024 01:01:01 +0000'
git_tz_time_setfile=$(git log --format="%cd" -n 1 --date=format:'%m/%d/%Y %H:%M:%S %z')

pack_dist() {
  rm -rf $project_dir/tmp/*.zip && mkdir -p $project_dir/tmp/;

  local entry_dir=$project_dir;

  if [ ! -d "$entry_dir/dist" ]; then
    echo "dist not exists"
    exit 1
  fi

  local files=$(find "$entry_dir/dist" -type f | sort)
  local dest_zip="$project_dir/tmp/Rabby_v${app_ver}_${build_type}.${git_committish}.zip"
  for file in $files; do
    if [ "$systype" = "Darwin" ]; then
      SetFile -d "$git_tz_time_setfile" "$file"
      SetFile -m "$git_tz_time_setfile" "$file"
    elif [ "$systype" = "Linux" ]; then
      touch -c -d "$git_tz_time_linux" "$file"
      touch -c -m "$git_tz_time_linux" "$file"
    fi

    local relname=${file#$entry_dir/}
    zip -X "$dest_zip" "$relname"
  done

  echo "git_tz_time_setfile is $git_tz_time_setfile"
  echo "git_tz_time_linux is $git_tz_time_linux"
  cd $project_dir;

}

build() {
  yarn build:${build_type};
}

if [ "$1" = "--pack-only" ]; then
  pack_dist;
else
  build && pack_dist;
fi

# case $systype in
#   "Darwin")
#     open ./tmp/
#     ;;
#   MSYS_NT*|MINGW*)
#     start "" .\\tmp
#     ;;
# esac