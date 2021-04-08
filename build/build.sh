#! /bin/sh

set -e

rm -rf dist/*
cp -r src/_raw/* dist

params=()
if [[ $1 == 'dev' ]]; then
    params+=(--env config=dev)
fi

webpack --progress "${params[@]}"


