export const docsSidebar = [
  {
    titleEn: 'Getting Started',
    titleZh: '快速开始',
    items: [
      { slug: 'introduction',  titleEn: 'Introduction',  titleZh: '项目介绍' },
      { slug: 'quick-start',   titleEn: 'Quick Start',   titleZh: '5 分钟上手' },
      { slug: 'installation',  titleEn: 'Installation',  titleZh: '完整安装' },
    ],
  },
  {
    titleEn: 'Core Concepts',
    titleZh: '核心概念',
    items: [
      { slug: 'architecture',          titleEn: 'Architecture',               titleZh: '架构' },
      { slug: 'adapter-system',        titleEn: 'Adapter System',             titleZh: 'Adapter 体系' },
      { slug: 'vs-browser-automation', titleEn: 'vs. Browser Automation MCPs', titleZh: '与浏览器自动化 MCP 对比' },
    ],
  },
  {
    titleEn: 'Reference',
    titleZh: '参考',
    items: [
      { slug: 'cli-reference',      titleEn: 'CLI Reference',      titleZh: 'CLI 参考' },
      { slug: 'api-reference',      titleEn: 'API Reference',      titleZh: 'API 参考' },
    ],
  },
  {
    titleEn: 'For Developers',
    titleZh: '开发者',
    items: [
      { slug: 'writing-an-adapter', titleEn: 'Writing an Adapter', titleZh: '编写 Adapter' },
    ],
  },
  {
    titleEn: 'Troubleshooting',
    titleZh: '故障排除',
    items: [
      { slug: 'troubleshooting', titleEn: 'Common Issues', titleZh: '常见问题' },
    ],
  },
  {
    titleEn: 'Legal',
    titleZh: '法律',
    items: [
      { slug: 'security',    titleEn: 'Security Model', titleZh: '安全模型' },
      { slug: 'disclaimer', titleEn: 'Disclaimer', titleZh: '免责声明' },
    ],
  },
]

export const defaultSlug = 'introduction'

export function findDocItem(slug) {
  for (const group of docsSidebar) {
    for (const item of group.items) {
      if (item.slug === slug) return item
    }
  }
  return null
}
