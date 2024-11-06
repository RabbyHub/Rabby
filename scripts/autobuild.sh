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
TARGET_FILE_MV2=$project_dir/tmp/RabbyDebugMV2-v${VERSION}-${RABBY_GIT_HASH}.zip;

echo "[pack] VERSION is $VERSION";

# for mingw, download zip.exe from http://stahlworks.com/dev/index.php?tool=zipunzip and add to your path
if [ -z $NO_BUILD ]; then
    yarn;
    yarn build:${build_type};
fi
echo "[pack] built mv3 finished";

if [ -z $NO_BUILD ]; then
    yarn build:${build_type}:mv2;
fi
echo "[pack] built mv2 finished";


cd $project_dir;
rm -rf $project_dir/tmp/*.zip && mkdir -p $project_dir/tmp/;
git_utc0_time_linux=$(TZ=UTC0 git show --quiet --date='format-local:%Y-%m-%dT%H:%M:%S+00:00' --format="%cd")
node $script_dir/fns.js $project_dir/dist $TARGET_FILE $git_utc0_time_linux true;
node $script_dir/fns.js $project_dir/dist-mv2 $TARGET_FILE_MV2 $git_utc0_time_linux false;

cd $project_dir;

get_md5 $TARGET_FILE;
target_md5_value=$last_md5_value;
echo "[pack] mv3 (md5: $TARGET_FILE) $target_md5_value";

get_md5 $TARGET_FILE_MV2;
target_md5_value_mv2=$last_md5_value;
echo "[pack] mv2 (md5: $TARGET_FILE_MV2) $target_md5_value_mv2";

# upload to storage
if [ -z $NO_UPLOAD ]; then
    DOWNLOAD_URL="https://download.rabby.io/autobuild/RabbyDebug-$CURRENT_TIME/RabbyDebug-v${VERSION}-${RABBY_GIT_HASH}.zip"
    DOWNLOAD_URL_MV2="https://download.rabby.io/autobuild/RabbyDebug-$CURRENT_TIME/RabbyDebugMV2-v${VERSION}-${RABBY_GIT_HASH}.zip"

    if [ ! -z $CI ]; then
        QUIET_PARASM="--quiet"
    else
        QUIET_PARASM=""
    fi

    echo "[pack] start upload...";
    aws s3 cp $QUIET_PARASM $project_dir/tmp/ s3://$RABBY_BUILD_BUCKET/rabby/autobuild/RabbyDebug-$CURRENT_TIME --recursive --exclude="*" --include "*.zip" --acl public-read
    echo "[pack] uploaded. mv3 DOWNLOAD_URL is $DOWNLOAD_URL";
    echo "[pack] uploaded. mv2 DOWNLOAD_URL is $DOWNLOAD_URL_MV2";

    if [ ! -z $notify_lark ]; then
        echo "[pack] update latest link...";

        node ./scripts/notify-lark.js "$DOWNLOAD_URL" "$target_md5_value"
        node ./scripts/notify-lark.js "$DOWNLOAD_URL_MV2" "$target_md5_value_mv2"
    else
        echo "[pack] skip notify.";
    fi
fi

echo "[pack] finished.";
