#!/usr/bin/env python3
"""
Grammar analysis and correction for Hebrew and English.
Uses LanguageTool for comprehensive grammar checking.
"""

import argparse
import sys
from pathlib import Path

try:
    import language_tool_python
    from docx import Document
except ImportError:
    print("Error: Required libraries not installed. Install with:")
    print("  pip install language-tool-python python-docx")
    sys.exit(1)


class GrammarChecker:
    def __init__(self, language='en', style='formal'):
        self.language = language
        self.style = style

        # Map language codes to LanguageTool codes
        lang_map = {
            'en': 'en-US',
            'he': 'auto'  # LanguageTool has limited Hebrew support
        }

        try:
            self.tool = language_tool_python.LanguageTool(lang_map.get(language, 'en-US'))
        except Exception as e:
            print(f"Error initializing LanguageTool: {e}")
            sys.exit(1)

    def check_text(self, text):
        """Check grammar in text"""
        matches = self.tool.check(text)
        errors = []

        for match in matches:
            errors.append({
                'message': match.message,
                'context': match.context,
                'offset': match.offset,
                'length': match.errorLength,
                'suggestions': match.replacements[:3],  # Top 3 suggestions
                'rule': match.ruleId,
                'category': match.category
            })

        return errors

    def check_docx(self, file_path):
        """Check grammar in DOCX file"""
        doc = Document(file_path)
        all_errors = []

        for i, para in enumerate(doc.paragraphs):
            if not para.text.strip():
                continue

            errors = self.check_text(para.text)
            if errors:
                all_errors.append({
                    'paragraph': i + 1,
                    'text': para.text,
                    'errors': errors
                })

        return all_errors

    def print_report(self, errors):
        """Print grammar check report"""
        if not errors:
            print("✓ No grammar errors found!")
            return

        print(f"\n📝 Found {len(errors)} paragraphs with grammar issues:\n")

        total_errors = sum(len(e['errors']) for e in errors)
        print(f"Total grammar issues: {total_errors}\n")

        for item in errors:
            print(f"📍 Paragraph {item['paragraph']}:")
            print(f"   {item['text'][:100]}..." if len(item['text']) > 100 else f"   {item['text']}")
            print()

            for error in item['errors']:
                print(f"  ⚠️  {error['message']}")
                print(f"     Context: {error['context']}")
                if error['suggestions']:
                    print(f"     Suggestions: {', '.join(error['suggestions'])}")
                print(f"     Rule: {error['rule']} ({error['category']})")
                print()


def main():
    parser = argparse.ArgumentParser(description='Grammar checker for documents')
    parser.add_argument('file_path', help='Path to document file (.docx)')
    parser.add_argument('--language', '-l', choices=['en', 'he'],
                       default='en', help='Document language')
    parser.add_argument('--style', '-s', choices=['formal', 'informal'],
                       default='formal', help='Writing style level')
    parser.add_argument('--rules', '-r', help='Custom grammar rules file')

    args = parser.parse_args()

    if not Path(args.file_path).exists():
        print(f"Error: File not found: {args.file_path}")
        sys.exit(1)

    print(f"📝 Grammar checking: {args.file_path}")
    print(f"   Language: {args.language}")
    print(f"   Style: {args.style}")
    print()

    checker = GrammarChecker(args.language, args.style)
    errors = checker.check_docx(args.file_path)
    checker.print_report(errors)


if __name__ == '__main__':
    main()
