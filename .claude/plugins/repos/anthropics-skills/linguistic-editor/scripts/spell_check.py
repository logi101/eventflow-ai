#!/usr/bin/env python3
"""
Multi-language spell checker with custom dictionary support.
Supports Hebrew, English, and mixed-language documents.
"""

import argparse
import sys
from pathlib import Path

try:
    import hunspell
    from docx import Document
except ImportError:
    print("Error: Required libraries not installed. Install with:")
    print("  pip install python-docx hunspell")
    sys.exit(1)


class MultiLanguageSpellChecker:
    def __init__(self, language='en', custom_dict=None):
        self.language = language
        self.custom_words = set()

        if custom_dict and Path(custom_dict).exists():
            with open(custom_dict, 'r', encoding='utf-8') as f:
                self.custom_words = {line.strip() for line in f if line.strip()}

        # Initialize hunspell dictionaries
        self.checkers = {}
        if language in ['en', 'mixed']:
            try:
                self.checkers['en'] = hunspell.HunSpell('/usr/share/hunspell/en_US.dic',
                                                        '/usr/share/hunspell/en_US.aff')
            except:
                print("Warning: English dictionary not found")

        if language in ['he', 'mixed']:
            try:
                self.checkers['he'] = hunspell.HunSpell('/usr/share/hunspell/he_IL.dic',
                                                        '/usr/share/hunspell/he_IL.aff')
            except:
                print("Warning: Hebrew dictionary not found")

    def is_hebrew(self, text):
        """Check if text contains Hebrew characters"""
        return any('\u0590' <= c <= '\u05FF' for c in text)

    def check_word(self, word):
        """Check if word is spelled correctly"""
        if word in self.custom_words:
            return True

        # Determine language
        lang = 'he' if self.is_hebrew(word) else 'en'

        if lang in self.checkers:
            return self.checkers[lang].spell(word)
        return True  # Unknown language, assume correct

    def get_suggestions(self, word):
        """Get spelling suggestions for misspelled word"""
        lang = 'he' if self.is_hebrew(word) else 'en'

        if lang in self.checkers:
            return self.checkers[lang].suggest(word)
        return []

    def check_text(self, text):
        """Check text and return misspelled words with suggestions"""
        words = text.split()
        errors = []

        for word in words:
            # Clean word (remove punctuation)
            clean_word = word.strip('.,!?;:"\'()[]{}')
            if not clean_word:
                continue

            if not self.check_word(clean_word):
                suggestions = self.get_suggestions(clean_word)
                errors.append({
                    'word': clean_word,
                    'original': word,
                    'suggestions': suggestions[:5]  # Top 5 suggestions
                })

        return errors

    def check_docx(self, file_path, interactive=False, output_path=None):
        """Check spelling in DOCX file"""
        doc = Document(file_path)
        all_errors = []

        for i, para in enumerate(doc.paragraphs):
            if not para.text.strip():
                continue

            errors = self.check_text(para.text)
            if errors:
                all_errors.append({
                    'paragraph': i + 1,
                    'text': para.text[:100] + '...' if len(para.text) > 100 else para.text,
                    'errors': errors
                })

        return all_errors

    def print_report(self, errors):
        """Print spell check report"""
        if not errors:
            print("✓ No spelling errors found!")
            return

        print(f"\n🔍 Found {len(errors)} paragraphs with spelling errors:\n")

        total_errors = sum(len(e['errors']) for e in errors)
        print(f"Total misspelled words: {total_errors}\n")

        for item in errors:
            print(f"📝 Paragraph {item['paragraph']}: {item['text']}")
            for error in item['errors']:
                print(f"  ❌ '{error['word']}'")
                if error['suggestions']:
                    print(f"     Suggestions: {', '.join(error['suggestions'])}")
            print()


def main():
    parser = argparse.ArgumentParser(description='Multi-language spell checker')
    parser.add_argument('file_path', help='Path to document file (.docx)')
    parser.add_argument('--language', '-l', choices=['en', 'he', 'mixed'],
                       default='en', help='Document language')
    parser.add_argument('--custom-dict', '-d', help='Path to custom dictionary file')
    parser.add_argument('--interactive', '-i', action='store_true',
                       help='Interactive mode for reviewing corrections')
    parser.add_argument('--output', '-o', help='Save corrections to file')

    args = parser.parse_args()

    if not Path(args.file_path).exists():
        print(f"Error: File not found: {args.file_path}")
        sys.exit(1)

    print(f"🔍 Spell checking: {args.file_path}")
    print(f"   Language: {args.language}")
    if args.custom_dict:
        print(f"   Custom dictionary: {args.custom_dict}")
    print()

    checker = MultiLanguageSpellChecker(args.language, args.custom_dict)
    errors = checker.check_docx(args.file_path, args.interactive, args.output)
    checker.print_report(errors)

    if args.output and errors:
        with open(args.output, 'w', encoding='utf-8') as f:
            f.write("Spell Check Report\n")
            f.write("==================\n\n")
            for item in errors:
                f.write(f"Paragraph {item['paragraph']}: {item['text']}\n")
                for error in item['errors']:
                    f.write(f"  - '{error['word']}' -> {', '.join(error['suggestions'])}\n")
                f.write("\n")
        print(f"\n✓ Report saved to: {args.output}")


if __name__ == '__main__':
    main()
