from __future__ import annotations

import asyncio
import os
import sqlite3
import tempfile
import unittest
from datetime import datetime, timedelta


class SSLInterviewFlowTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.storage = tempfile.TemporaryDirectory()
        os.environ["STORAGE_DIR"] = cls.storage.name
        os.environ["ENABLE_WRITE_API"] = "true"
        from backend.app import main

        cls.main = main

    @classmethod
    def tearDownClass(cls) -> None:
        cls.storage.cleanup()

    def test_submit_review_message_and_csv(self) -> None:
        main = self.main
        main.register_site_account(
            main.SiteAccountRegisterRequest(
                account="ssl-test-user",
                password="test1234",
                full_name="测试同学",
                grade="大二",
            )
        )
        interview_time = (datetime.now() + timedelta(days=2)).replace(second=0, microsecond=0).isoformat(timespec="minutes")
        application = main.submit_ssl_interview_application(
            main.SSLInterviewApplicationRequest(
                applicant_account="ssl-test-user",
                self_intro="具备机器人控制项目经验，希望参与多机协同开发。",
                interview_direction="算法",
                interview_time=interview_time,
            )
        )
        self.assertEqual(application["status"], "pending")

        reviewed = main.review_ssl_interview_application(
            application["id"],
            main.SSLInterviewReviewRequest(status="approved", interview_location="工程训练中心 302"),
            "admin",
        )
        self.assertEqual(reviewed["status"], "approved")
        inbox = main.list_site_messages("ssl-test-user", 50)
        messages = inbox["messages"]
        self.assertEqual(inbox["unread_count"], 1)
        self.assertFalse(messages[0]["is_read"])
        self.assertIn(interview_time.replace("T", " "), messages[0]["content"])
        self.assertIn("工程训练中心 302", messages[0]["content"])
        marked = main.mark_site_messages_read("ssl-test-user")
        self.assertEqual(marked["marked_read"], 1)
        read_inbox = main.list_site_messages("ssl-test-user", 50)
        self.assertEqual(read_inbox["unread_count"], 0)
        self.assertTrue(read_inbox["messages"][0]["is_read"])

        response = main.export_ssl_interview_applications("admin")

        async def read_body() -> bytes:
            return b"".join([chunk async for chunk in response.body_iterator])

        csv_content = asyncio.run(read_body()).decode("utf-8-sig")
        self.assertIn("姓名,年级,面试方向,面试时间", csv_content)
        self.assertIn("测试同学,大二,算法", csv_content)

    def test_rejection_requires_reason_and_sends_message(self) -> None:
        main = self.main
        main.register_site_account(
            main.SiteAccountRegisterRequest(
                account="ssl-reject-user",
                password="test1234",
                full_name="申请同学",
                grade="大一",
            )
        )
        interview_time = (datetime.now() + timedelta(days=3)).replace(second=0, microsecond=0).isoformat(timespec="minutes")
        application = main.submit_ssl_interview_application(
            main.SSLInterviewApplicationRequest(
                applicant_account="ssl-reject-user",
                self_intro="希望参与机械结构设计。",
                interview_direction="机械",
                interview_time=interview_time,
            )
        )
        with self.assertRaises(main.HTTPException):
            main.review_ssl_interview_application(
                application["id"],
                main.SSLInterviewReviewRequest(status="rejected"),
                "admin",
            )
        reviewed = main.review_ssl_interview_application(
            application["id"],
            main.SSLInterviewReviewRequest(status="rejected", rejection_reason="当前基础与本轮岗位要求未匹配"),
            "admin",
        )
        self.assertEqual(reviewed["status"], "rejected")
        messages = main.list_site_messages("ssl-reject-user", 50)["messages"]
        self.assertIn("当前基础与本轮岗位要求未匹配", messages[0]["content"])

    def test_existing_message_table_gets_read_column(self) -> None:
        connection = sqlite3.connect(":memory:")
        connection.row_factory = sqlite3.Row
        connection.execute("CREATE TABLE site_message (id TEXT PRIMARY KEY)")
        self.main.ensure_site_message_read_column(connection)
        columns = {row["name"] for row in connection.execute("PRAGMA table_info(site_message)").fetchall()}
        connection.close()
        self.assertIn("read_at", columns)

    def test_homepage_recruitment_banner_can_be_edited_and_hidden(self) -> None:
        main = self.main
        updated = main.update_homepage_recruitment_banner(
            main.HomepageRecruitmentBannerUpdate(
                text="2027赛季招新中",
                action_text="点击跳转",
                is_enabled=True,
            )
        )
        self.assertTrue(updated["is_enabled"])
        self.assertEqual(main.get_homepage_content()["recruitment_banner"]["text"], "2027赛季招新中")
        main.update_homepage_recruitment_banner(
            main.HomepageRecruitmentBannerUpdate(
                text="长期招新",
                action_text="了解详情",
                is_enabled=False,
            )
        )
        self.assertIsNone(main.get_homepage_content()["recruitment_banner"])
        admin_banner = main.get_homepage_content(include_disabled=True)["recruitment_banner"]
        self.assertEqual(admin_banner["text"], "长期招新")

    def test_homepage_profile_content_can_be_updated(self) -> None:
        main = self.main
        updated = main.update_homepage_profile(
            main.HomepageProfileUpdate(
                team_name="PRINTK 测试战队",
                team_intro="用于验证首页内容管理。",
                stats=[
                    main.HomepageStatItem(value="5", label="核心组别"),
                    main.HomepageStatItem(value="8", label="兵种方向"),
                    main.HomepageStatItem(value="2027", label="赛季规划"),
                ],
                awards=[
                    main.HomepageAwardItem(
                        title="联盟赛季军",
                        meta="2025 高校联盟赛广西站",
                        image_url="/award.jpg",
                        image_alt="联盟赛季军奖状",
                    )
                ],
            )
        )
        self.assertEqual(updated["team_name"], "PRINTK 测试战队")
        homepage = main.get_homepage_content()
        self.assertEqual(homepage["profile"]["stats"][2]["value"], "2027")
        self.assertEqual(homepage["profile"]["awards"][0]["title"], "联盟赛季军")


if __name__ == "__main__":
    unittest.main()
