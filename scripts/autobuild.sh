#!/usr/bin/env bash
set -e

script_dir="$( cd "$( dirname "$0"  )" && pwd  )"
project_dir=$(dirname "$script_dir")

. $script_dir/fns.sh --source-only

export VERSION=$(node --eval="process.stdout.write(require('./package.json').version)");
export RABBY_GIT_HASH=$(git rev-parse --short HEAD);
export CURRENT_TIME=$(date +%Y%m%d%H%M%S);

TARGET_FILE=$project_dir/tmp/RabbyDebug-v${VERSION}-${RABBY_GIT_HASH}.zip;

echo "[pack] VERSION is $VERSION";

# for mingw, download zip.exe from http://stahlworks.com/dev/index.php?tool=zipunzip and add to your path
if [ -z $NO_BUILD ]; then
    yarn;
    yarn build:debug;
fi
echo "[pack] built finished";

cd $project_dir;
rm -f $TARGET_FILE;
pack_dist_to_zip $TARGET_FILE;

cd $project_dir;

md5_value=$(md5 -q $TARGET_FILE);
echo "[pack] (md5: $TARGET_FILE) $md5_value";

# upload to storage
if [ -z $NO_UPLOAD ]; then
    DOWNLOAD_URL="https://download.rabby.io/autobuild/RabbyDebug-$CURRENT_TIME/RabbyDebug-v${VERSION}-${RABBY_GIT_HASH}.zip"

    if [ ! -z $CI ]; then
        QUIET_PARASM="--quiet"
    else
        QUIET_PARASM=""
    fi

    echo "[pack] start upload...";
    # aws s3 cp $QUIET_PARASM $project_dir/tmp/ s3://$RABBY_BUILD_BUCKET/rabby/autobuild/RabbyDebug-$CURRENT_TIME --recursive --exclude="*" --include "*.zip" --acl public-read
    echo "[pack] uploaded. DOWNLOAD_URL is $DOWNLOAD_URL";

    if [ ! -z $notify_lark ]; then
        echo "[pack] update latest link...";

        node ./scripts/notify-lark.js "$DOWNLOAD_URL" "$md5_value"
    else
        echo "[pack] skip notify.";
    fi
fi

echo "[pack] finished.";
