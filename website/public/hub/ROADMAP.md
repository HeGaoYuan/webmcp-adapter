# Adapter Roadmap

Planned adapters for the WebMCP hub. Contributions welcome — see [CONTRIBUTING.md](./CONTRIBUTING.md).

Adapters are listed roughly in priority order within each region. An adapter is most valuable when the target site has **no public API, a restricted API, or one that requires complex OAuth setup** — situations where browser automation is the practical alternative.

---

## 🎯 Adapter Quality System (Planned)

### Automated Testing & Scoring

To ensure adapter reliability and help users choose high-quality adapters, we plan to implement an automated testing and scoring system:

**Core Features:**
- **Daily Automated Tests**: Each adapter runs automated tests daily against the live website
- **Real-time Quality Score**: Adapters receive a quality score (0-100) based on test results
- **Public Dashboard**: Users can see adapter scores, success rates, and test history in the Adapter Hub
- **Automatic Alerts**: Maintainers are notified when adapter quality drops below threshold
- **Version Management**: Automatic fallback to previous stable versions when tests fail

**Quality Metrics:**
- **Success Rate**: Percentage of successful test executions (weight: 40%)
- **Response Time**: Average execution time for operations (weight: 20%)
- **Stability**: Consistency of results over time (weight: 20%)
- **Coverage**: Percentage of tools that pass tests (weight: 10%)
- **User Feedback**: Community ratings and issue reports (weight: 10%)

**Implementation Plan:**
```javascript
// Example: Adapter Test Suite
{
  "adapter": "mail.163.com",
  "version": "1.0.0",
  "tests": [
    {
      "tool": "search_emails",
      "scenarios": [
        { "input": { "keyword": "test" }, "expected": "results_array" },
        { "input": { "keyword": "发票" }, "expected": "results_array" }
      ]
    },
    {
      "tool": "get_unread_emails",
      "scenarios": [
        { "input": { "limit": 10 }, "expected": "results_with_count" }
      ]
    }
  ],
  "schedule": "daily",
  "timeout": 30000
}

// Example: Quality Score Display
{
  "adapter": "mail.163.com",
  "quality_score": 95,
  "metrics": {
    "success_rate": 98,      // 40 points
    "avg_response_time": 850, // 18 points (fast)
    "stability": 96,          // 19 points
    "coverage": 100,          // 10 points
    "user_rating": 4.5        // 8 points
  },
  "last_tested": "2026-02-26T10:00:00Z",
  "test_history": {
    "last_7_days": [95, 96, 94, 97, 95, 96, 95],
    "failures": 2,
    "total_runs": 70
  }
}
```

**Benefits:**
- ✅ Users can trust adapter quality before using
- ✅ Maintainers get early warning of website changes
- ✅ Community can identify which adapters need updates
- ✅ Automatic quality-based ranking in Adapter Hub
- ✅ Reduces manual testing burden

**Technical Requirements:**
- CI/CD pipeline for automated testing
- Test environment with real browser instances
- Database for storing test results and metrics
- Dashboard UI for displaying scores
- Notification system for maintainers

**Future Enhancements:**
- A/B testing for adapter improvements
- Performance benchmarking across adapters
- Predictive alerts (detect degradation trends)
- Community-contributed test cases
- Integration with adapter marketplace revenue sharing

---

## China

| Status | Site | Domain | Category | Notes |
|---|---|---|---|---|
| ✅ Done | 163邮箱 | mail.163.com | Email | First adapter |
| 🔜 Planned | QQ邮箱 | mail.qq.com | Email | Huge user base; same architecture as 163 mail |
| 🔜 Planned | 微博 | weibo.com | Social Media | API has been heavily restricted since 2019 |
| 🔜 Planned | 小红书 | xiaohongshu.com | Social Media | No public API; widely used by brand/content teams |
| 🔜 Planned | 知乎 | zhihu.com | Knowledge | No public API; Q&A reading and content management |
| 🔜 Planned | 天眼查 | tianyancha.com | Business Info | API is paid enterprise-only; high-frequency for BD/procurement |
| 🔜 Planned | BOSS直聘 | bosszhipin.com | Recruiting | No public API; job search and candidate screening |
| 🔜 Planned | 掘金 | juejin.cn | Developer Community | No API; largest Chinese developer content platform |
| 🔜 Planned | B站 | bilibili.com | Video / Community | API restricted; content creator data and comment management |
| 🔜 Planned | 百度网盘 | pan.baidu.com | File Storage | API setup is complex; file listing and search in browser |

---

## International

| Status | Site | Domain | Category | Notes |
|---|---|---|---|---|
| 🔜 Planned | Gmail | mail.google.com | Email | Google API requires complex OAuth; shares architecture with mail adapters |
| 🔜 Planned | Twitter / X | x.com | Social Media | API now starts at $100/month; web is the only free option |
| 🔜 Planned | LinkedIn | linkedin.com | Social Media / Recruiting | Public API essentially shut down in 2018 |
| 🔜 Planned | Reddit | reddit.com | Community | API became paid/restricted in 2023 |
| 🔜 Planned | GitHub | github.com | Developer Tools | API exists but reading issues/PRs/discussions in browser is natural |
| 🔜 Planned | Instagram | instagram.com | Social Media | Meta Graph API heavily restricted; web widely used by social media managers |
| 🔜 Planned | Outlook Web | outlook.office.com | Email | Corporate email; OAuth setup is complex for end users |
| 🔜 Planned | Notion | notion.so | Productivity | API requires setup; web app is the primary interface |
| 🔜 Planned | Hacker News | news.ycombinator.com | Developer Community | No API restrictions; reading and summarizing tech news |
| 🔜 Planned | Product Hunt | producthunt.com | Tech Community | No public API; used by tech workers to track new products |

---

## Deliberately Excluded

- **E-commerce / payment sites** (e.g. Taobao, JD, Amazon) — involving real money; excluded for user safety
- **Desktop-first apps** (e.g. Feishu desktop, DingTalk desktop, WeCom desktop) — not primarily browser-based
- **Sites with well-documented, free, easy-to-use APIs** — users are better served connecting Claude directly to the API via MCP

---

## Contributing an Adapter

Want to implement one of the planned adapters, or propose a new one? See [CONTRIBUTING.md](./CONTRIBUTING.md).
