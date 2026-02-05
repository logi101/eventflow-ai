---
name: linguistic-editor
description: "Comprehensive linguistic content editing for books and long-form content with multi-language support (Hebrew, English). Provides spelling/grammar correction, typography optimization, layout design, text structure management, and readability enhancement. Use when editing manuscripts, books, articles, or professional documents requiring precise linguistic quality and visual formatting."
license: Proprietary. LICENSE.txt has complete terms
---

# Linguistic Editor

## Overview

A comprehensive editing system for books and long-form content that combines linguistic precision with visual excellence. Handles multi-language content (Hebrew RTL, English LTR), corrects spelling and grammar, optimizes typography and layout, manages document structure (chapters, scenes, sections), and ensures readability and style consistency.

## Core Capabilities

### 1. Spelling & Grammar Correction

**Multi-Language Support:**
- **Hebrew**: Proper nikud (vocalization), correct spelling with/without diacritics, modern vs. biblical forms
- **English**: American/British spelling variations, proper punctuation, grammatical structures
- **Mixed Language**: Documents with both Hebrew and English sections

**Workflow:**
1. Identify document language(s)
2. Run language-specific spell check using `scripts/spell_check.py`
3. Analyze grammar using `scripts/grammar_check.py`
4. Review suggestions with context preservation
5. Apply corrections systematically by section

**Key Principles:**
- Always preserve author's voice and style
- Flag unusual terms for review (names, technical terms)
- Respect language-specific punctuation rules (Hebrew uses geresh, gershayim)
- Maintain consistency in terminology throughout document

**Reference:** See `references/hebrew_rules.md` and `references/english_rules.md` for language-specific guidelines.

### 2. Typography Optimization

**Font Selection:**
- **Hebrew Books**: David CLM, Frank Ruehl CLM, Alef, Noto Serif Hebrew
- **English Books**: Garamond, Baskerville, Caslon, Minion Pro
- **Mixed Language**: Font pairing for bilingual documents
- **Digital vs. Print**: Consider medium-specific requirements

**Typography Elements:**
- Font size hierarchy (title, headings, body, captions)
- Line height (leading) for optimal readability (1.4-1.6 for body text)
- Character spacing (kerning) for professional appearance
- Word spacing for balanced text flow
- Drop caps for chapter openings (if appropriate)

**Workflow:**
1. Determine book genre and target audience
2. Select appropriate font families from `assets/fonts/`
3. Define typography scale (title: 24-36pt, heading: 16-20pt, body: 11-12pt)
4. Set line height and spacing values
5. Apply styles consistently using `scripts/format_text.py`

**Reference:** See `references/typography_guide.md` for detailed typography best practices.

### 3. Color & Visual Design

**Color Schemes for Books:**
- **Body Text**: Near-black (#1a1a1a) for reduced eye strain, not pure black
- **Headings**: Can use accent colors for digital versions (print: same as body)
- **Highlights/Quotes**: Subtle background colors or borders
- **Page Elements**: Running headers, page numbers (muted gray)

**Digital-Specific Enhancements:**
- Hyperlinks (subtle blue/purple)
- Interactive elements (buttons, navigation)
- Code blocks (syntax highlighting if technical book)
- Side notes and annotations

**Print Considerations:**
- Grayscale compatibility
- CMYK color space for printing
- Ink coverage for cost efficiency

### 4. Layout & Text Structure

**Page Layout Elements:**
- **Margins**: Inner (gutter), outer, top, bottom appropriate for binding
- **Headers/Footers**: Running headers, page numbers, chapter titles
- **Paragraph Spacing**: Space between paragraphs vs. indentation
- **Text Alignment**: Justified (books), left-aligned (certain styles)
- **Orphans/Widows**: Eliminate single lines at page breaks

**Text Flow Optimization:**
1. Analyze document structure using `scripts/structure_analyzer.py`
2. Balance page density (text vs. white space)
3. Place images and figures strategically
4. Ensure consistent spacing throughout
5. Handle RTL (Hebrew) vs. LTR (English) properly

**Reference:** See `references/book_layout_guide.md` for professional layout standards.

### 5. Document Structure Management

**Hierarchical Organization:**
- **Book Level**: Title, copyright, dedication, table of contents
- **Part Level**: Major divisions (Part I, Part II)
- **Chapter Level**: Chapter titles, numbers, epigraphs
- **Section Level**: Scene breaks, section headings
- **Paragraph Level**: Body text, dialogue, quotes

**Scene & Section Division:**
- Identify natural break points in narrative
- Use visual separators (asterisks, ornamental breaks, blank lines)
- Maintain consistent scene break styling
- Number or title sections appropriately

**Structural Workflow:**
1. Map existing structure with `scripts/structure_analyzer.py`
2. Identify inconsistencies or unclear divisions
3. Propose improved structure with clear hierarchy
4. Implement changes preserving content integrity
5. Generate updated table of contents

**Chapter/Section Formatting:**
- Chapter openings: Special formatting, drop caps, spacing
- Section breaks: Visual markers, spacing consistency
- Subsections: Heading hierarchy (H1, H2, H3)

### 6. Readability Enhancement

**Readability Metrics:**
- **Flesch Reading Ease**: Target score based on audience (60-70 for general audience)
- **Flesch-Kincaid Grade Level**: Appropriate education level
- **Sentence Length**: Vary for rhythm (15-20 words average)
- **Word Complexity**: Balance simple/complex vocabulary
- **Paragraph Length**: 3-5 sentences for readability

**Analysis Workflow:**
1. Run `scripts/readability_scorer.py` on manuscript
2. Identify difficult sections (low readability scores)
3. Analyze sentence structure and vocabulary
4. Suggest improvements: shorter sentences, simpler words, active voice
5. Preserve author's style while improving clarity

**Language-Specific Considerations:**
- **Hebrew**: Longer words are natural; adjust metrics accordingly
- **English**: Watch for passive voice overuse
- **Both**: Maintain variety in sentence structure

### 7. Style & Voice Consistency

**Consistency Checking:**
- **Terminology**: Use same terms throughout (create glossary)
- **Character Names**: Spelling consistency, nickname usage
- **Tone**: Formal/informal consistency within sections
- **Tense**: Past/present tense consistency in narrative
- **Point of View**: First/second/third person consistency
- **Punctuation Style**: Consistent use of dashes, ellipses, quotes

**Style Guide Creation:**
1. Extract key terms, names, and phrases
2. Document style decisions (Oxford comma? em-dash or en-dash?)
3. Create reference guide for consistency checking
4. Run consistency checks throughout editing process

**Reference:** See `references/style_consistency.md` for detailed guidelines.

### 8. Multi-Language Document Handling

**Hebrew-English Mixed Documents:**
- **Direction Handling**: Proper RTL/LTR switching
- **Punctuation**: Language-appropriate punctuation marks
- **Font Switching**: Seamless transitions between language fonts
- **Quotation Marks**: Hebrew (״...״) vs. English ("...")
- **Numerals**: Hebrew letters vs. Arabic numerals

**Best Practices:**
- Keep language blocks cohesive (avoid excessive switching)
- Use proper Unicode directionality markers if needed
- Test rendering on multiple platforms
- Ensure bidirectional text displays correctly

## Workflow Decision Tree

### Initial Assessment
1. **Identify document type**: Book manuscript, article, academic paper, etc.
2. **Determine language(s)**: Hebrew only, English only, or mixed
3. **Assess current state**: Structure, formatting, language quality
4. **Define goals**: What level of editing is needed?

### Editing Levels

**Level 1: Proofreading**
- Spelling and grammar correction only
- Use `scripts/spell_check.py` and `scripts/grammar_check.py`
- Quick turnaround, minimal changes

**Level 2: Copy Editing**
- Language correction + style consistency
- Typography and formatting improvements
- Structural organization
- Use all core capabilities except major restructuring

**Level 3: Comprehensive Editing**
- All Level 2 items
- Document structure redesign
- Readability optimization
- Visual design and layout
- Full typography treatment

### Typical Workflow for Comprehensive Editing

1. **Initial Analysis** (30 minutes - 1 hour)
   - Read through document to understand content and style
   - Run `scripts/structure_analyzer.py` to map document structure
   - Run `scripts/readability_scorer.py` for baseline metrics
   - Identify language(s) and mixed-language sections

2. **Language Correction** (varies by document length)
   - Run `scripts/spell_check.py` for spelling errors
   - Run `scripts/grammar_check.py` for grammar issues
   - Review and apply corrections section by section
   - Create terminology glossary for consistency

3. **Structure Optimization** (1-2 hours for typical book)
   - Review chapter/section divisions
   - Optimize scene breaks and transitions
   - Ensure clear hierarchy (parts, chapters, sections)
   - Generate/update table of contents

4. **Typography & Layout** (1-2 hours)
   - Select appropriate fonts from `assets/fonts/`
   - Define typography scale and spacing
   - Apply formatting using `scripts/format_text.py`
   - Set up page layout (margins, headers, footers)

5. **Readability Enhancement** (ongoing)
   - Review sections with low readability scores
   - Suggest improvements while preserving voice
   - Balance sentence length and complexity
   - Ensure smooth flow and transitions

6. **Final Review & Consistency Check** (1 hour)
   - Verify style consistency throughout
   - Check all formatting is applied correctly
   - Ensure visual appeal and professional appearance
   - Generate final formatted version

## Working with Different File Formats

### Word Documents (.docx)
Use the `docx` skill for OOXML manipulation:
- Read document: Use pandoc for markdown conversion
- Edit document: Use Document library for tracked changes
- Format document: Modify styles and formatting via XML
- See docx skill documentation for detailed workflows

### Plain Text / Markdown
- Process directly with scripts
- Apply formatting rules
- Generate formatted output (PDF, HTML, DOCX)

### PDF Documents
Use the `pdf` skill for PDF handling:
- Extract text for analysis
- Cannot directly edit (convert to editable format first)
- Generate formatted PDF as final output

### HTML / EPUB (Digital Books)
- Edit HTML/CSS for digital formatting
- Ensure proper CSS typography
- Test on e-readers (Kindle, Apple Books, etc.)
- Validate EPUB structure

## Scripts Reference

### scripts/spell_check.py
Multi-language spell checker with custom dictionary support.

```bash
python scripts/spell_check.py <file_path> --language <he|en|mixed>
```

Options:
- `--custom-dict <path>`: Add custom dictionary for names, technical terms
- `--output <path>`: Save corrections to file
- `--interactive`: Review each correction before applying

### scripts/grammar_check.py
Grammar analysis and correction for Hebrew and English.

```bash
python scripts/grammar_check.py <file_path> --language <he|en>
```

Options:
- `--style <formal|informal>`: Set style level
- `--rules <path>`: Custom grammar rules file

### scripts/format_text.py
Apply typography and formatting styles to document.

```bash
python scripts/format_text.py <input_file> --output <output_file> --style <style_name>
```

Styles available in `assets/styles/`:
- `classic-book`: Traditional book typography
- `modern-book`: Contemporary clean design
- `academic`: Academic paper formatting
- `magazine`: Editorial style

### scripts/structure_analyzer.py
Analyze document structure and generate reports.

```bash
python scripts/structure_analyzer.py <file_path> --report <output_path>
```

Generates:
- Structure hierarchy visualization
- Inconsistency reports
- Section length analysis
- Table of contents preview

### scripts/readability_scorer.py
Calculate readability metrics and identify problem areas.

```bash
python scripts/readability_scorer.py <file_path> --language <he|en>
```

Outputs:
- Overall readability scores
- Section-by-section analysis
- Suggestions for improvement
- Sentence complexity breakdown

## Best Practices

### General Principles
- **Preserve Author Voice**: Edits should enhance, not change the author's unique style
- **Incremental Changes**: Make changes section by section, review frequently
- **Document Decisions**: Keep style guide and glossary for consistency
- **Test Rendering**: Check formatting on target medium (print vs. digital)
- **Backup Originals**: Always keep original versions before editing

### Language-Specific Best Practices

**Hebrew Editing:**
- Respect nikud conventions (children's books: full nikud; adult books: minimal or none)
- Use proper Hebrew punctuation (geresh for abbreviations, gershayim for acronyms)
- Watch for common spelling errors (ו/וו, י/יי)
- Maintain proper RTL directionality
- Use appropriate Hebrew typography (avoid narrow fonts)

**English Editing:**
- Choose style guide (Chicago, AP, MLA) and stick to it
- Watch for common errors (their/there/they're, its/it's)
- Maintain consistent punctuation style
- Use active voice where appropriate
- Vary sentence structure for rhythm

### Typography Best Practices
- Never use more than 2-3 font families in one document
- Maintain consistent spacing and alignment
- Use proper quotation marks (typographic, not straight)
- Ensure sufficient contrast for readability
- Test on multiple devices/paper stocks

### Structure Best Practices
- Each chapter should have clear opening and closing
- Scene breaks should be visually consistent
- Hierarchy should be immediately clear to reader
- Table of contents should be accurate and helpful
- Page breaks should not orphan headers or break critical content

## Troubleshooting

### Common Issues

**Problem**: Mixed language text displays incorrectly
- **Solution**: Add Unicode bidirectional markers (U+200E LTR, U+200F RTL)
- Use proper Unicode normalization (NFC for Hebrew)

**Problem**: Fonts not displaying correctly
- **Solution**: Ensure fonts are installed and embedded in document
- Check font licensing for commercial use
- Use web-safe fonts for digital distribution

**Problem**: Readability scores too low
- **Solution**: Break long sentences (>25 words)
- Replace complex words with simpler alternatives
- Use active voice instead of passive
- Add transitional phrases for flow

**Problem**: Inconsistent formatting throughout document
- **Solution**: Use styles/templates rather than manual formatting
- Run `scripts/format_text.py` with consistent style
- Create master style guide and apply systematically

**Problem**: Structure is unclear or confusing
- **Solution**: Run `scripts/structure_analyzer.py` to visualize hierarchy
- Add clear section breaks and headings
- Ensure logical flow of ideas
- Reorganize if necessary for clarity

## Resources

This skill includes comprehensive resources for linguistic editing:

### scripts/
Executable Python scripts for automated editing tasks:
- `spell_check.py`: Multi-language spell checking
- `grammar_check.py`: Grammar analysis and correction
- `format_text.py`: Typography and layout formatting
- `structure_analyzer.py`: Document structure analysis
- `readability_scorer.py`: Readability metrics calculation

All scripts support both Hebrew and English, with mixed-language document handling.

### references/
Detailed reference documentation:
- `hebrew_rules.md`: Hebrew language rules, nikud, punctuation, common errors
- `english_rules.md`: English grammar, punctuation, style guidelines
- `typography_guide.md`: Professional typography standards for books
- `book_layout_guide.md`: Page layout, margins, spacing for print and digital
- `style_consistency.md`: Guidelines for maintaining consistent style and voice

### assets/
Ready-to-use templates and resources:
- `fonts/`: Recommended font collections for Hebrew and English books
- `styles/`: Pre-configured style templates for different book types
- `templates/`: Document templates with proper formatting

## Dependencies

Required software and libraries:

**Python packages:**
```bash
pip install language-tool-python  # Grammar checking
pip install hunspell             # Spell checking
pip install textstat             # Readability metrics
pip install python-docx          # DOCX file handling
pip install markdown             # Markdown processing
```

**System tools:**
```bash
# macOS
brew install hunspell
brew install pandoc

# Ubuntu/Debian
sudo apt-get install hunspell
sudo apt-get install pandoc
```

**Hebrew language support:**
```bash
# Install Hebrew dictionaries for hunspell
# macOS: Download from GitHub he_IL dictionary
# Linux: sudo apt-get install hunspell-he
```

## Getting Started

### Quick Start for Book Manuscript Editing

1. **Initial assessment**:
   ```bash
   python scripts/structure_analyzer.py manuscript.docx --report structure_report.txt
   python scripts/readability_scorer.py manuscript.docx --language en
   ```

2. **Language correction**:
   ```bash
   python scripts/spell_check.py manuscript.docx --language en --interactive
   python scripts/grammar_check.py manuscript.docx --language en
   ```

3. **Apply formatting**:
   ```bash
   python scripts/format_text.py manuscript.docx --output formatted_manuscript.docx --style classic-book
   ```

4. **Review and refine**:
   - Review the formatted output
   - Make manual adjustments as needed
   - Run final consistency checks

### Example: Editing a Hebrew Book

```bash
# Step 1: Analyze structure
python scripts/structure_analyzer.py hebrew_book.docx --report report_he.txt

# Step 2: Check spelling (interactive mode for names/terms)
python scripts/spell_check.py hebrew_book.docx --language he --interactive --custom-dict names.txt

# Step 3: Check grammar
python scripts/grammar_check.py hebrew_book.docx --language he

# Step 4: Apply Hebrew book formatting
python scripts/format_text.py hebrew_book.docx --output formatted_hebrew_book.docx --style classic-book

# Step 5: Verify readability
python scripts/readability_scorer.py formatted_hebrew_book.docx --language he
```

### Example: Mixed Language Document

```bash
# For documents with both Hebrew and English sections
python scripts/spell_check.py bilingual_doc.docx --language mixed --custom-dict terms.txt
python scripts/format_text.py bilingual_doc.docx --output formatted_bilingual.docx --style modern-book
```

## Advanced Usage

### Creating Custom Style Templates

1. Start with existing template from `assets/styles/`
2. Modify typography settings (fonts, sizes, spacing)
3. Save as new style template
4. Apply with `scripts/format_text.py --style <your_style>`

### Building Custom Dictionaries

For specialized terminology, create custom dictionaries:

```python
# custom_dict.txt format (one word per line)
specialized_term
another_technical_word
character_name
place_name
```

Use with spell checker:
```bash
python scripts/spell_check.py document.docx --custom-dict custom_dict.txt
```

### Batch Processing Multiple Chapters

```bash
# Process all chapters in a directory
for file in chapters/*.docx; do
    python scripts/spell_check.py "$file" --language en
    python scripts/grammar_check.py "$file" --language en
    python scripts/format_text.py "$file" --output "formatted/${file##*/}" --style classic-book
done
```

## Quality Checklist

Before completing an editing project, verify:

- [ ] All spelling errors corrected
- [ ] Grammar checked and corrected
- [ ] Terminology consistent throughout
- [ ] Typography applied consistently
- [ ] Proper hierarchy (title, chapter, section headings)
- [ ] Scene breaks formatted consistently
- [ ] Page layout appropriate for medium (print/digital)
- [ ] Readability scores meet target levels
- [ ] Fonts embedded (if required for distribution)
- [ ] Table of contents accurate and complete
- [ ] Headers/footers correct on all pages
- [ ] No orphaned lines at page breaks
- [ ] Language directionality correct (Hebrew RTL)
- [ ] Punctuation follows chosen style guide
- [ ] Author's voice and style preserved

---

**Note**: This skill works best when combined with the `docx`, `pdf`, and `pptx` skills for handling different document formats. For optimal results, always work on a copy of the original document and maintain version history.
