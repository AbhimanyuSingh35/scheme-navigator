import os
import json
import fitz  # PyMuPDF

# Updated paths based on your structure
PDF_FOLDER = "./elastic/text_data"
PROCESSED_FOLDER = "./elastic/processed_data"
OUTPUT_FILE = os.path.join(PROCESSED_FOLDER, "corpus.json")

def build_and_save_chunks(words_per_chunk=300):
    corpus_data = []
    
    # 1. Automatically make directories for the chunked/preprocessed text
    os.makedirs(PROCESSED_FOLDER, exist_ok=True)
    print(f"Ensured output directory exists at: {PROCESSED_FOLDER}")
    
    # 2. Check if the input folder exists
    if not os.path.exists(PDF_FOLDER):
        print(f"Error: Could not find the PDF folder at {PDF_FOLDER}")
        return

    print("Reading PDFs and creating chunks...")
    for filename in os.listdir(PDF_FOLDER):
        if filename.endswith(".pdf"):
            filepath = os.path.join(PDF_FOLDER, filename)
            try:
                # Read the PDF
                doc = fitz.open(filepath)
                full_text = "".join([page.get_text() + " " for page in doc])
                
                # Chunk the text
                words = full_text.split()
                for i in range(0, len(words), words_per_chunk):
                    chunk_text = " ".join(words[i:i + words_per_chunk])
                    corpus_data.append({
                        "source": filename,
                        "text": chunk_text
                    })
            except Exception as e:
                print(f"Failed to read {filename}: {e}")
                
    # 3. Save to JSON
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(corpus_data, f, ensure_ascii=False, indent=2)
    
    print(f"Successfully saved {len(corpus_data)} chunks to {OUTPUT_FILE}")

if __name__ == "__main__":
    build_and_save_chunks()