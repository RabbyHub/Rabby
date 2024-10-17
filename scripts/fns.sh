# read last_md5_value
get_md5() {
    local TARGET_FILE=$1
    if [ ! -f $TARGET_FILE ]; then
        echo "[get_md5] file not found: $TARGET_FILE"
        exit 1
    fi
    local systype=$(uname -s)
    if [ $systype = "Darwin" ]; then
        export last_md5_value=$(md5 -q $TARGET_FILE);
    elif [ $systype = "Linux" ]; then
        export last_md5_value=$(md5sum $TARGET_FILE | awk '{ print $1 }');
    fi
}