import { useEffect, useRef, useState } from 'react'

const PROMPT_TEXT = 'Open Gmail and summarize my Claude spending in 2025'
const PROMPT_TEXT_ZH = '打开 Gmail，整理我 2025 年 Claude 的消费情况'

const STEPS = [
  { id: 'typing', duration: 3000, phase: 'input', tool: null },
  { id: 'thinking', duration: 1500, phase: 'ai-thinking', tool: null },
  { id: 'open-browser', duration: 1500, phase: 'tool-call', tool: 'open_browser' },
  { id: 'browser-open', duration: 1500, phase: 'browser-opening', tool: null },
  { id: 'inbox-show', duration: 1500, phase: 'inbox-display', tool: null },
  { id: 'search-call', duration: 1500, phase: 'tool-call', tool: 'search_emails' },
  { id: 'browser-search', duration: 1500, phase: 'browser-searching', tool: null },
  { id: 'open-email-1', duration: 1500, phase: 'tool-call', tool: 'open_email' },
  { id: 'email-1', duration: 1800, phase: 'opening-email-1', tool: null },
  { id: 'open-email-2', duration: 1500, phase: 'tool-call', tool: 'open_email' },
  { id: 'email-2', duration: 1800, phase: 'opening-email-2', tool: null },
  { id: 'open-email-3', duration: 1500, phase: 'tool-call', tool: 'open_email' },
  { id: 'email-3', duration: 1800, phase: 'opening-email-3', tool: null },
  { id: 'response', duration: 2500, phase: 'ai-response', tool: null },
  { id: 'done', duration: 2000, phase: 'complete', tool: null },
]

const AI_THOUGHTS = ['Analyzing user request...', 'Need to access Gmail', 'Planning tool calls...']
const AI_THOUGHTS_ZH = ['分析用户请求...', '需要访问 Gmail', '规划工具调用...']

const BROWSER_ACTIONS = ['Opening mail.google.com...', 'Page loaded', 'Searching for "Claude 2025"...', 'Opening email 1/12...', 'Extracting: $24.50', 'Opening email 2/12...', 'Extracting: $31.20', 'Opening email 3/12...', 'Extracting: $28.80']
const BROWSER_ACTIONS_ZH = ['打开 mail.google.com...', '页面已加载', '搜索 "Claude 2025"...', '打开邮件 1/12...', '提取: $24.50', '打开邮件 2/12...', '提取: $31.20', '打开邮件 3/12...', '提取: $28.80']

function useTypewriter(text, active, speed = 38) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!active) { setDisplayed(''); setDone(false); return }
    let i = 0
    setDisplayed('')
    setDone(false)
    ref.current = setInterval(() => {
      i++
      setDisplayed(text.slice(0, i))
      if (i >= text.length) { clearInterval(ref.current); setDone(true) }
    }, speed)
    return () => clearInterval(ref.current)
  }, [active, text, speed])
  return { displayed, done }
}

const INBOX_EMAILS = [
  { from: 'GitHub', subject: 'Your weekly digest', time: '10:30 AM' },
  { from: 'LinkedIn', subject: 'You have 3 new connections', time: '9:15 AM' },
  { from: 'Anthropic', subject: 'Your Claude API Invoice - January 2025', time: 'Jan 31', amount: '$24.50' },
  { from: 'Slack', subject: 'New message from team', time: 'Jan 30' },
  { from: 'Anthropic', subject: 'Your Claude API Invoice - February 2025', time: 'Feb 28', amount: '$31.20' },
]

const INBOX_EMAILS_ZH = [
  { from: 'GitHub', subject: '您的每周摘要', time: '上午10:30' },
  { from: 'LinkedIn', subject: '您有 3 个新联系人', time: '上午9:15' },
  { from: 'Anthropic', subject: 'Claude API 账单 - 2025年1月', time: '1月31日', amount: '$24.50' },
  { from: 'Slack', subject: '团队新消息', time: '1月30日' },
  { from: 'Anthropic', subject: 'Claude API 账单 - 2025年2月', time: '2月28日', amount: '$31.20' },
]

const SEARCH_RESULTS = [
  { from: 'Anthropic', subject: 'Your Claude API Invoice - January 2025', amount: '$24.50' },
  { from: 'Anthropic', subject: 'Your Claude API Invoice - February 2025', amount: '$31.20' },
  { from: 'Anthropic', subject: 'Your Claude API Invoice - March 2025', amount: '$28.80' },
]

const SEARCH_RESULTS_ZH = [
  { from: 'Anthropic', subject: 'Claude API 账单 - 2025年1月', amount: '$24.50' },
  { from: 'Anthropic', subject: 'Claude API 账单 - 2025年2月', amount: '$31.20' },
  { from: 'Anthropic', subject: 'Claude API 账单 - 2025年3月', amount: '$28.80' },
]

export default function HowItWorksAnimation({ lang = 'en' }) {
  const [stepIdx, setStepIdx] = useState(0)
  const [running, setRunning] = useState(true)
  const [aiThoughts, setAiThoughts] = useState([])
  const [browserActions, setBrowserActions] = useState([])
  const [showInbox, setShowInbox] = useState(false)
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [openedEmailIndex, setOpenedEmailIndex] = useState(-1)
  const [aiResponse, setAiResponse] = useState('')
  const [currentToolCall, setCurrentToolCall] = useState(null)
  const [extensionActive, setExtensionActive] = useState(false)
  const timerRef = useRef(null)
  const aiWindowRef = useRef(null)
  const browserWindowRef = useRef(null)

  // Debug: Log window heights
  useEffect(() => {
    const logHeights = () => {
      if (aiWindowRef.current && browserWindowRef.current) {
        console.log('📏 Heights - AI:', aiWindowRef.current.offsetHeight, 'Browser:', browserWindowRef.current.offsetHeight)
      }
    }
    const interval = setInterval(logHeights, 1000)
    return () => clearInterval(interval)
  }, [])

  const promptText = lang === 'zh' ? PROMPT_TEXT_ZH : PROMPT_TEXT
  const thoughts = lang === 'zh' ? AI_THOUGHTS_ZH : AI_THOUGHTS
  const actions = lang === 'zh' ? BROWSER_ACTIONS_ZH : BROWSER_ACTIONS
  const inboxEmails = lang === 'zh' ? INBOX_EMAILS_ZH : INBOX_EMAILS
  const searchResults = lang === 'zh' ? SEARCH_RESULTS_ZH : SEARCH_RESULTS
  
  const currentStep = STEPS[stepIdx]
  const typingActive = running && currentStep?.id === 'typing'
  const { displayed: typedText, done: typingDone } = useTypewriter(promptText, typingActive, 50)

  useEffect(() => { setRunning(true) }, [])

  useEffect(() => {
    if (!running) return
    const step = STEPS[stepIdx]
    if (!step) return

    console.log('🎬 Step:', step.id, 'Phase:', step.phase, 'Tool:', step.tool)

    if (step.phase === 'ai-thinking') {
      thoughts.forEach((thought, i) => {
        setTimeout(() => setAiThoughts(prev => [...prev, thought]), i * 400)
      })
    }

    if (step.phase === 'tool-call' && step.tool) {
      console.log('🔧 Tool call:', step.tool)
      setCurrentToolCall(step.tool)
    }
    if (step.phase === 'browser-opening') {
      console.log('🌐 Browser opening')
      setBrowserActions([actions[0], actions[1]])
      setExtensionActive(true)
      setTimeout(() => setShowInbox(true), 500)
    }
    if (step.phase === 'browser-searching') {
      console.log('🔍 Browser searching')
      setBrowserActions(prev => [...prev, actions[2]])
      setTimeout(() => { setShowInbox(false); setShowSearchResults(true) }, 600)
    }
    if (step.phase === 'opening-email-1') {
      console.log('📧 Opening email 1')
      setBrowserActions(prev => [...prev, actions[3], actions[4]])
      setOpenedEmailIndex(0)
    }
    if (step.phase === 'opening-email-2') {
      console.log('📧 Opening email 2')
      setBrowserActions(prev => [...prev, actions[5], actions[6]])
      setOpenedEmailIndex(1)
    }
    if (step.phase === 'opening-email-3') {
      console.log('📧 Opening email 3')
      setBrowserActions(prev => [...prev, actions[7], actions[8]])
      setOpenedEmailIndex(2)
    }
    if (step.phase === 'ai-response') {
      console.log('💬 AI responding')
      const response = lang === 'zh' ? '✓ 已打开 Gmail 并分析邮件。\n\n找到 12 封 Anthropic 账单邮件。\n2025 年 Claude API 总消费：$284.50' : '✓ Opened Gmail and analyzed emails.\n\nFound 12 Anthropic billing emails.\nTotal Claude API spend in 2025: $284.50'
      let i = 0
      const interval = setInterval(() => {
        setAiResponse(response.slice(0, i))
        i += 3
        if (i >= response.length) { clearInterval(interval); setAiResponse(response) }
      }, 30)
    }

    timerRef.current = setTimeout(() => {
      const next = stepIdx + 1
      if (next >= STEPS.length) {
        console.log('🔄 Resetting animation')
        setTimeout(() => {
          setStepIdx(0); setAiThoughts([]); setBrowserActions([]); setShowInbox(false); setShowSearchResults(false); setOpenedEmailIndex(-1); setAiResponse(''); setCurrentToolCall(null); setExtensionActive(false)
        }, 1000)
      } else {
        setStepIdx(next)
      }
    }, step.duration)

    return () => clearTimeout(timerRef.current)
  }, [stepIdx, running, lang, thoughts, actions])

  const phase = currentStep?.phase || 'idle'
  const browserActive = ['browser-opening', 'inbox-display', 'browser-searching', 'opening-email-1', 'opening-email-2', 'opening-email-3', 'ai-response', 'complete'].includes(phase)
  const dataFlowActive = phase === 'tool-call'

  return (
    <div className="w-full select-none py-8 overflow-x-auto">
      <div className="min-w-[1200px] max-w-7xl mx-auto">
        <div className="flex gap-6">
          <div className="flex-1 min-w-0">
            <div ref={aiWindowRef} className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl border border-gray-700 overflow-hidden flex flex-col" style={{ height: '500px', minHeight: '500px', maxHeight: '500px' }}>
              <div className="bg-gray-800/80 backdrop-blur px-4 py-3 flex items-center gap-2 border-b border-gray-700">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <div className="flex-1 text-center text-sm text-gray-400 font-medium">Claude Desktop</div>
              </div>
              <div className="p-6 space-y-4 flex-1 overflow-y-auto">
                <div className="flex justify-end">
                  <div className="max-w-[80%] bg-accent/20 border border-accent/30 rounded-2xl rounded-tr-sm px-4 py-3">
                    <div className="text-sm text-white">
                      {typingDone || !typingActive ? promptText : typedText}
                      {!typingDone && typingActive && <span className="inline-block w-0.5 h-4 bg-accent ml-1 animate-pulse align-middle" />}
                    </div>
                  </div>
                </div>
                {aiThoughts.length > 0 && (
                  <div className="flex justify-start">
                    <div className="max-w-[85%] bg-gray-800/50 border border-gray-700 rounded-2xl rounded-tl-sm px-4 py-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                          </svg>
                        </div>
                        <span className="text-xs text-gray-400 font-mono">{lang === 'zh' ? '思考中...' : 'Thinking...'}</span>
                      </div>
                      <div className="space-y-1.5 text-xs text-gray-300 font-mono">
                        {aiThoughts.map((thought, i) => (
                          <div key={i} className="flex items-start gap-2 animate-fade-in">
                            <span className="text-accent mt-0.5">→</span>
                            <span>{thought}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {aiResponse && (
                  <div className="flex justify-start">
                    <div className="max-w-[85%] bg-gray-800/50 border border-emerald-500/30 rounded-2xl rounded-tl-sm px-4 py-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </div>
                        <span className="text-xs text-emerald-400 font-semibold">Claude</span>
                      </div>
                      <div className="text-sm text-gray-200 whitespace-pre-line">{aiResponse}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div ref={browserWindowRef} className={`bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl border overflow-hidden flex flex-col transition-all duration-500 ${browserActive ? 'border-emerald-700' : 'border-gray-700'}`} style={{ height: '500px', minHeight: '500px', maxHeight: '500px' }}>
              <div className="bg-gray-800/80 backdrop-blur border-b border-gray-700">
                <div className="px-4 py-2 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                  <div className="flex-1 flex items-center gap-2 ml-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 16v-4M12 8h.01" />
                    </svg>
                    <div className="flex-1 bg-gray-900/50 rounded-lg px-3 py-1.5 text-xs text-gray-400 font-mono">mail.google.com</div>
                    <div className={`px-2 py-1 rounded text-[10px] font-mono transition-all duration-300 ${extensionActive ? (currentToolCall ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-400/50 animate-pulse' : 'bg-gray-700 text-gray-400') : 'opacity-0 invisible'}`}>WebMCP</div>
                  </div>
                </div>
                <div className="px-4 pb-2 flex items-center gap-2">
                  <div className="px-2 py-1 bg-gray-700/50 rounded text-xs text-gray-400">Gmail</div>
                  <div className={`flex items-center gap-1.5 text-xs transition-all duration-300 ${browserActions.length > 0 ? 'text-emerald-400 opacity-100' : 'text-gray-600 opacity-0'}`}>
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="font-mono">{lang === 'zh' ? '自动化中' : 'Automating'}</span>
                  </div>
                </div>
              </div>
              <div className="p-6 flex-1 overflow-y-auto bg-white">
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-200">
                  <div className="w-8 h-8 rounded bg-gradient-to-br from-red-500 to-yellow-500 flex items-center justify-center text-white font-bold text-sm">G</div>
                  <div className="flex-1"><div className="text-xl font-semibold text-gray-800">Gmail</div></div>
                </div>
                <div className="mb-4">
                  <div className={`flex items-center gap-2 bg-gray-100 rounded-lg px-4 py-2 transition-all duration-500 ${showSearchResults ? 'ring-2 ring-emerald-400' : ''}`}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.35-4.35" />
                    </svg>
                    <input type="text" className="flex-1 bg-transparent text-sm text-gray-700 outline-none" value={showSearchResults ? 'Claude 2025' : ''} readOnly placeholder={lang === 'zh' ? '搜索邮件' : 'Search mail'} />
                  </div>
                </div>
                <div className={`space-y-2 transition-all duration-500 ${showInbox && !showSearchResults ? 'opacity-100' : 'opacity-0 absolute pointer-events-none'}`}>
                  <div className="text-xs font-semibold text-gray-600 mb-2">{lang === 'zh' ? '收件箱' : 'Inbox'}</div>
                  {inboxEmails.map((email, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors" style={{ animationDelay: `${i * 80}ms` }}>
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-400 flex items-center justify-center text-white text-xs font-bold shrink-0">{email.from[0]}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-800 truncate">{email.from}</div>
                        <div className="text-xs text-gray-600 truncate">{email.subject}</div>
                      </div>
                      <div className="text-xs text-gray-500 shrink-0">{email.time}</div>
                    </div>
                  ))}
                </div>
                <div className={`space-y-2 transition-all duration-500 ${showSearchResults ? 'opacity-100' : 'opacity-0 absolute pointer-events-none'}`}>
                  <div className="text-xs font-semibold text-gray-600 mb-2">{lang === 'zh' ? '搜索结果' : 'Search Results'}</div>
                  {searchResults.map((email, i) => (
                    <div key={i} className={`flex items-start gap-3 p-3 border rounded-lg transition-all duration-300 ${openedEmailIndex === i ? 'bg-blue-100 border-blue-400 ring-2 ring-blue-300' : 'bg-blue-50 border-blue-200 hover:bg-blue-100'}`} style={{ animationDelay: `${i * 100}ms` }}>
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-xs font-bold shrink-0">A</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-800 truncate">{email.from}</div>
                        <div className="text-xs text-gray-600 truncate">{email.subject}</div>
                        {openedEmailIndex === i && (
                          <div className="mt-2 text-xs text-gray-700 bg-white p-2 rounded border border-blue-200 animate-fade-in">
                            <div className="font-mono text-emerald-600 font-semibold">{lang === 'zh' ? '提取金额: ' : 'Extracted: '}{email.amount}</div>
                          </div>
                        )}
                      </div>
                      <div className="text-xs font-mono text-emerald-600 font-semibold shrink-0">{email.amount}</div>
                    </div>
                  ))}
                  <div className="text-center text-xs text-gray-500 pt-2">{lang === 'zh' ? '+ 9 封更多邮件...' : '+ 9 more emails...'}</div>
                </div>
                <div className={`mt-4 bg-gray-50 rounded-lg p-3 border border-gray-200 transition-all duration-300 ${browserActions.length > 0 ? 'opacity-100' : 'opacity-0'}`}>
                  <div className="text-xs font-mono text-gray-600 space-y-1.5">
                    {browserActions.slice(-4).map((action, i) => (
                      <div key={i} className="flex items-center gap-2 animate-fade-in">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span>{action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Data Flow Visualization - Always visible, below both windows */}
      <div className="min-w-[1200px] max-w-7xl mx-auto mt-6">
        <div className="flex items-center justify-center gap-4">
          {/* AI Client */}
          <div className={`bg-surface/80 backdrop-blur border rounded-xl p-4 shadow-lg transition-all duration-500 ${dataFlowActive ? 'border-blue-400/40 scale-105' : 'border-gray-700/40 scale-100'}`}>
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className={`w-12 h-12 rounded-lg border flex items-center justify-center transition-all duration-500 ${dataFlowActive ? 'bg-blue-500/20 border-blue-400/50' : 'bg-gray-800/20 border-gray-700/50'}`}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={dataFlowActive ? 'text-blue-400' : 'text-gray-500'}>
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                {dataFlowActive && <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-400 rounded-full animate-ping" />}
              </div>
              <div>
                <div className={`text-sm font-semibold transition-colors duration-500 ${dataFlowActive ? 'text-blue-400' : 'text-gray-500'}`}>AI Client</div>
                <div className={`text-xs font-mono transition-colors duration-500 ${dataFlowActive ? 'text-muted' : 'text-gray-600'}`}>Claude Desktop</div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-12 h-0.5 relative transition-all duration-500 ${dataFlowActive ? 'bg-gradient-to-r from-blue-400 to-accent' : 'bg-gray-700'}`}>
              {dataFlowActive && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-accent rounded-full animate-pulse" />}
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-colors duration-500 ${dataFlowActive ? 'text-accent' : 'text-gray-600'}`}>
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </div>
          {/* MCP Server */}
          <div className={`bg-surface/80 backdrop-blur border rounded-xl p-4 shadow-lg transition-all duration-500 ${dataFlowActive ? 'border-accent/40 scale-105' : 'border-gray-700/40 scale-100'}`}>
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className={`w-12 h-12 rounded-lg border flex items-center justify-center transition-all duration-500 ${dataFlowActive ? 'bg-accent/20 border-accent/50' : 'bg-gray-800/20 border-gray-700/50'}`}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={dataFlowActive ? 'text-accent' : 'text-gray-500'}>
                    <rect x="2" y="3" width="20" height="14" rx="2" />
                    <path d="M8 21h8M12 17v4" />
                  </svg>
                </div>
                {dataFlowActive && <div className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full animate-ping" />}
              </div>
              <div>
                <div className={`text-sm font-semibold transition-colors duration-500 ${dataFlowActive ? 'text-accent' : 'text-gray-500'}`}>MCP Server</div>
                <div className={`text-xs font-mono transition-colors duration-500 ${dataFlowActive ? 'text-muted' : 'text-gray-600'}`}>{currentToolCall || 'idle'}</div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-12 h-0.5 relative transition-all duration-500 ${dataFlowActive ? 'bg-gradient-to-r from-accent to-purple-400' : 'bg-gray-700'}`}>
              {dataFlowActive && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-purple-400 rounded-full animate-pulse" />}
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-colors duration-500 ${dataFlowActive ? 'text-purple-400' : 'text-gray-600'}`}>
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </div>
          <div className={`bg-surface/80 backdrop-blur border rounded-xl p-4 shadow-lg transition-all duration-500 ${dataFlowActive ? 'border-purple-400/40 scale-105' : 'border-gray-700/40 scale-100'}`}>
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className={`w-12 h-12 rounded-lg border flex items-center justify-center transition-all duration-500 ${dataFlowActive ? 'bg-purple-500/20 border-purple-400/50' : 'bg-gray-800/20 border-gray-700/50'}`}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={dataFlowActive ? 'text-purple-400' : 'text-gray-500'}>
                    <path d="M18 20V10M12 20V4M6 20v-6" />
                  </svg>
                </div>
                {dataFlowActive && <div className="absolute -top-1 -right-1 w-3 h-3 bg-purple-400 rounded-full animate-ping" />}
              </div>
              <div>
                <div className={`text-sm font-semibold transition-colors duration-500 ${dataFlowActive ? 'text-purple-400' : 'text-gray-500'}`}>WebSocket Bridge</div>
                <div className={`text-xs font-mono transition-colors duration-500 ${dataFlowActive ? 'text-muted' : 'text-gray-600'}`}>localhost:3711</div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-12 h-0.5 relative transition-all duration-500 ${dataFlowActive ? 'bg-gradient-to-r from-purple-400 to-emerald-400' : 'bg-gray-700'}`}>
              {dataFlowActive && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />}
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-colors duration-500 ${dataFlowActive ? 'text-emerald-400' : 'text-gray-600'}`}>
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </div>
          <div className={`bg-surface/80 backdrop-blur border rounded-xl p-4 shadow-lg transition-all duration-500 ${dataFlowActive ? 'border-emerald-400/40 scale-105' : 'border-gray-700/40 scale-100'}`}>
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className={`w-12 h-12 rounded-lg border flex items-center justify-center transition-all duration-500 ${dataFlowActive ? 'bg-emerald-500/20 border-emerald-400/50' : 'bg-gray-800/20 border-gray-700/50'}`}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={dataFlowActive ? 'text-emerald-400' : 'text-gray-500'}>
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M3 9h18M9 21V9" />
                  </svg>
                </div>
                {dataFlowActive && <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full animate-ping" />}
              </div>
              <div>
                <div className={`text-sm font-semibold transition-colors duration-500 ${dataFlowActive ? 'text-emerald-400' : 'text-gray-500'}`}>Browser Extension</div>
                <div className={`text-xs font-mono transition-colors duration-500 ${dataFlowActive ? 'text-muted' : 'text-gray-600'}`}>
                  {dataFlowActive && currentToolCall === 'open_browser' && (lang === 'zh' ? '打开页面' : 'Opening page')}
                  {dataFlowActive && currentToolCall === 'search_emails' && (lang === 'zh' ? '搜索邮件' : 'Searching emails')}
                  {dataFlowActive && currentToolCall === 'open_email' && (lang === 'zh' ? '打开邮件' : 'Opening email')}
                  {!dataFlowActive && 'idle'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.4s ease-out forwards;
        }
        ::-webkit-scrollbar {
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.1);
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(99, 102, 241, 0.5);
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(99, 102, 241, 0.7);
        }
      `}</style>
    </div>
  )
}
