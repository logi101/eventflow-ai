#!/usr/bin/env python3
"""
Document structure analyzer.
Analyzes document hierarchy, section divisions, and generates structure reports.
"""

import argparse
import sys
from pathlib import Path
from collections import defaultdict

try:
    from docx import Document
    from docx.text.paragraph import Paragraph
except ImportError:
    print("Error: Required libraries not installed. Install with:")
    print("  pip install python-docx")
    sys.exit(1)


class StructureAnalyzer:
    def __init__(self, file_path):
        self.file_path = file_path
        self.doc = Document(file_path)
        self.structure = []
        self.stats = defaultdict(int)

    def analyze(self):
        """Analyze document structure"""
        self.structure = []
        self.stats = defaultdict(int)

        for i, para in enumerate(self.doc.paragraphs):
            if not para.text.strip():
                continue

            # Detect heading level
            style_name = para.style.name if para.style else 'Normal'
            level = self._get_heading_level(style_name)

            # Analyze paragraph
            word_count = len(para.text.split())
            char_count = len(para.text)

            item = {
                'index': i + 1,
                'level': level,
                'style': style_name,
                'text': para.text[:80] + '...' if len(para.text) > 80 else para.text,
                'word_count': word_count,
                'char_count': char_count
            }

            self.structure.append(item)
            self.stats[f'level_{level}'] += 1
            self.stats['total_words'] += word_count
            self.stats['total_chars'] += char_count
            self.stats['total_paragraphs'] += 1

        return self.structure, self.stats

    def _get_heading_level(self, style_name):
        """Extract heading level from style name"""
        if 'Heading' in style_name or 'heading' in style_name:
            try:
                # Extract number from "Heading 1", "Heading 2", etc.
                level = int(''.join(filter(str.isdigit, style_name)))
                return level if level > 0 else 0
            except:
                return 1  # Default to level 1 if can't parse
        elif 'Title' in style_name or 'title' in style_name:
            return 0
        return None  # Body text

    def generate_toc(self):
        """Generate table of contents from structure"""
        toc = []
        for item in self.structure:
            if item['level'] is not None and item['level'] <= 3:
                indent = '  ' * item['level']
                toc.append(f"{indent}- {item['text']}")
        return toc

    def detect_inconsistencies(self):
        """Detect structural inconsistencies"""
        issues = []

        # Check for skipped heading levels
        prev_level = 0
        for item in self.structure:
            if item['level'] is not None:
                if item['level'] - prev_level > 1:
                    issues.append(f"⚠️  Skipped heading level at paragraph {item['index']}: "
                                f"jumped from level {prev_level} to {item['level']}")
                prev_level = item['level']

        # Check for very short sections
        section_start = None
        section_words = 0
        for item in self.structure:
            if item['level'] is not None:
                if section_start and section_words < 50:
                    issues.append(f"⚠️  Very short section starting at paragraph {section_start} "
                                f"({section_words} words)")
                section_start = item['index']
                section_words = 0
            else:
                section_words += item['word_count']

        # Check for very long paragraphs
        for item in self.structure:
            if item['level'] is None and item['word_count'] > 200:
                issues.append(f"⚠️  Very long paragraph at {item['index']} "
                            f"({item['word_count']} words) - consider breaking up")

        return issues

    def print_report(self):
        """Print structure analysis report"""
        print("📊 Document Structure Analysis")
        print("=" * 60)
        print(f"\nFile: {self.file_path}")
        print(f"Total paragraphs: {self.stats['total_paragraphs']}")
        print(f"Total words: {self.stats['total_words']}")
        print(f"Total characters: {self.stats['total_chars']}")
        print()

        # Heading distribution
        print("📑 Heading Distribution:")
        for level in range(6):
            count = self.stats[f'level_{level}']
            if count > 0:
                level_name = 'Title' if level == 0 else f'Heading {level}'
                print(f"   {level_name}: {count}")
        print()

        # Table of contents
        toc = self.generate_toc()
        if toc:
            print("📖 Table of Contents:")
            for item in toc:
                print(f"   {item}")
            print()

        # Inconsistencies
        issues = self.detect_inconsistencies()
        if issues:
            print("🔍 Detected Issues:")
            for issue in issues:
                print(f"   {issue}")
            print()
        else:
            print("✓ No structural issues detected")
            print()

    def save_report(self, output_path):
        """Save analysis report to file"""
        toc = self.generate_toc()
        issues = self.detect_inconsistencies()

        with open(output_path, 'w', encoding='utf-8') as f:
            f.write("Document Structure Analysis Report\n")
            f.write("=" * 60 + "\n\n")
            f.write(f"File: {self.file_path}\n")
            f.write(f"Total paragraphs: {self.stats['total_paragraphs']}\n")
            f.write(f"Total words: {self.stats['total_words']}\n")
            f.write(f"Total characters: {self.stats['total_chars']}\n\n")

            f.write("Heading Distribution:\n")
            for level in range(6):
                count = self.stats[f'level_{level}']
                if count > 0:
                    level_name = 'Title' if level == 0 else f'Heading {level}'
                    f.write(f"  {level_name}: {count}\n")
            f.write("\n")

            if toc:
                f.write("Table of Contents:\n")
                for item in toc:
                    f.write(f"{item}\n")
                f.write("\n")

            if issues:
                f.write("Detected Issues:\n")
                for issue in issues:
                    f.write(f"{issue}\n")
                f.write("\n")
            else:
                f.write("No structural issues detected\n\n")

            f.write("\nDetailed Structure:\n")
            f.write("-" * 60 + "\n")
            for item in self.structure:
                level_str = f"[H{item['level']}]" if item['level'] is not None else "[Body]"
                f.write(f"{item['index']:4d} {level_str:8s} {item['text']}\n")
                f.write(f"      Words: {item['word_count']}, Chars: {item['char_count']}\n\n")


def main():
    parser = argparse.ArgumentParser(description='Analyze document structure')
    parser.add_argument('file_path', help='Path to document file (.docx)')
    parser.add_argument('--report', '-r', help='Save report to file')

    args = parser.parse_args()

    if not Path(args.file_path).exists():
        print(f"Error: File not found: {args.file_path}")
        sys.exit(1)

    analyzer = StructureAnalyzer(args.file_path)
    analyzer.analyze()
    analyzer.print_report()

    if args.report:
        analyzer.save_report(args.report)
        print(f"✓ Report saved to: {args.report}")


if __name__ == '__main__':
    main()
