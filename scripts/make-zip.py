import zipfile
import os
import sys

def zip_dir(source_dir, output_zip):
    with zipfile.ZipFile(output_zip, 'w', zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(source_dir):
            for file in files:
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, source_dir)
                zf.write(full_path, rel_path)
    print(f"Successfully created {output_zip}")

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python make-zip.py <source_dir> <output_zip>")
        sys.exit(1)
    zip_dir(sys.argv[1], sys.argv[2])
