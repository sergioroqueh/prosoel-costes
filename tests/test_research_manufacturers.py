"""No-network tests for the bounded PROSOEL manufacturer researcher."""
import importlib.util
import pathlib
import unittest
from unittest.mock import patch

SCRIPT=pathlib.Path(__file__).resolve().parents[1]/"scripts"/"research_manufacturers.py"
spec=importlib.util.spec_from_file_location("prosoel_research",SCRIPT)
research=importlib.util.module_from_spec(spec)
spec.loader.exec_module(research)

def item(ref, description, ident=1):
    return {"commercial_item_id":ident,"supplier_reference":ref,
            "supplier_description":description,"supplier_name":"GRUPO JARAMA"}

class OfficialResearchTests(unittest.TestCase):
    def test_verified_hosts_only(self):
        self.assertTrue(research.hostname_allowed(
            "https://www.aiscan.com/producto/cr/tubo-aiscan-cr-cr20/"))
        for bad in [
            "http://www.aiscan.com/producto/cr/",
            "https://www.aiscan.com.evil.test/path/",
            "https://evil.test@www.aiscan.com.evil.test/path/",
            "https://localhost:8443/admin",
            "https://www.aiscan.com:8080/path",
        ]:
            self.assertFalse(research.hostname_allowed(bad))
    def test_known_aiscan(self):
        urls=research.official_urls(item("CR20","Tubo Aiscan-CR diametro 20 negro"))
        self.assertEqual(urls,["https://www.aiscan.com/producto/cr/tubo-aiscan-cr-cr20/"])
    def test_code_collision_rejected_by_brand(self):
        self.assertEqual(research.official_urls(item(
            "403585","MT2. CONDUCTO CHAPA 0.6 mm")),[])
        self.assertEqual(research.official_urls(item(
            "CR20","ACCESORIO COFRET / CARCASA")),[])
    def test_source_stays_and_conflict_detected(self):
        good=item("CR20","Tubo Aiscan-CR corrugado doble capa diámetro 20 negro")
        wrong=item("CR20","Tubo Aiscan-CR corrugado doble capa diámetro 25 negro")
        page='<html><head><title>CR20 — Aiscan</title><meta name="description" content="CR20 tubo Ø20 negro"></head><body><h1>CR20</h1><p>Tubo de 20 mm</p></body></html>'
        ok=research.build_evidence(good,
           "https://www.aiscan.com/producto/cr/tubo-aiscan-cr-cr20/",page)
        bad=research.build_evidence(wrong,
           "https://www.aiscan.com/producto/cr/tubo-aiscan-cr-cr20/",page)
        self.assertTrue(ok["p_code_match"])
        self.assertTrue(ok["p_description_match"])
        self.assertFalse(bad["p_description_match"])
        self.assertNotIn("corrected_description",ok)
    def test_ref_must_appear_on_page(self):
        page="<title>Aiscan home</title><h1>CR25</h1>"
        self.assertIsNone(research.build_evidence(
          item("CR20","Tubo Aiscan-CR diametro 20 negro"),
          "https://www.aiscan.com/producto/cr/",page))
    def test_legrand_16_a(self):
        page='<html><title>TX3 403586 16 A Legrand</title><p>Magnetotérmico TX3 403586 1P+N 16A</p></html>'
        candidate=research.build_evidence(item("403586","Magnetotérmico TX3 6kA-C P + N 16A"),
            "https://www.legrand.es/es/productos/magnetotermico-tx3-1pn-230v-16a-curva-2-modulos-403586",page)
        self.assertTrue(candidate["p_description_match"])
        self.assertTrue(candidate["p_code_match"])
    def test_transient_network_error_keeps_queue_pending(self):
        from urllib.error import URLError
        source = item("CR20","Tubo Aiscan-CR diametro 20 negro")
        events = []
        def mocked_api(endpoint,key,name,payload):
            events.append(name)
            if name == "material_research_priority":
                return [source]
            raise AssertionError("An unreachable manufacturer must not write: "+name)
        with patch.dict("os.environ",{"SUPABASE_URL":"https://test.supabase.co",
                                     "SUPABASE_SERVICE_ROLE_KEY":"fake-test-only",
                                     "BRAVE_SEARCH_API_KEY":""}):
            with patch.object(research,"api_rpc",side_effect=mocked_api):
                with patch.object(research,"open_safe_official",
                                  side_effect=URLError("Network is unreachable")):
                    with patch.object(research.time,"sleep",return_value=None):
                        self.assertEqual(research.run(limit=1,scan=1,dry_run=False),2)
        self.assertEqual(events,["material_research_priority"])

    def test_confirmed_404_can_mark_absent_only_in_live_mode(self):
        from urllib.error import HTTPError
        source=item("CR20","Tubo Aiscan-CR diametro 20 negro")
        events=[]
        def mocked_api(endpoint,key,name,payload):
            events.append(name)
            if name=="material_research_priority":
                return [source]
            if name=="material_research_mark_attempt":
                return {"result":"recorded"}
            raise AssertionError(name)
        with patch.dict("os.environ",{"SUPABASE_URL":"https://test.supabase.co",
                                     "SUPABASE_SERVICE_ROLE_KEY":"fake-test-only",
                                     "BRAVE_SEARCH_API_KEY":""}):
            with patch.object(research,"api_rpc",side_effect=mocked_api):
                with patch.object(research,"open_safe_official",
                                  side_effect=HTTPError("https://www.aiscan.com/x",404,"Not Found",{},None)):
                    with patch.object(research.time,"sleep",return_value=None):
                        self.assertEqual(research.run(limit=1,scan=1,dry_run=False),0)
        self.assertEqual(events,["material_research_priority","material_research_mark_attempt"])

    def test_skip_without_service_secret(self):
        with patch.dict("os.environ",{"SUPABASE_URL":"","SUPABASE_SERVICE_ROLE_KEY":""}):
            self.assertEqual(research.run(limit=2,dry_run=True),0)

if __name__=="__main__":
    unittest.main()
