"""Names for owned early drafts; no model call or document-content changes."""
from datetime import datetime
from html.parser import HTMLParser
import re
from zoneinfo import ZoneInfo


_UNTITLED = re.compile(r"(?:untitled(?:\s+(?:draft|document))?|new\s+(?:draft|document))(?:\s*\(?\d+\)?)?", re.I)


class _OpeningLines(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.lines, self.stack = [], []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        hidden = bool(self.stack and self.stack[-1][2]) or "data-writing-footnote" in attrs or "draft-footnotes" in attrs.get("class", "").split()
        words = [] if not hidden and tag in {"p", "div", "blockquote", "pre", "li", "h1", "h2", "h3", "h4", "h5", "h6"} else None
        if words is not None:
            self.lines.append(words)
        if tag not in {"br", "hr", "wbr"}:
            self.stack.append((tag, words, hidden))

    def handle_endtag(self, tag):
        for index in range(len(self.stack) - 1, -1, -1):
            if self.stack[index][0] == tag:
                del self.stack[index:]
                break

    def handle_data(self, data):
        if self.stack and not self.stack[-1][2]:
            for _, words, _ in self.stack:
                if words is not None:
                    words.append(data)


def first_draft_title(title, body, document_format, stamp):
    """Keep named drafts; label Untitled from its first authored words."""
    if title.strip() and not _UNTITLED.fullmatch(title.strip()):
        return title
    if document_format == "html":
        parser = _OpeningLines()
        parser.feed(body)
        parser.close()
        lines = [" ".join(words) for words in parser.lines]
    else:
        lines = body.splitlines()
    for incoming in lines:
        text = " ".join(incoming.split())
        if not text or _UNTITLED.fullmatch(text):
            continue
        label = " ".join(text.split()[:12])
        if len(label) > 84:
            label = label[:84].rsplit(" ", 1)[0] or label[:84]
        return label.rstrip(" ,;:–—-") + ("…" if len(label) < len(text) else "")
    day = datetime.fromtimestamp(stamp, ZoneInfo("Europe/London"))
    return f"First draft — {day.strftime('%d %b %Y')}"
