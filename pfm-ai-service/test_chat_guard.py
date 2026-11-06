# -*- coding: utf-8 -*-
import unittest

from chat_guard import OUT_OF_SCOPE_REPLY, is_financial_follow_up, is_in_scope_question


class ChatScopeGuardTests(unittest.TestCase):
    def test_allows_personal_finance_questions(self):
        self.assertTrue(is_in_scope_question("Th\u00e1ng n\u00e0y t\u00f4i \u0111\u00e3 chi bao nhi\u00eau?"))
        self.assertTrue(is_in_scope_question("My account balance is what?"))
        self.assertTrue(is_in_scope_question("L\u00e3i su\u1ea5t kho\u1ea3n vay c\u1ee7a t\u00f4i l\u00e0 bao nhi\u00eau?"))

    def test_rejects_unrelated_questions(self):
        self.assertFalse(is_in_scope_question("Vi\u1ebft cho t\u00f4i m\u1ed9t h\u00e0m Python s\u1eafp x\u1ebfp m\u1ea3ng"))
        self.assertFalse(is_in_scope_question("Th\u1eddi ti\u1ebft \u1edf H\u00e0 N\u1ed9i h\u00f4m nay th\u1ebf n\u00e0o?"))
        self.assertIn("t\u00e0i ch\u00ednh c\u00e1 nh\u00e2n", OUT_OF_SCOPE_REPLY)

    def test_allows_short_greeting(self):
        self.assertTrue(is_in_scope_question("Xin ch\u00e0o"))

    def test_allows_follow_up_about_an_amount(self):
        self.assertTrue(is_in_scope_question("\u1ee6a 440000 l\u00e0 c\u00e1i n\u00e0o?"))
        self.assertTrue(is_in_scope_question("Kho\u1ea3n 440.000 n\u00e0y l\u00e0 giao d\u1ecbch g\u00ec?"))

    def test_allows_short_follow_up_after_financial_answer(self):
        history = [("assistant", "Giao d\u1ecbch 440.000 VND b\u1ea5t th\u01b0\u1eddng ng\u00e0y 16/08/2020.")]
        self.assertTrue(is_financial_follow_up("V\u1eady t\u1eadn 2020 nay 2026 m\u00e0?", history))
        self.assertFalse(is_financial_follow_up("Vi\u1ebft Python cho t\u00f4i", history))


if __name__ == "__main__":
    unittest.main()
