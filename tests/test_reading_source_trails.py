"""Published trail companions connect actual saved edges without rewriting them."""
from copy import deepcopy
import hashlib
import json
from pathlib import Path
import tempfile
import unittest

from test_reading_seo import _reading_book
from test_book_seo import _publish, seo


class ReadingSourceTrailsTests(unittest.TestCase):
    def test_wb_companions_are_bounded_and_shared_across_saved_renditions(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            work = _reading_book()
            original = deepcopy(work)
            _publish(root, [work])
            seo.build(root)
            manifest = json.loads((root / 'books/readings-manifest.json').read_text())
            units = {row['unit_id']: row for row in manifest['pages'] if row['kind'] == 'reading'}
            wb = units['WB_TIM']
            declaration, = wb['recorded_source_paths']
            digest = hashlib.sha256(b'WB_TIM:A1').hexdigest()[:24]
            self.assertEqual(declaration['path'], str(Path(wb['path']).parent / 'evidence' / (digest + '.json')))
            self.assertEqual(declaration['url'], wb['url'] + 'evidence/' + digest + '.json')
            raw = (root / declaration['path']).read_bytes()
            self.assertLessEqual(len(raw), 65536)
            trail = json.loads(raw)
            self.assertEqual(trail['item_id'], 'WB_TIM:A1')
            self.assertEqual(trail['relation'], 'inherited_via_recorded_refs')
            self.assertTrue(trail['complete'])
            path, = trail['paths']
            self.assertEqual(path['claim_path'], ['WB_TIM:A1', 'MC_TIM_L2:A1', 'MC_TIM_L1:A1', 'CL_TIM:A1', 'CH_TIM:A1'])
            self.assertEqual(path['passage_id'], 'RAW_TIM:P0001')
            self.assertEqual(path['terminal_alignment_type'], 'Composite')
            self.assertIn('#ref=RAW_TIM%3AP0001', path['source_url'])
            packet = json.loads((root / wb['json_path']).read_text())
            for rendition in packet['renditions']:
                item = rendition['sections'][0]['items'][0]
                self.assertEqual(item['recorded_source_paths_url'], 'https://carelibrary.org' + declaration['url'])
                self.assertEqual(item['passages'], [])
                self.assertEqual(item['refs'], ['MC_TIM_L2:A1'])
            html = (root / wb['text_path']).read_text()
            self.assertEqual(html.count('Follow the recorded source trail'), 2)
            self.assertNotIn('recorded_source_paths', units['CH_TIM'])
            self.assertEqual(work, original)
            first = raw
            seo.build(root)
            self.assertEqual((root / declaration['path']).read_bytes(), first)

    def test_unrendered_source_anchor_is_unresolved_without_invented_locus(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            work = _reading_book()
            work['sources'][0]['paragraphs'][0]['text'] = 'Text from another edition.'
            _publish(root, [work]); seo.build(root)
            manifest = json.loads((root / 'books/readings-manifest.json').read_text())
            wb = next(row for row in manifest['pages'] if row.get('unit_id') == 'WB_TIM')
            trail = json.loads((root / wb['recorded_source_paths'][0]['path']).read_text())
            self.assertFalse(trail['complete'])
            self.assertEqual(trail['paths'], [])
            self.assertIn('anchor_unavailable', json.dumps(trail['unresolved_refs']))


if __name__ == '__main__':
    unittest.main()
