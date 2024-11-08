#!/usr/bin/env bash
set -e

script_dir="$( cd "$( dirname "$0"  )" && pwd  )"
project_dir=$(dirname "$script_dir")
systype=$(uname -s)

. $script_dir/fns.sh --source-only

# debug, pro
if [ -z $build_type ]; then
  build_type="debug"
fi

VERSION=$(node --eval="process.stdout.write(require('./package.json').version)");
RABBY_GIT_HASH=$(git rev-parse --short HEAD);
CURRENT_TIME=$(date +%Y%m%d%H%M%S);

TARGET_FILE=$project_dir/tmp/RabbyDebug-v${VERSION}-${RABBY_GIT_HASH}.zip;

echo "[pack] VERSION is $VERSION";

# for mingw, download zip.exe from http://stahlworks.com/dev/index.php?tool=zipunzip and add to your path
if [ -z $NO_BUILD ]; then
    yarn;
    yarn build:${build_type};
fi
echo "[pack] built finished";

cd $project_dir;
rm -rf $project_dir/tmp/*.zip && mkdir -p $project_dir/tmp/;
git_utc0_time_linux=$(TZ=UTC0 git show --quiet --date='format-local:%Y-%m-%dT%H:%M:%S+00:00' --format="%cd")
node $script_dir/pkg-zip.js $project_dir/dist $TARGET_FILE $git_utc0_time_linux;

cd $project_dir;

get_md5 $TARGET_FILE;
target_md5_value=$last_md5_value;
echo "[pack] (md5: $TARGET_FILE) $target_md5_value";

# upload to storage
if [ -z $NO_UPLOAD ]; then
    DOWNLOAD_URL="https://download.rabby.io/autobuild/RabbyDebug-$CURRENT_TIME/RabbyDebug-v${VERSION}-${RABBY_GIT_HASH}.zip"

    if [ ! -z $CI ]; then
        QUIET_PARASM="--quiet"
    else
        QUIET_PARASM=""
    fi

    echo "[pack] start upload...";
    aws s3 cp $QUIET_PARASM $project_dir/tmp/ s3://$RABBY_BUILD_BUCKET/rabby/autobuild/RabbyDebug-$CURRENT_TIME --recursive --exclude="*" --include "*.zip" --acl public-read
    echo "[pack] uploaded. DOWNLOAD_URL is $DOWNLOAD_URL";

    if [ ! -z $notify_lark ]; then
        echo "[pack] update latest link...";

        node ./scripts/notify-lark.js "$DOWNLOAD_URL" "$target_md5_value"
    else
        echo "[pack] skip notify.";
    fi
fi

echo "[pack] finished.";
