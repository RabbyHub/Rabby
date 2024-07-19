#!/usr/bin/env sh
set -e

script_dir="$( cd "$( dirname "$0"  )" && pwd  )"
project_dir=$(dirname "$script_dir")

export VERSION=$(node --eval="process.stdout.write(require('./package.json').version)");
export RABBYX_GIT_HASH=$(git rev-parse --short HEAD);
export CURRENT_TIME=$(date +%Y%m%d%H%M%S);

TARGET_FILE=$project_dir/tmp/RabbyDebug-v${VERSION}-${RABBYX_GIT_HASH}.zip;

echo "[pack] VERSION is $VERSION";

# for mingw, download zip.exe from http://stahlworks.com/dev/index.php?tool=zipunzip and add to your path
if [ -z $NO_BUILD ]; then
    yarn;
    yarn build:debug;
fi
echo "[pack] built finished";

DIST_DIR=$project_dir/dist;

rm -rf $project_dir/tmp/ && mkdir -p $project_dir/tmp/;
if [ -d $DIST_DIR ]; then
    cd $DIST_DIR;
    zip -r $TARGET_FILE ./*
else
    echo "[pack] dist dir not found: $DIST_DIR";
fi

cd $project_dir;
cp $TARGET_FILE $project_dir/tmp/RabbyDebug-latest.zip

DOWNLOAD_URL="https://download.rabby.io/autobuild/RabbyDebug-v${VERSION}-${RABBYX_GIT_HASH}.zip"

# upload to storage
if [ -z $NO_UPLOAD ]; then
    INVALIDATION_BASE="/autobuild/RabbyDebug-v${VERSION}-${RABBYX_GIT_HASH}*"
    JSON="{'Paths': {'Quantity': 2,'Items': ['$INVALIDATION_BASE', '/autobuild/RabbyDebug-latest.zip']}, 'CallerReference': 'cli-rabbyx-${VERSION}-${RABBYX_GIT_HASH}-${CURRENT_TIME}'}"
    echo $(node -e "console.log(JSON.stringify($JSON, null, 2))") > "$project_dir/tmp/inv-batch.json"

    if [ ! -z $CI ]; then
        QUIET_PARASM="--quiet"
    else
        QUIET_PARASM=""
    fi
    aws s3 cp $QUIET_PARASM $project_dir/tmp/ s3://$RABBY_BUILD_BUCKET/rabby/autobuild/ --recursive --exclude="*" --include "*.zip" --acl public-read
    echo "[pack] uploaded. DOWNLOAD_URL is $DOWNLOAD_URL";

    if [ ! -z $CI ]; then
        node ./scripts/notify-lark.js "$DOWNLOAD_URL"
    else
        aws cloudfront create-invalidation $QUIET_PARASM --distribution-id E1F7UQCCQWLXXZ --invalidation-batch file://./tmp/inv-batch.json
        echo "[pack] invalidation finished.";
    fi
fi

echo "[pack] finished.";
