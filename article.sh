#!/bin/bash

# Helper Functions
to_camel_case() {
    local text="$1"
    # Convert text to camelCase
    echo "$text" | awk '{for (i=1;i<=NF;i++) {if (i==1) printf tolower($i); else printf toupper(substr($i,1,1))tolower(substr($i,2))}}'
}

sanitize_filename() {
    local filename="$1"
    # Remove invalid characters for filenames
    echo "$filename" | sed 's/[<>:"/\\|?*]//g'
}

convert_note_to_html() {
    local note_content="$1"
    local title=""
    local content=""
    
    while IFS= read -r line; do
        if [[ "$line" =~ ^"# " ]]; then
            title="${line:2}"
        elif [[ "$line" =~ ^"## " ]]; then
            content+="<h2>${line:3}</h2>\n"
        elif [[ "$line" =~ ^\[.*\]\(.*\) ]]; then
            text=$(echo "$line" | sed -n 's/^\[\(.*\)\](.*$/\1/p')
            link=$(echo "$line" | sed -n 's/^.*](\(.*\))$/\1/p')
            content+="<a href=\"$link\" class=\"href\">$text</a><br>\n"
        elif [[ -n "$line" ]]; then
            content+="<p>${line}</p>\n"
        fi
    done <<< "$note_content"

    html_template=$(cat <<EOF
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <link rel="stylesheet" href="data/css/article.css">
    <link rel="icon" href="data/assets/icon.png">
</head>
<body>
    <main>
        <div class="window">
            <div class="topbar">
                <div class="nametag">
                    <h1>${title}</h1>
                </div>
                <img src="data/assets/exit.png" alt="" class="exiticon">
            </div>
            <div class="windowContent">
                ${content}
            </div>
        </div>
    </main>
</body>
</html>
EOF
    )
    echo -e "$html_template"
}

# Directories
input_folder="markdown"
output_folder="web/articles"
mkdir -p "$output_folder"

# Subfolders to process
declare -A subfolders=(
    ["shitpost"]="$output_folder"
    ["reviews"]="$output_folder/reviews"
)

# Ensure subfolders exist in the output folder
for folder in "${!subfolders[@]}"; do
    mkdir -p "${subfolders[$folder]}"
done

# Process each subfolder
for subfolder in "${!subfolders[@]}"; do
    input_subfolder_path="$input_folder/$subfolder"
    destination="${subfolders[$subfolder]}"

    for filepath in "$input_subfolder_path"/*.md; do
        if [[ -f "$filepath" ]]; then
            # Read content from markdown file
            note_content=$(<"$filepath")
            
            # Convert content to HTML
            html_content=$(convert_note_to_html "$note_content")

            # Extract the title from the first line
            title=$(echo "$note_content" | grep -m1 '^# ' | cut -c3-)

            # Convert title to camelCase and sanitize
            camel_case_name=$(to_camel_case "$title")
            safe_filename=$(sanitize_filename "$camel_case_name")
            output_file_path="$destination/${safe_filename}.html"
            
            # Write HTML content to file
            echo -e "$html_content" > "$output_file_path"
            echo "Generated HTML for '$(basename "$filepath")' -> '$output_file_path'"
        fi
    done
done

echo "Markdown files processed successfully! Check the 'web/articles' folder."
