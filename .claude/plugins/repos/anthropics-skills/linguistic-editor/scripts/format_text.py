#!/usr/bin/env python3
"""
Apply typography and formatting styles to documents.
Supports multiple pre-defined styles and custom formatting.
"""

import argparse
import sys
from pathlib import Path

try:
    from docx import Document
    from docx.shared import Pt, RGBColor, Inches
    from docx.enum.text import WD_ALIGN_PARAGRAPH
except ImportError:
    print("Error: Required libraries not installed. Install with:")
    print("  pip install python-docx")
    sys.exit(1)


# Style definitions
STYLES = {
    'classic-book': {
        'title': {'font': 'Garamond', 'size': 36, 'bold': True, 'color': (0, 0, 0)},
        'heading1': {'font': 'Garamond', 'size': 20, 'bold': True, 'color': (0, 0, 0)},
        'heading2': {'font': 'Garamond', 'size': 16, 'bold': True, 'color': (0, 0, 0)},
        'heading3': {'font': 'Garamond', 'size': 14, 'bold': True, 'color': (0, 0, 0)},
        'body': {'font': 'Garamond', 'size': 12, 'color': (26, 26, 26)},
        'line_spacing': 1.5,
        'paragraph_spacing': 6
    },
    'modern-book': {
        'title': {'font': 'Helvetica', 'size': 32, 'bold': True, 'color': (0, 0, 0)},
        'heading1': {'font': 'Helvetica', 'size': 18, 'bold': True, 'color': (0, 0, 0)},
        'heading2': {'font': 'Helvetica', 'size': 14, 'bold': True, 'color': (60, 60, 60)},
        'heading3': {'font': 'Helvetica', 'size': 12, 'bold': True, 'color': (60, 60, 60)},
        'body': {'font': 'Georgia', 'size': 11, 'color': (40, 40, 40)},
        'line_spacing': 1.4,
        'paragraph_spacing': 8
    },
    'academic': {
        'title': {'font': 'Times New Roman', 'size': 24, 'bold': True, 'color': (0, 0, 0)},
        'heading1': {'font': 'Times New Roman', 'size': 16, 'bold': True, 'color': (0, 0, 0)},
        'heading2': {'font': 'Times New Roman', 'size': 14, 'bold': True, 'color': (0, 0, 0)},
        'heading3': {'font': 'Times New Roman', 'size': 12, 'bold': True, 'color': (0, 0, 0)},
        'body': {'font': 'Times New Roman', 'size': 12, 'color': (0, 0, 0)},
        'line_spacing': 2.0,
        'paragraph_spacing': 0
    },
    'magazine': {
        'title': {'font': 'Arial', 'size': 28, 'bold': True, 'color': (0, 51, 102)},
        'heading1': {'font': 'Arial', 'size': 18, 'bold': True, 'color': (0, 51, 102)},
        'heading2': {'font': 'Arial', 'size': 14, 'bold': True, 'color': (51, 102, 153)},
        'heading3': {'font': 'Arial', 'size': 12, 'bold': True, 'color': (51, 102, 153)},
        'body': {'font': 'Georgia', 'size': 11, 'color': (20, 20, 20)},
        'line_spacing': 1.3,
        'paragraph_spacing': 10
    }
}


class TextFormatter:
    def __init__(self, style_name='classic-book'):
        if style_name not in STYLES:
            print(f"Warning: Style '{style_name}' not found. Using 'classic-book'")
            style_name = 'classic-book'
        self.style = STYLES[style_name]
        self.style_name = style_name

    def format_paragraph(self, paragraph, element_type='body'):
        """Apply formatting to a paragraph"""
        if element_type not in self.style:
            element_type = 'body'

        style_config = self.style[element_type]

        for run in paragraph.runs:
            # Font
            run.font.name = style_config['font']
            run.font.size = Pt(style_config['size'])

            # Color
            if 'color' in style_config:
                r, g, b = style_config['color']
                run.font.color.rgb = RGBColor(r, g, b)

            # Bold
            if style_config.get('bold', False):
                run.font.bold = True

        # Line spacing
        paragraph.paragraph_format.line_spacing = self.style['line_spacing']

        # Paragraph spacing
        paragraph.paragraph_format.space_after = Pt(self.style['paragraph_spacing'])

    def format_document(self, doc):
        """Apply formatting to entire document"""
        print(f"Applying '{self.style_name}' style...")

        for para in doc.paragraphs:
            if not para.text.strip():
                continue

            # Determine element type based on style
            style_name = para.style.name if para.style else 'Normal'

            if 'Title' in style_name:
                element_type = 'title'
            elif 'Heading 1' in style_name or 'heading 1' in style_name.lower():
                element_type = 'heading1'
            elif 'Heading 2' in style_name or 'heading 2' in style_name.lower():
                element_type = 'heading2'
            elif 'Heading 3' in style_name or 'heading 3' in style_name.lower():
                element_type = 'heading3'
            else:
                element_type = 'body'

            self.format_paragraph(para, element_type)

        print("✓ Formatting applied successfully")

    def save_document(self, doc, output_path):
        """Save formatted document"""
        doc.save(output_path)
        print(f"✓ Document saved to: {output_path}")


def list_styles():
    """List available styles"""
    print("📚 Available Styles:\n")
    for style_name, style_config in STYLES.items():
        print(f"  • {style_name}")
        print(f"    Body font: {style_config['body']['font']}, {style_config['body']['size']}pt")
        print(f"    Line spacing: {style_config['line_spacing']}")
        print()


def main():
    parser = argparse.ArgumentParser(description='Apply typography formatting to documents')
    parser.add_argument('input_file', nargs='?', help='Input document file (.docx)')
    parser.add_argument('--output', '-o', help='Output file path')
    parser.add_argument('--style', '-s', default='classic-book',
                       help='Style to apply (classic-book, modern-book, academic, magazine)')
    parser.add_argument('--list', '-l', action='store_true',
                       help='List available styles')

    args = parser.parse_args()

    if args.list:
        list_styles()
        return

    if not args.input_file:
        parser.error("input_file is required (unless using --list)")

    if not Path(args.input_file).exists():
        print(f"Error: File not found: {args.input_file}")
        sys.exit(1)

    output_file = args.output or args.input_file.replace('.docx', '_formatted.docx')

    print(f"📝 Formatting document: {args.input_file}")
    print(f"   Style: {args.style}")
    print(f"   Output: {output_file}")
    print()

    doc = Document(args.input_file)
    formatter = TextFormatter(args.style)
    formatter.format_document(doc)
    formatter.save_document(doc, output_file)


if __name__ == '__main__':
    main()
