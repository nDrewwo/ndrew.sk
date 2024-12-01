import os
import re

def to_camel_case(text):
    """Convert a string to camelCase."""
    words = text.split()
    return words[0].lower() + ''.join(word.capitalize() for word in words[1:])

def sanitize_filename(filename):
    """Remove invalid characters for filenames."""
    return re.sub(r'[<>:"/\\|?*]', '', filename)

def convert_note_to_html(note):
    lines = note.split("\n")
    title = ""
    content = ""
    
    for line in lines:
        if line.startswith("# "):
            title = line[2:].strip()
        elif line.startswith("## "):
            content += f"<h2>{line[3:].strip()}</h2>\n"
        elif line.startswith("[") and "](" in line:
            text, link = line.split("](", 1)
            text = text[1:].strip()
            link = link[:-1].strip()
            content += f'<a href="{link}" class="href">{text}</a><br>\n'
        elif line.strip():
            content += f"<p>{line.strip()}</p>\n"

    html_template = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{title}</title>
        <link rel="stylesheet" href="data/css/article.css">
        <link rel="icon" href="data/assets/icon.png">
    </head>
    <body>
        <main>
            <div class="window">
                <div class="topbar">
                    <div class="nametag">
                        <h1>{title}</h1>
                    </div>
                    <img src="data/assets/exit.png" alt="" class="exiticon">
                </div>
                <div class="windowContent">
                    {content}
                </div>
            </div>
        </main>
    </body>
    </html>
    """
    return title, html_template

# Directories
input_folder = "markdown"  # Source folder containing shitpost and reviews subfolders
output_folder = "web/articles"  # Base output folder
os.makedirs(output_folder, exist_ok=True)  # Ensure base output folder exists

# Subfolders to process
subfolders = {
    "shitpost": output_folder,
    "reviews": os.path.join(output_folder, "reviews")
}

# Ensure subfolders exist in the output folder
for _, output_subfolder in subfolders.items():
    os.makedirs(output_subfolder, exist_ok=True)

# Process each subfolder
for subfolder, destination in subfolders.items():
    input_subfolder_path = os.path.join(input_folder, subfolder)
    
    for filename in os.listdir(input_subfolder_path):
        if filename.endswith(".md"):
            input_file_path = os.path.join(input_subfolder_path, filename)
            
            # Read the content of the .md file
            with open(input_file_path, "r", encoding="utf-8") as file:
                note_content = file.read()
            
            # Convert the note content to HTML and extract the title
            title, html_content = convert_note_to_html(note_content)
            
            # Convert title to camelCase and sanitize it
            camel_case_name = to_camel_case(title)
            safe_filename = sanitize_filename(camel_case_name)
            output_filename = safe_filename + ".html"
            output_file_path = os.path.join(destination, output_filename)
            
            # Save the HTML content to the output file
            with open(output_file_path, "w", encoding="utf-8") as file:
                file.write(html_content)

            print(f"Generated HTML for '{filename}' -> '{output_file_path}'")

print(f"Markdown files processed successfully! Check the 'web/articles' folder.")
