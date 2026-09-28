import unittest

from hardware.pump_host import execute_recipe, parse_done, validate_recipe


class PumpHostTests(unittest.TestCase):
    def test_validate_recipe_rejects_duplicate_pump(self):
        with self.assertRaises(ValueError):
            validate_recipe([{"pump": 1, "grams": 2.0}, {"pump": 1, "grams": 3.0}])

    def test_validate_recipe_rejects_fifth_pump(self):
        with self.assertRaises(ValueError):
            validate_recipe([{"pump": 5, "grams": 2.0}])

    def test_parse_done_returns_structured_measurement(self):
        result = parse_done("D2 DONE actual=5.2g target=5.0g err=+0.2g", 2)
        self.assertIsNotNone(result)
        self.assertEqual(result.pump, 2)
        self.assertEqual(result.actualG, 5.2)
        self.assertEqual(result.errorG, 0.2)

    def test_dry_run_never_opens_serial(self):
        result = execute_recipe([{"pump": 1, "grams": 2.0}], dry_run=True)
        self.assertTrue(result["ok"])
        self.assertEqual(result["results"][0]["actualG"], 2.0)


if __name__ == "__main__":
    unittest.main()

