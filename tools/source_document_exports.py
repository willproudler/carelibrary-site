"""Print and editable source editions, from the same ordered reading blocks as EPUB."""
from functools import lru_cache
from io import BytesIO
from itertools import groupby
from pathlib import Path
import re
from xml.sax.saxutils import escape, quoteattr
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED

TOOLS = Path(__file__).resolve().parent
W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
REL = 'http://schemas.openxmlformats.org/package/2006/relationships'
TYPES = 'http://schemas.openxmlformats.org/package/2006/content-types'
XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'


def edition_notes(facts):
    return [value for label, value in facts if label in {'Source rights statement', 'Licence', 'Source attribution', 'Translation'}]


def reading_blocks(chapter):
    if chapter['heading']:
        yield 1, chapter['heading']
    for level, text, _ in chapter['blocks']:
        yield level, text


def reference_blocks(chapters):
    groups = [chapter for chapter in chapters if chapter['notes']]
    if groups:
        yield 1, 'Source references'
    for chapter in groups:
        yield 2, chapter['navigation']
        for number, text, url in chapter['notes']:
            yield 0, f'Line {number} · {text}' + (' — ' + url if url else '')


def word_edition(work, chapters, facts):
    def para(text, style='Normal'):
        pieces = re.split(r'(\r?\n|\t)', text)
        runs = ''.join('<w:br/>' if '\n' in piece else '<w:tab/>' if piece == '\t' else
                       '<w:t xml:space="preserve">' + escape(piece) + '</w:t>' for piece in pieces if piece)
        return '<w:p><w:pPr><w:pStyle w:val="' + style + '"/></w:pPr><w:r>' + runs + '</w:r></w:p>'

    def style(style_id, name, size, space, colour, extra='', properties='', outline=''):
        return (f'<w:style w:type="paragraph" w:styleId="{style_id}"><w:name w:val="{name}"/><w:basedOn w:val="Normal"/>'
                f'<w:pPr>{properties}<w:spacing w:before="{space}" w:after="120"/>{outline}</w:pPr><w:rPr>'
                f'<w:color w:val="{colour}"/><w:sz w:val="{size}"/>{extra}</w:rPr></w:style>')

    language = quoteattr(work.get('language_code') or 'und')
    styles = (f'<w:styles xmlns:w="{W}"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Cambria" '
              f'w:hAnsi="Cambria" w:cs="Cambria"/><w:color w:val="232C28"/><w:sz w:val="24"/><w:lang w:val={language}/>'
              '</w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:widowControl/>'
              '<w:spacing w:after="130" w:line="300" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>'
              '<w:style w:type="paragraph" w:styleId="Normal" w:default="1"><w:name w:val="Normal"/></w:style>'
              + style('Title','Title',56,0,'244638',properties='<w:keepNext/>')
              + style('Author','Author',28,120,'52685A','<w:i/>')
              + style('Heading1','heading 1',36,300,'254638',properties='<w:keepNext/>', outline='<w:outlineLvl w:val="0"/>')
              + style('Heading2','heading 2',29,220,'304A40',properties='<w:keepNext/>', outline='<w:outlineLvl w:val="1"/>')
              + '</w:styles>')
    title, author = work['title'], work.get('author') or ''
    parts = [para(title, 'Title'), para(author, 'Author')]
    if work.get('source_language_edition'):
        parts.append(para(next(value for label,value in facts if label=='Translation')))
    parts.append('<w:p><w:r><w:br w:type="page"/></w:r></w:p>')
    for chapter in chapters:
        for level, body in reading_blocks(chapter):
            parts.append(para(body, 'Heading1' if level == 1 else 'Heading2' if level else 'Normal'))
    for level, body in reference_blocks(chapters):
        parts.append(para(body,'Heading1' if level == 1 else 'Heading2' if level else 'Normal'))
    parts.extend(para(note) for note in edition_notes(facts))
    sect = '<w:sectPr><w:footerReference w:type="default" r:id="rId2"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1350" w:right="1320" w:bottom="1350" w:left="1440" w:footer="560"/><w:titlePg/></w:sectPr>'
    document = f'<w:document xmlns:w="{W}" xmlns:r="{R}"><w:body>' + ''.join(parts) + sect + '</w:body></w:document>'
    content = f'<Types xmlns="{TYPES}"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>'
    files = {'[Content_Types].xml':content, '_rels/.rels':f'<Relationships xmlns="{REL}"><Relationship Id="rId1" Type="{R}/officeDocument" Target="word/document.xml"/></Relationships>',
             'word/document.xml':document, 'word/styles.xml':styles,
             'word/footer1.xml':f'<w:ftr xmlns:w="{W}"><w:p><w:pPr><w:jc w:val="right"/></w:pPr><w:fldSimple w:instr="PAGE"><w:r><w:rPr><w:color w:val="52685A"/><w:sz w:val="20"/></w:rPr><w:t>1</w:t></w:r></w:fldSimple></w:p></w:ftr>',
             'word/_rels/document.xml.rels':f'<Relationships xmlns="{REL}"><Relationship Id="rId1" Type="{R}/styles" Target="styles.xml"/><Relationship Id="rId2" Type="{R}/footer" Target="footer1.xml"/></Relationships>'}
    out = BytesIO()
    with ZipFile(out, 'w') as archive:
        for name, value in files.items():
            info = ZipInfo(name, (2000, 1, 1, 0, 0, 0))
            info.compress_type = ZIP_DEFLATED
            archive.writestr(info, (XML + value).encode('utf-8'))
    return out.getvalue()


@lru_cache(maxsize=1)
def print_fonts():
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont

    class UnicodeFont(TTFont):
        def addObjects(self, document):
            # ReportLab 5 writes supplementary characters as five/six hex digits.
            # PDF text extraction needs their actual UTF-16BE surrogate pairs.
            state = self.state.get(document)
            supplementary = {}
            for index, subset in enumerate(state.subsets if state else []):
                if any(value > 0xffff for value in subset):
                    name = self.getSubsetInternalName(index, document)[1:]
                    supplementary[name] = [(slot, value) for slot, value in enumerate(subset) if value > 0xffff]
            super().addObjects(document)
            for name, entries in supplementary.items():
                font = document.idToObject[name]
                mapping = document.idToObject[font.ToUnicode.name]
                for slot, value in entries:
                    source = f"<{slot:02X}> <{value:04X}>"
                    encoded = chr(value).encode("utf-16be").hex().upper()
                    mapping.content = mapping.content.replace(source, f"<{slot:02X}> <{encoded}>")

    fonts = []
    for name, path in [('CareBook',TOOLS.parent/'native/numo-EBGaramond.ttf'), ('CareBookFallback',TOOLS/'fonts/DejaVuSans.ttf')]:
        font = UnicodeFont(name, str(path))
        pdfmetrics.registerFont(font)
        fonts.append(font)
    return fonts


@lru_cache(maxsize=8192)
def glyph(char):
    for font in print_fonts():
        if ord(char) in font.face.charToGlyph:
            return font.fontName, font.face.charWidths.get(ord(char), font.face.defaultWidth)/1000
    raise ValueError(f'The printable edition has no embedded glyph for U+{ord(char):04X}.')


@lru_cache(maxsize=32768)
def word_width(word):
    return sum(glyph(c)[1] for c in word)


def print_edition(work, chapters, facts):
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen.canvas import Canvas
    out = BytesIO()
    canvas = Canvas(out, pagesize=A4, pageCompression=1, invariant=1)
    title, author = work["title"], work.get("author") or ""
    canvas.setTitle(title)
    canvas.setAuthor(author)
    canvas.setCreator("CARE Library")
    width, height = A4
    left, right, bottom = 65, width - 65, 65
    measure = right - left
    y = height * .67

    def line(text, size, colour="#242C28"):
        cursor = canvas.beginText(left, y)
        cursor.setFillColor(colour)
        for font_name, chars in groupby(text, key=lambda char: glyph(char)[0]):
            cursor.setFont(font_name, size)
            cursor.textOut("".join(chars))
        canvas.drawText(cursor)

    def next_page():
        nonlocal y
        number = canvas.getPageNumber()
        if number > 1:
            canvas.setFont("CareBook", 10)
            canvas.setFillColor("#57695E")
            canvas.drawRightString(right, 38, str(number))
        canvas.showPage()
        y = height - 65

    def wrap(value, size, available=measure):
        # Preserve explicit lineation and interior spacing, wrapping only at a
        # whitespace boundary or where one token exceeds the available measure.
        limit = available / size
        for physical in value.expandtabs(4).splitlines() or [""]:
            chunk, advance = "", 0
            for part in re.findall(r"\S+|\s+", physical):
                part_width = word_width(part)
                if chunk and not part.isspace() and advance + part_width > limit:
                    yield chunk.rstrip()
                    chunk, advance = "", 0
                if part_width > limit:
                    for char in part:
                        char_width = glyph(char)[1]
                        if chunk and advance + char_width > limit:
                            yield chunk.rstrip()
                            chunk, advance = "", 0
                        chunk += char
                        advance += char_width
                else:
                    chunk += part
                    advance += part_width
            yield chunk.rstrip()

    def paragraph(value, size, leading, space=4, heading=False):
        nonlocal y
        if heading and y - bottom < leading * 3:
            next_page()
        for body in wrap(value, size):
            if y < bottom:
                next_page()
            line(body, size, "#305342" if heading else "#222B26")
            y -= leading
        y -= space

    print_fonts()
    paragraph(title, 32, 37, 12, True)
    if author:
        paragraph(author, 18, 24, 14)
    if work.get("source_language_edition"):
        paragraph(next(value for label, value in facts if label == "Translation"), 11, 15)
    next_page()
    paragraph("Contents", 23, 30, 18, True)
    for index, chapter in enumerate(chapters, 1):
        if y < bottom + 12:
            next_page()
        for row, body in enumerate(wrap(chapter["navigation"], 13, measure - 38)):
            if y < bottom:
                next_page()
            line(body, 13, "#2D5141")
            if row == 0:
                # Contents precede the body. Fill this small PDF form with the
                # actual printed page number after its target has been laid out.
                canvas.saveState()
                canvas.translate(right - 33, y)
                canvas.doForm(f"contents-number-{index}")
                canvas.restoreState()
            canvas.linkRect("", f"source-{index}", (left, y - 3, right, y + 12), relative=0, thickness=0)
            y -= 18
        y -= 6
    next_page()
    for index, chapter in enumerate(chapters, 1):
        if index > 1:
            y -= 11
        if (index > 1 and chapter.get("commentary_appendix")) or y < bottom + 65:
            next_page()
        target = f"source-{index}"
        canvas.bookmarkHorizontalAbsolute(target, y + 16)
        canvas.addOutlineEntry(chapter["navigation"], target, level=0, closed=True)
        number = str(canvas.getPageNumber())
        canvas.beginForm(f"contents-number-{index}", 0, -4, 34, 16)
        canvas.setFillColor("#52665A")
        canvas.setFont("CareBook", 12)
        canvas.drawRightString(33, 0, number)
        canvas.endForm()
        for level, body in reading_blocks(chapter):
            if level == 1:
                paragraph(body, 18, 23, 8, True)
            elif level:
                paragraph(body, 15, 19, 8, True)
            else:
                paragraph(body, 12, 16, 5)
    for level, body in reference_blocks(chapters):
        paragraph(body, 16 if level else 10, 20 if level else 14, 4, bool(level))
    notes = edition_notes(facts)
    if notes:
        y -= 12
        for note in notes:
            paragraph(note, 10, 14)
    next_page()
    canvas.save()
    return out.getvalue()
