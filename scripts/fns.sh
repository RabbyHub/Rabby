script_dir="$( cd "$( dirname "$0"  )" && pwd  )"
project_dir=$(dirname "$script_dir")
systype=$(uname -s)

pack_dist_to_zip() {
    local entry_dir=$project_dir;
    local files=$(find "$entry_dir/dist" -type f | sort)
    local dest_zip=$1

    if [ -z $dest_zip ]; then
        echo "dest_zip is required"
        exit 1
    fi

    if [ -z $build_type ]; then
        build_type="debug"
    fi

    git_committish=$(git log --format="%h" -n 1)
    # e.g. '2024-01-01 01:01:01 +0000'
    git_tz_time_linux=$(git log --format="%cd" -n 1 --date=format:'%Y-%m-%d %H:%M:%S %z')
    # SetFile format, e.g. '01/01/2024 01:01:01 +0000'
    git_tz_time_setfile=$(git log --format="%cd" -n 1 --date=format:'%m/%d/%Y %H:%M:%S %z')

    for file in $files; do
        if [ "$systype" = "Darwin" ]; then
            SetFile -d "$git_tz_time_setfile" "$file"
            SetFile -m "$git_tz_time_setfile" "$file"
        elif [ "$systype" = "Linux" ]; then
            touch -a -d "$git_tz_time_linux" "$file"
            touch -m -d "$git_tz_time_linux" "$file"
        fi

        local relname=${file#$entry_dir/}
        zip -X "$dest_zip" "$relname"
    done

    echo "git_tz_time_setfile is $git_tz_time_setfile"
    echo "git_tz_time_linux is $git_tz_time_linux"
}